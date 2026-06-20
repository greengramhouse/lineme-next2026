import Link from "next/link";

const quickLinks = [
  {
    href: "/dashboard/keyword",
    title: "Keywords",
    description: "จัดการคีย์เวิร์ดตอบกลับอัตโนมัติ",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    gradient: "from-indigo-500 to-blue-600",
    shadowColor: "shadow-indigo-200",
  },
  {
    href: "/dashboard/richmenu",
    title: "Rich Menu",
    description: "จัดการเมนูแชทด้านล่างใน LINE",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    gradient: "from-orange-500 to-amber-600",
    shadowColor: "shadow-orange-200",
  },
  {
    href: "/dashboard/userProfile",
    title: "Users",
    description: "ดูรายการผู้ใช้ที่ติดตามบอท",
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "from-violet-500 to-purple-600",
    shadowColor: "shadow-violet-200",
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            ยินดีต้อนรับ 👋
          </h1>
          <p className="mt-2 text-base text-slate-500">
            จัดการ LINE บอทของคุณได้จากที่เดียว เลือกเมนูด้านล่างเพื่อเริ่มต้นใช้งาน
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-pointer">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-slate-50 group-hover:bg-slate-100/80 transition-colors duration-300" />
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-slate-100/50 group-hover:bg-slate-100 transition-colors duration-300" />

                <div className="relative">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg ${item.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>

                  {/* Arrow */}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>เปิดดู</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}