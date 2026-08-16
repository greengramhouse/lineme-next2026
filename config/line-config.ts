// src/config/line.ts
import { messagingApi } from "@line/bot-sdk";

// อ่าน env แบบ fail fast — ถ้าไม่มีให้พังตั้งแต่ตอน import ไปเลย
// เหตุผล: ถ้าปล่อย fallback เป็น "" ระบบจะ "ไม่พัง" แต่ไปตรวจ HMAC ด้วย key ว่างแทน
// = ใครก็ตามที่รู้ว่าเราลืมตั้ง env สามารถคำนวณ signature ด้วย key ว่างแล้วยิง event ปลอมเข้ามาได้
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[line-config] ไม่พบ environment variable "${name}" — ต้องตั้งค่าก่อนเริ่มระบบ`
    );
  }
  return value;
}

export const channelSecret = requireEnv("CHANNEL_SECRET");

const channelAccessToken = requireEnv("CHANNEL_ACCESS_TOKEN");

export const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken,
});

export const lineBlobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken,
});
