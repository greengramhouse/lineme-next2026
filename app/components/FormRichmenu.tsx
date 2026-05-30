"use client";

import { useState, ChangeEvent, FormEvent } from "react";

interface FormRichmenuProps {
  onSuccess: () => void; // ฟังก์ชันสั่งปิด Modal และรีเฟรชตาราง
}

export default function FormRichmenu({ onSuccess }: FormRichmenuProps) {
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    aliasId: "", // 🌟 เพิ่ม state สำหรับ Alias
    payload: "",
    isDefault: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [aliasError, setAliasError] = useState(""); // state สำหรับโชว์ Error ของ Alias

  // ฟังก์ชันจัดการเมื่อพิมพ์ข้อมูลลงช่องต่างๆ
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    // 🌟 1. ดักจับและตรวจรูปแบบ Alias ขณะพิมพ์ (Frontend Validation)
    if (name === "aliasId") {
      // กฎ LINE: a-z, 0-9, underscore (_), hyphen (-) เท่านั้น
      const aliasRegex = /^[a-z0-9_-]*$/; 
      
      if (!aliasRegex.test(value)) {
        setAliasError("รูปแบบไม่ถูกต้อง: ใช้ได้เฉพาะ a-z, 0-9, _, - เท่านั้นครับ");
      } else if (value.length > 32) {
        setAliasError("ยาวเกินไป: ห้ามเกิน 32 ตัวอักษรครับ");
      } else {
        setAliasError(""); // เคลียร์ Error ถ้าถูกต้อง
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ฟังก์ชันกด Submit ส่งข้อมูลไปที่ API
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // 🌟 2. ดักจับ Error ขั้นสุดท้ายก่อนส่ง: ถ้า Alias พัง ห้ามส่งข้อมูล
    if (formData.aliasId && aliasError) {
      alert("กรุณาแก้ไขรูปแบบ Rich Menu Alias ID ให้ถูกต้องก่อนบันทึกครับ");
      return;
    }

    setIsLoading(true);
    console.log("Submitting form with data:", formData);

    try {
      // 🌟 3. ดักจับ Error JSON เหมือนเดิม
      const parsedPayload = JSON.parse(formData.payload);

      // 🌟 4. ส่งข้อมูลไปที่ API (เพิ่ม aliasId ไปใน body)
      const response = await fetch("/api/richmenu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          imageUrl: formData.imageUrl,
          aliasId: formData.aliasId || null, // ส่ง null ถ้าไม่ได้กรอก
          payload: parsedPayload,
          isDefault: formData.isDefault,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("สร้าง Rich Menu และตั้งค่าเรียบร้อยแล้วครับ!");
        onSuccess(); // สั่งปิด Modal และรีเฟรชตาราง
      } else {
        // ดัก Error กรณี alias ซ้ำ (Backend ส่งกลับมา)
        if (result.error && result.error.includes("Alias")) {
          alert("เกิดข้อผิดพลาด: ชื่อ Alias นี้ถูกใช้ไปแล้ว กรุณาตั้งชื่อใหม่ครับ");
        } else {
          alert("เกิดข้อผิดพลาด: " + result.error);
        }
      }
    } catch (error) {
      alert("รูปแบบ JSON ในช่อง Payload ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ");
      console.error("JSON Parse Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      
      {/* 1. ช่องใส่ชื่อ Rich Menu */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อ Rich Menu (สำหรับระบบ)</label>
        <input 
          required 
          type="text" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          placeholder="เช่น เมนูหลักฝั่งผู้ปกครอง"
          className="w-full rounded-md border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" 
        />
      </div>

      {/* 2. ช่องใส่ URL รูปภาพ */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL (ลิงก์รูปภาพ ขนาดต้องเป๊ะ)</label>
        <input 
          required 
          type="url" 
          name="imageUrl" 
          value={formData.imageUrl} 
          onChange={handleChange} 
          placeholder="https://res.cloudinary.com/..."
          className="w-full rounded-md border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500" 
        />
        <p className="text-xs text-gray-500 mt-1">
          แนะนำอัปโหลดลง Cloudinary แล้วนำลิงก์ตรงมาวาง ขนาดรูปต้องตรงกับใน JSON เป๊ะๆ
        </p>
      </div>

      {/* 🌟 3. ช่องใส่ Rich Menu Alias ID (เพิ่มใหม่) */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-semibold text-gray-700">Rich Menu Alias ID (ไม่บังคับ)</label>
          {aliasError && (
            <span className="text-xs text-red-600 animate-pulse">{aliasError}</span>
          )}
        </div>
        <input 
          type="text" 
          name="aliasId" 
          value={formData.aliasId} 
          onChange={handleChange} 
          placeholder="เช่น menu_parent_page1"
          className={`w-full rounded-md border p-2.5 focus:outline-none focus:ring-2 ${
            aliasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-green-500'
          } font-mono`} // ใช้ font-mono เพื่อให้เห็นช่องว่างชัดเจน
        />
        <div className="text-xs text-gray-500 mt-1.5 space-y-1 bg-gray-50 p-2 rounded border">
          <p>• จำเป็นสำหรับการทำปุ่ม <span className="font-semibold text-gray-700">สลับเมนูสลับหน้า (richmenuSwitch)</span></p>
          <p>• กฎ LINE: ภาษาอังกฤษตัวเล็ก (a-z), ตัวเลข (0-9), <span className="font-mono">_</span> , <span className="font-mono">-</span> เท่านั้น ห้ามเกิน 32 ตัวอักษร</p>
        </div>
      </div>

      {/* 4. ช่องใส่ JSON Payload */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">JSON Payload (ก๊อปปี้มาแปะ)</label>
        <textarea 
          required 
          rows={10} 
          name="payload" 
          value={formData.payload} 
          onChange={handleChange} 
          placeholder='{"size": {"width": 2500, "height": 1686}, ...}'
          className="w-full rounded-md border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs" 
        />
      </div>

      {/* 5. Checkbox ตั้งเป็น Default Menu */}
      <div className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200">
        <input
          type="checkbox"
          id="isDefault"
          name="isDefault"
          checked={formData.isDefault}
          onChange={handleChange}
          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
        />
        <label htmlFor="isDefault" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
          ตั้งเป็นเมนูเริ่มต้น (Default Menu) 
          <span className="block text-xs font-normal text-gray-500">
            หากเลือก LINE จะแสดงเมนูนี้ให้ผู้ใช้ทุกคนโดยอัตโนมัติ
          </span>
        </label>
      </div>

      {/* ปุ่ม บันทึก */}
      <div className="flex justify-end pt-2 border-t mt-4">
        <button
          type="submit"
          disabled={isLoading || !!aliasError} // ดึงปุ่มถ้ากำลังโหลด หรือ alias มี error
          className={`px-6 py-2.5 text-white font-medium rounded-md shadow-sm transition ${
            isLoading || !!aliasError ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isLoading ? "กำลังบันทึกและส่งข้อมูล..." : "บันทึก Rich Menu"}
        </button>
      </div>
    </form>
  );
}