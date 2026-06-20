import { create } from "zustand";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffState {
  profile: LineProfile | null;
  isLoggedIn: boolean;
  isLiffReady: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: LineProfile) => void;
  setIsLoggedIn: (value: boolean) => void;
  setIsLiffReady: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearProfile: () => void;
}

export const useLiffStore = create<LiffState>((set) => ({
  profile: null,
  isLoggedIn: false,
  isLiffReady: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setIsLiffReady: (value) => set({ isLiffReady: value }),
  setError: (error) => set({ error }),
  clearProfile: () =>
    set({ profile: null, isLoggedIn: false, isLiffReady: false }),
}));
