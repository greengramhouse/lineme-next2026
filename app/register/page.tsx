import type { Metadata } from "next";
import { getOpenSession } from "@/services/accountLinkService";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "ลงทะเบียนสมาชิก",
};

/**
 * หน้าฟอร์มลงทะเบียน — เปิดจากปุ่มในแชท LINE เท่านั้น
 *
 * ไม่ใช่หน้า LIFF โดยตั้งใจ: ตัวตนของผู้กรอกมาจาก sessionId ที่เราออกให้ตอนเขา
 * ทักในแชท ไม่ใช่จาก ID token ฝั่ง client จึงไม่ต้องพึ่ง SDK ของ LIFF เลย
 *
 * searchParams เป็น Promise ตั้งแต่ Next 15 และการอ่านค่าทำให้หน้านี้เป็น
 * dynamic rendering อัตโนมัติ ซึ่งเป็นสิ่งที่ต้องการอยู่แล้ว (ต้องเช็คอายุเซสชันสด ๆ)
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const session = await getOpenSession(s);

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-8">
        {session ? (
          <>
            <h1 className="text-xl font-bold mb-1 text-gray-800">ลงทะเบียนสมาชิก</h1>
            <p className="text-sm text-gray-500 mb-4">
              กรอกให้ครบภายใน 10 นาที แล้วรับบัตรสมาชิกกลับไปในแชท LINE ได้เลย
            </p>
            <RegisterForm sessionId={session.id} />
          </>
        ) : (
          // ทุกกรณีที่กรอกต่อไม่ได้ (ลิงก์ผิด / หมดอายุ / ใช้ไปแล้ว) จบที่หน้าจอเดียวกัน
          // เพราะทางออกของผู้ใช้เหมือนกันหมด และการบอกละเอียดก็ไม่ช่วยอะไรนอกจากบอกใบ้คนที่เดาลิงก์
          <div className="text-center py-6">
            <p className="text-4xl mb-3">⏳</p>
            <h1 className="text-lg font-bold text-gray-800 mb-2">
              ลิงก์นี้ใช้ไม่ได้แล้ว
            </h1>
            <p className="text-sm text-gray-500">
              ลิงก์ลงทะเบียนมีอายุ 10 นาที และใช้ได้ครั้งเดียว
              <br />
              กรุณากลับไปที่แชท LINE แล้วพิมพ์ว่า{" "}
              <span className="font-semibold text-gray-700">&ldquo;ลงทะเบียน&rdquo;</span>{" "}
              เพื่อขอลิงก์ใหม่ค่ะ
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
