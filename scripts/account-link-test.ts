/**
 * ทดสอบ flow ลงทะเบียนผ่านเว็บ + Account Link
 * รันด้วย: npx tsx --env-file=.env scripts/account-link-test.ts [port]
 * ต้องเปิดเซิร์ฟเวอร์ก่อน (next dev หรือ next start) ถ้าอยากให้ส่วนหน้าเว็บถูกทดสอบด้วย
 *
 * ไม่แตะ LINE API เลย — ขั้นตอนที่ต้องคุยกับ LINE จริง (issueLinkToken และ
 * event accountLink) ทดสอบอัตโนมัติไม่ได้ จึงจำลองด้วยการใส่แถวเซสชันเองแทน
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  completeRegistration,
  getOpenSession,
  submitRegistration,
} from "../services/accountLinkService";
import { buildMemberCard, buildRegisterInvite } from "../services/registerFlex";

const BASE = `http://localhost:${process.argv[2] ?? 3000}`;
const TEST_LINE_ID = `Utest-accountlink-${randomBytes(4).toString("hex")}`;

const results: boolean[] = [];
function check(name: string, ok: boolean, detail = "") {
  results.push(ok);
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function makeSession(id: string) {
  await prisma.registerSession.create({
    data: {
      id,
      lineId: TEST_LINE_ID,
      linkToken: "fake-link-token-for-test",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

async function main() {
  const sessionId = `test-${randomBytes(12).toString("base64url")}`;
  await makeSession(sessionId);

  // ---------- เซสชัน ----------
  check("เซสชันที่เพิ่งออกให้ยังกรอกได้", (await getOpenSession(sessionId))?.id === sessionId);
  check("sessionId มั่ว ๆ ต้องกรอกไม่ได้", (await getOpenSession("ไม่มีจริง")) === null);

  const expiredId = `test-${randomBytes(12).toString("base64url")}`;
  await prisma.registerSession.create({
    data: {
      id: expiredId,
      lineId: TEST_LINE_ID,
      linkToken: "x",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  check("เซสชันหมดอายุต้องกรอกไม่ได้", (await getOpenSession(expiredId)) === null);

  // ---------- ตรวจข้อมูลที่กรอก ----------
  const short = await submitRegistration(sessionId, {
    fullName: "กก",
    phone: "0812345678",
    birthday: "2000-01-01",
  });
  check("ชื่อสั้นเกินต้องไม่ผ่าน", !short.ok);

  const badPhone = await submitRegistration(sessionId, {
    fullName: "ทดสอบ ระบบ",
    phone: "123",
    birthday: "2000-01-01",
  });
  check("เบอร์โทรผิดรูปแบบต้องไม่ผ่าน", !badPhone.ok);

  const future = await submitRegistration(sessionId, {
    fullName: "ทดสอบ ระบบ",
    phone: "081-234-5678",
    birthday: "2999-01-01",
  });
  check("วันเกิดในอนาคตต้องไม่ผ่าน", !future.ok);

  check(
    "กรอกผิดแล้วเซสชันต้องยังใช้ได้อยู่",
    (await getOpenSession(sessionId)) !== null
  );

  // ---------- กรอกถูก ----------
  const ok = await submitRegistration(sessionId, {
    fullName: "ทดสอบ ระบบลงทะเบียน",
    phone: "081-234-5678",
    birthday: "2000-03-05",
  });
  check("กรอกถูกต้องต้องผ่าน", ok.ok, ok.ok ? "" : ok.error);
  if (!ok.ok) return;

  const url = new URL(ok.redirectUrl);
  check(
    "ปลายทางต้องเป็นหน้าเชื่อมบัญชีของ LINE",
    url.origin + url.pathname === "https://access.line.me/dialog/bot/accountLink",
    url.origin + url.pathname
  );
  check("ต้องแนบ linkToken ไปด้วย", url.searchParams.get("linkToken") === "fake-link-token-for-test");

  const nonce = url.searchParams.get("nonce") ?? "";
  check(
    "nonce ต้องยาว 10–255 ตัวตามที่ LINE กำหนด",
    nonce.length >= 10 && nonce.length <= 255,
    `${nonce.length} ตัวอักษร`
  );
  check("nonce ต้องไม่ใช่ค่าที่คาดเดาได้อย่าง sessionId/lineId", nonce !== sessionId && nonce !== TEST_LINE_ID);

  const again = await submitRegistration(sessionId, {
    fullName: "ทดสอบ ระบบลงทะเบียน",
    phone: "0812345678",
    birthday: "2000-03-05",
  });
  check("ส่งฟอร์มซ้ำต้องถูกปฏิเสธ", !again.ok);
  check("ส่งแล้วเซสชันต้องปิด", (await getOpenSession(sessionId)) === null);

  // ---------- event accountLink ----------
  check(
    "nonce ที่มาจาก userId คนอื่นต้องไม่ถูกบันทึก",
    (await completeRegistration(nonce, "Uคนอื่น")) === null
  );

  const user = await completeRegistration(nonce, TEST_LINE_ID);
  check("ยืนยันสำเร็จต้องได้ผู้ใช้กลับมา", user !== null);
  check("ชื่อต้องถูกบันทึก", user?.userName === "ทดสอบ ระบบลงทะเบียน", user?.userName ?? "");
  check("เบอร์ต้องถูกเก็บเป็นตัวเลขล้วน", user?.phone === "0812345678", user?.phone ?? "");
  check("วันเกิดต้องถูกบันทึก", user?.birthday === "2000-03-05");
  check("ต้องมีเวลาที่ลงทะเบียนสำเร็จ", user?.registeredAt instanceof Date);

  const closed = await prisma.registerSession.findUnique({ where: { id: sessionId } });
  check("เซสชันต้องถูกปิดเป็น linked", closed?.status === "linked", closed?.status ?? "");

  // ---------- ข้อความที่ส่งกลับ ----------
  const invite = buildRegisterInvite("https://example.com/register?s=abc", new Date());
  check("ข้อความชวนลงทะเบียนต้องเป็น Flex", invite.type === "flex");

  const card = buildMemberCard(user!);
  check("บัตรสมาชิกต้องเป็น Flex", card.type === "flex");
  check(
    "altText ของบัตรต้องมีชื่อผู้ใช้ (คนที่ปิดแสดง Flex จะได้อ่านรู้เรื่อง)",
    card.type === "flex" && card.altText.includes("ทดสอบ ระบบลงทะเบียน")
  );

  // ---------- หน้าเว็บ ----------
  const liveId = `test-${randomBytes(12).toString("base64url")}`;
  await makeSession(liveId);
  try {
    const openPage = await fetch(`${BASE}/register?s=${liveId}`).then((r) => r.text());
    check("เซสชันที่ยังไม่หมดอายุต้องเห็นฟอร์ม", openPage.includes("ยืนยันการลงทะเบียน"));

    const usedPage = await fetch(`${BASE}/register?s=${sessionId}`).then((r) => r.text());
    check("เซสชันที่ใช้ไปแล้วต้องเห็นหน้าลิงก์หมดอายุ", usedPage.includes("ลิงก์นี้ใช้ไม่ได้แล้ว"));

    const noParam = await fetch(`${BASE}/register`).then((r) => r.text());
    check("เข้าหน้าลงทะเบียนตรง ๆ โดยไม่มีลิงก์จากแชทต้องกรอกไม่ได้", noParam.includes("ลิงก์นี้ใช้ไม่ได้แล้ว"));
  } catch {
    console.log(`[SKIP] ส่วนหน้าเว็บ — ต่อ ${BASE} ไม่ได้ (ยังไม่ได้เปิดเซิร์ฟเวอร์?)`);
  }

  // ---------- เก็บกวาด ----------
  await prisma.registerSession.deleteMany({ where: { lineId: TEST_LINE_ID } });
  await prisma.user.deleteMany({ where: { lineId: TEST_LINE_ID } });

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} ผ่าน`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.registerSession.deleteMany({ where: { lineId: TEST_LINE_ID } });
  await prisma.user.deleteMany({ where: { lineId: TEST_LINE_ID } });
  process.exit(1);
});
