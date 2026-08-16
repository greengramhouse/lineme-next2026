import { NextResponse } from "next/server";
import { lineClient } from "@/config/line-config";
import { requireAdminApi } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { lineId, richMenuId } = await request.json();

    if (!lineId) {
      return NextResponse.json({ error: "Missing lineId" }, { status: 400 });
    }

    if (richMenuId) {
      // ตั้งค่า Rich Menu เฉพาะบุคคล
      await lineClient.linkRichMenuIdToUser(lineId, richMenuId);
      return NextResponse.json({ success: true, message: "Linked rich menu to user successfully" });
    } else {
      // ถ้ายกเลิก (ส่ง richMenuId เป็นค่าว่าง)
      await lineClient.unlinkRichMenuIdFromUser(lineId);
      return NextResponse.json({ success: true, message: "Unlinked rich menu from user successfully" });
    }
  } catch (error: any) {
    console.error("Error linking rich menu to user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set user rich menu" },
      { status: 500 }
    );
  }
}
