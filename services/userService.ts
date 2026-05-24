// src/services/userService.ts
import { lineClient } from "@/config/line-config";
import { prisma } from "@/lib/prisma";

// กำหนด Type ของข้อมูลที่จะรับเข้ามา
interface UserProfileData {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  isFollowing?: boolean;
}

export async function upsertUserProfile(data: UserProfileData) {
  try {
    return await prisma.user.upsert({
      where: { lineId: data.userId },
      update: {
        displayName: data.displayName,
        pictureUrl: data.pictureUrl,
        statusMessage: data.statusMessage,
        isFollowing: data.isFollowing ?? true, 
      },
      create: {
        lineId: data.userId,
        displayName: data.displayName,
        pictureUrl: data.pictureUrl,
        statusMessage: data.statusMessage,
        isFollowing: data.isFollowing ?? true,
      },
    });
  } catch (dbError) {
    console.error("[UserService] บันทึกข้อมูลผู้ใช้ล้มเหลว:", dbError);
    // คืนค่า null กลับไปแทน เพื่อไม่ให้ระบบหลักแครช
    return null; 
  }
}

// ฟังก์ชันแยกออกมาเพื่อไม่ให้ขวางการทำงานหลัก
export async function updateProfileInBackground(userId: string) {
  try {
    // 1. ดึงข้อมูลล่าสุดจาก LINE
    const profile = await lineClient.getProfile(userId);
    
    // 2. โยนให้ Service จัดการฐานข้อมูลแทน (โค้ดคลีนและใช้ซ้ำได้)
    await upsertUserProfile({
      userId: userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || null,
      statusMessage: profile.statusMessage || null,
      isFollowing: true
    });
  } catch (error) {
    // ปล่อยผ่านไป ไม่ต้องสนใจถ้ายิง API หรือ DB พัง
  }
}