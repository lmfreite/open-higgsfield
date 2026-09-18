import { asString } from "./defaults";
import { SEEDANCE_ASPECT } from "./tokens";
import type { FalRoutes, ModelEntry } from "./types";

const seedanceRoles = { start: 1, end: 1, reference: 9, video: 3, audio: 3 } as const;

const seedanceSettings = {
  aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
  duration: { type: "range", min: 4, max: 15, default: 5 },
  generateAudio: { type: "boolean", default: true },
} as const satisfies ModelEntry["settings"];

const dials = {
  duration: asString("duration"),
  resolution: "resolution",
  generateAudio: "generate_audio",
};

/** The three Seedance endpoints of one tier. A start frame fixes the picture's
    shape, so the image endpoint takes no aspect ratio. */
export function seedanceRoutes(prefix: string): FalRoutes {
  return {
    text: {
      path: `${prefix}/text-to-video`,
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: `${prefix}/image-to-video`,
      start: "image_url",
      end: "end_image_url",
      settings: dials,
    },
    reference: {
      path: `${prefix}/reference-to-video`,
      refs: "image_urls",
      videos: "video_urls",
      audios: "audio_urls",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
  };
}

export const seedance2: ModelEntry = {
  id: "seedance-2",
  surface: "video",
  label: "Seedance 2.0",
  roles: seedanceRoles,
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p", "1080p", "4k"], default: "720p" },
  },
  routes: seedanceRoutes("bytedance/seedance-2.0"),
};

export const seedance2Fast: ModelEntry = {
  id: "seedance-2-fast",
  surface: "video",
  label: "Seedance 2.0 Fast",
  roles: seedanceRoles,
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  },
  routes: seedanceRoutes("bytedance/seedance-2.0/fast"),
};

export const seedance2Mini: ModelEntry = {
  id: "seedance-2-mini",
  surface: "video",
  label: "Seedance 2.0 Mini",
  roles: seedanceRoles,
  settings: {
    ...seedanceSettings,
    resolution: { type: "enum", values: ["480p", "720p"], default: "720p" },
  },
  routes: seedanceRoutes("bytedance/seedance-2.0/mini"),
};
