// services/documentFlowService.ts
import { messagingApi } from "@line/bot-sdk";
import { prisma } from "@/lib/prisma";
import { SENDER_GREEN } from "@/config/senders";

/** ค้างไว้นานกว่านี้ถือว่าเลิกทำแล้ว ครูกลับมาพิมพ์อีกทีจะไม่โดนจับเข้าโหมดเดิม */
const FLOW_TTL_MS = 30 * 60 * 1000;

/** คำที่พิมพ์แล้วบอทแสดงรายการประเภทเอกสารให้เลือก */
export const MENU_KEYWORDS = ["ร่างหนังสือ", "ร่างเอกสาร", "ช่วยร่างเอกสาร"];

/** คำที่ใช้ออกจากโหมดได้ตลอดเวลา */
const CANCEL_WORDS = ["ยกเลิก", "เลิก", "ออก", "cancel"];

/** ค่าที่ส่งมากับปุ่ม (postback หรือข้อความจาก Quick Reply) */
export const ACTION_CONFIRM = "ยืนยันร่างเอกสาร";
export const ACTION_RESTART = "เริ่มกรอกใหม่";

type Message = messagingApi.Message;

const say = (text: string, quickReplyItems?: string[]): Message => ({
  type: "text",
  text,
  sender: SENDER_GREEN,
  ...(quickReplyItems?.length
    ? {
        quickReply: {
          items: quickReplyItems.slice(0, 13).map((label) => ({
            type: "action" as const,
            action: { type: "message" as const, label: label.slice(0, 20), text: label },
          })),
        },
      }
    : {}),
});

export interface FlowResult {
  /** ข้อความที่จะตอบกลับ — ถ้าเป็น null แปลว่าไม่ใช่เรื่องของ flow ให้ระบบเดิมทำงานต่อ */
  messages: Message[] | null;
  /** กรอกครบและยืนยันแล้ว — prompt ที่ประกอบเสร็จ พร้อมส่งให้ Gemini */
  prompt?: string;
  documentTypeName?: string;
}

const PASS_THROUGH: FlowResult = { messages: null };

async function clearState(lineId: string) {
  await prisma.conversationState.deleteMany({ where: { lineId } });
}

async function getActiveState(lineId: string) {
  const state = await prisma.conversationState.findUnique({ where: { lineId } });
  if (!state) return null;

  // หมดอายุแล้วให้ถือว่าไม่มี และเก็บกวาดทิ้งไปเลย
  if (state.expiresAt < new Date()) {
    await clearState(lineId);
    return null;
  }
  return state;
}

async function getTypeWithFields(id: string) {
  return prisma.documentType.findUnique({
    where: { id },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });
}

/** ถามช่องที่ index นี้ พร้อมบอกความคืบหน้า */
function askStep(
  type: { name: string; fields: { label: string; question: string; hint: string | null }[] },
  index: number
): Message[] {
  const field = type.fields[index];
  const progress = `(${index + 1}/${type.fields.length})`;
  const hint = field.hint ? `\nตัวอย่าง: ${field.hint}` : "";

  return [
    say(`${progress} ${field.question}${hint}\n\nพิมพ์ "ยกเลิก" เพื่อออกได้ตลอดค่ะ`),
  ];
}

function summarize(
  type: { name: string; fields: { label: string }[] },
  answers: Record<string, string>
): Message[] {
  const lines = type.fields
    .map((f) => `• ${f.label}: ${answers[f.label] ?? "-"}`)
    .join("\n");

  return [
    say(
      `สรุปข้อมูล${type.name}นะคะ ✅\n\n${lines}\n\nถูกต้องไหมคะ`,
      [ACTION_CONFIRM, ACTION_RESTART, "ยกเลิก"]
    ),
  ];
}

/**
 * ข้อบังคับที่ต่อท้ายทุก prompt — เป็นข้อจำกัดของช่องทาง ไม่ใช่สไตล์เอกสาร
 * จึงอยู่ในโค้ด ไม่ให้แอดมินเผลอลบตอนแก้ promptTemplate
 *
 * ที่ต้องมี: LINE แสดงข้อความธรรมดา ไม่ render Markdown
 * ถ้า Gemini ตอบมาเป็น **ตัวหนา** หรือ * bullet ครูจะเห็นดอกจันเต็มไปหมด
 */
