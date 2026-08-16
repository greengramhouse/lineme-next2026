// app/api/bot/school-info/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminAuth";
import { invalidateBotConfigCache } from "@/services/botConfigService";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;
    const { topic, content, isActive } = await request.json();

    // ส่งมาแค่ isActive ได้ (ใช้ตอนกดสวิตช์เปิด/ปิด) แต่ถ้าส่ง topic/content มาต้องไม่ว่าง
    if (topic !== undefined && !topic?.trim()) {
      return NextResponse.json({ error: "หัวข้อต้องไม่ว่าง" }, { status: 400 });
    }
    if (content !== undefined && !content?.trim()) {
      return NextResponse.json({ error: "เนื้อหาต้องไม่ว่าง" }, { status: 400 });
    }

    const updated = await prisma.schoolInfo.update({
      where: { id },
      data: {
        ...(topic !== undefined && { topic: topic.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    invalidateBotConfigCache();

    return NextResponse.json({ message: "แก้ไขแล้ว", data: updated });
  } catch (error: any) {
    console.error("[API bot/school-info] PUT ล้มเหลว:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบหัวข้อนี้" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "ชื่อหัวข้อนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    }

    return NextResponse.json({ error: "แก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;

    // กันลบหัวข้อสุดท้ายทิ้ง ไม่งั้นน้องกรีนจะไม่มีความรู้เหลือเลย
    // (จริง ๆ botConfigService จะถอยไปใช้ค่าเริ่มต้นให้ แต่แอดมินจะงงว่าทำไมข้อมูลเก่ากลับมา)
    const activeCount = await prisma.schoolInfo.count({ where: { isActive: true } });
    const target = await prisma.schoolInfo.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (target?.isActive && activeCount <= 1) {
      return NextResponse.json(
        { error: "ลบไม่ได้ ต้องเหลือหัวข้อที่เปิดใช้งานอย่างน้อย 1 หัวข้อ" },
        { status: 400 }
      );
    }

    await prisma.schoolInfo.delete({ where: { id } });

    invalidateBotConfigCache();

    return NextResponse.json({ message: "ลบแล้ว" });
  } catch (error: any) {
    console.error("[API bot/school-info] DELETE ล้มเหลว:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบหัวข้อนี้" }, { status: 404 });
    }

    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
