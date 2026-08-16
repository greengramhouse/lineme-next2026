// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/services/botConfigService";

// ดึง API Key จาก .env
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateGeminiReply(userText: string, userId?: string): Promise<string> {
  try {
    // 🌟 1. ประกอบ System Prompt (บุคลิก + ความรู้ของน้องกรีน) จากฐานข้อมูล
    // เดิม prompt ทั้งก้อน hardcode อยู่ตรงนี้ เวลาโรงเรียนเปลี่ยนเบอร์โทรหรือเวลาเรียน
    // ต้องแก้โค้ดแล้ว deploy ใหม่ — ตอนนี้แก้จากหน้า /dashboard/bot ได้เลย
    // ถ้า DB ล่มหรือยังไม่ได้ seed จะถอยไปใช้ค่าใน config/botDefaults.ts อัตโนมัติ
    const systemPrompt = await buildSystemPrompt();

    let history: any[] = [];
    if (userId) {
      // 2.1 ลบประวัติแชทที่เก่าเกิน 30 นาที (Auto-Cleanup)
      const THIRTY_MINUTES = 30 * 60 * 1000;
      const thirtyMinsAgo = new Date(Date.now() - THIRTY_MINUTES);

      await prisma.chatHistory.deleteMany({
        where: {
          lineId: userId,
          createdAt: {
            lt: thirtyMinsAgo,
          },
        },
      });

      // 2.2 ดึงประวัติที่เหลือมาแปลงเป็นรูปแบบที่ Gemini เข้าใจ
      const chatRecords = await prisma.chatHistory.findMany({
        where: { lineId: userId },
        orderBy: { createdAt: "asc" },
      });

      history = chatRecords.map((record) => ({
        role: record.role,
        parts: [{ text: record.message }],
      }));
    }

    let responseText = "";

    try {
      // 🌟 2. ลองเรียกใช้รุ่น Lite (gemini-2.5-flash-lite) ก่อน
      const modelLite = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: systemPrompt,
      });
      const chatLite = modelLite.startChat({ history });
      const resultLite = await chatLite.sendMessage(userText);
      responseText = resultLite.response.text();

    } catch (liteError: any) {
      console.warn("gemini-2.5-flash-lite failed (possibly 503), falling back to gemini-2.5-flash. Error:", liteError.message);
      
      // 🌟 3. ถ้า Lite มีปัญหาคิวเต็ม (503) หรือพัง สลับไปใช้รุ่นธรรมดาแทน
      const modelFlash = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });
      const chatFlash = modelFlash.startChat({ history });
      const resultFlash = await chatFlash.sendMessage(userText);
      responseText = resultFlash.response.text();
    }

    // 🌟 5. บันทึกคำถามและคำตอบล่าสุดลง Database
    if (userId) {
      await prisma.chatHistory.createMany({
        data: [
          { lineId: userId, role: "user", message: userText },
          { lineId: userId, role: "model", message: responseText },
        ],
      });
    }

    return responseText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // 🌟 ปรับประโยค Error ให้เข้ากับบุคลิกน้องกรีนด้วย
    return "แงงง ระบบของน้องกรีนขัดข้องนิดหน่อยค่ะ 😭 รบกวนพิมพ์ถามหนูใหม่อีกครั้งนะคะ หรือลองพูดคุยกับน้องโปรแกรมก่อนก็ได้ค่ะ 🙏✨";
  }
}
