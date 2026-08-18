"use client";

import { useState } from "react";
import { submitRegistrationAction } from "@/app/actions/registerAction";

/**
 * ฟอร์มลงทะเบียน — จงใจมีแค่ 3 ช่อง
 *
 * linkToken ของ LINE ตายใน 10 นาที ถ้าฟอร์มยาวจนกรอกไม่ทัน ผู้ใช้จะกดส่งแล้วเจอ
 * หน้า error ของ LINE โดยที่เราช่วยอะไรไม่ได้เลย (LINE ไม่ยิง webhook มาให้ด้วยซ้ำ)
 */
export default function RegisterForm({ sessionId }: { sessionId: string }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await submitRegistrationAction(sessionId, {
      fullName,
      phone,
      birthday,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // ส่งต่อไปหน้าเชื่อมบัญชีของ LINE — ตัวเราตอบอะไรกลับเข้าแชทตรงนี้ไม่ได้
    // ต้องให้ LINE เป็นคนยิง event accountLink กลับมาให้เราตอบด้วย replyToken
    // ใช้ location.replace เพื่อไม่ให้ผู้ใช้กด back กลับมาที่ฟอร์มที่ใช้ไปแล้ว
    window.location.replace(result.redirectUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อ-นามสกุล
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="กรอกชื่อและนามสกุลของคุณ"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-800"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          เบอร์โทรศัพท์
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0812345678"
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-800"
        />
      </div>

      <div>
        <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">
          วันเกิด
        </label>
        <input
          id="birthday"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-gray-800"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || !fullName || !phone || !birthday}
        className="w-full bg-[#06C755] hover:bg-[#05b34c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
      >
        {loading ? "กำลังบันทึก..." : "ยืนยันการลงทะเบียน"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        กดยืนยันแล้วระบบจะพาไปหน้ายืนยันของ LINE
        <br />
        แล้วส่งบัตรสมาชิกกลับเข้าแชทให้อัตโนมัติ
      </p>
    </form>
  );
}
