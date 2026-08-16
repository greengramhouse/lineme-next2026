import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBotPersona } from "@/services/botConfigService";
import BotConfigEditor from "@/app/components/BotConfigEditor";

export const metadata: Metadata = {
  title: "ตั้งค่าน้องกรีน · Lineme",
};

export default async function BotConfigPage() {
  const [persona, schoolInfo] = await Promise.all([
    getBotPersona(),
    prisma.schoolInfo.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ตั้งค่าน้องกรีน
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            แก้ข้อมูลที่น้องกรีนใช้ตอบคำถาม — บันทึกแล้วมีผลทันที ไม่ต้อง deploy ใหม่
          </p>
        </div>

        <BotConfigEditor initialPersona={persona} initialSchoolInfo={schoolInfo} />
      </div>
    </div>
  );
}
