"use client";

import Image from "next/image";
import { useLiffStore } from "../store/liffStore";

export default function Navbar() {
  const profile = useLiffStore((state) => state.profile);
  const isLoggedIn = useLiffStore((state) => state.isLoggedIn);
  const isLiffReady = useLiffStore((state) => state.isLiffReady);


  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: "linear-gradient(135deg, #00B900 0%, #00C853 50%, #06C755 100%)",
        boxShadow: "0 4px 24px rgba(0, 185, 0, 0.25)",
      }}
    >
      {/* Glass overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)",
        }}
      />

      <div className="relative flex items-center justify-between px-4 py-3 max-w-md mx-auto w-full">
        {/* Logo / App name */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.4)",
            }}
          >
            {/* LINE-style icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.02 2 11c0 3.07 1.61 5.77 4.07 7.47L5 21l3.12-1.56C9.27 19.8 10.6 20 12 20c5.52 0 10-4.02 10-9S17.52 2 12 2z" />
            </svg>
          </div>
          <span
            className="text-white font-bold text-lg tracking-tight"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >
            LINE Form
          </span>
        </div>

        {/* Profile section */}
        {!isLiffReady ? (
          /* Skeleton loading */
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-4 w-20 rounded-full bg-white/30" />
            <div className="w-9 h-9 rounded-full bg-white/30" />
          </div>
        ) : isLoggedIn && profile ? (
          /* Profile display */
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden xs:block">
              <p
                className="text-white text-sm font-semibold leading-tight"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
              >
                {profile.displayName}
              </p>
              {profile.statusMessage && (
                <p className="text-green-100 text-xs truncate max-w-[120px]">
                  {profile.statusMessage}
                </p>
              )}
            </div>

            {/* Avatar */}
            <div
              className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/60"
            >
              {profile.pictureUrl ? (
                <Image
                  src={profile.pictureUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-green-700 font-bold text-sm"
                  style={{ background: "rgba(255,255,255,0.9)" }}
                >
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Not logged in */
          <div
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "white",
            }}
          >
            กำลังเข้าสู่ระบบ…
          </div>
        )}
      </div>

      {/* Bottom shimmer line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
        }}
      />
    </nav>
  );
}
