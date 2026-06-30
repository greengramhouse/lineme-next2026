"use client";

import { useLiffStore } from "../store/liffStore";
import liff from "@line/liff";

import { useState, useEffect } from "react";

export default function FriendshipModal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isFriend = useLiffStore((state) => state.isFriend);
  const isLiffReady = useLiffStore((state) => state.isLiffReady);
  const isLoggedIn = useLiffStore((state) => state.isLoggedIn);
  const setIsFriend = useLiffStore((state) => state.setIsFriend);

  // We only show the modal if LIFF is ready, user is logged in, and they are NOT a friend (isFriend === false).
  // If isFriend is true or null (still checking), we don't show the modal.
  if (!mounted || !isLiffReady || !isLoggedIn || isFriend !== false) {
    return null;
  }

  const handleAddFriend = async () => {
    try {
      // ใช้ API ของ LIFF ในการเปิดหน้าต่างเพิ่มเพื่อน
      await liff.requestFriendship();
      
      // หลังจากกลับมา ให้เช็คสถานะการเป็นเพื่อนอีกครั้ง
      const friend = await liff.getFriendship();
      setIsFriend(friend.friendFlag);
    } catch (err) {
      console.error("Add friend failed", err);
    }
  };

  return (
    <div
      id="friendship-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md px-4 transition-opacity duration-300"
    >
      <div className="bg-white/10 p-8 rounded-3xl max-w-sm w-full text-center border border-green-500/30 shadow-2xl transform scale-100 transition-transform">
        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-500/30 shadow-lg shadow-green-500/20">
          {/* Replace FontAwesome icon with a simple SVG if FA is not loaded, but user used FA class in their code so we can keep it or use an SVG. I will use SVG for safety in case FA is not included. */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.02 2 11c0 3.07 1.61 5.77 4.07 7.47L5 21l3.12-1.56C9.27 19.8 10.6 20 12 20c5.52 0 10-4.02 10-9S17.52 2 12 2z" />
          </svg>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2">
          เพิ่มเพื่อนก่อนใช้งาน
        </h3>
        <p className="text-slate-300 text-sm mb-8 leading-relaxed">
          กรุณาเพิ่ม LINE Official Account ของเราเป็นเพื่อนก่อนทำการแจ้งปัญหา
          เพื่อให้แอดมินสามารถติดต่อกลับหรืออัปเดตสถานะให้คุณได้ครับ
        </p>
        <button
          onClick={handleAddFriend}
          className="w-full py-3.5 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-green-500/25 flex items-center justify-center transform hover:-translate-y-0.5 active:scale-95"
        >
          {/* SVG for user-plus icon instead of FA just to be safe */}
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          เพิ่มเพื่อนทันที
        </button>
      </div>
    </div>
  );
}
