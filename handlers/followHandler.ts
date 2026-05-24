// src/handlers/followHandler.ts
import { webhook, HTTPFetchError } from "@line/bot-sdk";
import { replyText } from "@/services/replyService";
import { lineClient } from "@/config/line-config";
import { upsertUserProfile } from "@/services/userService"; // <--- Import Service ใหม่เข้ามา

export async function handleFollowEvent(event: webhook.FollowEvent) {
  if (!event.replyToken) return;
  
  const userId = event.source?.userId;
  if (!userId) return;

  let displayName = "คุณลูกค้า";
  let pictureUrl: string | null = null;
  let statusMessage: string | null = null;

  // 1. ดึงข้อมูลโปรไฟล์จาก LINE
  try {
    const userProfile = await lineClient.getProfile(userId);
    displayName = userProfile.displayName;
    pictureUrl = userProfile.pictureUrl || null;
    statusMessage = userProfile.statusMessage || null;
    
    console.log(`[FollowEvent] ผู้ใช้ ${displayName} (${userId}) ติดตามบอท`);
  } catch (error: unknown) {
    console.error(`[FollowEvent] ไม่สามารถดึงโปรไฟล์ของ ${userId} ได้`);
    if (error instanceof HTTPFetchError) {
      console.error(`Status: ${error.status} | Body:`, error.body);
    }
  }

  // 2. เรียกใช้งาน Service เพื่อบันทึกลงฐานข้อมูล (โค้ดคลีนขึ้นมาก)
  await upsertUserProfile({
    userId,
    displayName,
    pictureUrl,
    statusMessage,
    isFollowing: true
  });

  // 3. ส่งข้อความต้อนรับ
  const welcomeMessage = `สวัสดีคุณ ${displayName} 🎉 ยินดีต้อนรับสู่บริการของเราครับ`;
  await replyText(event.replyToken, welcomeMessage);
}