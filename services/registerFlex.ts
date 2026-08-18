// services/registerFlex.ts
//
// ข้อความ Flex ของ flow ลงทะเบียน — แยกออกมาจาก handler เพราะเป็นงาน "หน้าตา" ล้วน ๆ
// handler จะได้เหลือแต่ลำดับการทำงาน อ่านแล้วเห็นภาพรวมทันที
import { messagingApi } from "@line/bot-sdk";
import { SENDER_PROGRAM } from "@/config/senders";

/** สีเขียวของ LINE — ใช้เป็นสีหลักของการ์ดให้กลมกลืนกับแอป */
const LINE_GREEN = "#06C755";

/** แปลง "2543-03-05" เป็น "5 มี.ค. 2543" — ถ้าแปลงไม่ได้คืนค่าเดิมไป ไม่ต้องพัง */
function formatThaiDate(value: string | null): string {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

/** 0812345678 → 081-234-5678 อ่านง่ายขึ้นบนการ์ด */
function formatPhone(value: string | null): string {
  if (!value) return "-";
  if (value.length === 10) return `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
  if (value.length === 9) return `${value.slice(0, 2)}-${value.slice(2, 5)}-${value.slice(5)}`;
  return value;
}

/** หนึ่งบรรทัดข้อมูลบนบัตร: ป้ายซ้าย ค่าขวา */
function row(label: string, value: string): messagingApi.FlexBox {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, color: "#8C8C8C", size: "sm", flex: 2 },
      { type: "text", text: value, wrap: true, color: "#333333", size: "sm", flex: 5 },
    ],
  };
}

/**
 * ข้อความชวนกรอกฟอร์ม — ตอบตอนผู้ใช้พิมพ์ "ลงทะเบียน"
 *
 * บอกเวลาหมดอายุไว้บนการ์ดด้วย เพราะ linkToken ตายใน 10 นาที
 * ถ้าไม่บอก ผู้ใช้ที่เปิดค้างไว้แล้วกลับมากรอกทีหลังจะเจอ error โดยไม่รู้สาเหตุ
 */
export function buildRegisterInvite(url: string, expiresAt: Date): messagingApi.Message {
  const deadline = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(expiresAt);

  return {
    type: "flex",
    altText: "ลงทะเบียนสมาชิก — กดเปิดฟอร์มได้เลยค่ะ",
    sender: SENDER_PROGRAM,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "ลงทะเบียนสมาชิก", weight: "bold", size: "xl", color: "#333333" },
          {
            type: "text",
            text: "กรอกชื่อ เบอร์โทร และวันเกิด แล้วรับบัตรสมาชิกกลับมาในแชทนี้ได้เลยค่ะ",
            wrap: true,
            size: "sm",
            color: "#666666",
          },
          {
            type: "text",
            text: `⏰ ลิงก์นี้ใช้ได้ถึง ${deadline} น. และใช้ได้ครั้งเดียว`,
            wrap: true,
            size: "xs",
            color: "#D9534F",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: LINE_GREEN,
            action: { type: "uri", label: "เปิดฟอร์มลงทะเบียน", uri: url },
          },
        ],
      },
    },
  };
}

interface MemberCardData {
  id: string;
  displayName: string;
  pictureUrl: string | null;
  userName: string | null;
  phone: string | null;
  birthday: string | null;
  registeredAt: Date | null;
}

/**
 * บัตรสมาชิก — ตอบด้วย replyToken ของ event accountLink จึงไม่กินโควตา push
 */
export function buildMemberCard(user: MemberCardData): messagingApi.Message {
  const memberNo = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const registeredAt = user.registeredAt ?? new Date();

  const header: messagingApi.FlexBox = {
    type: "box",
    layout: "vertical",
    backgroundColor: LINE_GREEN,
    paddingAll: "16px",
    contents: [
      { type: "text", text: "บัตรสมาชิก", color: "#FFFFFF", size: "sm" },
      {
        type: "text",
        text: user.userName ?? user.displayName,
        color: "#FFFFFF",
        size: "xl",
        weight: "bold",
        wrap: true,
      },
      { type: "text", text: `No. ${memberNo}`, color: "#E8FFF1", size: "xs" },
    ],
  };

  const body: messagingApi.FlexBox = {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: [
      row("ชื่อ LINE", user.displayName),
      row("เบอร์โทร", formatPhone(user.phone)),
      row("วันเกิด", formatThaiDate(user.birthday)),
      row(
        "สมัครเมื่อ",
        new Intl.DateTimeFormat("th-TH", {
          dateStyle: "medium",
          timeZone: "Asia/Bangkok",
        }).format(registeredAt)
      ),
    ],
  };

  // รูปโปรไฟล์เป็น optional — บางคนไม่ได้ตั้งไว้ ถ้าใส่ url ว่างลงไป LINE จะตอบ 400
  if (user.pictureUrl) {
    body.contents.unshift({
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "image",
          url: user.pictureUrl,
          size: "md",
          aspectMode: "cover",
          aspectRatio: "1:1",
        },
      ],
      cornerRadius: "100px",
      width: "72px",
      height: "72px",
      paddingAll: "0px",
    });
  }

  return {
    type: "flex",
    altText: `ลงทะเบียนสำเร็จ — บัตรสมาชิกของคุณ ${user.userName ?? user.displayName}`,
    sender: SENDER_PROGRAM,
    contents: {
      type: "bubble",
      header,
      body,
      styles: { header: { backgroundColor: LINE_GREEN } },
    },
  };
}
