// app/api/document-types/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminAuth";
import { toFieldCreateData, validateDocumentPayload } from "../route";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    // ส่งมาแค่ isActive ได้ (ใช้ตอนกดสวิตช์เปิด/ปิด) ไม่ต้องส่ง fields มาทั้งชุด
    if (body.fields === undefined && body.isActive !== undefined) {
      const toggled = await prisma.documentType.update({
        where: { id },
        data: { isActive: body.isActive },
      });
      return NextResponse.json({ message: "อัปเดตแล้ว", data: toggled });
    }

    const invalid = validateDocumentPayload(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    // แทนที่คำถามทั้งชุดในทีเดียว — ทำใน transaction เพื่อไม่ให้เกิดจังหวะที่
    // ประเภทเอกสารมี 0 คำถาม ซึ่งจะทำให้ครูที่กำลังกรอกอยู่เจอสถานะพัง
    const updated = await prisma.$transaction(async (tx) => {
      await tx.documentField.deleteMany({ where: { documentTypeId: id } });

      return tx.documentType.update({
        where: { id },
        data: {
          name: body.name.trim(),
          triggerKeyword: body.triggerKeyword.trim(),
          description: body.description?.trim() || null,
          promptTemplate: body.promptTemplate.trim(),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          fields: { create: toFieldCreateData(body.fields) },
        },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json({ message: "บันทึกแล้ว", data: updated });
  } catch (error: any) {
    console.error("[API document-types] PUT ล้มเหลว:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบประเภทเอกสารนี้" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "คำเริ่มต้นนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    }

    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
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

    // ครูที่กำลังกรอกประเภทนี้อยู่ต้องถูกปล่อยออกจากโหมด
    // ไม่งั้นจะติดค้างจนกว่า state จะหมดอายุ 30 นาที
    await prisma.conversationState.deleteMany({ where: { documentTypeId: id } });

    // fields ถูกลบตามด้วย onDelete: Cascade
    await prisma.documentType.delete({ where: { id } });

    return NextResponse.json({ message: "ลบแล้ว" });
  } catch (error: any) {
    console.error("[API document-types] DELETE ล้มเหลว:", error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบประเภทเอกสารนี้" }, { status: 404 });
    }

    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
