// src/handlers/messageHandler.ts
import { webhook } from "@line/bot-sdk";
import { lineClient } from "@/config/line-config";
import { findMatchedReply } from "@/services/replyRuleService";
import { updateProfileInBackground } from "@/services/userService";
import { replyMessages, replyText } from "@/services/replyService";

export async function handleMessageEvent(event: webhook.MessageEvent) {
  if (!event.replyToken) return;
  
  const userId = event.source?.userId;
  if (userId) {
    updateProfileInBackground(userId).catch(console.error);
  }

  if (event.message.type === "text") {
    const userText = event.message.text.trim();

    // 1. นำข้อความไปเช็คในฐานข้อมูล
    const matchedReply = await findMatchedReply(userText.toLowerCase());

    // 2. ถ้าเจอคำตอบในฐานข้อมูล
    if (matchedReply) {
      // 2.1 แสดง Loading ถ้าระบุไว้ใน Payload
      if (matchedReply.showLoading && userId) {
        await lineClient.showLoadingAnimation({
          chatId: userId,
          loadingSeconds: 5,
        });
      }

      // 2.2 ส่งข้อความกลับไป (โยน array ของ messages กลับไปได้เลย)
// 🌟 ใช้ Service ตอบกลับแบบ Dynamic โยน messages เข้าไปได้เลย
      await replyMessages(event.replyToken, matchedReply.messages);
      return; // จบการทำงาน
    }

   // ถ้าไม่เจอคำตอบ (ใช้ Text ธรรมดาตอบกลับ)
    await replyText(event.replyToken, "ขออภัยครับ บอทยังไม่เข้าใจคำสั่งนี้");
  }
}

