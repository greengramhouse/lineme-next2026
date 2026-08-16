// proxy.ts
//
// ⚠️ ไฟล์นี้เคยชื่อ middleware.ts — Next 16 เปลี่ยนชื่อ convention เป็น proxy.ts แล้ว
// (ดู node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
//
// ตรงนี้เป็นแค่ **ด่านหน้า** ดูว่ามีคุกกี้ session ไหมแบบเร็ว ๆ ไม่แตะฐานข้อมูล
// ด่านจริงที่ตรวจ allowlist อยู่ที่ lib/adminAuth.ts ซึ่งถูกเรียกในทุก API route
// และใน layout ของ dashboard
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  if (hasSession) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  // API เรียกจาก JS ให้ตอบ 401 ไปตรง ๆ redirect ไปหน้า login ไม่มีประโยชน์
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "ต้องเข้าสู่ระบบด้วยบัญชีแอดมินก่อน" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // ใช้ allowlist ไม่ใช่ "ครอบทุกอย่างแล้วเจาะรู"
  // เพราะถ้าเพิ่มเส้นใหม่ในอนาคตแล้วลืมเจาะรู จะพังแบบเงียบ ๆ แทนที่จะแค่ไม่ถูกป้องกัน
  //
  // 🔴 ห้ามใส่ /api/line-webhook เด็ดขาด — LINE ล็อกอินไม่ได้ มันยืนยันตัวตนด้วย
  //    x-line-signature ของมันเอง ถ้าครอบเข้าไปบอทจะได้ 401 ทุก request แล้วตายทันที
  // 🔴 ห้ามใส่ /api/auth/** — เป็นเส้นที่ใช้ล็อกอิน ถ้าครอบจะเข้าไม่ได้เลย (chicken-and-egg)
  // 🔴 ห้ามใส่ /form/** — เป็นหน้า LIFF ของผู้ใช้ LINE ทั่วไป
  matcher: [
    "/dashboard/:path*",
    "/api/keywords/:path*",
    "/api/richmenu/:path*",
    "/api/bot/:path*",
  ],
};
