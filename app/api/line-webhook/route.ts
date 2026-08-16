// src/app/api/line-webhook/route.ts
import { after, NextRequest, NextResponse } from "next/server";
import { validateSignature, webhook } from "@line/bot-sdk";
import { channelSecret } from "@/config/line-config";
import { handleLineEvent } from "@/handlers";
import { claimEvent, cleanupProcessedEvents } from "@/services/idempotencyService";
import { cleanupExpiredFlows } from "@/services/documentFlowService";

// จำเป็นต้องเป็น Node runtime: validateSignature ใช้ node:crypto และ audio path ใช้ Buffer
export const runtime = "nodejs";
// เผื่อเวลาให้งานเบื้องหลังใน after() (ASR + Gemini) ทำงานจนจบตอน deploy จริง
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ต้องอ่าน raw body ก่อนเสมอ — HMAC คำนวณจาก raw string
  // ถ้าใช้ req.json() แล้ว stringify กลับ signature จะเพี้ยน
  const bodyText = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!signature || !validateSignature(bodyText, channelSecret, signature)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: webhook.CallbackRequest;
  try {
    body = JSON.parse(bodyText) as webhook.CallbackRequest;
  } catch {
    // body ไม่ใช่ JSON = คนยิงผิด ไม่ใช่ระบบเราพัง จึงต้องเป็น 400 ไม่ใช่ 500
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ปุ่ม Verify ใน LINE Developers Console ส่ง events: [] มา ต้องตอบ 200 ได้ปกติ
  const events = body.events ?? [];

  // LINE ใส่ header นี้มาเมื่อเป็นการส่งซ้ำ มีไว้เพื่อให้ไล่ log ตามได้
  const retryKey = req.headers.get("x-line-retry-key");
  if (retryKey) {
    console.warn(`[Webhook] เป็นการส่งซ้ำจาก LINE (retry key: ${retryKey})`);
  }

  if (events.length > 0) {
    // หลักของ LINE: ตอบ 200 ให้เร็วที่สุด แล้วค่อยประมวลผลเบื้องหลัง
    // ถ้ารอ Gemini + ASR + DB จนเสร็จก่อนตอบ LINE จะถือว่าส่งไม่สำเร็จแล้ว retry
    // → Gemini ถูกเรียกซ้ำ, ChatHistory ซ้ำ, โควตาไหม้
    after(async () => {
      // allSettled ไม่ใช่ all — event เดียวพังต้องไม่ทำให้ event ที่เหลือถูกทิ้ง
      const results = await Promise.allSettled(
        events.map(async (event) => {
          // กัน LINE retry แล้วเรียก Gemini ซ้ำ / เขียน ChatHistory ซ้ำ
          const isFirstTime = await claimEvent(event.webhookEventId);
          if (!isFirstTime) {
            console.warn(
              `[Webhook] ข้าม event ${event.webhookEventId} เพราะเคยประมวลผลไปแล้ว` +
                (event.deliveryContext?.isRedelivery ? " (isRedelivery = true)" : "")
            );
            return;
          }

          return handleLineEvent(event);
        })
      );

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[Webhook] event ${events[index]?.webhookEventId ?? "unknown"} ล้มเหลว:`,
            result.reason
          );
        }
      });

      // ล้างแถวเก่าใน ProcessedEvent (มี throttle ในตัว อย่างมากชั่วโมงละครั้ง)
      await cleanupProcessedEvents();
      // ล้าง state ร่างเอกสารที่ครูค้างไว้เกิน 30 นาที
      await cleanupExpiredFlows();
    });
  }

  // ตอบ 200 เสมอเมื่อ signature ผ่านแล้ว — error ภายในเป็นเรื่องที่เรา log เอง
  // non-2xx ทำให้ LINE retry และถ้า error rate สูงต่อเนื่อง LINE จะปิด webhook ให้เอง
  return new NextResponse(null, { status: 200 });
}
