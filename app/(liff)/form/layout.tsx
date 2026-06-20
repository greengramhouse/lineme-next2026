import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LiffProvider from "../components/LiffProvider";

export default function FormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col">
          {children}
        </main>
        <Footer />
      </div>
    </LiffProvider>
  );
}
