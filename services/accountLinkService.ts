// services/accountLinkService.ts
//
// ระบบลงทะเบียนผ่านหน้าเว็บ ที่ตอบบัตรสมาชิกกลับได้ "ฟรี"
//
// แก่นของเรื่อง: LINE นับโควตาเฉพาะ push / multicast / narrowcast / broadcast
// ส่วน reply ไม่นับ — แต่หน้าเว็บฟอร์มไม่มี replyToken อยู่ในมือ
// flow account link ของ LINE ปิดช่องว่างนี้ให้ เพราะจบด้วย event `accountLink`
// ที่มี replyToken ติดมาด้วย → ตอบ Flex บัตรสมาชิกตรงนั้นได้เลยโดยไม่กินโควตา
//
// ข้อจำกัดที่ตามมาและแก้ไม่ได้ (เป็นข้อบังคับของ LINE เอง):
//   1. flow ต้องเริ่มจากในแชทเสมอ เพราะต้องรู้ userId ก่อนถึงจะขอ linkToken ได้
//      → ทำเป็นเว็บลอย ๆ ให้คนนอกเข้ามาสมัครไม่ได้
//   2. linkToken อายุ 10 นาที และใช้ได้ครั้งเดียว
//      → ฟอร์มต้องสั้น และต้องมีทางขอลิงก์ใหม่เมื่อหมดอายุ
//   3. nonce ต้องเดาไม่ได้ ห้ามใช้ค่าที่คาดเดาได้อย่าง id ในระบบเรา
//      → ไม่งั้นคนร้ายส่งลิงก์หลอกให้เหยื่อเชื่อมบัญชี LINE ของคนร้ายเข้ากับข้อมูลเหยื่อได้
import { randomBytes } from "node:crypto";
import { lineClient } from "@/config/line-config";
import { prisma } from "@/lib/prisma";

/** อายุ linkToken ของ LINE คือ 10 นาที — เซสชันฝั่งเราหมดอายุพร้อมกัน */
const SESSION_TTL_MS = 10 * 60 * 1000;

/** หน้าเชื่อมบัญชีของ LINE — ปลายทางที่ฟอร์มจะเด้งไปหลังกดส่ง */
const ACCOUNT_LINK_DIALOG = "https://access.line.me/dialog/bot/accountLink";

/** คำที่พิมพ์ในแชทแล้วบอทออกลิงก์ฟอร์มให้ (ริชเมนูตั้งให้ส่งข้อความพวกนี้ได้) */
export const REGISTER_KEYWORDS = ["ลงทะเบียน", "สมัครสมาชิก", "ลงทะเบียนสมาชิก"];

/**
 * URL ฐานของเว็บเรา — ต้องเป็น https ที่เปิดจากมือถือผู้ใช้ได้จริง (dev ใช้ ngrok)
 *
 * ไม่ throw ตอน import เหมือน line-config เพราะระบบส่วนอื่นทำงานได้โดยไม่มีค่านี้
 * ให้พังเฉพาะตอนมีคนกดลงทะเบียนจริง แล้ว handler จะตอบข้อความขอโทษไปแทน
 */
function requireBaseUrl(): string {
  const value = process.env.APP_BASE_URL;
  if (!value) {
    throw new Error(
      `[accountLink] ไม่พบ environment variable "APP_BASE_URL" — ต้องตั้งเป็น URL สาธารณะของเว็บ เช่น https://xxx.ngrok-free.dev`
    );
  }
  return value.replace(/\/+$/, "");
}

/** ค่าสุ่มแบบเดาไม่ได้ — 32 ไบต์ → 43 ตัวอักษร อยู่ในช่วง 10–255 ที่ LINE กำหนดไว้ */
function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export interface RegistrationInput {
  fullName: string;
  phone: string;
  birthday: string;
}

