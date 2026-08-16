import crypto from "node:crypto";
import fs from "node:fs";

const env = fs.readFileSync("D:/project_gukkghu/13-Next-LineSDK/lineme/.env", "utf8");
const secret = env.match(/^CHANNEL_SECRET\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
if (!secret) throw new Error("CHANNEL_SECRET not found in .env");

const URL = "http://localhost:3999/api/line-webhook";

const sign = (body) =>
  crypto.createHmac("sha256", secret).update(body).digest("base64");

async function hit(name, body, signature, expected) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature !== null ? { "x-line-signature": signature } : {}),
    },
    body,
  });
  const text = await res.text();
  const ok = res.status === expected ? "PASS" : "FAIL";
  console.log(
    `[${ok}] ${name} -> ${res.status} (คาดหวัง ${expected}) ${text ? `body="${text.slice(0, 60)}"` : "body=<empty>"}`
  );
  return res.status === expected;
}

// รอ dev server ตื่น
for (let i = 0; i < 60; i++) {
  try {
    await fetch("http://localhost:3999/");
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const results = [];

// 1.15 — signature ผิด -> 401
results.push(
  await hit("1.15 signature ผิด", JSON.stringify({ events: [] }), "bogus-signature-aaaa", 401)
);

// 1.15b — ไม่มี header signature เลย -> 401
results.push(
  await hit("1.15b ไม่มี signature header", JSON.stringify({ events: [] }), null, 401)
);

// 1.16 — signature ถูก แต่ body ไม่ใช่ JSON -> 400
const badBody = "this-is-not-json{{{";
results.push(await hit("1.16 body ไม่ใช่ JSON", badBody, sign(badBody), 400));

// 1.17 — ปุ่ม Verify ของ LINE Console (events: []) -> 200
const verifyBody = JSON.stringify({ destination: "Uxxxxxxxx", events: [] });
results.push(await hit("1.17 Verify (events: [])", verifyBody, sign(verifyBody), 200));

// 1.17b — body ที่ไม่มีฟิลด์ events เลย -> 200 (ไม่ใช่ 500)
const noEvents = JSON.stringify({ destination: "Uxxxxxxxx" });
results.push(await hit("1.17b ไม่มีฟิลด์ events", noEvents, sign(noEvents), 200));

// 1.18 — วัดว่า route ตอบเร็วแม้มี event จริงที่ต้องประมวลผลนาน
const realEvent = JSON.stringify({
  destination: "Uxxxxxxxx",
  events: [
    {
      type: "message",
      mode: "active",
      timestamp: 1700000000000,
      webhookEventId: "TEST-EVENT-0001",
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: "Utest0000000000000000000000000000" },
      replyToken: "0000000000000000000000000000000000",
      message: { type: "text", id: "1", text: "สวัสดี" },
    },
  ],
});
const t0 = Date.now();
results.push(await hit("1.18 event จริง (ตอบก่อนประมวลผล)", realEvent, sign(realEvent), 200));
console.log(`      ⏱  response time = ${Date.now() - t0} ms`);

// 1.20 — 3 events ใน 1 request, ตัวแรกพังตั้งใจ (ไม่มี replyToken)
const batch = JSON.stringify({
  destination: "Uxxxxxxxx",
  events: [
    {
      type: "message", mode: "active", timestamp: 1700000000000,
      webhookEventId: "TEST-BATCH-A",
      deliveryContext: { isRedelivery: false },
      source: { type: "group", groupId: "Cgroup", userId: "Utest0000000000000000000000000000" },
      replyToken: "1111111111111111111111111111111111",
      message: { type: "text", id: "2", text: "ทดสอบในกลุ่ม" },
    },
    {
      type: "message", mode: "active", timestamp: 1700000000001,
      webhookEventId: "TEST-BATCH-B",
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: "Utest0000000000000000000000000000" },
      replyToken: "2222222222222222222222222222222222",
      message: { type: "text", id: "3", text: "ทดสอบสอง" },
    },
    {
      type: "unfollow", mode: "active", timestamp: 1700000000002,
      webhookEventId: "TEST-BATCH-C",
      deliveryContext: { isRedelivery: false },
      source: { type: "user", userId: "Utest0000000000000000000000000000" },
    },
  ],
});
results.push(await hit("1.20 batch 3 events", batch, sign(batch), 200));

console.log(`\nสรุป: ${results.filter(Boolean).length}/${results.length} ผ่าน`);
