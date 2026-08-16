// services/botConfigService.ts
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PERSONA,
  DEFAULT_RULES,
  DEFAULT_SCOPE,
  DEFAULT_SCHOOL_INFO,
} from "@/config/botDefaults";

export const PERSONA_ID = "singleton";

// prompt ถูกประกอบทุกครั้งที่มีคนคุยกับน้องกรีน จึง cache ไว้
// TTL สั้น ๆ พอ — แก้จาก dashboard แล้วรออย่างมาก 60 วิก็เห็นผล
// (และ API ของ dashboard เรียก invalidate ให้อยู่แล้ว จึงเห็นผลทันทีในทางปฏิบัติ)
const CACHE_TTL_MS = 60_000;

let cache: { prompt: string; expiresAt: number } | null = null;

/** ล้าง cache ทันที — เรียกจาก API หลังแก้ persona หรือข้อมูลโรงเรียน */
export function invalidateBotConfigCache() {
  cache = null;
}

export interface BotPersonaData {
  persona: string;
  scope: string;
  rules: string;
}

/** อ่าน persona จาก DB ถ้ายังไม่มีแถวให้คืนค่าเริ่มต้น */
export async function getBotPersona(): Promise<BotPersonaData> {
  try {
    const row = await prisma.botPersona.findUnique({ where: { id: PERSONA_ID } });
    if (row) {
      return { persona: row.persona, scope: row.scope, rules: row.rules };
    }
  } catch (error) {
    console.error("[BotConfig] อ่าน BotPersona ไม่สำเร็จ ใช้ค่าเริ่มต้นแทน:", error);
  }

  return {
    persona: DEFAULT_PERSONA,
    scope: DEFAULT_SCOPE,
    rules: DEFAULT_RULES,
  };
}

/**
 * ประกอบ system prompt ทั้งก้อนจากฐานข้อมูล
 *
 * ⚠️ ออกแบบให้ **ไม่มีทางคืน prompt เปล่า** — ถ้า DB ล่มหรือยังไม่ได้ seed
 * จะถอยไปใช้ค่าใน config/botDefaults.ts แทน
 * ถ้าปล่อยให้คืนค่าว่าง น้องกรีนจะกลายเป็นบอทไม่มีความรู้และตอบมั่วทันที
 */
export async function buildSystemPrompt(): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.prompt;
  }

  const { persona, scope, rules } = await getBotPersona();

  let entries: { topic: string; content: string }[] = DEFAULT_SCHOOL_INFO;
  try {
    const rows = await prisma.schoolInfo.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { topic: true, content: true },
    });

    // ว่างเปล่าแปลว่ายังไม่ได้ seed หรือแอดมินปิดหมด — ถอยไปใช้ค่าเริ่มต้น
    if (rows.length > 0) entries = rows;
    else console.warn("[BotConfig] ไม่มี SchoolInfo ที่เปิดใช้งาน ใช้ค่าเริ่มต้นแทน");
  } catch (error) {
    console.error("[BotConfig] อ่าน SchoolInfo ไม่สำเร็จ ใช้ค่าเริ่มต้นแทน:", error);
  }

  // ใช้ TAB คั่นหัวข้อกับเนื้อหาแบบเดียวกับ prompt เดิม เพื่อไม่ให้พฤติกรรมของโมเดลเปลี่ยน
  const knowledgeBase = entries
    .map((e) => `- ${e.topic}\t${e.content}`)
    .join("\n");

  const prompt = [
    persona,
    "",
    "====================================",
    "ข้อมูลพื้นฐานของโรงเรียน (Knowledge Base) ที่น้องกรีนต้องใช้ตอบคำถาม:",
    knowledgeBase,
    "====================================",
    "",
    scope,
    "",
    rules,
  ].join("\n");

  cache = { prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}
