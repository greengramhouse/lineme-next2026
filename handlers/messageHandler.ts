// src/handlers/messageHandler.ts
import { after } from "next/server";
import { webhook } from "@line/bot-sdk";
import { lineBlobClient, lineClient } from "@/config/line-config";
import { SENDER_GREEN, SENDER_PROGRAM, withSender } from "@/config/senders";
import { findMatchedReply } from "@/services/replyRuleService";
import { updateProfileInBackground } from "@/services/userService";
import {
  replyMessages,
  replyOrPush,
  pushMessages,
  splitForLine,
} from "@/services/replyService";
import { handleFlowMessage } from "@/services/documentFlowService";
import { REGISTER_KEYWORDS, startRegistration } from "@/services/accountLinkService";
import { buildRegisterInvite } from "@/services/registerFlex";

// 🌟 นำเข้า Gemini Service ที่เราเพิ่งสร้าง
import { generateGeminiReply } from "@/services/geminiService";
import { processTyphoonASR } from "@/services/typhoon";

/** ข้อความตอบกลับสำหรับชนิดข้อความที่ระบบยังไม่รองรับ */
const UNSUPPORTED_MESSAGE_REPLY: Record<string, string> = {
  image: "น้องกรีนยังดูรูปไม่เป็นเลยค่ะ 🥲 รบกวนพิมพ์อธิบายมาแทนได้ไหมคะ",
  video: "น้องกรีนยังดูวิดีโอไม่ได้ค่ะ 🥲 รบกวนพิมพ์หรือส่งเสียงมาแทนน้า",
  file: "น้องกรีนยังเปิดไฟล์ไม่ได้ค่ะ 🥲 รบกวนพิมพ์รายละเอียดมาแทนน้า",
  location: "ขอบคุณสำหรับตำแหน่งค่ะ 📍 แต่ตอนนี้น้องกรีนยังอ่านแผนที่ไม่เป็น รบกวนพิมพ์ชื่อสถานที่มาแทนน้า",
  sticker: "น่ารักจังเลยค่ะ 😆 พิมพ์มาคุยกับน้องกรีนได้เลยน้า",
};

const DEFAULT_UNSUPPORTED_REPLY =
  "ขออภัยค่ะ น้องกรีนรับได้แค่ข้อความกับเสียงน้า 🙏 รบกวนพิมพ์หรือส่งเสียงมาแทนได้ไหมคะ";

/** prefix สำหรับ log ให้สืบย้อนได้ว่าเป็น event ไหน */
const tag = (event: webhook.MessageEvent) =>
  `[MessageHandler ${event.webhookEventId ?? "unknown"}]`;

/**
 * แสดง loading animation แบบปลอดภัย
 *
 * showLoadingAnimation ใช้ได้เฉพาะแชท 1:1 เท่านั้น แต่ในกลุ่ม/ห้องแชท
 * event.source.userId ก็ยังมีค่า → ถ้าเช็คแค่ if (userId) จะหลุดไปยิงในกลุ่ม
 * → LINE ตอบ 400 → SDK throw → กลายเป็น 500 → LINE retry ซ้ำ ๆ
 *
 * จึงต้องเช็ค source.type === "user" ด้วย และต่อ .catch() กันไว้อีกชั้น
 */
async function showLoadingSafely(
  event: webhook.MessageEvent,
  loadingSeconds: number
) {
  if (event.source?.type !== "user") return;

  const userId = event.source.userId;
  if (!userId) return;

  await lineClient
    .showLoadingAnimation({ chatId: userId, loadingSeconds })
    .catch((error) =>
      console.error(`${tag(event)} showLoadingAnimation ล้มเหลว:`, error)
    );
}

export async function handleMessageEvent(event: webhook.MessageEvent) {
  if (!event.replyToken) return;

  const userId = event.source?.userId;
  if (userId) {
    // ใช้ after() ไม่ใช่ floating promise — งานที่ไม่มีใครถือ promise ไว้
    // มีโอกาสถูกฆ่ากลางทางตอน deploy บน serverless
    // (after() ซ้อนใน after() ได้ Next รองรับไว้แล้ว)
    after(() => updateProfileInBackground(userId));
  }

  if (event.message.type === "text") {
    await handleTextMessage(event, event.message.text.trim(), userId);
    return;
  }

  if (event.message.type === "audio") {
    await handleAudioMessage(event, event.message.id, userId);
    return;
  }

  // ชนิดที่ยังไม่รองรับ — เดิมเงียบสนิท ผู้ใช้ไม่รู้ว่าบอทได้รับหรือเปล่า
  const fallbackText =
    UNSUPPORTED_MESSAGE_REPLY[event.message.type] ?? DEFAULT_UNSUPPORTED_REPLY;

  console.log(`${tag(event)} ได้รับข้อความชนิด "${event.message.type}" ที่ยังไม่รองรับ`);

  await replyMessages(
    event.replyToken,
    withSender([{ type: "text", text: fallbackText }], SENDER_GREEN)
  );
}

