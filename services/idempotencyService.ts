// src/services/idempotencyService.ts
import { prisma } from "@/lib/prisma";

// LINE retry ภายในกรอบเวลาสั้น ๆ เก็บไว้ 3 วันเหลือเฟือ
const RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
// ล้างแถวเก่าอย่างมากชั่วโมงละครั้งต่อ 1 instance
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

let lastCleanupAt = 0;

/**
 * จองสิทธิ์ประมวลผล event นี้
 *
 * @returns `true` = ยังไม่เคยเห็น event นี้ ให้ทำงานต่อได้
 *          `false` = เคยประมวลผลไปแล้ว ต้องข้าม
 *
 * ใช้ createMany + skipDuplicates เพื่อให้เป็น atomic operation เดียว
 * ถ้าใช้ findUnique แล้วค่อย create จะมีช่องว่างให้ event ที่มาพร้อมกันแทรกได้
 *
 * ⚠️ ออกแบบให้ fail-open: ถ้า DB ล่ม จะคืน true (ยอมให้ทำซ้ำ)
 * เพราะการที่ผู้ใช้ได้คำตอบซ้ำ ยังดีกว่าบอทเงียบไปเฉย ๆ
 */
export async function claimEvent(webhookEventId: string): Promise<boolean> {
  if (!webhookEventId) {
    // ไม่มี id ให้ dedup ก็ปล่อยผ่าน ดีกว่าทิ้ง event
    return true;
  }

  try {
    const result = await prisma.processedEvent.createMany({
      data: { webhookEventId },
      skipDuplicates: true,
    });

    return result.count > 0;
  } catch (error) {
    console.error(
      `[Idempotency] จอง event ${webhookEventId} ไม่สำเร็จ ปล่อยให้ทำงานต่อ:`,
      error
    );
    return true;
  }
}

/** ล้างแถวที่เก่ากว่า RETENTION_MS — เรียกได้บ่อยแค่ไหนก็ได้ มี throttle ในตัว */
export async function cleanupProcessedEvents() {
  if (Date.now() - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = Date.now();

  try {
    const { count } = await prisma.processedEvent.deleteMany({
      where: { processedAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });

    if (count > 0) {
      console.log(`[Idempotency] ล้าง ProcessedEvent เก่าไป ${count} แถว`);
    }
  } catch (error) {
    console.error("[Idempotency] ล้างแถวเก่าล้มเหลว:", error);
  }
}
