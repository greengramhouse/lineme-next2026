/**
 * ทดสอบ state machine ของระบบร่างเอกสาร (ไม่เรียก Gemini จริง)
 * รันด้วย: npx tsx --env-file=.env scripts/document-flow-test.ts
 */
import { prisma } from "../lib/prisma";
import {
  handleFlowMessage,
  ACTION_CONFIRM,
  ACTION_RESTART,
} from "../services/documentFlowService";

const USER = "Uflowtest0000000000000000000001";
const results: boolean[] = [];

function check(name: string, ok: boolean, detail = "") {
  results.push(ok);
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const textOf = (r: Awaited<ReturnType<typeof handleFlowMessage>>) =>
  (r.messages ?? []).map((m: any) => m.text ?? "").join("\n");

async function reset() {
  await prisma.conversationState.deleteMany({ where: { lineId: USER } });
}

async function main() {
  await reset();

  // ---- ข้อความทั่วไปต้องผ่านไปให้ระบบเดิม ----
  const passthrough = await handleFlowMessage(USER, "สวัสดีค่ะ");
  check("ข้อความทั่วไป → ปล่อยผ่านให้ระบบ keyword/Gemini เดิม", passthrough.messages === null);

  // ---- คำกลาง ๆ → แสดงเมนู ----
  const menu = await handleFlowMessage(USER, "ร่างหนังสือ");
  check("พิมพ์ 'ร่างหนังสือ' → แสดงรายการให้เลือก", textOf(menu).includes("หนังสือขออนุญาต"));
  check("   มี Quick Reply ให้กด", ((menu.messages?.[0] as any)?.quickReply?.items?.length ?? 0) > 0);
  check("   ยังไม่เข้าโหมด (แค่แสดงเมนู)", (await prisma.conversationState.count({ where: { lineId: USER } })) === 0);

  // ---- เลือกประเภท → เข้าโหมด ----
  const start = await handleFlowMessage(USER, "หนังสือขออนุญาต");
  check("เลือกประเภท → เริ่มถามข้อ 1", textOf(start).includes("(1/5)"));
  check("   บอกวิธียกเลิกไว้ด้วย", textOf(start).includes("ยกเลิก"));

  // ---- ตอบทีละข้อ ----
  const answers = ["ขออนุญาตพานักเรียนไปทัศนศึกษา", "ผู้อำนวยการโรงเรียน", "เพื่อการเรียนรู้นอกห้องเรียน 45 คน", "5 มีนาคม 2569"];
  for (const [i, a] of answers.entries()) {
    const r = await handleFlowMessage(USER, a);
    check(`ตอบข้อ ${i + 1} → ถามข้อ ${i + 2}`, textOf(r).includes(`(${i + 2}/5)`));
  }

  // ---- ข้อสำคัญ: ระหว่างอยู่ในโหมด ข้อความต้องไม่หลุดไป keyword ----
  const inFlow = await prisma.conversationState.findUnique({ where: { lineId: USER } });
  check("ระหว่างกรอก state ถูกเก็บใน DB", inFlow !== null, `ขั้นที่ ${inFlow?.stepIndex}`);

  // ---- ตอบข้อสุดท้าย → สรุป ----
  const summary = await handleFlowMessage(USER, "นางสาวสมศรี ใจดี ครูชำนาญการ");
  check("ตอบครบ → แสดงสรุปให้ตรวจ", textOf(summary).includes("สรุปข้อมูล"));
  check("   สรุปมีคำตอบครบทุกช่อง", textOf(summary).includes("ทัศนศึกษา") && textOf(summary).includes("สมศรี"));
  check("   ยังไม่ส่งให้ Gemini", summary.prompt === undefined);

  // ---- กด 'เริ่มกรอกใหม่' ----
  const restart = await handleFlowMessage(USER, ACTION_RESTART);
  check("กดเริ่มกรอกใหม่ → กลับไปข้อ 1", textOf(restart).includes("(1/5)"));

  // กรอกใหม่ให้ครบเร็ว ๆ
  for (const a of [...answers, "นางสาวสมศรี ใจดี"]) await handleFlowMessage(USER, a);

  // ---- ยืนยัน → ได้ prompt ----
  const confirmed = await handleFlowMessage(USER, ACTION_CONFIRM);
  check("กดยืนยัน → ได้ prompt พร้อมส่ง Gemini", typeof confirmed.prompt === "string");
  check("   prompt มีคำตอบของครูอยู่ครบ", confirmed.prompt?.includes("ทัศนศึกษา") === true);
  check("   prompt มีคำสั่งรูปแบบหนังสือราชการ", confirmed.prompt?.includes("หนังสือราชการ") === true);
  check("   ครูไม่ต้องเขียน prompt เอง", confirmed.prompt !== "ขออนุญาตพานักเรียนไปทัศนศึกษา");
  check("   state ถูกล้างหลังยืนยัน", (await prisma.conversationState.count({ where: { lineId: USER } })) === 0);

  // ---- ยกเลิกกลางคัน ----
  await handleFlowMessage(USER, "หนังสือขออนุญาต");
  await handleFlowMessage(USER, "เรื่องทดสอบ");
  const cancelled = await handleFlowMessage(USER, "ยกเลิก");
  check("พิมพ์ 'ยกเลิก' กลางคัน → ออกจากโหมด", textOf(cancelled).includes("ยกเลิก"));
  check("   state ถูกล้าง", (await prisma.conversationState.count({ where: { lineId: USER } })) === 0);
  const afterCancel = await handleFlowMessage(USER, "สวัสดีค่ะ");
  check("   หลังยกเลิก ข้อความทั่วไปกลับมาปกติ", afterCancel.messages === null);

  // ---- หมดอายุ ----
  await handleFlowMessage(USER, "หนังสือขออนุญาต");
  await prisma.conversationState.update({
    where: { lineId: USER },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const expired = await handleFlowMessage(USER, "ข้อความหลังหมดอายุ");
  check("state หมดอายุ → หลุดจากโหมดเอง ไม่ค้าง", expired.messages === null);
  check("   แถวที่หมดอายุถูกลบทิ้ง", (await prisma.conversationState.count({ where: { lineId: USER } })) === 0);

  await reset();
  console.log(`\nสรุป: ${results.filter(Boolean).length}/${results.length} ผ่าน`);
  await prisma.$disconnect();
}

main();
