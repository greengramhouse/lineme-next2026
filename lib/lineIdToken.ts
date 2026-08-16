// lib/lineIdToken.ts
import "server-only";

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export interface VerifiedLineUser {
  /** LINE userId ที่ LINE รับรองแล้ว — ปลอมไม่ได้ */
  lineId: string;
  displayName: string | null;
  pictureUrl: string | null;
  email: string | null;
}

interface LineVerifyResponse {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
  email?: string;
}

/**
 * ยืนยัน ID token ที่ได้จาก liff.getIDToken() กับ LINE
 *
 * ทำไมต้องมี: เดิม client ส่ง lineId มาตรง ๆ แล้วเซิร์ฟเวอร์เชื่อเลย
 * ใครก็ยิง server action พร้อม lineId ของคนอื่นเพื่อเขียนทับข้อมูลได้
 *
 * ID token เป็น JWT ที่ LINE เซ็น ปลอมไม่ได้ และ endpoint นี้จะเช็คให้ด้วยว่า
 * token ออกให้ channel ของเราจริง (client_id) ไม่ใช่ token ของแอปอื่น
 * ที่ถูกขโมยมาใช้ต่อ — ตรงนี้สำคัญ ถ้าไม่ส่ง client_id ไปเทียบ
 * ใครก็เอา token จาก LIFF app อื่นมายิงใส่เราได้
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<VerifiedLineUser | null> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    console.error("[lineIdToken] ไม่พบ env LINE_LOGIN_CHANNEL_ID");
    return null;
  }

  if (!idToken) return null;

  try {
    const response = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: clientId,
      }),
      // ห้าม cache — token แต่ละใบไม่เหมือนกันและมีอายุ
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      console.warn(
        `[lineIdToken] LINE ปฏิเสธ token (${response.status}): ${detail.slice(0, 200)}`
      );
      return null;
    }

    const payload = (await response.json()) as LineVerifyResponse;

    if (!payload.sub) {
      console.warn("[lineIdToken] response ไม่มีฟิลด์ sub");
      return null;
    }

    return {
      lineId: payload.sub,
      displayName: payload.name ?? null,
      pictureUrl: payload.picture ?? null,
      email: payload.email ?? null,
    };
  } catch (error) {
    console.error("[lineIdToken] เชื่อมต่อ LINE เพื่อยืนยัน token ไม่สำเร็จ:", error);
    return null;
  }
}
