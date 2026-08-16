/**
 * ทดสอบ H7 — server action ต้องไม่เชื่อ client อีกต่อไป
 * รันด้วย: npx tsx --conditions=react-server --env-file=.env scripts/h7-idtoken-test.ts
 * (ไม่ต้องเปิด dev server — เรียก action ตรง ๆ)
 *
 * ต้องมี --conditions=react-server เพราะ lib/lineIdToken.ts มี import "server-only"
 * ซึ่งจะ throw ถ้าถูกโหลดนอกบริบท server component — flag นี้บอกให้ resolve
 * ไปที่ empty.js ของ package นั้นแทน (guard ยังทำงานปกติตอน build จริง)
 */
import { saveUserNameAction } from "../app/actions/userAction";
import { verifyLineIdToken } from "../lib/lineIdToken";
import { prisma } from "../lib/prisma";

const check = (name: string, ok: boolean, detail = "") =>
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);

const VICTIM_LINE_ID = "Uc229d8cd..."; // ตัวอย่าง lineId ของคนอื่น (ไม่ต้องมีจริง)

async function main() {
  // 1. token ว่าง → ต้องไม่ผ่าน
  const empty = await saveUserNameAction("", "ชื่อทดสอบยาวพอ");
  check("ส่ง idToken ว่าง → ปฏิเสธ", empty.success === false, empty.error);

  // 2. token มั่ว → LINE ต้องปฏิเสธ
  const bogus = await saveUserNameAction("ey.bogus.token", "ชื่อทดสอบยาวพอ");
  check("ส่ง idToken ปลอม → ปฏิเสธ", bogus.success === false, bogus.error);

  // 3. ชื่อสั้นเกิน → ปฏิเสธก่อนถึง LINE ด้วยซ้ำ
  const short = await saveUserNameAction("ey.bogus.token", "ab");
  check("ชื่อสั้นเกิน → ปฏิเสธ", short.success === false, short.error);

  // 4. ยืนยันว่า signature ไม่มีช่องให้ส่ง lineId แล้ว
  check(
    "saveUserNameAction รับแค่ 2 พารามิเตอร์ (idToken, userName) ไม่มี lineId",
    saveUserNameAction.length === 2,
    `รับ ${saveUserNameAction.length} พารามิเตอร์`
  );

  // 5. verifyLineIdToken ปฏิเสธ token มั่ว
  const verified = await verifyLineIdToken("ey.bogus.token");
  check("verifyLineIdToken('ปลอม') → null", verified === null);

  // 6. ยืนยันว่าไม่มีการเขียน DB จากการทดสอบข้างบนเลย
  const leaked = await prisma.user.count({ where: { userName: "ชื่อทดสอบยาวพอ" } });
  check("ไม่มีแถวไหนถูกเขียนจาก request ปลอม", leaked === 0, `พบ ${leaked} แถว`);

  await prisma.$disconnect();
}

main();
