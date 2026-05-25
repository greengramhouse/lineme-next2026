"use client";
import { useState, ChangeEvent } from "react";

// สร้าง Type เพื่อรับค่าเข้ามา
interface FormKeywordProps {
  editData?: any; // ข้อมูลเดิม (ถ้ามีแปลว่ากำลังแก้ไข)
  onSuccess?: () => void; // ฟังก์ชันที่ให้ทำหลังบันทึกเสร็จ (เช่น ปิด Modal)
}

export default function FormKeyword({ editData, onSuccess }: FormKeywordProps) {
  // ถัามีข้อมูล editData ส่งมา ให้เอามาเป็นค่าเริ่มต้น แต่ถ้าไม่มีให้เป็นช่องว่าง
  const [formData, setFormData] = useState({
    keyword: editData?.keyword || "",
    matchType: editData?.matchType || "EXACT",
    // แปลง Object กลับเป็น JSON String สวยๆ เพื่อใส่ลงช่อง textarea
    payload: editData?.payload ? JSON.stringify(editData.payload, null, 2) : "", 
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsedPayload = JSON.parse(formData.payload);

      // 🌟 เช็คว่าเป็น โหมดแก้ไข หรือ โหมดเพิ่มใหม่
      const isEditMode = !!editData;
      const url = isEditMode ? `/api/keywords/${editData.id}` : "/api/keywords";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: formData.keyword,
          matchType: formData.matchType,
          payload: parsedPayload,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(isEditMode ? "แก้ไขข้อมูลสำเร็จ!" : "เพิ่มข้อมูลสำเร็จ!");
        
        // ถ้ามีฟังก์ชัน onSuccess ส่งมา (เช่น ปิด Modal และรีเฟรชหน้า) ให้เรียกใช้งาน
        if (onSuccess) {
          onSuccess();
        } else {
          // ถ้าไม่มี ก็ล้างฟอร์มธรรมดา
          setFormData({ keyword: "", matchType: "EXACT", payload: "" });
        }
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด! กรุณาตรวจสอบรูปแบบ JSON ในช่อง Payload");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4 bg-white p-6 rounded-lg shadow-md">
        
        {/* Keyword Input */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
            Keyword
          </label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={formData.keyword} // ชี้ไปที่ Object
            onChange={handleChange} // ใช้ฟังก์ชันกลาง
            className="mt-1 px-2 py-3 block w-full rounded-md border-gray-300 shadow-sm border focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm"
            placeholder="Enter a keyword"
            required
          />
        </div>

        {/* Match Type Radio Buttons */}
        <div className="mb-6 flex items-center space-x-6">
          <span className="block text-sm font-medium text-gray-700">Match Type:</span>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="exactmatch"
              name="matchType"
              value="EXACT"
              checked={formData.matchType === "EXACT"}
              onChange={handleChange}
              className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
            />
            <label htmlFor="exactmatch" className="ml-2 block text-sm font-medium text-gray-700">
              Exact
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="radio"
              id="contains"
              name="matchType"
              value="CONTAINS"
              checked={formData.matchType === "CONTAINS"}
              onChange={handleChange}
              className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300"
            />
            <label htmlFor="contains" className="ml-2 block text-sm font-medium text-gray-700">
              Contains
            </label>
          </div>
        </div>

        {/* Payload Textarea */}
        <div className="mb-6">
          <label htmlFor="payload" className="block text-sm font-medium text-gray-700">
            Payload (JSON)
          </label>
          <textarea
            rows={15}
            id="payload"
            name="payload"
            value={formData.payload}
            onChange={handleChange}
            className="mt-1 px-2 py-3 block w-full rounded-md border-gray-300 shadow-sm border focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 sm:text-sm font-mono"
            placeholder='{"showLoading": true, "messages": [...]}'
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isLoading ? "Saving..." : "Add Keyword"}
          </button>
        </div>

      </form>
    </div>
  );
}