"use client";

import { useState, useMemo } from "react";

interface UserItem {
  id: string;
  lineId: string;
  displayName: string;
  pictureUrl: string | null;
  statusMessage: string | null;
  email: string | null;
  userName: string | null;
  isFollowing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function RichMenuSetter({ lineId }: { lineId: string }) {
  const [richMenuId, setRichMenuId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSetDefault = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/richmenu/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId, richMenuId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("ตั้งค่า Rich Menu สำเร็จ");
        setIsOpen(false);
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (err) {
      alert("ไม่สามารถตั้งค่า Rich Menu ได้");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg text-xs font-semibold border border-violet-200 transition-colors"
      >
        ตั้งค่าเมนู
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <input 
        type="text" 
        placeholder="ใส่ Rich Menu ID หรือเว้นว่างเพื่อยกเลิก" 
        value={richMenuId}
        onChange={(e) => setRichMenuId(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-violet-500 outline-none"
      />
      <div className="flex gap-1">
        <button 
          onClick={handleSetDefault}
          disabled={loading}
          className="flex-1 px-2 py-1 bg-violet-600 text-white rounded text-xs hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? "รอ..." : "บันทึก"}
        </button>
        <button 
          onClick={() => setIsOpen(false)}
          className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

export default function TableUserProfile({
  initialData,
}: {
  initialData: UserItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "following" | "unfollowed"
  >("all");

  // Filter & search logic
  const filteredData = useMemo(() => {
    return initialData.filter((user) => {
      const matchesSearch =
        user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.userName &&
          user.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.statusMessage &&
          user.statusMessage
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "following" && user.isFollowing) ||
        (filterStatus === "unfollowed" && !user.isFollowing);

      return matchesSearch && matchesFilter;
    });
  }, [initialData, searchQuery, filterStatus]);

  // Stats
  const totalUsers = initialData.length;
  const followingUsers = initialData.filter((u) => u.isFollowing).length;
  const unfollowedUsers = totalUsers - followingUsers;

  return (
    <div className="space-y-6">
      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-50" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-violet-100/60" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ผู้ใช้ทั้งหมด
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
              {totalUsers}
            </p>
          </div>
        </div>

        {/* Following */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-50" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-emerald-100/60" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              กำลังติดตาม
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
              {followingUsers}
            </p>
          </div>
        </div>

        {/* Unfollowed */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-50" />
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-rose-100/60" />
          <div className="relative">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              เลิกติดตาม
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800">
              {unfollowedUsers}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้, LINE ID หรือสเตตัส..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
          {(
            [
              { key: "all", label: "ทั้งหมด", count: totalUsers },
              { key: "following", label: "ติดตาม", count: followingUsers },
              { key: "unfollowed", label: "เลิกติดตาม", count: unfollowedUsers },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                filterStatus === f.key
                  ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                filterStatus === f.key
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards for Mobile / Table for Desktop ── */}

      {/* Mobile: Card View */}
      <div className="block sm:hidden space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {user.pictureUrl ? (
                  <img
                    src={user.pictureUrl}
                    alt={user.displayName}
                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-base font-bold text-white ring-2 ring-slate-100 shadow-sm flex-shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{user.displayName}</p>
                    {user.isFollowing ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 flex-shrink-0">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        </span>
                        ติดตาม
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 border border-red-200 flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                        เลิกติดตาม
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">{user.lineId}</p>
                  {user.userName && (
                    <p className="mt-1 text-xs font-semibold text-violet-700 truncate">{user.userName}</p>
                  )}
                  {user.statusMessage && (
                    <p className="mt-1 text-xs text-slate-500 italic truncate">&ldquo;{user.statusMessage}&rdquo;</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    เข้าร่วมเมื่อ{" "}
                    {new Date(user.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">
                {searchQuery || filterStatus !== "all"
                  ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไข"
                  : "ยังไม่มีผู้ใช้ในระบบ"}
              </p>
              {(searchQuery || filterStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}
                  className="text-sm text-violet-600 hover:text-violet-800 font-medium transition"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                ผู้ใช้
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                LINE ID
              </th>
              <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                ชื่อที่ลงทะเบียน
              </th>
              <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                สเตตัส
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                การติดตาม
              </th>
              <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                เข้าร่วมเมื่อ
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                เมนูส่วนตัว
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? (
              filteredData.map((user) => (
                <tr
                  key={user.id}
                  className="group hover:bg-violet-50/30 transition-colors duration-150"
                >
                  {/* User Info (Avatar + Name) */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.pictureUrl ? (
                        <img
                          src={user.pictureUrl}
                          alt={user.displayName}
                          className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm group-hover:ring-violet-200 transition"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-sm font-bold text-white ring-2 ring-slate-100 shadow-sm">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                          {user.displayName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* LINE ID */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700 transition max-w-[180px] truncate">
                      {user.lineId}
                    </span>
                  </td>

                  {/* UserName */}
                  <td className="hidden lg:table-cell px-6 py-4">
                    {user.userName ? (
                      <span className="font-semibold text-slate-700 text-sm">{user.userName}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">— ยังไม่ลงทะเบียน —</span>
                    )}
                  </td>

                  {/* Status Message */}
                  <td className="hidden md:table-cell px-6 py-4">
                    {user.statusMessage ? (
                      <p
                        className="max-w-[200px] truncate text-slate-500 italic text-xs"
                        title={user.statusMessage}
                      >
                        &ldquo;{user.statusMessage}&rdquo;
                      </p>
                    ) : (
                      <span className="text-slate-300 text-xs">
                        — ไม่มีสเตตัส —
                      </span>
                    )}
                  </td>

                  {/* Following Badge */}
                  <td className="px-6 py-4 text-center">
                    {user.isFollowing ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        ติดตามอยู่
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 border border-red-200/80">
                        <span className="h-2 w-2 rounded-full bg-red-400"></span>
                        เลิกติดตาม
                      </span>
                    )}
                  </td>

                  {/* Created At */}
                  <td className="hidden lg:table-cell px-6 py-4 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    <br />
                    <span className="text-slate-400">
                      {new Date(user.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>

                  {/* Rich Menu Setter */}
                  <td className="px-6 py-4 text-center">
                    <RichMenuSetter lineId={user.lineId} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">
                      {searchQuery || filterStatus !== "all"
                        ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไข"
                        : "ยังไม่มีผู้ใช้ในระบบ"}
                    </p>
                    {(searchQuery || filterStatus !== "all") && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setFilterStatus("all");
                        }}
                        className="text-sm text-violet-600 hover:text-violet-800 font-medium transition"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer info ── */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <p>
          แสดง <span className="font-semibold text-slate-500">{filteredData.length}</span> จาก{" "}
          <span className="font-semibold text-slate-500">{totalUsers}</span> รายการ
        </p>
        <p>
          อัปเดตล่าสุด:{" "}
          {new Date().toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
