// handlers/accountLinkHandler.ts
//
// ปลายทางของ flow ลงทะเบียนผ่านเว็บ — LINE ยิง event นี้มาหลังผู้ใช้กดยืนยัน
// ที่หน้า access.line.me และนี่คือจุดเดียวที่เราได้ replyToken มาแบบไม่ต้อง push
import { webhook } from "@line/bot-sdk";
import { completeRegistration } from "@/services/accountLinkService";
import { buildMemberCard } from "@/services/registerFlex";
import { replyMessages } from "@/services/replyService";
import { SENDER_PROGRAM } from "@/config/senders";

export async function handleAccountLinkEvent(event: webhook.AccountLinkEvent) {
  const userId = event.source?.userId;
  const { result, nonce } = event.link;

  if (result !== "ok") {
    // เชื่อมไม่สำเร็จ LINE จะ "ไม่ส่ง replyToken" มาให้ (ดู accountLinkEvent.d.ts)
    // แปลว่าตอบกลับในแชทไม่ได้เลย ทำได้แค่ log ไว้ให้ไล่ย้อนได้
    // ฝั่งผู้ใช้เห็นหน้า error ของ LINE ไปแล้ว จึงไม่ได้เงียบสนิทเสียทีเดียว
    console.error(
      `[AccountLink] เชื่อมบัญชีไม่สำเร็จ (userId: ${userId ?? "unknown"}, nonce: ${nonce.slice(0, 8)}...)`
    );
    return;
  }

  if (!event.replyToken || !userId) {
    console.error("[AccountLink] event สำเร็จแต่ไม่มี replyToken หรือ userId");
    return;
  }

  const user = await completeRegistration(nonce, userId);

  if (!user) {
    // จับคู่ nonce ไม่ได้ = ข้อมูลที่กรอกหาไม่เจอ ไม่ควรทำเป็นว่าสำเร็จ
    await replyMessages(event.replyToken, [
      {
        type: "text",
        text: "เชื่อมบัญชีสำเร็จแล้ว แต่ระบบหาข้อมูลที่กรอกไว้ไม่เจอค่ะ 😢 รบกวนพิมพ์ “ลงทะเบียน” เพื่อเริ่มใหม่อีกครั้งน้า",
        sender: SENDER_PROGRAM,
      },
    ]);
    return;
  }

  console.log(`[AccountLink] ลงทะเบียนสำเร็จ: ${user.userName} (${userId})`);

  await replyMessages(event.replyToken, [
    {
      type: "text",
      text: `ลงทะเบียนสำเร็จแล้วค่ะ คุณ${user.userName ?? user.displayName} 🎉`,
      sender: SENDER_PROGRAM,
    },
    buildMemberCard(user),
  ]);
}
