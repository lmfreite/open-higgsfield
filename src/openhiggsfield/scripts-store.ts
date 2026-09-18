import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "@/generation/stores/browser-storage";

export const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** The brief the model is given before the visitor says anything. It is theirs to
    edit — a different format, a house style, another language — and to reset. */
export const DEFAULT_SYSTEM = `You are a screenwriter for short videos made with AI video models.
Turn the user's idea into a script. Answer in the language the idea is written in.

Format: a one-line title, then a numbered list of scenes. For each scene give:
- Visual: what the camera sees, written as a self-contained prompt that can be pasted into a text-to-video model — subject, setting, light, camera move, style. Under 60 words.
- Audio: dialogue, voice-over or sound.
- Duration: seconds, between 3 and 10.

Keep characters, places and look consistent from scene to scene. No preamble, no closing remarks.`;

type ScriptSettings = {
  baseUrl: string;
  model: string;
  system: string;
  set: (patch: Partial<Pick<ScriptSettings, "baseUrl" | "model" | "system">>) => void;
};

/** Where the script-writing model lives. Not secret — the key is, and it never
    reaches the browser's storage. */
export const useScriptSettings = create<ScriptSettings>()(
  persist(
    (set) => ({
      baseUrl: DEFAULT_BASE_URL,
      model: "",
      system: DEFAULT_SYSTEM,
      set: (patch) => set(patch),
    }),
    {
      name: "openhiggsfield.scriptSettings.v1",
      storage: browserStorage(),
      partialize: (state) => ({ baseUrl: state.baseUrl, model: state.model, system: state.system }),
    },
  ),
);

export interface ScriptRecord {
  id: string;
  title: string;
  text: string;
  createdAt: number;
}

const MAX_SCRIPTS = 100;

type Scripts = {
  brief: string;
  /** The script on the page: what the model wrote, and whatever the visitor made of it. */
  text: string;
  library: ScriptRecord[];
  setBrief: (brief: string) => void;
  setText: (text: string) => void;
  /** Files the current text away; returns it, or null when the page is empty. */
  save: () => ScriptRecord | null;
  open: (id: string) => void;
  remove: (id: string) => void;
};

export const useScripts = create<Scripts>()(
  persist(
    (set, get) => ({
      brief: "",
      text: "",
      library: [],
      setBrief: (brief) => set({ brief }),
      setText: (text) => set({ text }),
      save: () => {
        const text = get().text.trim();
        if (!text) return null;
        const record: ScriptRecord = {
          id: crypto.randomUUID(),
          title: titleOf(text),
          text,
          createdAt: Date.now(),
        };
        set((state) => ({ library: [record, ...state.library].slice(0, MAX_SCRIPTS) }));
        return record;
      },
      open: (id) => {
        const record = get().library.find((entry) => entry.id === id);
        if (record) set({ text: record.text });
      },
      remove: (id) => set((state) => ({ library: state.library.filter((entry) => entry.id !== id) })),
    }),
    {
      name: "openhiggsfield.scripts.v1",
      storage: browserStorage(),
      partialize: (state) => ({ brief: state.brief, text: state.text, library: state.library }),
    },
  ),
);

/** The first line that says something, without the markdown around it. */
export function titleOf(text: string): string {
  const line = text
    .split("\n")
    .map((entry) => entry.replace(/^[\s#>*_-]+|[\s*_]+$/g, "").trim())
    .find((entry) => entry.length > 0);
  if (!line) return "Untitled script";
  return line.length > 64 ? `${line.slice(0, 63)}…` : line;
}
