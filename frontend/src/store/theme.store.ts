import { create } from "zustand";

export type AppTheme = "investor" | "admin";

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "investor",
  setTheme: (theme) => set({ theme }),
}));
