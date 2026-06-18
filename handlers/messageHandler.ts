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
        loadingSeconds: 20,
      }).catch(console.error);
    }

    // เรียกใช้ Gemini
    const aiText = await generateGeminiReply(userText, userId);

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

    // 🌟 1. โชว์ Loading รอไว้ก่อนเลย (เพราะสเตปดาวน์โหลด + ASR ใช้เวลา)
    if (userId) {
      await lineClient.showLoadingAnimation({
        chatId: userId,
        loadingSeconds: 10,
      }).catch(console.error);
    }

    try {
      // 🌟 2. โหลดไฟล์เสียงจาก LINE (รองรับทั้ง Blob และ Stream)
      const audioContent = await lineBlobClient.getMessageContent(messageId);

      let audioBuffer: Buffer;
      if (typeof (audioContent as any).arrayBuffer === "function") {
        const arrayBuf = await (audioContent as any).arrayBuffer();
        audioBuffer = Buffer.from(arrayBuf);
      } else {
        const chunks: any[] = [];
        for await (const chunk of (audioContent as any)) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        audioBuffer = Buffer.concat(chunks);
      }

      // 🌟 3. ส่งเข้า Typhoon ASR เพื่อแปลงเสียงพูดเป็นข้อความ Text
      const transcribedText = await processTyphoonASR(audioBuffer);

      // เช็คว่า Typhoon พังหรือไม่ ถ้าพังให้แจ้งเตือนและหยุดทำงาน
      if (transcribedText.includes("ไม่สามารถถอดข้อความ") || transcribedText.includes("ข้อผิดพลาด")) {
        await lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: transcribedText }]
        });
        return;
      }

      // นำข้อความเสียงที่ถอดได้มาตัดช่องว่างเตรียมเอาไปค้นหา
      const cleanUserVoiceText = transcribedText.trim();

      // ==========================================================
      // 🌟 สเตปที่ 3.5: นำข้อความจากเสียงไปเช็ค Keyword ในฐานข้อมูลก่อน
      // ==========================================================
      const matchedReply = await findMatchedReply(cleanUserVoiceText.toLowerCase());

      // เจอกลุ่มคำตอบที่ตรงกับคีย์เวิร์ด -> สั่งให้น้องโปรแกรมตอบทันที!
      if (matchedReply) {
        // สร้างโปรไฟล์จำแลงของน้องโปรแกรม
        const customSender = {
          name: "น้องโปรแกรม 👦🏻",
          iconUrl: "https://png.pngtree.com/png-clipart/20221226/ourmid/pngtree-little-girl-illustration-with-bangs-png-image_6497274.png"
        };

        // ยัดสติ๊กเกอร์โปรไฟล์เข้าข้อความในคีย์เวิร์ดทั้งหมด
        const messagesWithSender = matchedReply.messages.map((msg: any) => {
          return {
            ...msg,
            sender: customSender
          };
        });

        // ส่งคำตอบจากระบบคีย์เวิร์ดกลับไป แล้วจบฟังก์ชันเลย
        await replyMessages(event.replyToken, messagesWithSender);
        return;
      }

      // ==========================================================
      // 🌟 4. ถ้าไม่เจอคีย์เวิร์ดในระบบ -> ค่อยส่งข้อความให้ Gemini (น้องกรีน) จัดการ
      // ==========================================================
      const geminiPrompt = `(นี่คือข้อความที่ถอดจากเสียงพูดของ User): ${cleanUserVoiceText}`;
      const aiText = await generateGeminiReply(geminiPrompt, userId);

      // ตอบกลับในร่างน้องกรีน
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: aiText,
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