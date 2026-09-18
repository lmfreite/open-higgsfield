import { asString, shotType } from "./defaults";
import type { FalRoutes, ModelEntry } from "./types";

const klingTurboSettings = {
  aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
  duration: { type: "range", min: 3, max: 15, default: 5 },
} as const satisfies ModelEntry["settings"];

const kling3Settings = {
  aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  duration: { type: "range", min: 3, max: 15, default: 5 },
  sound: { type: "boolean", default: true },
  cfgScale: { type: "range", min: 0, max: 1, default: 0.5, step: 0.01 },
  multiShots: { type: "boolean", default: false },
} as const satisfies ModelEntry["settings"];

const klingMotionSettings = {
  keepOriginalSound: { type: "boolean", default: true },
  characterOrientation: { type: "enum", values: ["video", "image"], default: "video" },
} as const satisfies ModelEntry["settings"];

/** Turbo sells its two tiers by resolution: Standard is 720p, Pro is 1080p. */
const turboTier = (settings: Record<string, unknown>) =>
  settings.resolution === "1080p" ? "pro" : "standard";

const turboRoutes: FalRoutes = {
  text: {
    path: (settings) => `fal-ai/kling-video/v3/turbo/${turboTier(settings)}/text-to-video`,
    settings: { aspectRatio: "aspect_ratio", duration: asString("duration") },
  },
  image: {
    path: (settings) => `fal-ai/kling-video/v3/turbo/${turboTier(settings)}/image-to-video`,
    start: "image_url",
    settings: { duration: asString("duration") },
  },
};

/** Standard, Pro and 4K differ only in the tier segment of the endpoint. A start
    frame fixes the picture's shape, so the image endpoint takes no aspect ratio. */
function kling3Routes(tier: "standard" | "pro" | "4k"): FalRoutes {
  const dials = {
    duration: asString("duration"),
    sound: "generate_audio",
    cfgScale: "cfg_scale",
    multiShots: shotType,
  };
  return {
    text: {
      path: `fal-ai/kling-video/v3/${tier}/text-to-video`,
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: `fal-ai/kling-video/v3/${tier}/image-to-video`,
      start: "start_image_url",
      end: "end_image_url",
      settings: dials,
    },
  };
}

function motionRoutes(tier: "standard" | "pro"): FalRoutes {
  return {
    image: {
      path: `fal-ai/kling-video/v3/${tier}/motion-control`,
      start: "image_url",
      video: "video_url",
      settings: {
        keepOriginalSound: "keep_original_sound",
        characterOrientation: "character_orientation",
      },
    },
  };
}

export const kling3Turbo: ModelEntry = {
  id: "kling-3-turbo",
  surface: "video",
  label: "Kling 3.0 Turbo",
  roles: { start: 1 },
  settings: klingTurboSettings,
  routes: turboRoutes,
};

export const kling3Std: ModelEntry = {
  id: "kling-3-std",
  surface: "video",
  label: "Kling 3.0 Standard",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  routes: kling3Routes("standard"),
};

export const kling3Pro: ModelEntry = {
  id: "kling-3-pro",
  surface: "video",
  label: "Kling 3.0 Pro",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  routes: kling3Routes("pro"),
};

export const kling34k: ModelEntry = {
  id: "kling-3-4k",
  surface: "video",
  label: "Kling 3.0 4K",
  roles: { start: 1, end: 1 },
  settings: kling3Settings,
  routes: kling3Routes("4k"),
};

export const kling3MotionStd: ModelEntry = {
  id: "kling-3-motion-std",
  surface: "video",
  label: "Kling 3.0 Motion Control",
  roles: { start: 1, video: 1 },
  settings: klingMotionSettings,
  routes: motionRoutes("standard"),
};

export const kling3MotionPro: ModelEntry = {
  id: "kling-3-motion-pro",
  surface: "video",
  label: "Kling 3.0 Motion Control Pro",
  roles: { start: 1, video: 1 },
  settings: klingMotionSettings,
  routes: motionRoutes("pro"),
};
