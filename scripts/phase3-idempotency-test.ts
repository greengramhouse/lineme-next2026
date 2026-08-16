/**
 * ทดสอบ H3 — idempotency กัน LINE retry
 * รันด้วย: npx tsx --env-file=.env scripts/phase3-idempotency-test.ts
 * ต้องเปิด dev server ไว้ที่พอร์ต 3999 ก่อน
 */
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";

const secret = process.env.CHANNEL_SECRET!;
const URL = "http://localhost:3999/api/line-webhook";
const TEST_LINE_ID = "Uphase3idem00000000000000000001";
const EVENT_ID = `PHASE3-IDEM-${Math.floor(performance.now() * 1000)}`;

const sign = (b: string) => crypto.createHmac("sha256", secret).update(b).digest("base64");
const check = (name: string, ok: boolean, detail = "") =>
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);

function buildEvent(isRedelivery: boolean) {
  return {
    destination: "Uxxx",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: 1700000000000,
        webhookEventId: EVENT_ID, // 👈 id เดียวกันทั้งสองรอบ = จำลอง LINE retry
        deliveryContext: { isRedelivery },
        source: { type: "user", userId: TEST_LINE_ID },
        replyToken: "0".repeat(34),
        message: { type: "text", id: "1", text: "ทดสอบ idempotency" },
      },
    ],
  };
}

async function post(payload: unknown, retryKey?: string) {
  const body = JSON.stringify(payload);
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-line-signature": sign(body),
      ...(retryKey ? { "x-line-retry-key": retryKey } : {}),
    },
    body,
  });
  return res.status;
}

async function main() {
  await prisma.processedEvent.deleteMany({ where: { webhookEventId: EVENT_ID } });
  await prisma.chatHistory.deleteMany({ where: { lineId: TEST_LINE_ID } });

  // รอบแรก — ต้องประมวลผลจริง
  const s1 = await post(buildEvent(false));
  await new Promise((r) => setTimeout(r, 8000));

  const claimed = await prisma.processedEvent.findUnique({
    where: { webhookEventId: EVENT_ID },
  });
  check("รอบแรก: event ถูกบันทึกใน ProcessedEvent", claimed !== null, `HTTP ${s1}`);

  const historyAfterFirst = await prisma.chatHistory.count({
    where: { lineId: TEST_LINE_ID },
  });
  console.log(`      ChatHistory หลังรอบแรก = ${historyAfterFirst} แถว`);

  // รอบสอง — id เดียวกัน + isRedelivery + retry key (จำลอง LINE ส่งซ้ำ)
  const s2 = await post(buildEvent(true), "retry-key-test-0001");
  await new Promise((r) => setTimeout(r, 8000));

  const historyAfterSecond = await prisma.chatHistory.count({
    where: { lineId: TEST_LINE_ID },
  });

  check("รอบสอง (retry): ตอบ 200 ตามปกติ", s2 === 200, `HTTP ${s2}`);
  check(
    "รอบสอง (retry): ChatHistory ไม่เพิ่ม = Gemini ไม่ถูกเรียกซ้ำ",
    historyAfterSecond === historyAfterFirst,
    `${historyAfterFirst} → ${historyAfterSecond} แถว`
  );

  const rows = await prisma.processedEvent.count({ where: { webhookEventId: EVENT_ID } });
  check("ProcessedEvent มีแถวเดียว ไม่ซ้ำ", rows === 1, `${rows} แถว`);

  await prisma.processedEvent.deleteMany({ where: { webhookEventId: EVENT_ID } });
  await prisma.chatHistory.deleteMany({ where: { lineId: TEST_LINE_ID } });
  await prisma.user.deleteMany({ where: { lineId: TEST_LINE_ID } });
  console.log("\nล้างข้อมูลทดสอบเรียบร้อย");
  await prisma.$disconnect();
}

main();
