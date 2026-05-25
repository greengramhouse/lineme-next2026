import Navbar from "@/app/components/Navbar";
import { Metadata } from "next";

export const metadata:Metadata = {
  title: "Dashboard Lineme",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen w-full">
      <Navbar />
      {children}
    </div>
  );
}
