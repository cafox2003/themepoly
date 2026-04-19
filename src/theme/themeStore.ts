import { create } from "zustand";
import { CLASSIC_THEME, type GameTheme } from "../engine/theme";
import { loadThemeZip } from "./themeLoader";

interface ThemeStore {
  theme: GameTheme;
  error: string | null;
  objectUrls: string[];
  loadThemeFile: (file: File) => Promise<void>;
  resetTheme: () => void;
  clearError: () => void;
}

const revokeUrls = (urls: string[]) => {
  for (const url of urls) URL.revokeObjectURL(url);
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: CLASSIC_THEME,
  error: null,
  objectUrls: [],
  loadThemeFile: async (file) => {
    try {
      const loaded = await loadThemeZip(file);
      revokeUrls(get().objectUrls);
      set({ theme: loaded.theme, objectUrls: loaded.objectUrls, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Theme could not be loaded." });
    }
  },
  resetTheme: () => {
    revokeUrls(get().objectUrls);
    set({ theme: CLASSIC_THEME, objectUrls: [], error: null });
  },
  clearError: () => set({ error: null }),
}));
