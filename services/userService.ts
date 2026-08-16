// src/services/userService.ts
import { lineClient } from "@/config/line-config";
import { prisma } from "@/lib/prisma";

// รีเฟรชโปรไฟล์จาก LINE อย่างมากทุก 24 ชม. ต่อผู้ใช้ 1 คน
// เดิมยิง getProfile + upsert ทุกข้อความที่ผู้ใช้พิมพ์ ทั้งที่โปรไฟล์แทบไม่เปลี่ยน
const PROFILE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
        // ใช้ ?? ไม่ได้กับ boolean ที่ไม่ได้ส่งมา — ต้องเช็ค undefined ตรง ๆ
        // ไม่งั้นถ้าผู้ใช้บล็อกบอทไว้แล้วมี event อื่นวิ่งเข้ามา จะถูกเซ็ตกลับเป็น true
        ...(data.isFollowing !== undefined && { isFollowing: data.isFollowing }),
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

/**
 * เซ็ตสถานะการติดตาม — ใช้ตอน unfollow (บล็อกบอท)
 *
 * ใช้ updateMany ไม่ใช่ update เพราะถ้าไม่เจอ record จะไม่ throw (P2025)
 * กรณีนี้เกิดได้จริง เช่น คนที่เคยคุยตอนที่เรายังไม่มีตาราง User แล้วมาบล็อกทีหลัง
 */
export async function setFollowingStatus(lineId: string, isFollowing: boolean) {
  try {
    const result = await prisma.user.updateMany({
      where: { lineId },
      data: { isFollowing },
    });

    if (result.count === 0) {
      console.warn(
        `[UserService] ไม่พบผู้ใช้ ${lineId} ในฐานข้อมูล จึงไม่ได้อัปเดต isFollowing`
      );
    }

    return result.count;
  } catch (dbError) {
    console.error("[UserService] อัปเดตสถานะการติดตามล้มเหลว:", dbError);
    return 0;
  }
}

/**
 * รีเฟรชโปรไฟล์แบบเบื้องหลัง — มี throttle 24 ชม.
 *
 * ต้องเรียกผ่าน after() เสมอ อย่าปล่อยเป็น floating promise
 * เพราะตอน deploy บน serverless งานที่ไม่มีใครถือ promise ไว้จะถูกฆ่าทิ้งเมื่อ response ออกไปแล้ว
 */
export async function updateProfileInBackground(userId: string) {
  try {
    const existing = await prisma.user.findUnique({
      where: { lineId: userId },
      select: { updatedAt: true, isFollowing: true },
    });

    if (existing) {
      // ผู้ใช้ส่งข้อความมาได้ = ยังไม่ได้บล็อกแน่นอน ถ้า DB ค้างเป็น false ให้แก้ให้ตรงก่อน
      // (เกิดได้ถ้า unfollow event มาถึงแต่ follow event ตอนปลดบล็อกหล่นหาย)
      if (!existing.isFollowing) {
        await setFollowingStatus(userId, true);
      }

      if (
        Date.now() - existing.updatedAt.getTime() < PROFILE_REFRESH_INTERVAL_MS
      ) {
        return;
      }
    }

    // 1. ดึงข้อมูลล่าสุดจาก LINE
    const profile = await lineClient.getProfile(userId);

    // 2. โยนให้ Service จัดการฐานข้อมูลแทน (โค้ดคลีนและใช้ซ้ำได้)
    await upsertUserProfile({
      userId: userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl || null,
      statusMessage: profile.statusMessage || null,
      // ผู้ใช้ส่งข้อความมาได้ = ยังไม่ได้บล็อก แต่ถ้ายังไม่มี record ให้ปล่อยเป็น default
      isFollowing: true,
    });
  } catch (error) {
    // เดิม catch ว่างเปล่า → พังแล้วเงียบสนิท debug ไม่ได้
    console.error(
      `[UserService] รีเฟรชโปรไฟล์ของ ${userId} ล้มเหลว:`,
      error
    );
  }
}
