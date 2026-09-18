import { aspect, resolution, seconds } from "./defaults";
import type { FalRoutes, ModelEntry } from "./types";

const dials = {
  resolution: "resolution",
  duration: "duration",
  generateAudio: "generate_audio",
};

/** Fast and Pro share every field; only the tier at the end of the endpoint differs. */
export function ltx25Routes(tier: "fast" | "pro"): FalRoutes {
  return {
    text: {
      path: `lightricks/ltx-2.5/text-to-video/${tier}`,
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: `lightricks/ltx-2.5/image-to-video/${tier}`,
      start: "image_url",
      end: "end_image_url",
      settings: dials,
    },
  };
}

export const ltx25Fast: ModelEntry = {
  id: "ltx-2.5-fast",
  surface: "video",
  label: "LTX 2.5 Fast",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16"]),
    resolution: resolution(["720p", "1080p", "1440p", "2160p"], "1080p"),
    duration: seconds(6, 20, 6, 2),
    generateAudio: { type: "boolean", default: true },
  },
  routes: ltx25Routes("fast"),
};
