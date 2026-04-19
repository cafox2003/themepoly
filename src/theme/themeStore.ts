import { create } from "zustand";
import { CLASSIC_THEME, type GameTheme } from "../engine/theme";
import { loadThemeZip } from "./themeLoader";

export interface SavedThemeMeta {
  id: string;
  name: string;
  fileName: string;
  savedAt: number;
}

interface ThemeStore {
  theme: GameTheme;
  error: string | null;
  objectUrls: string[];
  sourceFile: File | null;
  savedThemes: SavedThemeMeta[];
  initializeThemeLibrary: () => Promise<void>;
  loadThemeFile: (file: File) => Promise<void>;
  loadThemeUrl: (url: string, fileName: string) => Promise<void>;
  selectSavedTheme: (themeId: string) => Promise<void>;
  deleteSavedTheme: (themeId: string) => Promise<void>;
  resetTheme: () => void;
  clearError: () => void;
}

const DB_NAME = "themepoly-themes";
const DB_VERSION = 1;
const THEME_STORE = "themes";

const revokeUrls = (urls: string[]) => {
  for (const url of urls) URL.revokeObjectURL(url);
};

const openThemeDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(THEME_STORE)) db.createObjectStore(THEME_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Theme database could not be opened."));
  });

const withThemeStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openThemeDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(THEME_STORE, mode);
    const request = run(transaction.objectStore(THEME_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Theme database request failed."));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Theme database transaction failed."));
    };
  });
};

interface SavedThemeRecord extends SavedThemeMeta {
  blob: Blob;
}

const listSavedThemes = async () => {
  const records = await withThemeStore<SavedThemeRecord[]>("readonly", (store) => store.getAll());
  return records
    .map(({ id, name, fileName, savedAt }) => ({ id, name, fileName, savedAt }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const saveThemeRecord = async (theme: GameTheme, file: File) => {
  await withThemeStore<IDBValidKey>("readwrite", (store) =>
    store.put({
      id: theme.id,
      name: theme.name,
      fileName: file.name || `${theme.id}.zip`,
      savedAt: Date.now(),
      blob: file,
    } satisfies SavedThemeRecord),
  );
};

const getSavedThemeRecord = (themeId: string) => withThemeStore<SavedThemeRecord | undefined>("readonly", (store) => store.get(themeId));

const deleteSavedThemeRecord = (themeId: string) => withThemeStore<undefined>("readwrite", (store) => store.delete(themeId));

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: CLASSIC_THEME,
  error: null,
  objectUrls: [],
  sourceFile: null,
  savedThemes: [],
  initializeThemeLibrary: async () => {
    try {
      set({ savedThemes: await listSavedThemes(), error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Saved themes could not be loaded." });
    }
  },
  loadThemeFile: async (file) => {
    try {
      const loaded = await loadThemeZip(file);
      await saveThemeRecord(loaded.theme, file);
      revokeUrls(get().objectUrls);
      set({ theme: loaded.theme, sourceFile: file, objectUrls: loaded.objectUrls, savedThemes: await listSavedThemes(), error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Theme could not be loaded." });
    }
  },
  loadThemeUrl: async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Theme could not be downloaded (${response.status}).`);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type || "application/zip" });
      const loaded = await loadThemeZip(file);
      await saveThemeRecord(loaded.theme, file);
      revokeUrls(get().objectUrls);
      set({ theme: loaded.theme, sourceFile: file, objectUrls: loaded.objectUrls, savedThemes: await listSavedThemes(), error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Theme could not be loaded." });
    }
  },
  selectSavedTheme: async (themeId) => {
    try {
      const record = await getSavedThemeRecord(themeId);
      if (!record) throw new Error("Saved theme could not be found.");
      const file = new File([record.blob], record.fileName, { type: record.blob.type || "application/zip" });
      const loaded = await loadThemeZip(file);
      revokeUrls(get().objectUrls);
      set({ theme: loaded.theme, sourceFile: file, objectUrls: loaded.objectUrls, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Theme could not be loaded." });
    }
  },
  deleteSavedTheme: async (themeId) => {
    try {
      await deleteSavedThemeRecord(themeId);
      const next = await listSavedThemes();
      if (get().theme.id === themeId) {
        revokeUrls(get().objectUrls);
        set({ theme: CLASSIC_THEME, sourceFile: null, objectUrls: [], savedThemes: next, error: null });
      } else {
        set({ savedThemes: next, error: null });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Saved theme could not be removed." });
    }
  },
  resetTheme: () => {
    revokeUrls(get().objectUrls);
    set({ theme: CLASSIC_THEME, sourceFile: null, objectUrls: [], error: null });
  },
  clearError: () => set({ error: null }),
}));
