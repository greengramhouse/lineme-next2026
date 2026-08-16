/**
 * ทดสอบ M3 — cache ของกฎ CONTAINS
 * รันด้วย: npx tsx --env-file=.env scripts/phase4-cache-test.ts
 * (ไม่ต้องเปิด dev server เพราะเรียก service ตรง ๆ)
 */
import { prisma } from "../lib/prisma";
import {
  findMatchedReply,
  invalidateReplyRuleCache,
} from "../services/replyRuleService";

const KEYWORD = "phase4cachetest";
const check = (name: string, ok: boolean, detail = "") =>
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  await prisma.autoReply.deleteMany({ where: { keyword: KEYWORD } });
  await prisma.autoReply.create({
    data: {
      keyword: KEYWORD,
      matchType: "CONTAINS",
      isActive: true,
      payload: { messages: [{ type: "text", text: "hit" }] },
    },
  });

  // ครั้งแรก: cache ว่าง → ต้องอ่าน DB แล้วเจอ
  const first = await findMatchedReply(`ข้อความยาว ๆ ที่มี ${KEYWORD} ซ่อนอยู่`);
  check("อ่านครั้งแรกเจอกฎ CONTAINS", first !== null);

  // ลบออกจาก DB ตรง ๆ โดยไม่เรียก invalidate
  await prisma.autoReply.deleteMany({ where: { keyword: KEYWORD } });

  // ถ้ายังเจออยู่ = แปลว่าอ่านจาก cache จริง (ไม่ได้ยิง DB ซ้ำ)
  const cached = await findMatchedReply(`ข้อความยาว ๆ ที่มี ${KEYWORD} ซ่อนอยู่`);
  check("ลบจาก DB แล้วยังเจอ = อ่านจาก cache จริง ไม่ได้ยิง DB ซ้ำ", cached !== null);

  // เรียก invalidate แล้วต้องหายไป
  invalidateReplyRuleCache();
  const afterInvalidate = await findMatchedReply(
    `ข้อความยาว ๆ ที่มี ${KEYWORD} ซ่อนอยู่`
  );
  check("หลัง invalidateReplyRuleCache() → ไม่เจอแล้ว", afterInvalidate === null);

  await prisma.autoReply.deleteMany({ where: { keyword: KEYWORD } });
  await prisma.$disconnect();
}

main();
