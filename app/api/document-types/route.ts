// app/api/document-types/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminAuth";

export interface FieldInput {
  label: string;
  question: string;
  hint?: string | null;
  isRequired?: boolean;
}

/** ตรวจ payload ให้ครบก่อนแตะฐานข้อมูล — คืนข้อความ error ถ้าไม่ผ่าน */
export function validateDocumentPayload(body: any): string | null {
  if (!body?.name?.trim()) return "กรุณากรอกชื่อประเภทเอกสาร";
  if (!body?.triggerKeyword?.trim()) return "กรุณากรอกคำเริ่มต้นที่ครูจะพิมพ์";
  if (!body?.promptTemplate?.trim()) return "กรุณากรอกคำสั่งรูปแบบเอกสาร";

  const fields: FieldInput[] = body.fields ?? [];
  if (!Array.isArray(fields) || fields.length === 0) {
    return "ต้องมีคำถามอย่างน้อย 1 ข้อ ไม่งั้นบอทจะไม่รู้ว่าต้องถามอะไร";
  }

  for (const [i, f] of fields.entries()) {
    if (!f?.label?.trim()) return `คำถามข้อ ${i + 1}: กรุณากรอกชื่อช่อง`;
    if (!f?.question?.trim()) return `คำถามข้อ ${i + 1}: กรุณากรอกประโยคที่บอทจะถาม`;
  }

  // ชื่อช่องถูกใช้เป็น key ของคำตอบ ถ้าซ้ำกันคำตอบจะทับกันเงียบ ๆ
  const labels = fields.map((f) => f.label.trim());
  const dup = labels.find((l, i) => labels.indexOf(l) !== i);
  if (dup) return `ชื่อช่อง "${dup}" ซ้ำกัน กรุณาตั้งชื่อไม่ให้ซ้ำ`;

  return null;
}

export function toFieldCreateData(fields: FieldInput[]) {
  return fields.map((f, i) => ({
    label: f.label.trim(),
    question: f.question.trim(),
    hint: f.hint?.trim() || null,
    isRequired: f.isRequired ?? true,
    sortOrder: i,
  }));
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = await request.json();

    const invalid = validateDocumentPayload(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const last = await prisma.documentType.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const created = await prisma.documentType.create({
      data: {
        name: body.name.trim(),
        triggerKeyword: body.triggerKeyword.trim(),
        description: body.description?.trim() || null,
        promptTemplate: body.promptTemplate.trim(),
        sortOrder: (last?.sortOrder ?? -1) + 1,
        fields: { create: toFieldCreateData(body.fields) },
      },
      include: { fields: true },
    });

    return NextResponse.json({ message: "เพิ่มประเภทเอกสารแล้ว", data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API document-types] POST ล้มเหลว:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "คำเริ่มต้นนี้ถูกใช้ไปแล้ว กรุณาใช้คำอื่น" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "เพิ่มไม่สำเร็จ" }, { status: 500 });
  }
}
