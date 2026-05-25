import { prisma } from "@/lib/prisma";
import TableKeyword from "@/app/components/TableKeyword";

export default async function Page() {
  // 1. ดึงข้อมูลจากฐานข้อมูล (เรียงจากใหม่ไปเก่า)
  const keywords = await prisma.autoReply.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    // เปลี่ยนพื้นหลังของทั้งหน้าให้เป็นสีเทาอ่อนๆ เพื่อให้ตัวตารางสีขาวป๊อปอัปขึ้นมา
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      
      {/* ใช้ max-w-5xl (หรือ 6xl) และ mx-auto เพื่อ "จัดกึ่งกลางแนวนอน" ทั้งหมด */}
      <div className="max-w-6xl mx-auto">
        
        {/* ส่วนหัว (Header Section) */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Keyword Management
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Here you can manage your auto-reply keywords for the LineMe dashboard. 
            Add, edit, or remove rules to keep your bot smart.
          </p>
        </div>

        {/* ส่วนกล่องตาราง (Table Container) */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
          <TableKeyword initialData={keywords} />
        </div>
        
      </div>
    </div>
  );
}