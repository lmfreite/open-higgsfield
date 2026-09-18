import { asString } from "./defaults";
import { seedanceRoutes } from "./seedance-2";
import { SEEDANCE_ASPECT } from "./tokens";
import type { FalRoute, ModelEntry } from "./types";

const seedance25Settings = {
  resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  generateAudio: { type: "boolean", default: true },
} as const satisfies ModelEntry["settings"];

const PATH = "bytedance/seedance-2.5";

/** Editing and extending ride the reference endpoint: `task` says which. */
function sourceRoute(task: "editing" | "extension", withDuration: boolean): FalRoute {
  return {
    path: `${PATH}/reference-to-video`,
    fixed: { task },
    refs: "image_urls",
    videos: "video_urls",
    audios: "audio_urls",
    settings: {
      resolution: "resolution",
      generateAudio: "generate_audio",
      ...(withDuration ? { duration: asString("duration") } : {}),
    },
  };
}

export const seedance25: ModelEntry = {
  id: "seedance-2.5",
  surface: "video",
  label: "Seedance 2.5",
  roles: { start: 1, end: 1, reference: 30, video: 10, audio: 10 },
  settings: {
    aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    ...seedance25Settings,
  },
  routes: seedanceRoutes(PATH),
};

export const seedance25Edit: ModelEntry = {
  id: "seedance-2.5-edit",
  surface: "video",
  label: "Seedance 2.5 Edit",
  roles: { video: 1, reference: 30, audio: 10 },
  settings: seedance25Settings,
  routes: { reference: sourceRoute("editing", false) },
};

export const seedance25Extend: ModelEntry = {
  id: "seedance-2.5-extend",
  surface: "video",
  label: "Seedance 2.5 Extend",
  roles: { video: 1, reference: 30, audio: 10 },
  settings: {
    duration: { type: "range", min: 4, max: 30, default: 5 },
    ...seedance25Settings,
  },
  routes: { reference: sourceRoute("extension", true) },
};
