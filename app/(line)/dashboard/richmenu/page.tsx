import { prisma } from "@/lib/prisma";
import TableRichmenu from "@/app/components/TableRichmenu";

export default async function RichMenuPage() {
  // 1. ดึงข้อมูล Rich Menu ทั้งหมดจาก Database (เรียงจากสร้างล่าสุดไปเก่าสุด)
  const richMenus = await prisma.richMenu.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    // จัดกึ่งกลางและใช้พื้นหลังสีเทาอ่อนให้ตารางสีขาวดูโดดเด่นขึ้นมา
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ส่วนหัว (Header Section) */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Rich Menu Management
          </h1>
          <p className="mt-2 text-base text-gray-500">
            จัดการเมนูแชทด้านล่าง (Rich Menu) สำหรับ LINE บอทของโรงเรียน 
            เพิ่ม, ลบ, หรือตั้งค่าเมนูเริ่มต้นได้ที่นี่
          </p>
        </div>

        {/* ส่วนกล่องตาราง (Table Container) */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          {/* 2. โยนข้อมูลที่ดึงมาเข้าสู่ Client Component */}
          <TableRichmenu initialData={richMenus} />
        </div>
        
      </div>
    </div>
  );
}