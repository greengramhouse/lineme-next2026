// app/api/bot/school-info/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminAuth";
import { invalidateBotConfigCache } from "@/services/botConfigService";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { topic, content } = await request.json();

    if (!topic?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "กรุณากรอกทั้งหัวข้อและเนื้อหา" },
        { status: 400 }
      );
    }

    // ต่อท้ายรายการเสมอ ให้ลำดับที่แอดมินจัดไว้ไม่เพี้ยน
    const last = await prisma.schoolInfo.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const created = await prisma.schoolInfo.create({
      data: {
        topic: topic.trim(),
        content: content.trim(),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    invalidateBotConfigCache();

    return NextResponse.json({ message: "เพิ่มหัวข้อแล้ว", data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API bot/school-info] POST ล้มเหลว:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "มีหัวข้อนี้อยู่แล้ว กรุณาใช้ชื่อหัวข้ออื่น" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "เพิ่มหัวข้อไม่สำเร็จ" }, { status: 500 });
  }
}
