"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 🌟 นำเข้า useRouter
import FormKeyword from "./formKeyword";

interface KeywordItem {
  id: string;
  keyword: string;
  matchType: string;
  payload: any; // 🌟 เพิ่ม payload เพื่อเอาไปแสดงตอนแก้ไข
  isActive: boolean;
  createdAt: Date;
}

export default function TableKeyword({ initialData }: { initialData: KeywordItem[] }) {
  const router = useRouter(); // 🌟 เรียกใช้ router

  // State จัดการ Modal และข้อมูลที่จะแก้ไข
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeywordItem | null>(null);

  // 🌟 ฟังก์ชันเปิด Modal สำหรับการ "แก้ไข"
  const handleEdit = (item: KeywordItem) => {
    setEditingItem(item); // เก็บข้อมูลแถวที่กดลง State
    setIsModalOpen(true); // เปิด Modal
  };

  // 🌟 ฟังก์ชันเปิด Modal สำหรับการ "เพิ่มใหม่"
  const handleAddNew = () => {
    setEditingItem(null); // ล้างข้อมูลเก่า
    setIsModalOpen(true); // เปิด Modal
  };

  // 🌟 ฟังก์ชันจัดการปิด Modal และรีเฟรชตาราง
  const handleModalSuccess = () => {
    setIsModalOpen(false); // ปิด Modal
    setEditingItem(null);
    router.refresh(); // 🌟 สั่ง Next.js ไปดึงข้อมูลใหม่จาก Server มาเปลี่ยนในตารางแบบสดๆ!
  };

  // 🌟 ฟังก์ชัน "ลบ" ของจริง
  const handleDelete = async (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ Keyword นี้? ข้อมูลจะไม่สามารถกู้คืนได้")) {
      try {
        const response = await fetch(`/api/keywords/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          alert("ลบข้อมูลสำเร็จ");
          router.refresh(); // 🌟 สั่งอัปเดตตาราง
        } else {
          const result = await response.json();
          alert("ลบไม่สำเร็จ: " + result.error);
        }
      } catch (error) {
        console.error(error);
        alert("ระบบขัดข้อง ไม่สามารถลบข้อมูลได้");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddNew} // ใช้ฟังก์ชัน Add New
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          + Add Keyword
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border w-full">
        {/* ... (ส่วน <table ...> และ <thead> เหมือนเดิม) ... */}
        <table className="min-w-full text-sm text-left text-gray-500">
           <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
             <tr>
               <th className="px-6 py-4">Keyword</th>
               <th className="px-6 py-4">Match Type</th>
               <th className="px-6 py-4 text-center">Actions</th>
             </tr>
           </thead>
           <tbody>
             {initialData.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{item.keyword}</td>
                  <td className="px-6 py-4">{item.matchType}</td>
                  <td className="px-6 py-4 text-center space-x-3">
                    <button 
                      onClick={() => handleEdit(item)} // 🌟 ส่ง item ทั้งก้อนไป
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} // 🌟 ส่ง id ไปลบ
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
             ))}
           </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? "Edit Keyword" : "Add New Keyword"}
            </h2>
            
            {/* 🌟 เรียกใช้ Form พร้อมโยน Props เข้าไป */}
            <FormKeyword 
              editData={editingItem} 
              onSuccess={handleModalSuccess} 
            />
          </div>
        </div>
      )}
    </div>
  );
}