async function handleTextMessage(
  event: webhook.MessageEvent,
  userText: string,
  userId: string | undefined
) {
  const replyToken = event.replyToken!;

  try {
    // ==========================================================
    // 0. ระบบร่างเอกสารต้องมาก่อนทุกอย่าง
    //
    // ถ้าครูกำลังกรอกข้อมูลอยู่ คำตอบอย่าง "วันที่ 5 มีนาคม" ต้องถูกเก็บเป็น
    // คำตอบของช่องนั้น ไม่ใช่หลุดไปตรงกับ keyword อื่นแล้วบอทตอบมั่ว
    // ==========================================================
    const flow = await handleFlowMessage(userId, userText);

    if (flow.prompt) {
      // กรอกครบและยืนยันแล้ว — ตอบรับก่อนแล้วค่อยให้ Gemini ร่าง
      await replyMessages(replyToken, flow.messages ?? []);
      await showLoadingSafely(event, 60);

      const draft = await generateGeminiReply(flow.prompt, userId);

      // reply token ใช้ไปกับข้อความ "กำลังร่าง..." แล้ว ตัวเอกสารจึงต้องส่งด้วย push
      await pushMessages(userId, splitForLine(draft, SENDER_GREEN));
      return;
    }

    if (flow.messages) {
      await replyMessages(replyToken, flow.messages);
      return;
    }

    // ==========================================================
    // 0.5 ลงทะเบียนสมาชิก — ต้องมาก่อน keyword จากฐานข้อมูล
    //
    // ตอบด้วย AutoReply ที่ฝัง URL ตายตัวไม่ได้ เพราะทุกครั้งที่กดต้องขอ
    // linkToken "ใบใหม่" จาก LINE (ใบเก่าอายุ 10 นาทีและใช้ได้ครั้งเดียว)
    // ==========================================================
    if (REGISTER_KEYWORDS.includes(userText)) {
      await handleRegisterRequest(event, userId);
      return;
    }

    // 1. นำข้อความไปเช็คในฐานข้อมูล
    const matchedReply = await findMatchedReply(userText.toLowerCase());

    // 2. ถ้าเจอคำตอบในฐานข้อมูล
    if (matchedReply) {
      if (matchedReply.showLoading) {
        await showLoadingSafely(event, 5);
      }

      // ตอบเร็วอยู่แล้ว จึงไม่ต้อง fallback เป็น push (push กินโควตา)
      await replyMessages(
        replyToken,
        withSender(matchedReply.messages, SENDER_PROGRAM)
      );
      return;
    }

    // ==========================================
    // 3. ถ้าไม่เจอคีย์เวิร์ด -> โยนให้ Gemini (น้องกรีน) จัดการ!
    // ==========================================
    await showLoadingSafely(event, 20);

    const aiText = await generateGeminiReply(userText, userId);

    // Gemini อาจยิง 2 รอบ (flash-lite → flash) จึงเสี่ยง reply token หมดอายุ → ใช้ replyOrPush
    await replyOrPush(
      replyToken,
      userId,
      withSender([{ type: "text", text: aiText }], SENDER_GREEN)
    );
  } catch (error) {
    // จุดเสี่ยงคือ findMatchedReply (Prisma) และ replyMessage
    // ถ้าพังแล้วปล่อยเงียบ ผู้ใช้จะไม่ได้รับอะไรกลับเลย
    console.error(`${tag(event)} text branch ล้มเหลว:`, error);
    await replyMessages(replyToken, [
      {
        type: "text",
        text: "ขออภัยค่ะ ระบบขัดข้องชั่วคราว รบกวนลองพิมพ์มาใหม่อีกครั้งน้า 😢",
      },
    ]);
  }
}

/**
 * ออกลิงก์ฟอร์มลงทะเบียนให้ผู้ใช้
 *
 * ตอบกลับด้วย reply ล้วน ๆ ทั้งเส้นทาง — ตัวบัตรสมาชิกจะถูกส่งทีหลังด้วย
 * replyToken ของ event accountLink จึงไม่มีจุดไหนกินโควตา push เลย
 */
