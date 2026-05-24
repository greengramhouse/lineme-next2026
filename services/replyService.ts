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
    console.error("[ReplyService] การส่งข้อความล้มเหลว:");
    
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