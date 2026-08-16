// app/api/richmenu/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lineClient } from "@/config/line-config";
import { requireAdminApi } from "@/lib/adminAuth";



export async function DELETE(
  request: Request,
  // 🌟 ใช้ Promise สำหรับ Next.js 15 เหมือนที่เราเคยแก้ไปในหน้า Keyword ครับ
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { id } = await params;

    // 1. ค้นหาข้อมูลจาก Database ของเราก่อนว่ามีอยู่จริงไหม
    const richMenu = await prisma.richMenu.findUnique({
      where: { id: id },
    });

    if (!richMenu) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล Rich Menu นี้ในระบบ" },
        { status: 404 }
      );
    }

    // ==========================================
    // 2. จัดการกับเซิร์ฟเวอร์ของ LINE
    // ==========================================
    if (richMenu.richMenuId) {
      try {
        // 🌟 อิงจาก Doc ล่าสุด: ถ้าเมนูที่จะลบเป็น Default ต้องใช้คำสั่ง cancelDefaultRichMenu
        if (richMenu.isDefault) {
          await lineClient.cancelDefaultRichMenu();
          console.log("ยกเลิก Default Menu ใน LINE แล้ว");
        }
        
        // 🌟 ใช้คำสั่ง deleteRichMenu ตามปกติ
        await lineClient.deleteRichMenu(richMenu.richMenuId);
        console.log(`ลบ Rich Menu ${richMenu.richMenuId} ออกจาก LINE สำเร็จ`);
      } catch (lineError) {
        // ดัก Error ไว้เฉยๆ เผื่อกรณีที่แอดมินเผลอไปลบเมนูทิ้งผ่านเว็บ LINE Official Manager ไปก่อนแล้ว
        console.warn("LINE API Warning (อาจถูกลบไปแล้วในระบบ LINE):", lineError);
      }
    }

    // ==========================================
    // 3. ลบข้อมูลออกจากฐานข้อมูล (Prisma) ของเรา
    // ==========================================
    await prisma.richMenu.delete({
      where: { id: id },
    });

    return NextResponse.json(
      { message: "ลบข้อมูล Rich Menu สำเร็จ!" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete RichMenu API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบข้อมูล" },
      { status: 500 }
    );
  }
}