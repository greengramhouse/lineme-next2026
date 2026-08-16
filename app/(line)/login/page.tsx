import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminIdentity } from "@/lib/adminAuth";
import LoginCard from "./LoginCard";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ · Lineme",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  // ล็อกอินอยู่แล้วก็ไม่ต้องเห็นหน้านี้อีก
  const admin = await getAdminIdentity();
  if (admin) {
    redirect(safeRedirect(params.redirect));
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      {/* วงกลมเบลอเป็นฉากหลัง ให้หน้าไม่โล่งจนเกินไป */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <Suspense>
        <LoginCard redirectTo={safeRedirect(params.redirect)} error={params.error} />
      </Suspense>
    </main>
  );
}

/**
 * กัน open redirect — รับเฉพาะ path ภายในเว็บเรา
 *
 * ถ้าไม่กรอง ใครก็ส่ง /login?redirect=https://evil.example มาหลอกให้คนกดล็อกอิน
 * แล้วเด้งออกไปเว็บปลอมได้
 */
function safeRedirect(value: string | undefined): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
