"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import FriendshipModal from "../../components/FriendshipModal";
import { useLiffStore } from "../../store/liffStore";
import { saveUserNameAction } from "@/app/actions/userAction";

function FormContent() {
  const searchParams = useSearchParams();
  // const testkey = searchParams.get("testkey"); // Keep it if needed, but not showing for now
  
  const profile = useLiffStore((state) => state.profile);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!userName || userName.trim().length <= 3) {
      setMessage({ text: "กรุณากรอกชื่อ-นามสกุลให้มากกว่า 3 ตัวอักษร", type: "error" });
      return;
    }

    if (!profile?.userId) {
      setMessage({ text: "ไม่พบข้อมูลผู้ใช้ LINE กรุณาล็อกอินใหม่", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const result = await saveUserNameAction(
        profile.userId, 
        userName.trim(), 
        profile.email,
        profile.displayName,
        profile.pictureUrl
      );
      
      if (result.success) {
        setMessage({ text: "บันทึกข้อมูลสำเร็จ!", type: "success" });
        setUserName(""); // เคลียร์ฟอร์ม
        
        // ซ่อนข้อความอัตโนมัติหลังจาก 3 วินาที
        setTimeout(() => {
          setMessage({ text: "", type: "" });
        }, 3000);
      } else {
        setMessage({ text: result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">ลงทะเบียนผู้ใช้งาน</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ-นามสกุล
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-800"
            placeholder="กรอกชื่อและนามสกุลของคุณ"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">ต้องมีความยาวมากกว่า 3 ตัวอักษร</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-xl text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || userName.trim().length <= 3}
          className="w-full bg-[#06C755] hover:bg-[#05b34c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </button>
      </form>
    </div>
  );
}

export default function UserFormPage() {
  return (
    <>
      <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading form...</div>}>
        <FormContent />
      </Suspense>
      <FriendshipModal />
    </>
  );
}