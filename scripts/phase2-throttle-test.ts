/**
 * ทดสอบอีกด้านของ throttle: updatedAt เก่ากว่า 24 ชม. ต้องยอมรีเฟรชโปรไฟล์
 * รันด้วย: npx tsx --env-file=.env scripts/phase2-throttle-test.ts
 */
import crypto from "node:crypto";
import { prisma } from "../lib/prisma";

const secret = process.env.CHANNEL_SECRET!;
const URL = "http://localhost:3999/api/line-webhook";
const STALE_ID = "Uphase2stale00000000000000000001";

const sign = (b: string) => crypto.createHmac("sha256", secret).update(b).digest("base64");

async function post(payload: unknown) {
  const body = JSON.stringify(payload);
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-line-signature": sign(body) },
    body,
  });
  return res.status;
}

async function main() {
  await prisma.user.deleteMany({ where: { lineId: STALE_ID } });
  await prisma.user.create({
    data: { lineId: STALE_ID, displayName: "Stale Test", isFollowing: true },
  });

  // @updatedAt ทำให้ Prisma เขียนทับค่าที่เราส่งไป จึงต้องย้อนเวลาด้วย raw SQL
  await prisma.$executeRaw`
    UPDATE "User" SET "updatedAt" = NOW() - INTERVAL '3 days' WHERE "lineId" = ${STALE_ID}
  `;

  const row = await prisma.user.findUnique({
    where: { lineId: STALE_ID },
    select: { updatedAt: true },
  });
  const ageHours = (Date.now() - row!.updatedAt.getTime()) / 3600_000;
  console.log(`เตรียมข้อมูล: updatedAt เก่า ${ageHours.toFixed(1)} ชม.\n`);

  await post({
    destination: "Uxxx",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: 1700000000000,
        webhookEventId: "PHASE2-STALE-01",
        deliveryContext: { isRedelivery: false },
        source: { type: "user", userId: STALE_ID },
        replyToken: "0".repeat(34),
        message: { type: "text", id: "1", text: "ทดสอบ stale" },
      },
    ],
  });

  console.log("ยิงข้อความ 1 ครั้งแล้ว — ดู log ว่ามีบรรทัด 'รีเฟรชโปรไฟล์ของ ... ล้มเหลว'");
  console.log("(จะล้มเหลวเพราะ userId เป็นของปลอม แต่การที่มันพยายามยิง = throttle ปล่อยผ่านถูกต้อง)");

  await new Promise((r) => setTimeout(r, 5000));
  await prisma.user.deleteMany({ where: { lineId: STALE_ID } });
  await prisma.chatHistory.deleteMany({ where: { lineId: STALE_ID } });
  await prisma.$disconnect();
}

main();
