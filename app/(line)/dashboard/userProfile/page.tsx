import { prisma } from "@/lib/prisma";
import TableUserProfile from "@/app/components/TableUserProfile";

export default async function UserProfilePage() {
  // ดึงข้อมูลผู้ใช้ทั้งหมด (เรียงจากใหม่ไปเก่า)
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* ส่วนหัว (Header Section) */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                User Profiles
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">
            รายการผู้ใช้ที่ติดตามบอท LINE ของคุณ ดูข้อมูลโปรไฟล์และสถานะการติดตามได้ที่นี่
          </p>
        </div>

        {/* ส่วนตาราง */}
        <TableUserProfile initialData={users} />

      </div>
    </div>
  );
}
