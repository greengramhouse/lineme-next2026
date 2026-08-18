"use server";

import {
  submitRegistration,
  type RegistrationInput,
  type SubmitResult,
} from "@/services/accountLinkService";

/**
 * รับข้อมูลจากฟอร์มลงทะเบียนหน้าเว็บ
 *
 * ⚠️ ไม่รับ `lineId` จาก client เหมือน saveUserNameAction
 *    ตัวตนของผู้กรอกมาจาก sessionId ที่เราออกให้ตอนเขาอยู่ในแชท LINE เท่านั้น
 *    (server action เป็น endpoint สาธารณะ ใครก็ยิงตรงได้ ไม่ต่างจาก API route)
 *
 * sessionId ที่เดาไม่ได้จึงทำหน้าที่เป็นทั้ง "ใบเบิกทาง" และ "ตัวระบุตัวตน" ในตัว
 * และมีอายุแค่ 10 นาทีตาม linkToken ของ LINE
 */
export async function submitRegistrationAction(
  sessionId: string,
  input: RegistrationInput
): Promise<SubmitResult> {
  try {
    return await submitRegistration(sessionId, input);
  } catch (error) {
    console.error("[registerAction] บันทึกการลงทะเบียนล้มเหลว:", error);
    return { ok: false, error: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง" };
  }
}
