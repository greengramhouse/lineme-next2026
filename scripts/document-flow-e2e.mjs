/**
 * ทดสอบครบวงจรผ่าน webhook จริง — จำลองครูคุยกับบอท
 * รันด้วย: node scripts/document-flow-e2e.mjs [port]
 * ต้องเปิด dev server ก่อน
 *
 * ตัวนี้เรียก Gemini จริงตอนท้าย จึงใช้เวลาสักครู่
 */
import crypto from "node:crypto";
import fs from "node:fs";

const env = fs.readFileSync("./.env", "utf8");
const secret = env.match(/^CHANNEL_SECRET\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
const PORT = process.argv[2] ?? 3000;
const URL = `http://localhost:${PORT}/api/line-webhook`;
const USER = "Ue2eflowtest00000000000000000001";

let seq = 0;
async function send(text) {
  const body = JSON.stringify({
    destination: "Uxxx",
    events: [{
      type: "message", mode: "active", timestamp: 1700000000000,
      webhookEventId: `E2E-FLOW-${process.pid}-${seq++}`,
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: USER },
      replyToken: "0".repeat(34),
      message: { type: "text", id: String(seq), text },
    }],
  });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-line-signature": sig },
    body,
  });
  console.log(`  ครู ▸ ${text.slice(0, 45)}${text.length > 45 ? "..." : ""}   [HTTP ${res.status}]`);
  // รอ after() ประมวลผลจบก่อนส่งข้อความถัดไป ไม่งั้น state จะชนกัน
  await new Promise((r) => setTimeout(r, 2500));
  return res.status;
}

console.log("=== จำลองบทสนทนาร่างหนังสือขออนุญาต ===\n");

const steps = [
  "ร่างหนังสือ",
  "หนังสือขออนุญาต",
  "ขออนุญาตพานักเรียนไปทัศนศึกษา",
  "ผู้อำนวยการโรงเรียนชุมชนวัดไทยงาม",
  "เพื่อให้นักเรียนได้เรียนรู้นอกห้องเรียน จำนวน 45 คน ณ ศูนย์วิทยาศาสตร์",
  "วันที่ 5 มีนาคม 2569 เวลา 08.00-16.00 น.",
  "นางสาวสมศรี ใจดี ครูชำนาญการ",
];

let allOk = true;
for (const s of steps) {
  const status = await send(s);
  if (status !== 200) allOk = false;
}

console.log("\n  (บอทควรแสดงสรุปให้ตรวจแล้ว — กดยืนยัน)");
const confirmStatus = await send("ยืนยันร่างเอกสาร");
if (confirmStatus !== 200) allOk = false;

console.log("\n  รอ Gemini ร่างเอกสาร...");
await new Promise((r) => setTimeout(r, 30000));

console.log(`\n${allOk ? "✅" : "❌"} ทุกขั้นตอบ HTTP 200`);
console.log("ตรวจ log ฝั่ง server เพื่อดูว่า Gemini ร่างออกมาแล้วส่ง push หรือไม่");
