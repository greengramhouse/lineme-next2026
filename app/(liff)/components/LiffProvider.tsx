"use client";

import { useEffect } from "react";
import liff from "@line/liff";
import { useLiffStore } from "../store/liffStore";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export default function LiffProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setProfile, setIsLoggedIn, setIsLiffReady, setError } =
    useLiffStore();

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        setIsLiffReady(true);

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          const profile = await liff.getProfile();
          setProfile({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage,
          });
        } else {
          // Redirect to LINE login in production
          if (!liff.isInClient()) {
            liff.login();
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "LIFF init failed";
        setError(message);
        console.error("[LIFF] Initialization error:", err);
      }
    };

    if (LIFF_ID) {
      initLiff();
    } else {
      setError("NEXT_PUBLIC_LIFF_ID is not set");
      console.warn("[LIFF] NEXT_PUBLIC_LIFF_ID is missing in .env");
    }
  }, [setProfile, setIsLoggedIn, setIsLiffReady, setError]);

  return <>{children}</>;
}
