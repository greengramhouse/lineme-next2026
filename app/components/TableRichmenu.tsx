"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import FormRichmenu from "./FormRichmenu";

interface RichMenuItem {
  id: string;
  richMenuId: string | null;
  name: string;
  imageUrl: string;
  payload: any;
  isDefault: boolean;
  createdAt: Date;
}

export default function TableRichmenu({ initialData }: { initialData: RichMenuItem[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null); // 🌟 State สำหรับเก็บ ID ที่เพิ่งก๊อปปี้
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  // 🌟 ฟังก์ชันสำหรับคัดลอกข้อความ
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    
    // รีเซ็ตไอคอนกลับเป็นเหมือนเดิมหลังจากผ่านไป 2 วินาที
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleDelete = async (id: string, richMenuId: string | null) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ Rich Menu นี้? ระบบจะลบข้อมูลออกจาก LINE ด้วย")) {
      try {
        const response = await fetch(`/api/richmenu/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          alert("ลบข้อมูลสำเร็จ");
          router.refresh();
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
          Add Rich Menu
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Preview</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rich Menu ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created At</th>
              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialData.length > 0 ? (
              initialData.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors duration-150">
                  {/* Preview Image */}
                  <td className="px-6 py-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm group-hover:shadow-md group-hover:border-slate-300 transition-all duration-200 w-28">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </td>
                  
                  {/* Rich Menu ID */}
                  <td className="px-6 py-4">
                    {item.richMenuId ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 truncate max-w-[180px]" title={item.richMenuId}>
                          {item.richMenuId}
                        </span>
                        <button
                          onClick={() => handleCopy(item.richMenuId!)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all duration-200 ${
                            copiedId === item.richMenuId 
                              ? "bg-green-100 text-green-600" 
                              : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                          }`}
                          title="คัดลอก ID"
                        >
                          {/* สลับไอคอนเมื่อกด Copy */}
                          {copiedId === item.richMenuId ? "✅" : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">ไม่มีข้อมูล</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      item.isDefault 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}>
                      {item.isDefault && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                        </span>
                      )}
                      {item.isDefault ? "Default Menu" : "Normal"}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(item.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(item.id, item.richMenuId)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">ยังไม่มีข้อมูล Rich Menu ในระบบ</p>
                    <p className="text-xs text-slate-400">กดปุ่ม &quot;Add Rich Menu&quot; เพื่อเพิ่มเมนูใหม่</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isMounted && isModalOpen && createPortal(
        <div className="relative z-[100]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

          {/* Scrollable Container */}
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              
              {/* Modal Panel */}
              <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl ring-1 ring-slate-200/50">
                
                {/* Header (Sticky so it stays visible when scrolling down) */}
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white p-6 pb-4">
                  <h2 className="text-xl font-bold text-slate-800" id="modal-title">Add New Rich Menu</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl w-8 h-8 flex items-center justify-center transition"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Body */}
                <div className="p-6 bg-white">
                  <FormRichmenu onSuccess={() => { 
                    setIsModalOpen(false); 
                    router.refresh(); 
                  }} />
                </div>
                
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}