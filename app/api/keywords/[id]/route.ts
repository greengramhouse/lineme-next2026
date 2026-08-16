// app/api/keywords/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateReplyRuleCache } from "@/services/replyRuleService";
import { requireAdminApi } from "@/lib/adminAuth";

// ==========================================
// 1. API สำหรับการแก้ไขข้อมูล (PUT)
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 🌟 1. เปลี่ยน Type เป็น Promise
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params; // 🌟 2. ใส่ await ก่อนดึง id ออกมา
    const body = await request.json();
    
    // ... โค้ดส่วนที่เหลือของ PUT ใช้เหมือนเดิมเป๊ะเลยครับ ...
    const { keyword, matchType, payload, isActive } = body;

    const updatedKeyword = await prisma.autoReply.update({
      where: { id: id },
      data: {
        ...(keyword && { keyword }),
        ...(matchType && { matchType }),
        ...(payload && { payload }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // ล้าง cache ของกฎ CONTAINS ให้การแก้เห็นผลทันที
    invalidateReplyRuleCache();

    return NextResponse.json({ message: "แก้ไขสำเร็จ", data: updatedKeyword }, { status: 200 });
  } catch (error: any) {
    // เดิม catch นี้ว่างเปล่า = ไม่ return อะไรเลย → Next โยน
    // "No response is returned from route handler" กลายเป็น 500 แบบไม่มีสาเหตุให้ดู
    console.error("API PUT Error:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบข้อมูลนี้ในระบบ" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `คีย์เวิร์ด "${error.meta?.target?.[0] || "นี้"}" มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" }, { status: 500 });
  }
}

// ==========================================
// 2. API สำหรับการลบข้อมูล (DELETE)
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 🌟 1. เปลี่ยน Type เป็น Promise
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params; // 🌟 2. ใส่ await ก่อนดึง id ออกมา

    // สั่งลบข้อมูลด้วย Prisma
    await prisma.autoReply.delete({
      where: { id: id },
    });

    // ล้าง cache ไม่งั้นคีย์เวิร์ดที่ลบไปแล้วจะยังตอบอยู่จน TTL หมด
    invalidateReplyRuleCache();

    return NextResponse.json({ message: "ลบข้อมูลสำเร็จ!" }, { status: 200 });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบข้อมูลนี้ในระบบ" }, { status: 404 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 });
  }
}