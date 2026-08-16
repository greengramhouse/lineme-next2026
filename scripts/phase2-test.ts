/**
 * ทดสอบ Phase 2 (H2 unfollow / H4 throttle) — ใช้ครั้งเดียวแล้วลบทิ้งได้
 * รันด้วย: npx tsx --env-file=.env scripts/phase2-test.ts
 * ต้องเปิด dev server ไว้ที่พอร์ต 3999 ก่อน
 */
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";

const secret = process.env.CHANNEL_SECRET!;
const URL = "http://localhost:3999/api/line-webhook";
const TEST_LINE_ID = "Uphase2test0000000000000000000001";

const sign = (body: string) =>
  crypto.createHmac("sha256", secret).update(body).digest("base64");

async function post(payload: unknown) {
  const body = JSON.stringify(payload);
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-line-signature": sign(body) },
    body,
  });
  return res.status;
}

const baseEvent = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  mode: "active",
  timestamp: 1700000000000,
  webhookEventId: `PHASE2-${type}-${Math.floor(performance.now() * 1000)}`,
  deliveryContext: { isRedelivery: false },
  source: { type: "user", userId: TEST_LINE_ID },
  ...extra,
});

const check = (name: string, ok: boolean, detail = "") =>
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  // เตรียม: สร้าง user ทดสอบ isFollowing = true, updatedAt = ตอนนี้
  await prisma.user.deleteMany({ where: { lineId: TEST_LINE_ID } });
  await prisma.user.create({
    data: { lineId: TEST_LINE_ID, displayName: "Phase2 Test", isFollowing: true },
  });
  console.log("เตรียมข้อมูล: สร้าง user ทดสอบแล้ว (isFollowing = true)\n");

  // ---- 2.11 unfollow -> isFollowing = false ----
  const s1 = await post({ destination: "Uxxx", events: [baseEvent("unfollow")] });
  await new Promise((r) => setTimeout(r, 2500)); // รอ after() ทำงาน
  const afterUnfollow = await prisma.user.findUnique({ where: { lineId: TEST_LINE_ID } });
  check("2.11 unfollow → isFollowing = false", afterUnfollow?.isFollowing === false,
    `HTTP ${s1}, isFollowing = ${afterUnfollow?.isFollowing}`);

  // ---- 2.13 throttle: ยิง 5 ข้อความ ----
  // user เพิ่งถูกอัปเดต (updatedAt สด) → ไม่ควรเรียก getProfile เลยสักครั้ง
  // แต่ isFollowing เป็น false อยู่ → ควรถูกแก้กลับเป็น true (self-heal)
  console.log("\nยิง 5 ข้อความติดกัน (ดู log ฝั่ง server ว่า getProfile ถูกเรียกกี่ครั้ง)...");
  for (let i = 0; i < 5; i++) {
    await post({
      destination: "Uxxx",
      events: [
        baseEvent("message", {
          replyToken: "0".repeat(34),
          message: { type: "text", id: String(i), text: `ทดสอบครั้งที่ ${i + 1}` },
        }),
      ],
    });
  }
  await new Promise((r) => setTimeout(r, 6000));

  const afterMessages = await prisma.user.findUnique({ where: { lineId: TEST_LINE_ID } });
  check("2.12 ส่งข้อความหลัง unfollow → isFollowing กลับเป็น true (self-heal)",
    afterMessages?.isFollowing === true, `isFollowing = ${afterMessages?.isFollowing}`);

  // ---- unfollow ผู้ใช้ที่ไม่มีใน DB ต้องไม่พัง ----
  const s2 = await post({
    destination: "Uxxx",
    events: [{ ...baseEvent("unfollow"), source: { type: "user", userId: "Unot-in-db-0000" } }],
  });
  await new Promise((r) => setTimeout(r, 1500));
  check("unfollow ผู้ใช้ที่ไม่มีใน DB → ไม่พัง (ตอบ 200)", s2 === 200, `HTTP ${s2}`);

  // ล้างข้อมูลทดสอบ
  await prisma.user.deleteMany({ where: { lineId: TEST_LINE_ID } });
  await prisma.chatHistory.deleteMany({ where: { lineId: TEST_LINE_ID } });
  console.log("\nล้างข้อมูลทดสอบเรียบร้อย");
  await prisma.$disconnect();
}

main();
