// src/services/replyService.ts
import { lineClient } from "@/config/line-config";
import { HTTPFetchError, messagingApi } from "@line/bot-sdk";

/**
 * 1. ฟังก์ชันส่งข้อความแบบ Dynamic (Flex, Image, Video, Imagemap ได้หมด)
 */
export async function replyMessages(replyToken: string, messages: messagingApi.Message[]) {
  try {
    return await lineClient.replyMessage({
      replyToken,
      messages: messages,
    });
  } catch (error: unknown) {
    // reply token ใช้ได้ครั้งเดียวและมีอายุจำกัด — สาเหตุที่พบบ่อยที่สุดคือหมดอายุ
    // จึงต้อง log ให้เห็นว่าเป็น token ไหน ไม่ใช่คืน null เงียบ ๆ
    console.error(
      `[ReplyService] การส่งข้อความล้มเหลว (replyToken: ${replyToken.slice(0, 8)}...):`
    );

    if (error instanceof HTTPFetchError) {
      console.error(`Status: ${error.status} | Body:`, error.body);
    } else {
      console.error(error);
    }

    return null;
  }
}

/**
 * ส่ง push message ตรง ๆ (ไม่ผ่าน reply token)
 *
 * ใช้กับงานที่ใช้ reply token ไปแล้ว เช่น ตอบ "กำลังร่าง..." ไปก่อน
 * แล้วค่อยส่งตัวเอกสารตามมาทีหลัง
 */
export async function pushMessages(
  userId: string | null | undefined,
  messages: messagingApi.Message[]
) {
  if (!userId) {
    console.error("[ReplyService] ไม่มี userId จึง push ไม่ได้");
    return null;
  }
  if (messages.length === 0) return null;

  try {
    // LINE รับได้สูงสุด 5 ข้อความต่อ 1 request
    for (let i = 0; i < messages.length; i += 5) {
      await lineClient.pushMessage({ to: userId, messages: messages.slice(i, i + 5) });
    }
    return true;
  } catch (error: unknown) {
    console.error("[ReplyService] push ล้มเหลว:");
    if (error instanceof HTTPFetchError) {
      console.error(`Status: ${error.status} | Body:`, error.body);
    } else {
      console.error(error);
    }
    return null;
  }
}

/** LINE จำกัดข้อความละ 5,000 ตัวอักษร เผื่อไว้หน่อยกันพลาดตอนนับ emoji */
const LINE_TEXT_LIMIT = 4800;

/**
 * หั่นข้อความยาวเป็นหลายข้อความ — หนังสือราชการที่ Gemini ร่างมามักเกิน 5,000
 * ถ้าส่งทั้งก้อน LINE จะตอบ 400 แล้วครูไม่ได้อะไรเลย
 *
 * พยายามตัดตรงย่อหน้าหรือบรรทัดก่อน เพื่อไม่ให้ประโยคขาดกลางคัน
 */
export function splitForLine(
  text: string,
  sender?: messagingApi.Sender
): messagingApi.Message[] {
  const chunks: string[] = [];
  let rest = text.trim();

  while (rest.length > LINE_TEXT_LIMIT) {
    const window = rest.slice(0, LINE_TEXT_LIMIT);
    // หาจุดตัดที่สวยที่สุด: ย่อหน้า > ขึ้นบรรทัดใหม่ > ช่องว่าง
    const cut =
      window.lastIndexOf("\n\n") > LINE_TEXT_LIMIT * 0.5
        ? window.lastIndexOf("\n\n")
        : window.lastIndexOf("\n") > LINE_TEXT_LIMIT * 0.5
          ? window.lastIndexOf("\n")
          : window.lastIndexOf(" ") > LINE_TEXT_LIMIT * 0.5
            ? window.lastIndexOf(" ")
            : LINE_TEXT_LIMIT;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest) chunks.push(rest);
  if (chunks.length === 0) chunks.push("(ไม่มีเนื้อหา)");

  return chunks.map((chunk, i) => ({
    type: "text" as const,
    // บอกลำดับเมื่อถูกหั่น ครูจะได้รู้ว่ายังมีต่อ
    text: chunks.length > 1 ? `(${i + 1}/${chunks.length})\n${chunk}` : chunk,
    ...(sender ? { sender } : {}),
  }));
}

/**
 * ตอบด้วย reply token ก่อน ถ้าล้มเหลวค่อย fallback เป็น push
 *
 * ใช้กับ path ที่ช้าจนเสี่ยง token หมดอายุเท่านั้น (audio ASR, Gemini)
 * ไม่ใช้กับ path ที่ตอบเร็วอยู่แล้ว เพราะ push กินโควตาข้อความและ LINE คิดเงินตามจำนวนที่ส่ง
 */
export async function replyOrPush(
  replyToken: string,
  userId: string | null | undefined,
  messages: messagingApi.Message[]
) {
  const result = await replyMessages(replyToken, messages);
  if (result !== null) return result;

  if (!userId) {
    console.error("[ReplyService] reply ล้มเหลวและไม่มี userId จึง push ต่อไม่ได้");
    return null;
  }

  console.warn(`[ReplyService] reply ล้มเหลว → fallback เป็น push ไปที่ ${userId}`);

  try {
    return await lineClient.pushMessage({ to: userId, messages });
  } catch (error: unknown) {
    console.error("[ReplyService] push fallback ล้มเหลวด้วย:");

    if (error instanceof HTTPFetchError) {
      console.error(`Status: ${error.status} | Body:`, error.body);
    } else {
      console.error(error);
    }

    return null;
  }
}

/**
 * 2. ฟังก์ชันส่งข้อความธรรมดา (ยังเก็บไว้ใช้สำหรับข้อความง่ายๆ)
 */
export async function replyText(replyToken: string, text: string) {
  // เปลี่ยนมาเรียกใช้ฟังก์ชันหลักแทน เพื่อรวม Error Handling ไว้ที่เดียว
  return await replyMessages(replyToken, [{ type: "text", text }]);
}