import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { Metadata } from "next";
import { getAdminIdentity } from "@/lib/adminAuth";

export const metadata: Metadata = {
  title: "Dashboard Lineme",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ด่านจริงของฝั่งหน้าเว็บ — proxy.ts ดูแค่ว่ามีคุกกี้ไหม ไม่ได้เช็ค allowlist
  // ตรงนี้เช็คทุกครั้งที่โหลดหน้า ถอดชื่อออกจาก ADMIN_LINE_IDS แล้วมีผลทันที
  const admin = await getAdminIdentity();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar admin={{ name: admin.name, image: admin.image }} />
      {/* Main content area — offset on desktop for sidebar */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
