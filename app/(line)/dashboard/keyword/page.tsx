import { prisma } from "@/lib/prisma";
import TableKeyword from "@/app/components/TableKeyword";

export default async function Page() {
  // 1. ดึงข้อมูลจากฐานข้อมูล (เรียงจากใหม่ไปเก่า)
  const keywords = await prisma.autoReply.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ส่วนหัว (Header Section) */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Keyword Management
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">
            จัดการคีย์เวิร์ดตอบกลับอัตโนมัติสำหรับ LINE บอท เพิ่ม แก้ไข หรือลบกฎเกณฑ์ได้ที่นี่
          </p>
        </div>

        {/* ส่วนกล่องตาราง (Table Container) */}
        <div className="bg-white/70 backdrop-blur-sm p-5 md:p-7 rounded-2xl shadow-sm border border-slate-200/80">
          <TableKeyword initialData={keywords} />
        </div>
        
      </div>
    </div>
  );
}