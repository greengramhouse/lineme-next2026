import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MENU_KEYWORDS } from "@/services/documentFlowService";
import DocumentTypeManager from "@/app/components/DocumentTypeManager";

export const metadata: Metadata = {
  title: "ร่างเอกสาร · Lineme",
};

export default async function DocumentTypePage() {
  const types = await prisma.documentType.findMany({
    orderBy: { sortOrder: "asc" },
    include: { fields: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ร่างเอกสาร
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            ตั้งค่าว่าบอทจะถามอะไรบ้างก่อนร่างเอกสารให้ครู — ครูไม่ต้องเขียน prompt เอง
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
          <p className="font-semibold">ครูเริ่มใช้งานได้ 2 ทาง</p>
          <ul className="mt-1.5 space-y-1 text-sky-800">
            <li>
              • พิมพ์{" "}
              {MENU_KEYWORDS.map((k) => (
                <code key={k} className="mx-0.5 rounded bg-white px-1.5 py-0.5 text-[13px] ring-1 ring-sky-200">
                  {k}
                </code>
              ))}{" "}
              เพื่อดูรายการทั้งหมด
            </li>
            <li>• หรือพิมพ์ &quot;คำเริ่มต้น&quot; ของแต่ละประเภทเพื่อเข้าเลย</li>
          </ul>
        </div>

        <DocumentTypeManager initialTypes={types} />
      </div>
    </div>
  );
}
