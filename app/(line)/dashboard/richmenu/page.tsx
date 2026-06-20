import { prisma } from "@/lib/prisma";
import TableRichmenu from "@/app/components/TableRichmenu";

export default async function RichMenuPage() {
  // 1. ดึงข้อมูล Rich Menu ทั้งหมดจาก Database (เรียงจากสร้างล่าสุดไปเก่าสุด)
  const richMenus = await prisma.richMenu.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ส่วนหัว (Header Section) */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Rich Menu Management
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 ml-[52px]">
            จัดการเมนูแชทด้านล่าง (Rich Menu) สำหรับ LINE บอท เพิ่ม ลบ หรือตั้งค่าเมนูเริ่มต้นได้ที่นี่
          </p>
        </div>

        {/* ส่วนกล่องตาราง (Table Container) */}
        <div className="bg-white/70 backdrop-blur-sm p-5 md:p-7 rounded-2xl shadow-sm border border-slate-200/80">
          {/* 2. โยนข้อมูลที่ดึงมาเข้าสู่ Client Component */}
          <TableRichmenu initialData={richMenus} />
        </div>
        
      </div>
    </div>
  );
}