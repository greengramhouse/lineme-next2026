"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={handleAddNew}
          className="bg-green-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
        >
          + Add Rich Menu
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200 w-full p-4">
        <table className="min-w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold">Preview</th>
              <th className="px-6 py-4 font-bold">Name</th>
              <th className="px-6 py-4 font-bold">Rich Menu ID</th> 
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold">Created At</th>
              <th className="px-6 py-4 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialData.length > 0 ? (
              initialData.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-24 h-auto object-cover rounded shadow-sm border"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  
                  <td className="px-6 py-4">
                    {item.richMenuId ? (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-gray-600 truncate max-w-30" title={item.richMenuId}>
                          {item.richMenuId}
                        </span>
                        <button
                          onClick={() => handleCopy(item.richMenuId!)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition flex items-center justify-center"
                          title="คัดลอก ID"
                        >
                          {/* สลับไอคอนเมื่อกด Copy */}
                          {copiedId === item.richMenuId ? "✅" : "📋"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">ไม่มีข้อมูล</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.isDefault ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.isDefault ? "🌟 Default Menu" : "Normal"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(item.createdAt).toLocaleDateString("th-TH")}
                  </td>
                  
                  <td className="px-6 py-4 text-center space-x-3">
                    <button 
                      onClick={() => handleDelete(item.id, item.richMenuId)}
                      className="font-medium text-red-600 hover:text-red-800 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  ยังไม่มีข้อมูล Rich Menu ในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200 p-6">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Rich Menu</h2>
            
            <FormRichmenu onSuccess={() => { 
              setIsModalOpen(false); 
              router.refresh(); 
            }} />
            
          </div>
        </div>
      )}
    </div>
  );
}