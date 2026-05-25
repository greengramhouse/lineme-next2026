// app/api/keywords/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // เช็ค path ของ prisma client ให้ตรงกับโปรเจกต์คุณ

export async function POST(request: Request) {
  try {
    // 1. รับค่า Request Body จากฟอร์ม
    const body = await request.json();
    const { keyword, matchType, payload } = body;

    // 2. ตรวจสอบว่าส่งมาครบไหม
    if (!keyword || !matchType || !payload) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน (keyword, matchType, payload)" },
        { status: 400 }
      );
    }

    // 3. สั่งบันทึกลง Database ด้วย Prisma
    const newAutoReply = await prisma.autoReply.create({
      data: {
        keyword: keyword,
        matchType: matchType, // "EXACT" หรือ "CONTAINS"
        payload: payload,     // รับ Object ก้อน JSON ยัดลงไปได้เลย
      },
    });

    // 4. บันทึกสำเร็จ ส่งข้อมูลที่ถูกสร้างกลับไปให้ Client
    return NextResponse.json(
      { message: "บันทึก Keyword สำเร็จ!", data: newAutoReply },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("API Error:", error);

    // 🌟 ดักจับ Error กรณีพิมพ์ Keyword ซ้ำ (Prisma Code: P2002 คือ Unique constraint failed)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: `คีย์เวิร์ด "${error.meta?.target?.[0] || 'นี้'}" มีอยู่ในระบบแล้ว กรุณาใช้คำอื่น` },
        { status: 400 }
      );
    }

    // Error ทั่วไป
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลบนเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}