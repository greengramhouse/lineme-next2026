"use client";

import { useEffect, useRef } from "react";
import liff from "@line/liff";
import { useLiffStore } from "../store/liffStore";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export default function LiffProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const setProfile = useLiffStore((state) => state.setProfile);
  const setIsLoggedIn = useLiffStore((state) => state.setIsLoggedIn);
  const setIsLiffReady = useLiffStore((state) => state.setIsLiffReady);
  const setError = useLiffStore((state) => state.setError);
  const setIsFriend = useLiffStore((state) => state.setIsFriend);

  const didInit = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        await liff.ready; // Ensure LIFF is completely ready
        
        if (!isMounted) return;
        setIsLiffReady(true);

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          // Optional: You can clear previous cache if needed, but getProfile usually returns fresh data
          const profile = await liff.getProfile();
          const email = liff.getDecodedIDToken()?.email;
          console.log("email", email);
          if (isMounted) {
            setProfile({
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
              email,
            });
          }

          try {
            const friend = await liff.getFriendship();
            if (isMounted) {
              setIsFriend(friend.friendFlag);
            }
          } catch (err) {
            console.error("[LIFF] Check Friendship failed", err);
          }
        } else {
          // Redirect to LINE login in production
          if (!liff.isInClient() && isMounted) {
            liff.login({ redirectUri: window.location.href });
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err instanceof Error ? err.message : "LIFF init failed";
        setError(message);
        console.error("[LIFF] Initialization error:", err);
      }
    };

    if (LIFF_ID) {
      if (!didInit.current) {
        didInit.current = true;
        initLiff();
      }
    } else {
      setError("NEXT_PUBLIC_LIFF_ID is not set");
      console.warn("[LIFF] NEXT_PUBLIC_LIFF_ID is missing in .env");
    }

    return () => {
      isMounted = false;
    };
  }, [setProfile, setIsLoggedIn, setIsLiffReady, setError]);

  return <>{children}</>;
}