const CHANNEL_CONSTRAINTS = [
  "ข้อบังคับการจัดรูปแบบ (สำคัญมาก):",
  "- ห้ามใช้ Markdown เด็ดขาด ห้ามใช้เครื่องหมาย * ** ## หรือ ``` ทุกกรณี",
  "  เพราะเอกสารจะถูกส่งผ่าน LINE ซึ่งแสดงผลเป็นข้อความธรรมดา ครูจะเห็นเครื่องหมายพวกนี้ติดมาด้วย",
  "- ถ้าต้องขึ้นรายการ ให้ใช้การขึ้นบรรทัดใหม่และเลขข้อ เช่น 1. 2. 3. แทน",
  "- ใช้ปีพุทธศักราชให้สอดคล้องกับวันที่ที่ผู้ใช้ระบุมา ห้ามเดาปีเอง",
  "- ข้อมูลส่วนไหนที่ผู้ใช้ไม่ได้ให้มา ให้เว้นเป็นวงเล็บเหลี่ยม เช่น [ระบุชั้นเรียน] ให้ผู้ใช้เติมเอง",
  "- ตอบกลับมาเป็นตัวเอกสารที่ร่างเสร็จแล้วเท่านั้น ไม่ต้องมีคำทักทายหรือคำอธิบายนำ",
].join("\n");

/** ประกอบ prompt จากคำตอบทั้งหมด — ครูไม่ต้องเขียน prompt เอง */
function buildPrompt(
  type: { name: string; promptTemplate: string; fields: { label: string }[] },
  answers: Record<string, string>
): string {
  const details = type.fields
    .map((f) => `- ${f.label}: ${answers[f.label] ?? "(ไม่ได้ระบุ)"}`)
    .join("\n");

  return [
    `ช่วยร่าง "${type.name}" ให้หน่อย โดยใช้ข้อมูลต่อไปนี้`,
    "",
    details,
    "",
    type.promptTemplate,
    "",
    CHANNEL_CONSTRAINTS,
  ].join("\n");
}

/**
 * ตัวกลางของทั้งระบบ — เรียกจาก messageHandler **ก่อน** ระบบ keyword และ Gemini
 *
 * คืน messages = null เมื่อไม่เกี่ยวกับ flow เพื่อให้ระบบเดิมทำงานต่อตามปกติ
 */
