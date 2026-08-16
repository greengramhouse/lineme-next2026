// app/api/auth/[...all]/route.ts
// จุดรับ callback ของ LINE Login และ endpoint อื่น ๆ ของ Better Auth ทั้งหมด
// Callback URL ที่ต้องลงทะเบียนใน LINE Developers Console คือ
//   {baseURL}/api/auth/callback/line
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
