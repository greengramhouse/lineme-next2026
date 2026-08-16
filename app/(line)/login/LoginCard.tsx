"use client";

import { useState } from "react";
import { signIn } from "@/lib/authClient";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized:
    "บัญชี LINE นี้ไม่มีสิทธิ์เข้าใช้งาน Dashboard — ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์",
  access_denied: "คุณยกเลิกการเข้าสู่ระบบ ลองใหม่อีกครั้งได้เลย",
};

export default function LoginCard({
  redirectTo,
  error,
}: {
  redirectTo: string;
  error?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง") : null
  );

  async function handleLineLogin() {
    setIsLoading(true);
    setFailed(null);

    const { error: signInError } = await signIn.social({
      provider: "line",
      callbackURL: redirectTo,
      errorCallbackURL: "/login?error=unauthorized",
    });

    if (signInError) {
      setFailed("เชื่อมต่อ LINE ไม่สำเร็จ ลองใหม่อีกครั้ง");
      setIsLoading(false);
    }
    // ถ้าสำเร็จ เบราว์เซอร์จะถูกพาไปหน้า LINE ต่อเอง ไม่ต้องปิด loading
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 ring-1 ring-slate-900/5 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 21l1.9-3.8A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Lineme Dashboard
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            เข้าสู่ระบบด้วยบัญชี LINE ที่ได้รับสิทธิ์ผู้ดูแล
            <br />
            เพื่อจัดการคีย์เวิร์ดและ Rich Menu
          </p>
        </div>

        {failed && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200"
          >
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-rose-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              />
            </svg>
            <span>{failed}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLineLogin}
          disabled={isLoading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-[#05b34c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#06C755] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              กำลังพาไปหน้า LINE...
            </>
          ) : (
            <>
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.48 2 2 5.82 2 10.52c0 4.21 3.56 7.74 8.37 8.41.33.07.77.22.88.5.1.26.07.66.03.92l-.14.85c-.04.25-.2.98.86.53s5.7-3.36 7.78-5.75c1.43-1.57 2.12-3.17 2.12-5.46C22 5.82 17.52 2 12 2zM8.1 13.2H6.06a.53.53 0 01-.53-.53V8.6a.53.53 0 111.06 0v3.54H8.1a.53.53 0 010 1.06zm2.08-.53a.53.53 0 11-1.06 0V8.6a.53.53 0 111.06 0v4.07zm4.9 0a.53.53 0 01-.95.32l-2.09-2.84v2.52a.53.53 0 11-1.06 0V8.6a.53.53 0 01.95-.32l2.09 2.84V8.6a.53.53 0 111.06 0v4.07zm3.35-2.57a.53.53 0 010 1.06h-1.5v.94h1.5a.53.53 0 010 1.06h-2.03a.53.53 0 01-.53-.53V8.6c0-.29.24-.53.53-.53h2.03a.53.53 0 010 1.06h-1.5v.94h1.5z" />
              </svg>
              เข้าสู่ระบบด้วย LINE
            </>
          )}
        </button>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          เฉพาะบัญชีที่อยู่ในรายชื่อผู้ดูแลเท่านั้นจึงจะเข้าได้
          <br />
          หน้านี้ไม่เกี่ยวกับผู้ใช้ทั่วไปที่คุยกับบอทใน LINE
        </p>
      </div>
    </div>
  );
}
