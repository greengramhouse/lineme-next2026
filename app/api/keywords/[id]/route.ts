// app/api/keywords/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ==========================================
// 1. API สำหรับการแก้ไขข้อมูล (PUT)
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 🌟 1. เปลี่ยน Type เป็น Promise
) {
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

    return NextResponse.json({ message: "แก้ไขสำเร็จ", data: updatedKeyword }, { status: 200 });
  } catch (error: any) {
    // ... ดัก Error ตามเดิม
  }
}

// ==========================================
// 2. API สำหรับการลบข้อมูล (DELETE)
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // 🌟 1. เปลี่ยน Type เป็น Promise
) {
  try {
    const { id } = await params; // 🌟 2. ใส่ await ก่อนดึง id ออกมา

    // สั่งลบข้อมูลด้วย Prisma
    await prisma.autoReply.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "ลบข้อมูลสำเร็จ!" }, { status: 200 });
  } catch (error: any) {
    console.error("API DELETE Error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบข้อมูลนี้ในระบบ" }, { status: 404 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 });
  }
}