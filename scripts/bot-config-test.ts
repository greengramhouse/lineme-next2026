/**
 * ทดสอบระบบตั้งค่าน้องกรีน
 * รันด้วย: npx tsx --env-file=.env scripts/bot-config-test.ts [port]
 * ต้องเปิด dev server ก่อน
 */
import { prisma } from "../lib/prisma";
import { buildSystemPrompt, invalidateBotConfigCache } from "../services/botConfigService";

const BASE = `http://localhost:${process.argv[2] ?? 3000}`;
const results: boolean[] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push(ok);
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  // ---- 1. เส้น API ใหม่ต้องถูกป้องกัน ----
  console.log("=== auth ของเส้นใหม่ ===");
  for (const [path, method] of [
    ["/api/bot/persona", "PUT"],
    ["/api/bot/school-info", "POST"],
    ["/api/bot/school-info/abc", "PUT"],
    ["/api/bot/school-info/abc", "DELETE"],
  ] as const) {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "x", content: "y" }),
    });
    check(`${method} ${path} → 401`, res.status === 401, `HTTP ${res.status}`);
  }

  // ---- 2. prompt ประกอบจาก DB จริง ----
  console.log("\n=== การประกอบ prompt ===");
  invalidateBotConfigCache();
  const before = await buildSystemPrompt();
  check("prompt มีความรู้จาก DB", before.includes("065-3349421"), `${before.length} ตัวอักษร`);
  check("prompt มีบุคลิก", before.includes("น้องกรีน"));
  check("prompt มีข้อห้าม", before.includes("ห้ามสร้างข้อมูลเท็จ"));
  check("prompt ไม่มีเศษ backtick ปนมา", !before.includes("`;"));

  // ---- 3. แก้ข้อมูลใน DB แล้ว prompt ต้องเปลี่ยนตาม ----
  const target = await prisma.schoolInfo.findUnique({ where: { topic: "ค่าเล่าเรียน" } });
  if (!target) {
    check("หาหัวข้อทดสอบเจอ", false, "ไม่พบหัวข้อ 'ค่าเล่าเรียน'");
    await prisma.$disconnect();
    return;
  }

  const original = target.content;
  const marker = "ทดสอบแก้จาก dashboard 12345";

  await prisma.schoolInfo.update({ where: { id: target.id }, data: { content: marker } });
  invalidateBotConfigCache();
  const after = await buildSystemPrompt();
  check("แก้เนื้อหาใน DB → prompt เปลี่ยนตาม", after.includes(marker));
  check("เนื้อหาเดิมหายไปจาก prompt", !after.includes(original));

  // ---- 4. ปิดหัวข้อแล้วต้องหลุดออกจาก prompt ----
  await prisma.schoolInfo.update({ where: { id: target.id }, data: { isActive: false } });
  invalidateBotConfigCache();
  const afterDisable = await buildSystemPrompt();
  check("ปิดหัวข้อ → หลุดออกจาก prompt", !afterDisable.includes(marker));

  // ---- 5. คืนค่าเดิม ----
  await prisma.schoolInfo.update({
    where: { id: target.id },
    data: { content: original, isActive: true },
  });
  invalidateBotConfigCache();
  const restored = await buildSystemPrompt();
  check("คืนค่าเดิมแล้ว prompt กลับมาเหมือนเดิม", restored === before);

  // ---- 6. cache ทำงานจริง ----
  console.log("\n=== cache ===");
  const cached1 = await buildSystemPrompt();
  await prisma.schoolInfo.update({ where: { id: target.id }, data: { content: "ค่าที่ไม่ควรเห็น" } });
  const cached2 = await buildSystemPrompt();
  check("ไม่ invalidate → ยังได้ค่าจาก cache", cached1 === cached2);

  invalidateBotConfigCache();
  const fresh = await buildSystemPrompt();
  check("invalidate แล้ว → เห็นค่าใหม่ทันที", fresh.includes("ค่าที่ไม่ควรเห็น"));

  await prisma.schoolInfo.update({ where: { id: target.id }, data: { content: original } });
  invalidateBotConfigCache();

  console.log(`\nสรุป: ${results.filter(Boolean).length}/${results.length} ผ่าน`);
  await prisma.$disconnect();
}

main();