/**
 * ขั้นที่ 1 — ผู้ใช้กดลงทะเบียนในแชท
 *
 * ขอ linkToken จาก LINE แล้วเก็บไว้ฝั่งเรา ส่งออกไปแค่ id ของเซสชัน
 * (ถ้าเอา linkToken ใส่ลิงก์ตรง ๆ ใครเห็นลิงก์ก็เอาไปเชื่อมบัญชีต่อได้)
 */
export async function startRegistration(lineId: string) {
  const baseUrl = requireBaseUrl();

  const { linkToken } = await lineClient.issueLinkToken(lineId);

  const sessionId = randomToken(24);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // เซสชันเก่าที่ยังกรอกไม่เสร็จให้ทิ้งไป — linkToken ใบเก่าใช้ไม่ได้แล้วอยู่ดี
  // ถ้าปล่อยไว้ผู้ใช้อาจเผลอกรอกลิงก์เก่าที่ค้างในแท็บ แล้วงงว่าทำไมไม่สำเร็จ
  await prisma.registerSession.deleteMany({
    where: { lineId, status: "pending" },
  });

  await prisma.registerSession.create({
    data: { id: sessionId, lineId, linkToken, expiresAt },
  });

  return {
    url: `${baseUrl}/register?s=${sessionId}`,
    expiresAt,
  };
}

/**
 * ขั้นที่ 2 — หน้าเว็บเปิดขึ้นมา ต้องรู้ว่าเซสชันนี้ยังกรอกได้อยู่ไหม
 *
 * คืน null ทุกกรณีที่กรอกต่อไม่ได้ (ไม่มี / หมดอายุ / กรอกไปแล้ว)
 * ไม่บอกว่าเพราะอะไร เพราะทางออกของผู้ใช้เหมือนกันหมด = ขอลิงก์ใหม่ในแชท
 */
export async function getOpenSession(sessionId: string | undefined | null) {
  if (!sessionId) return null;

  const session = await prisma.registerSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;
  if (session.status !== "pending") return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

function validate(input: RegistrationInput): string | null {
  if (input.fullName.trim().length <= 3) {
    return "กรุณากรอกชื่อ-นามสกุลให้มากกว่า 3 ตัวอักษร";
  }

  // เก็บเฉพาะตัวเลข ผู้ใช้พิมพ์ขีดหรือเว้นวรรคมาก็ยังผ่าน
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10) {
    return "เบอร์โทรศัพท์ต้องมี 9–10 หลัก";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthday)) {
    return "กรุณาเลือกวันเกิด";
  }
  const birthday = new Date(`${input.birthday}T00:00:00Z`);
  if (Number.isNaN(birthday.getTime()) || birthday > new Date()) {
    return "วันเกิดไม่ถูกต้อง";
  }

  return null;
}

export type SubmitResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

/**
 * ขั้นที่ 3 — ผู้ใช้กดส่งฟอร์ม
 *
 * บันทึกข้อมูลพักไว้ที่เซสชัน (ยังไม่เขียนลง User) แล้วสร้าง nonce
 * คืน URL หน้าเชื่อมบัญชีของ LINE ให้หน้าเว็บพาผู้ใช้ไปต่อ
 *
 * ⚠️ lineId มาจากแถวในฐานข้อมูลเท่านั้น ไม่มีช่องให้ client ส่งเข้ามา
 *    (server action เป็น endpoint สาธารณะ ใครก็ยิงได้ — ห้ามเชื่อ input ฝั่งนั้น)
 */
