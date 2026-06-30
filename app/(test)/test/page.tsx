"use client";

import { useState } from "react";

// --- 1. ฟังก์ชัน Utility สำหรับแปลง File เป็น Base64 ---
const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file); // แปลงไฟล์เป็น Base64 Data URL
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = (error) => reject(error);
    });
};

export default function TestPage() {
    // --- 2. กำหนด State (ใช้ Record<string, any> เพื่อความยืดหยุ่นถ้าฟอร์มใหญ่ขึ้น) ---
    const [formData, setFormData] = useState<Record<string, any>>({
        userName: "",
        email: "",
        age: "",           // ตัวอย่าง Input ประเภท Number
        isConsent: false,  // ตัวอย่าง Input ประเภท Checkbox
        profileImage: ""   // ตัวอย่าง Input ประเภท File (จะเก็บเป็น Base64)
    });

    // --- 3. ฟังก์ชัน handleChange ครอบจักรวาล ---
    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked, files } = e.target;

        // แยกการจัดการตามประเภท (Type) ของ Input
        if (type === "file" && files && files.length > 0) {
            // กรณีเป็นไฟล์: ดึงไฟล์ตัวแรกมาแปลงเป็น Base64 ก่อนอัปเดต State
            try {
                const base64 = await convertToBase64(files[0]);
                setFormData((prev) => ({ ...prev, [name]: base64 }));
            } catch (error) {
                console.error("Error converting file to Base64:", error);
            }
        } else if (type === "checkbox") {
            // กรณีเป็น Checkbox: ให้ใช้ค่า checked แทน value
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            // กรณี Input ทั่วไป (Text, Email, Number, Password, Date ฯลฯ)
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    // --- 4. ฟังก์ชันจัดการตอนกด Submit ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        // ข้อมูลชุดนี้ (formData) พร้อมถูกแปลงเป็น JSON ส่งให้ API เลยครับ
        console.log("🚀 Data ready to save:", formData);

        // ตัวอย่างการนำไปส่ง API:
        // await fetch('/api/save', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(formData)
        // });
    };

    return (
        <div className="p-8 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Best Practice Form</h1>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Text Input */}
                <label className="flex flex-col text-sm font-medium">
                    ชื่อผู้ใช้:
                    <input 
                        type="text" 
                        name="userName" 
                        value={formData.userName} 
                        onChange={handleChange} 
                        className="border border-gray-300 rounded-md p-2 mt-1 text-black" 
                    />
                </label>

                {/* Email Input */}
                <label className="flex flex-col text-sm font-medium">
                    อีเมล:
                    <input 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        className="border border-gray-300 rounded-md p-2 mt-1 text-black" 
                    />
                </label>

                {/* Number Input */}
                <label className="flex flex-col text-sm font-medium">
                    อายุ:
                    <input 
                        type="number" 
                        name="age" 
                        value={formData.age} 
                        onChange={handleChange} 
                        className="border border-gray-300 rounded-md p-2 mt-1 text-black" 
                    />
                </label>

                {/* File Input (ไม่บังคับใส่ value ให้ Input ประเภทไฟล์ตามกฎของ React) */}
                <label className="flex flex-col text-sm font-medium">
                    อัปโหลดรูปโปรไฟล์:
                    <input 
                        type="file" 
                        name="profileImage" 
                        accept="image/*" // บังคับให้เลือกได้เฉพาะรูปภาพ
                        onChange={handleChange} 
                        className="mt-1" 
                    />
                </label>

                {/* Checkbox Input */}
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="isConsent" 
                        checked={formData.isConsent} 
                        onChange={handleChange} 
                    />
                    ยอมรับเงื่อนไขการใช้งาน
                </label>

                <button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md mt-4 transition-colors"
                >
                    Submit Data
                </button>
            </form>
        </div>
    );
}