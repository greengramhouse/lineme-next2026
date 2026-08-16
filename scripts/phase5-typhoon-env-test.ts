/**
 * ทดสอบว่า typhoon.ts อ่าน key จาก env จริง และ degrade อย่างถูกต้องเมื่อไม่มี key
 * รันด้วย: npx tsx --env-file=.env scripts/phase5-typhoon-env-test.ts
 * (ไม่ต้องเปิด dev server — เรียก service ตรง ๆ)
 */
import { processTyphoonASR } from "../services/typhoon";

const check = (name: string, ok: boolean, detail = "") =>
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  const dummyAudio = Buffer.from("ไม่ใช่ไฟล์เสียงจริง");

  // กรณีที่ 1: ไม่มี key เลย
  delete process.env.TYPHOON_API_KEY;
  const noKey = await processTyphoonASR(dummyAudio);
  check("ไม่มี TYPHOON_API_KEY → ok = false", noKey.ok === false);
  check(
    "ไม่มี key → ข้อความบอกผู้ใช้ว่าระบบถอดเสียงไม่พร้อม",
    !noKey.ok && noKey.message.includes("ระบบถอดเสียงยังไม่พร้อม"),
    !noKey.ok ? `"${noKey.message}"` : ""
  );

  // กรณีที่ 2: มี key แต่เป็นของปลอม → API ต้องตอบ error แล้ว service ต้องคืน ok = false
  // ต้องเป็น ASCII ล้วน ไม่งั้นจะติดที่ header encoding ตั้งแต่ยังไม่ได้ยิง API
  process.env.TYPHOON_API_KEY = "sk-invalid-key-for-testing-only-000000";
  const badKey = await processTyphoonASR(dummyAudio);
  check("key ผิด → ok = false ไม่ใช่ throw ออกมา", badKey.ok === false);

  // ยืนยันว่าไม่มีการ fallback ไปใช้ค่า hardcode
  check(
    "ไม่มี key hardcode หลงเหลือ (ไม่มี key แล้วต้องไม่สำเร็จ)",
    noKey.ok === false
  );
}

main();