export async function submitRegistration(
  sessionId: string,
  input: RegistrationInput
): Promise<SubmitResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const session = await getOpenSession(sessionId);
  if (!session) {
    return {
      ok: false,
      error:
        "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาพิมพ์ “ลงทะเบียน” ในแชทเพื่อขอลิงก์ใหม่",
    };
  }

  const nonce = randomToken(32);

  // updateMany + เงื่อนไข status ทำหน้าที่เป็น optimistic lock
  // กันกดส่งรัว ๆ สองครั้งแล้วได้ nonce สองใบ (ใบแรกจะกลายเป็นขยะที่จับคู่ไม่ได้)
  const { count } = await prisma.registerSession.updateMany({
    where: { id: session.id, status: "pending" },
    data: {
      nonce,
      status: "submitted",
      fullName: input.fullName.trim(),
      phone: input.phone.replace(/\D/g, ""),
      birthday: input.birthday,
    },
  });

  if (count === 0) {
    return { ok: false, error: "ฟอร์มนี้ถูกส่งไปแล้ว กรุณากลับไปที่แชท LINE" };
  }

  const redirectUrl =
    `${ACCOUNT_LINK_DIALOG}?linkToken=${encodeURIComponent(session.linkToken)}` +
    `&nonce=${encodeURIComponent(nonce)}`;

  return { ok: true, redirectUrl };
}

/**
 * ขั้นที่ 4 — LINE ยืนยันการเชื่อมบัญชีแล้วยิง event accountLink กลับมา
 *
 * เอา nonce มาเปิดเซสชัน ย้ายข้อมูลลง User จริง แล้วคืนผู้ใช้ที่อัปเดตแล้ว
 * ให้ handler เอาไปทำบัตรสมาชิก
 */
export async function completeRegistration(nonce: string, lineId: string) {
  const session = await prisma.registerSession.findUnique({ where: { nonce } });

  if (!session) {
    console.error(`[accountLink] ไม่พบเซสชันของ nonce นี้ (lineId: ${lineId})`);
    return null;
  }

  // nonce ต้องเป็นของคนที่ LINE บอกว่าเชื่อมสำเร็จเท่านั้น
  // ไม่ตรง = มีคนพยายามเอา nonce ของคนอื่นมาใช้ ห้ามเขียนข้อมูลเด็ดขาด
  if (session.lineId !== lineId) {
    console.error(
      `[accountLink] nonce ไม่ตรงกับเจ้าของ — เซสชันเป็นของ ${session.lineId} แต่ event มาจาก ${lineId}`
    );
    return null;
  }

  if (session.status === "linked") {
    // LINE ส่ง event ซ้ำถูกกันด้วย ProcessedEvent อยู่แล้ว มาถึงตรงนี้ได้แปลว่าผิดปกติ
    // แต่ผลลัพธ์ยังถูก (เขียนทับด้วยข้อมูลเดิม) จึงแค่เตือนไว้ ไม่ต้องหยุด
    console.warn(`[accountLink] เซสชัน ${session.id} ถูกใช้ไปแล้ว`);
  }

  const user = await prisma.user.upsert({
    where: { lineId },
    update: {
      userName: session.fullName,
      phone: session.phone,
      birthday: session.birthday,
      registeredAt: new Date(),
    },
    create: {
      lineId,
      // ปกติแถว User มีอยู่แล้วตั้งแต่ตอน follow — เส้นนี้ไว้กันกรณีข้อมูลหาย
      displayName: session.fullName ?? "ผู้ใช้ใหม่",
      userName: session.fullName,
      phone: session.phone,
      birthday: session.birthday,
      registeredAt: new Date(),
    },
  });

  await prisma.registerSession.update({
    where: { id: session.id },
    data: { status: "linked" },
  });

  return user;
}

/** ล้างเซสชันที่หมดอายุ — เรียกท้าย webhook เหมือน cleanupExpiredFlows */
export async function cleanupExpiredSessions() {
  try {
    const { count } = await prisma.registerSession.deleteMany({
      // เก็บไว้อีก 1 วันหลังหมดอายุ เผื่อไล่ log ตอนมีคนแจ้งว่าลงทะเบียนไม่ผ่าน
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (count > 0) {
      console.log(`[accountLink] ล้างเซสชันลงทะเบียนที่หมดอายุ ${count} รายการ`);
    }
  } catch (error) {
    console.error("[accountLink] ล้างเซสชันหมดอายุล้มเหลว:", error);
  }
}
