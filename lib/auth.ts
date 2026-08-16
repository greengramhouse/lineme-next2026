// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[auth] ไม่พบ environment variable "${name}"`);
  }
  return value;
}

/**
 * LINE userId ที่มีสิทธิ์เข้า dashboard
 *
 * จำเป็นต้องมี เพราะลำพัง LINE Login แปลว่า "ใครมีบัญชี LINE ก็ล็อกอินได้"
 * allowlist คือตัวบอกว่าใครเป็นแอดมิน
 */
export function getAdminLineIds(): string[] {
  return (process.env.ADMIN_LINE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminLineId(lineId: string | null | undefined): boolean {
  if (!lineId) return false;
  return getAdminLineIds().includes(lineId);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  secret: requireEnv("BETTER_AUTH_SECRET"),
  baseURL: process.env.BETTER_AUTH_URL,

  // ⚠️ ต้องเปลี่ยนชื่อ model ทั้ง 4 ตัว
  // ค่า default ของ Better Auth คือ user/session/account/verification
  // ซึ่ง `user` จะไปชนกับ prisma.user = ตารางผู้ติดตามบอทใน LINE ที่มีอยู่แล้ว
  // คนละความหมายกันสิ้นเชิง (ของเดิม = คนที่แอดบอท, ของนี่ = แอดมินที่ล็อกอิน)
  //
  // ⚠️ ต้องเป็น camelCase — prisma adapter เรียก db[modelName] ตรง ๆ ไม่แปลงตัวอักษรให้
  // ส่วน Prisma client ตั้งชื่อ accessor เป็น camelCase (model AdminUser → prisma.adminUser)
  // ถ้าใส่ "AdminUser" จะพังตอน runtime ว่า Model AdminUser does not exist
  user: { modelName: "adminUser" },
  session: { modelName: "adminSession" },
  account: { modelName: "adminAccount" },
  verification: { modelName: "adminVerification" },

  // ไม่เปิด email+password — เข้าได้ทางเดียวคือ LINE Login
  emailAndPassword: { enabled: false },

  socialProviders: {
    line: {
      clientId: requireEnv("LINE_LOGIN_CHANNEL_ID"),
      clientSecret: requireEnv("LINE_LOGIN_CHANNEL_SECRET"),
      // scope default คือ openid profile email
      // channel นี้ได้รับอนุมัติ Email address permission แล้ว จึงใช้ค่า default ได้
    },
  },

  databaseHooks: {
    session: {
      create: {
        // ด่านแรก: ปฏิเสธตั้งแต่ตอนสร้าง session ถ้าไม่ได้อยู่ใน allowlist
        // คนที่ไม่มีสิทธิ์จะไม่ได้ session ติดมือกลับไปเลย
        before: async (session) => {
          const lineAccount = await prisma.adminAccount.findFirst({
            where: { userId: session.userId, providerId: "line" },
            select: { accountId: true },
          });

          // accountId ของ provider line คือ sub จาก LINE = LINE userId
          if (!isAdminLineId(lineAccount?.accountId)) {
            console.warn(
              `[auth] ปฏิเสธการล็อกอิน — LINE userId ${lineAccount?.accountId ?? "ไม่ทราบ"} ไม่ได้อยู่ใน ADMIN_LINE_IDS`
            );
            return false;
          }

          return;
        },
      },
    },
  },

  // ต้องอยู่ท้ายสุดของ plugins — จัดการ cookie ให้ทำงานกับ Next server action/route handler
  plugins: [nextCookies()],
});