export async function handleFlowMessage(
  lineId: string | undefined,
  text: string
): Promise<FlowResult> {
  if (!lineId) return PASS_THROUGH;

  const trimmed = text.trim();
  const state = await getActiveState(lineId);

  // ── อยู่ในโหมดกรอกข้อมูล ──────────────────────────────────────────
  if (state) {
    // ต้องออกได้ตลอด ไม่งั้นครูติดอยู่ในโหมดจนกว่าจะหมดอายุ
    if (CANCEL_WORDS.includes(trimmed)) {
      await clearState(lineId);
      return { messages: [say("ยกเลิกการร่างเอกสารแล้วค่ะ 🙏 พิมพ์คุยกับน้องกรีนได้ตามปกติเลยน้า")] };
    }

    const type = await getTypeWithFields(state.documentTypeId);
    if (!type || type.fields.length === 0) {
      await clearState(lineId);
      return { messages: [say("ขออภัยค่ะ ประเภทเอกสารนี้ถูกแก้ไขระหว่างทาง รบกวนเริ่มใหม่อีกครั้งน้า")] };
    }

    const answers = (state.answers ?? {}) as Record<string, string>;

    // ── ขั้นยืนยัน ──
    if (state.status === "confirming") {
      if (trimmed === ACTION_CONFIRM) {
        await clearState(lineId);
        return {
          messages: [say(`กำลังร่าง${type.name}ให้นะคะ รอสักครู่ ✍️`)],
          prompt: buildPrompt(type, answers),
          documentTypeName: type.name,
        };
      }

      if (trimmed === ACTION_RESTART) {
        await prisma.conversationState.update({
          where: { lineId },
          data: {
            stepIndex: 0,
            answers: {},
            status: "collecting",
            expiresAt: new Date(Date.now() + FLOW_TTL_MS),
          },
        });
        return { messages: [say("ได้ค่ะ เริ่มกรอกใหม่นะคะ"), ...askStep(type, 0)] };
      }

      return { messages: summarize(type, answers) };
    }

    // ── ขั้นเก็บคำตอบ ──
    const field = type.fields[state.stepIndex];
    if (!field) {
      // index หลุดกรอบ (เช่นแอดมินลบช่องทิ้งระหว่างทาง) — ถือว่ากรอกครบแล้ว
      await prisma.conversationState.update({
        where: { lineId },
        data: { status: "confirming", expiresAt: new Date(Date.now() + FLOW_TTL_MS) },
      });
      return { messages: summarize(type, answers) };
    }

    if (field.isRequired && !trimmed) {
      return { messages: [say("ช่องนี้จำเป็นต้องกรอกค่ะ รบกวนพิมพ์ใหม่อีกครั้งน้า"), ...askStep(type, state.stepIndex)] };
    }

    answers[field.label] = trimmed;
    const nextIndex = state.stepIndex + 1;
    const done = nextIndex >= type.fields.length;

    await prisma.conversationState.update({
      where: { lineId },
      data: {
        stepIndex: nextIndex,
        answers,
        status: done ? "confirming" : "collecting",
        expiresAt: new Date(Date.now() + FLOW_TTL_MS),
      },
    });

    return { messages: done ? summarize(type, answers) : askStep(type, nextIndex) };
  }

  // ── ยังไม่อยู่ในโหมด — ดูว่าเป็นคำเริ่มต้นไหม ────────────────────
  const types = await prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });

  if (types.length === 0) return PASS_THROUGH;

  // พิมพ์ชื่อประเภทตรง ๆ หรือคำ trigger ของประเภทนั้น → เข้าโหมดเลย
  const matched = types.find(
    (t) => t.triggerKeyword === trimmed || t.name === trimmed
  );

  if (matched) {
    if (matched.fields.length === 0) {
      return { messages: [say(`ขออภัยค่ะ ${matched.name} ยังไม่ได้ตั้งค่าคำถาม รบกวนแจ้งผู้ดูแลระบบน้า`)] };
    }

    await prisma.conversationState.upsert({
      where: { lineId },
      update: {
        documentTypeId: matched.id,
        stepIndex: 0,
        answers: {},
        status: "collecting",
        expiresAt: new Date(Date.now() + FLOW_TTL_MS),
      },
      create: {
        lineId,
        documentTypeId: matched.id,
        expiresAt: new Date(Date.now() + FLOW_TTL_MS),
      },
    });

    return {
      messages: [say(`เริ่มร่าง${matched.name}กันเลยค่ะ 📝`), ...askStep(matched, 0)],
    };
  }

  // คำกลาง ๆ → แสดงรายการให้เลือก
  if (MENU_KEYWORDS.includes(trimmed)) {
    const list = types.map((t) => `• ${t.name}${t.description ? ` — ${t.description}` : ""}`).join("\n");
    return {
      messages: [
        say(
          `น้องกรีนช่วยร่างเอกสารได้ตามนี้ค่ะ 📄\n\n${list}\n\nเลือกได้เลยน้า`,
          types.map((t) => t.name)
        ),
      ],
    };
  }

  return PASS_THROUGH;
}

/** เก็บกวาด state ที่หมดอายุ — เรียกจาก webhook route เป็นระยะ */
export async function cleanupExpiredFlows() {
  try {
    const { count } = await prisma.conversationState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) console.log(`[DocumentFlow] ล้าง state ที่หมดอายุ ${count} รายการ`);
  } catch (error) {
    console.error("[DocumentFlow] ล้าง state หมดอายุล้มเหลว:", error);
  }
}
