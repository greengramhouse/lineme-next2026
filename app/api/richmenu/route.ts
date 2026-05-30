// app/api/richmenu/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lineBlobClient, lineClient } from "@/config/line-config";

export async function POST(request: Request) {
  console.log("Received POST request to /api/richmenu");
  try {
    const body = await request.json();
    // 🌟 1. ดึงค่า aliasId เพิ่มมาจาก body ที่ส่งมาจากฟอร์มหน้าบ้าน
    const { name, imageUrl, payload, isDefault, aliasId } = body;

    if (!imageUrl || !payload) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบถ้วน กรุณากรอก URL รูปภาพและ JSON Payload" },
        { status: 400 }
      );
    }

    // ==========================================
    // สเตป 1: สร้างโครงสร้าง Rich Menu ในระบบ LINE
    // ==========================================
    const richMenuResponse = await lineClient.createRichMenu(payload);
    const richMenuId = richMenuResponse.richMenuId;

    // ==========================================
    // สเตป 2: ดาวน์โหลดรูปจาก imageUrl และอัปโหลดขึ้น LINE
    // ==========================================
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error("ไม่สามารถดาวน์โหลดรูปภาพจาก URL ที่ระบุได้");
    }
    
    const imageBlob = await imageRes.blob();
    await lineBlobClient.setRichMenuImage(richMenuId, imageBlob);

    // ==========================================
    // 🌟 สเตป 2.5: สร้าง Rich Menu Alias ในระบบ LINE (เพิ่มเข้ามาใหม่)
    // ==========================================
    if (aliasId) {
      // ใช้โครงสร้าง Request Object ตามสเปค LINE SDK ล่าสุดที่คุณเตรียมไว้
      await lineClient.createRichMenuAlias({
        richMenuId: richMenuId,
        richMenuAliasId: aliasId,
      });
      console.log(`สร้าง Alias: ${aliasId} ผูกกับ Rich Menu: ${richMenuId} สำเร็จ`);
    }

    // ==========================================
    // สเตป 3: ตั้งค่าเป็นเมนูเริ่มต้น (ถ้าผู้ใช้ติ๊กเลือก)
    // ==========================================
    if (isDefault) {
      await lineClient.setDefaultRichMenu(richMenuId);
      
      await prisma.richMenu.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // ==========================================
    // สเตป 4: บันทึกข้อมูลลงฐานข้อมูล (Prisma)
    // ==========================================
    const newRichMenu = await prisma.richMenu.create({
      data: {
        name,
        richMenuId,
        aliasId, // 🌟 บันทึก aliasId ลงตารางใน Database ของเราด้วย
        imageUrl,
        payload,
        isDefault,
      },
    });

    return NextResponse.json(
      { message: "สร้าง Rich Menu และ Alias สำเร็จ!", data: newRichMenu },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("RichMenu API Error:", error);
    
    const errorMessage = error.originalError?.response?.data?.message || error.message;
    
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาด: ${errorMessage}` },
      { status: 500 }
    );
  }
}