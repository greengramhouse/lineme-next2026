"use server";

import { prisma } from "@/lib/prisma";
import { verifyLineIdToken } from "@/lib/lineIdToken";

/**
 * บันทึกชื่อผู้ใช้จากหน้า LIFF
 *
 * ⚠️ ไม่รับ `lineId` จาก client อีกต่อไป
 *
 * เดิม signature เป็น saveUserNameAction(lineId, userName, ...) ซึ่งแปลว่า
 * ใครก็ยิง action นี้พร้อม lineId ของคนอื่นเพื่อเขียนทับข้อมูลได้
 * (server action เป็น endpoint สาธารณะ ไม่ต่างจาก API route)
 *
 * ตอนนี้รับ ID token แทน แล้วให้ LINE เป็นคนบอกว่าคนนี้คือใคร
 * ปลอมไม่ได้เพราะไม่มีช่องให้ส่ง lineId เข้ามาแล้ว
 *
 * displayName / pictureUrl / email ก็เอาจาก token ไม่เอาจาก client เช่นกัน
 */
export async function saveUserNameAction(idToken: string, userName: string) {
  if (!idToken) {
    return { success: false, error: "ไม่พบข้อมูลยืนยันตัวตน กรุณาเปิดหน้านี้ผ่านแอป LINE" };
  }

  if (!userName || userName.trim().length <= 3) {
    return { success: false, error: "กรุณากรอกชื่อ-นามสกุลให้มากกว่า 3 ตัวอักษร" };
  }

  const verified = await verifyLineIdToken(idToken);
  if (!verified) {
    return {
      success: false,
      error: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดหน้านี้ใหม่อีกครั้ง",
    };
  }

  const trimmedName = userName.trim();

  try {
    const user = await prisma.user.upsert({
      where: { lineId: verified.lineId },
      update: {
        userName: trimmedName,
        ...(verified.email && { email: verified.email }),
        ...(verified.displayName && { displayName: verified.displayName }),
        ...(verified.pictureUrl && { pictureUrl: verified.pictureUrl }),
      },
      create: {
        lineId: verified.lineId,
        displayName: verified.displayName || "Unknown",
        pictureUrl: verified.pictureUrl,
        userName: trimmedName,
        ...(verified.email && { email: verified.email }),
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("[userAction] บันทึกชื่อผู้ใช้ล้มเหลว:", error);
    return { success: false, error: "บันทึกข้อมูลลงฐานข้อมูลไม่สำเร็จ" };
  }
}
