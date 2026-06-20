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
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          ทั้งหมด <span className="font-semibold text-slate-700">{initialData.length}</span> รายการ
        </p>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Keyword
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Keyword
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Match Type
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialData.length > 0 ? (
              initialData.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 text-xs">
                        #
                      </span>
                      {item.keyword}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      item.matchType === "EXACT"
                        ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                        : "bg-amber-50 text-amber-700 border border-amber-200/80"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        item.matchType === "EXACT" ? "bg-blue-500" : "bg-amber-500"
                      }`} />
                      {item.matchType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100/0 group-hover:bg-slate-100 p-0.5 transition">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">ยังไม่มี Keyword ในระบบ</p>
                    <p className="text-xs text-slate-400">กดปุ่ม &quot;Add Keyword&quot; เพื่อเพิ่มคีย์เวิร์ดใหม่</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6 ring-1 ring-slate-200/50">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl w-8 h-8 flex items-center justify-center transition"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-800">
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