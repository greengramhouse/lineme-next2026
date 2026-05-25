// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ดึง API Key จาก .env
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function generateGeminiReply(userText: string): Promise<string> {
  try {
    // แนะนำรุ่น 1.5-flash เพราะทำงานเร็วมาก เหมาะกับแชทบอทที่สุดครับ
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-lite" });
    
    // โยนข้อความของผู้ใช้ไปให้ AI คิด
    const result = await model.generateContent(userText);
    const responseText = result.response.text();
    
    return responseText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // กรณีเน็ตหลุด หรือ API มีปัญหา ให้ตอบกลับแบบปลอดภัยไว้ก่อน
    return "ขออภัยครับ ตอนนี้สมองกลของผมกำลังมึนงงเล็กน้อย รบกวนพิมพ์ใหม่อีกครั้งนะครับ 😅";
  }
}