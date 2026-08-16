// lib/adminAuth.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth, isAdminLineId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AdminIdentity {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  lineId: string;
}

/**
 * ตรวจว่า request นี้มาจากแอดมินจริงไหม
 *
 * นี่คือ **ด่านจริง** ของระบบ ส่วน proxy.ts เป็นแค่ด่านหน้าที่ดูคุกกี้แบบเร็ว ๆ
 * ไม่ได้แตะฐานข้อมูล จึงกันได้แค่คนที่ไม่มี session เท่านั้น
 *
 * ตรวจ allowlist ทุก request ไม่ใช่แค่ตอนล็อกอิน — ถอดชื่อออกจาก ADMIN_LINE_IDS
 * แล้วมีผลทันที ไม่ต้องรอ session เดิมหมดอายุ
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const lineAccount = await prisma.adminAccount.findFirst({
    where: { userId: session.user.id, providerId: "line" },
    select: { accountId: true },
  });

  // accountId ของ provider line คือ sub จาก LINE = LINE userId
  if (!isAdminLineId(lineAccount?.accountId)) return null;

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    lineId: lineAccount!.accountId,
  };
}

/**
 * ใช้ใน API route — คืน NextResponse 401 ถ้าไม่ผ่าน, คืน null ถ้าผ่าน
 *
 * วิธีใช้:
 *   const denied = await requireAdminApi();
 *   if (denied) return denied;
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const admin = await getAdminIdentity();
  if (admin) return null;

  return NextResponse.json(
    { error: "ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน" },
    { status: 401 }
  );
}
