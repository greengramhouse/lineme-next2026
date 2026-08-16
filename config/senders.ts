// src/config/senders.ts
import { messagingApi } from "@line/bot-sdk";

/**
 * โปรไฟล์จำแลง (icon + display name) ที่ใช้สวมตอนตอบข้อความ
 *
 * เดิม object พวกนี้ถูก hardcode ซ้ำ 4 ที่ใน messageHandler.ts
 * แก้ชื่อ/รูปทีต้องไล่แก้ 4 จุด และเคยหลุดไม่ตรงกันมาแล้ว
 */

/** น้องโปรแกรม — ใช้ตอบเมื่อ match keyword จากฐานข้อมูล */
export const SENDER_PROGRAM: messagingApi.Sender = {
  name: "น้องโปรแกรม 👦🏻",
  iconUrl:
    "https://png.pngtree.com/png-clipart/20221226/ourmid/pngtree-little-girl-illustration-with-bangs-png-image_6497274.png",
};

/** น้องกรีน — ใช้ตอบเมื่อไม่ match keyword แล้วโยนให้ Gemini */
// ชื่อสั้น ๆ เพื่อป้องกัน Emoji กินโควตาตัวอักษร
export const SENDER_GREEN: messagingApi.Sender = {
  name: "น้องกรีน 👧🏻",
  iconUrl:
    "https://i.pinimg.com/236x/b2/6a/18/b26a1862d53bb75d5f104c2897365d9a.jpg",
};

/** สวม sender ให้ทุกข้อความในชุด */
export function withSender(
  messages: messagingApi.Message[],
  sender: messagingApi.Sender
): messagingApi.Message[] {
  return messages.map((message) => ({ ...message, sender }));
}
