// 1. Import messagingApi เข้ามาแทน Message เฉยๆ
import { messagingApi } from "@line/bot-sdk"; 
import { prisma } from "@/lib/prisma";

// 2. ใช้ messagingApi.Message สำหรับ array ของ messages
interface ReplyPayload {
  showLoading?: boolean;
  messages: messagingApi.Message[]; // ใช้ตัวนี้ครับ! https://line.github.io/line-bot-sdk-nodejs/guide/migration.html
}

export async function findMatchedReply(userText: string) {
  // 1. ค้นหาแบบ EXACT ก่อน (พิมพ์ตรงตัวเป๊ะๆ)
  const exactMatch = await prisma.autoReply.findFirst({
    where: {
      keyword: userText,
      matchType: "EXACT",
      isActive: true,
    },
  });

  if (exactMatch) {
    // Prisma จะคืนค่า Json เป็น object ให้เลย แค่ต้องครอบ Type ให้มัน
    return exactMatch.payload as unknown as ReplyPayload;
  }

  // 2. ถ้าไม่เจอแบบ EXACT ให้ดึงแบบ CONTAINS มาตรวจ
  // หมายเหตุ: การตรวจ Contains ต้องดึงจาก DB มาเช็คในโค้ด เพราะ user พิมพ์มายาวๆ แต่ DB เก็บคำสั้นๆ
  const containsRules = await prisma.autoReply.findMany({
    where: {
      matchType: "CONTAINS",
      isActive: true,
    },
  });

  // วนลูปหาว่าข้อความของผู้ใช้ มี Keyword ซ่อนอยู่ไหม
  const matchedRule = containsRules.find((rule) =>
    userText.includes(rule.keyword)
  );

  if (matchedRule) {
    return matchedRule.payload as unknown as ReplyPayload;
  }

  // 3. ถ้าไม่ตรงกับกติกาไหนเลย
  return null;
}