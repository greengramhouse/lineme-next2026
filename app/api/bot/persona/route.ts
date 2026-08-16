// app/api/bot/persona/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminAuth";
import { invalidateBotConfigCache, PERSONA_ID } from "@/services/botConfigService";

export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { persona, scope, rules } = await request.json();

    // ทั้ง 3 ส่วนเป็นโครงของ prompt ถ้าปล่อยให้ว่างได้ น้องกรีนจะเสียบุคลิก
    // หรือเสีย guardrail ไปเลย จึงบังคับว่าต้องมีเนื้อหา
    for (const [key, value] of Object.entries({ persona, scope, rules })) {
      if (typeof value !== "string" || !value.trim()) {
        return NextResponse.json(
          { error: `ช่อง "${key}" ต้องไม่ว่าง` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.botPersona.upsert({
      where: { id: PERSONA_ID },
      update: { persona: persona.trim(), scope: scope.trim(), rules: rules.trim() },
      create: {
        id: PERSONA_ID,
        persona: persona.trim(),
        scope: scope.trim(),
        rules: rules.trim(),
      },
    });

    invalidateBotConfigCache();

    return NextResponse.json({ message: "บันทึกแล้ว", data: updated });
  } catch (error) {
    console.error("[API bot/persona] PUT ล้มเหลว:", error);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
