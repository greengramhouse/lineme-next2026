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