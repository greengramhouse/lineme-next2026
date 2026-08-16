// 1. Import messagingApi เข้ามาแทน Message เฉยๆ
import { messagingApi } from "@line/bot-sdk"; 
import { prisma } from "@/lib/prisma";

// 2. ใช้ messagingApi.Message สำหรับ array ของ messages
interface ReplyPayload {
  showLoading?: boolean;
  messages: messagingApi.Message[]; // ใช้ตัวนี้ครับ! https://line.github.io/line-bot-sdk-nodejs/guide/migration.html
}

// กฎแบบ CONTAINS ต้องดึงมาทั้งตารางเพื่อวนเช็คในโค้ด
// ถ้าดึงใหม่ทุกข้อความ = query ตารางเต็มทุกครั้งที่มีคนพิมพ์อะไรมา
// cache ไว้ในหน่วยความจำแบบมี TTL สั้น ๆ พอ — แก้คีย์เวิร์ดแล้วรออย่างมาก 60 วิก็เห็นผล
const CONTAINS_CACHE_TTL_MS = 60_000;

type ContainsRule = { keyword: string; payload: unknown };

let containsCache: { rules: ContainsRule[]; expiresAt: number } | null = null;

/** ล้าง cache ทันที — เรียกจาก admin API หลังเพิ่ม/แก้/ลบคีย์เวิร์ด */
export function invalidateReplyRuleCache() {
  containsCache = null;
}

async function getContainsRules(): Promise<ContainsRule[]> {
  if (containsCache && containsCache.expiresAt > Date.now()) {
    return containsCache.rules;
  }

  const rules = await prisma.autoReply.findMany({
    where: {
      matchType: "CONTAINS",
      isActive: true,
    },
    select: { keyword: true, payload: true },
  });

  containsCache = { rules, expiresAt: Date.now() + CONTAINS_CACHE_TTL_MS };
  return rules;
}

export async function findMatchedReply(userText: string) {
  // 1. ค้นหาแบบ EXACT ก่อน (พิมพ์ตรงตัวเป๊ะๆ)
  // ตัวนี้ไม่ cache เพราะมี index บน keyword อยู่แล้ว query เร็วและตรงตัว
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
  const containsRules = await getContainsRules();

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