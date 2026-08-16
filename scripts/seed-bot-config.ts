/**
 * ย้ายบุคลิกและความรู้ของน้องกรีนจาก config/botDefaults.ts ลงฐานข้อมูล
 * รันด้วย: npx tsx --env-file=.env scripts/seed-bot-config.ts
 *
 * รันซ้ำได้ปลอดภัย — ใช้ upsert ตาม topic ไม่สร้างซ้ำ
 * และ **ไม่ลบ** หัวข้อที่แอดมินเพิ่มเองทีหลัง
 */
import { prisma } from "../lib/prisma";
import {
  DEFAULT_PERSONA,
  DEFAULT_RULES,
  DEFAULT_SCOPE,
  DEFAULT_SCHOOL_INFO,
} from "../config/botDefaults";
import { PERSONA_ID } from "../services/botConfigService";

async function main() {
  const persona = await prisma.botPersona.upsert({
    where: { id: PERSONA_ID },
    update: {}, // มีอยู่แล้วไม่ทับ — กันเผลอรันซ้ำแล้วลบสิ่งที่แอดมินแก้ไว้
    create: {
      id: PERSONA_ID,
      persona: DEFAULT_PERSONA,
      scope: DEFAULT_SCOPE,
      rules: DEFAULT_RULES,
    },
  });
  console.log(`BotPersona: พร้อมแล้ว (อัปเดตล่าสุด ${persona.updatedAt.toISOString()})`);

  let created = 0;
  let skipped = 0;

  for (const [index, entry] of DEFAULT_SCHOOL_INFO.entries()) {
    const existing = await prisma.schoolInfo.findUnique({
      where: { topic: entry.topic },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.schoolInfo.create({
      data: {
        topic: entry.topic,
        content: entry.content,
        sortOrder: index,
        isActive: true,
      },
    });
    created++;
  }

  const total = await prisma.schoolInfo.count();
  console.log(`SchoolInfo: เพิ่มใหม่ ${created} หัวข้อ, มีอยู่แล้วข้าม ${skipped} หัวข้อ (รวมในระบบ ${total})`);

  await prisma.$disconnect();
}

main();
