// src/handlers/unfollowHandler.ts
import { webhook } from "@line/bot-sdk";
import { setFollowingStatus } from "@/services/userService";

/**
 * ผู้ใช้บล็อกบอท / ลบเพื่อน
 *
 * event นี้ไม่มี replyToken และเรียก getProfile ไม่ได้แล้ว (LINE จะตอบ 403)
 * ทำได้อย่างเดียวคือมาร์ก isFollowing = false
 *
 * สำคัญเพราะถ้าไม่ทำ เวลาจะ broadcast/push ในอนาคตจะยิงหาคนที่บล็อกไปแล้ว
 * = โควตา push ไหม้เปล่า และ LINE คิดเงินตาม message ที่ส่ง
 */
export async function handleUnfollowEvent(event: webhook.UnfollowEvent) {
  const userId = event.source?.userId;
  if (!userId) return;

  await setFollowingStatus(userId, false);
  console.log(`[UnfollowEvent] ผู้ใช้ ${userId} บล็อก/ลบบอท`);
}
