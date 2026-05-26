// src/handlers/messageHandler.ts
import { webhook } from "@line/bot-sdk";
import { lineClient } from "@/config/line-config";
import { findMatchedReply } from "@/services/replyRuleService";
import { updateProfileInBackground } from "@/services/userService";
import { replyMessages } from "@/services/replyService";

// 🌟 นำเข้า Gemini Service ที่เราเพิ่งสร้าง
import { generateGeminiReply } from "@/services/geminiService";

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
      if (matchedReply.showLoading && userId) {
        await lineClient.showLoadingAnimation({
          chatId: userId,
          loadingSeconds: 5,
        });
      }

      // 🌟 สร้างโปรไฟล์จำแลงที่ต้องการ (เช่น เปลี่ยนเป็นน้องกรีน หรือ ชื่อโรงเรียน)
      const customSender = {
        name: "น้องโปรแกรม 👦🏻", 
        iconUrl: "https://png.pngtree.com/png-clipart/20221226/ourmid/pngtree-little-girl-illustration-with-bangs-png-image_6497274.png"
      };

      // 🌟 ใช้ .map() เพื่อแกะกล่องข้อความเดิม แล้วยัด sender เข้าไปในทุกๆ ข้อความ
      const messagesWithSender = matchedReply.messages.map((msg: any) => {
        return {
          ...msg, // ก๊อปปี้ข้อมูลเดิมทั้งหมด (เช่น Flex, Text)
          sender: customSender // เติม sender เข้าไป
        };
      });

      // โยนข้อความที่ถูกอัปเกรดแล้ว ไปให้ฟังก์ชันตอบกลับ
      await replyMessages(event.replyToken, messagesWithSender);
      return; 
    }

// ==========================================
    // 3. ถ้าไม่เจอคีย์เวิร์ด -> โยนให้ Gemini (น้องกรีน) จัดการ!
    // ==========================================
    
    if (userId) {
      await lineClient.showLoadingAnimation({
        chatId: userId,
        loadingSeconds: 5,
      }).catch(console.error);
    }

    // เรียกใช้ Gemini
    const aiText = await generateGeminiReply(userText);
    
    // 🌟 สั่งให้ตอบกลับใน "ร่างของน้องกรีน"
    // รวบ replyToken และ messages ให้อยู่ในปีกกา {} ก้อนเดียวกัน
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: aiText,
          sender: {
            name: "น้องกรีน 👧🏻", // 👈 ปรับให้สั้นลงเพื่อป้องกัน Emoji กินโควต้าตัวอักษร
            iconUrl: "https://i.pinimg.com/236x/b2/6a/18/b26a1862d53bb75d5f104c2897365d9a.jpg"
          }
        }
      ]
    });
  }
}