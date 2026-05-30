// src/handlers/messageHandler.ts
import { webhook } from "@line/bot-sdk";
import { lineBlobClient, lineClient } from "@/config/line-config";
import { findMatchedReply } from "@/services/replyRuleService";
import { updateProfileInBackground } from "@/services/userService";
import { replyMessages } from "@/services/replyService";

// 🌟 นำเข้า Gemini Service ที่เราเพิ่งสร้าง
import { generateGeminiReply } from "@/services/geminiService";
import { processTyphoonASR } from "@/services/typhoon";

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

  if (event.message.type === "audio") {
    const messageId = event.message.id;

    // 🌟 1. โชว์ Loading ก่อนเลย (สำคัญมาก!)
    // เพราะการแปลงเสียง + ให้ AI คิดคำตอบ อาจจะใช้เวลาเกือบ 5-10 วินาที
    if (userId) {
      await lineClient.showLoadingAnimation({
        chatId: userId,
        loadingSeconds: 10, // ตั้งเผื่อไว้ 10 วินาทีเลยครับ
      }).catch(console.error);
    }

    try {
// สเตปที่ 2: โหลดไฟล์เสียงจาก LINE
      const audioContent = await lineBlobClient.getMessageContent(messageId);
      
      // 🌟 ท่าไม้ตายครอบจักรวาล: แปลงข้อมูลเป็น Buffer ไม่ว่ามันจะมาในรูปแบบไหน
      let audioBuffer: Buffer;

      if (typeof (audioContent as any).arrayBuffer === "function") {
        // กรณีที่ 1: ระบบส่งมาเป็น Blob มาตรฐาน
        const arrayBuf = await (audioContent as any).arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
      } else {
        // กรณีที่ 2: ระบบส่งมาเป็น Stream (Next.js มักจะเป็นตัวนี้)
        const chunks: any[] = [];
        for await (const chunk of (audioContent as any)) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        audioBuffer = Buffer.concat(chunks);
      }

      // 🌟 3. ส่งเข้า Typhoon ASR เพื่อถอดเสียงเป็นข้อความ
      const transcribedText = await processTyphoonASR(audioBuffer);

      // เช็คว่า Typhoon พังไหม ถ้าพังให้ตอบกลับไปตรงๆ
      if (transcribedText.includes("ไม่สามารถถอดข้อความ") || transcribedText.includes("ข้อผิดพลาด")) {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: transcribedText }]
        });
        return; // จบการทำงาน ไม่ต้องส่งให้ Gemini
      }

      // 🌟 4. โยนข้อความที่ถอดได้ ให้ Gemini ตอบ!
      // เคล็ดลับ: แอบเติมวงเล็บเพื่อให้ Gemini รู้ว่านี่คือเสียงที่พิมพ์มา เผื่อประโยคอาจจะแปลกๆ ไปบ้าง
      const geminiPrompt = `(นี่คือข้อความที่ถอดจากเสียงพูดของ User): ${transcribedText}`;
      const aiText = await generateGeminiReply(geminiPrompt);

      // 🌟 5. ตอบกลับด้วยร่างน้องกรีน
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: aiText, // ใช้ข้อความที่ Gemini คิดให้
            sender: {
              name: "น้องกรีน 👧🏻", 
              iconUrl: "https://i.pinimg.com/236x/b2/6a/18/b26a1862d53bb75d5f104c2897365d9a.jpg"
            }
          }
        ]
      });

    } catch (error) {
      console.error("Audio Webhook Error:", error);
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "ขออภัยค่ะ ระบบฟังเสียงมีปัญหาชั่วคราว พิมพ์มาคุยแทนน้องกรีนก่อนน้า 😢" }]
      });
    }
  }
}