async function handleRegisterRequest(
  event: webhook.MessageEvent,
  userId: string | undefined
) {
  const replyToken = event.replyToken!;

  // issueLinkToken ใช้กับผู้ใช้ในแชท 1:1 เท่านั้น — ในกลุ่ม source.userId ก็มีค่า
  // ถ้าไม่กันไว้จะยิงไปแล้วโดน LINE ตอบ error กลับมาเปล่า ๆ
  if (event.source?.type !== "user" || !userId) {
    await replyMessages(
      replyToken,
      withSender(
        [{ type: "text", text: "การลงทะเบียนต้องทำในแชทส่วนตัวกับบอทเท่านั้นค่ะ 🙏" }],
        SENDER_PROGRAM
      )
    );
    return;
  }

  try {
    const { url, expiresAt } = await startRegistration(userId);
    await replyMessages(replyToken, [buildRegisterInvite(url, expiresAt)]);
  } catch (error) {
    // สาเหตุที่เจอบ่อยคือลืมตั้ง APP_BASE_URL หรือ LINE ปฏิเสธ issueLinkToken
    console.error(`${tag(event)} ออกลิงก์ลงทะเบียนล้มเหลว:`, error);
    await replyMessages(
      replyToken,
      withSender(
        [
          {
            type: "text",
            text: "ขออภัยค่ะ ตอนนี้ระบบลงทะเบียนขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งน้า 😢",
          },
        ],
        SENDER_GREEN
      )
    );
  }
}

async function handleAudioMessage(
  event: webhook.MessageEvent,
  messageId: string,
  userId: string | undefined
) {
  const replyToken = event.replyToken!;

  // 🌟 1. โชว์ Loading รอไว้ก่อนเลย (เพราะสเตปดาวน์โหลด + ASR ใช้เวลา)
  await showLoadingSafely(event, 10);

  try {
    // 🌟 2. โหลดไฟล์เสียงจาก LINE (รองรับทั้ง Blob และ Stream)
    const audioBuffer = await downloadAudio(messageId);

    // 🌟 3. ส่งเข้า Typhoon ASR เพื่อแปลงเสียงพูดเป็นข้อความ Text
    const asr = await processTyphoonASR(audioBuffer);

    // เช็คด้วย discriminated union ไม่ใช่การหา substring ในข้อความ
    if (!asr.ok) {
      console.error(`${tag(event)} ASR ไม่สำเร็จ: ${asr.message}`);
      await replyOrPush(replyToken, userId, [
        { type: "text", text: asr.message },
      ]);
      return;
    }

    // นำข้อความเสียงที่ถอดได้มาตัดช่องว่างเตรียมเอาไปค้นหา
    const cleanUserVoiceText = asr.text.trim();

    // ==========================================================
    // 🌟 สเตปที่ 3.5: นำข้อความจากเสียงไปเช็ค Keyword ในฐานข้อมูลก่อน
    // ==========================================================
    const matchedReply = await findMatchedReply(cleanUserVoiceText.toLowerCase());

    // เจอกลุ่มคำตอบที่ตรงกับคีย์เวิร์ด -> สั่งให้น้องโปรแกรมตอบทันที!
    if (matchedReply) {
      // ใช้ replyOrPush เพราะกว่าจะมาถึงจุดนี้ผ่าน download + ASR มาแล้ว token อาจหมดอายุ
      await replyOrPush(
        replyToken,
        userId,
        withSender(matchedReply.messages, SENDER_PROGRAM)
      );
      return;
    }

    // ==========================================================
    // 🌟 4. ถ้าไม่เจอคีย์เวิร์ดในระบบ -> ค่อยส่งข้อความให้ Gemini (น้องกรีน) จัดการ
    // ==========================================================
    const geminiPrompt = `(นี่คือข้อความที่ถอดจากเสียงพูดของ User): ${cleanUserVoiceText}`;
    const aiText = await generateGeminiReply(geminiPrompt, userId);

    // path นี้ยาวที่สุด (download + ASR + Gemini) เสี่ยง token หมดอายุมากสุด
    await replyOrPush(
      replyToken,
      userId,
      withSender([{ type: "text", text: aiText }], SENDER_GREEN)
    );
  } catch (error) {
    console.error(`${tag(event)} audio branch ล้มเหลว:`, error);
    await replyOrPush(replyToken, userId, [
      {
        type: "text",
        text: "ขออภัยค่ะ ระบบฟังเสียงมีปัญหาชั่วคราว พิมพ์มาคุยแทนน้องกรีนก่อนน้า 😢",
      },
    ]);
  }
}

/** ดาวน์โหลดไฟล์เสียงจาก LINE — SDK คืนได้ทั้ง Blob และ Stream แล้วแต่ runtime */
async function downloadAudio(messageId: string): Promise<Buffer> {
  const audioContent = await lineBlobClient.getMessageContent(messageId);

  if (typeof (audioContent as any).arrayBuffer === "function") {
    const arrayBuf = await (audioContent as any).arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of audioContent as any) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
