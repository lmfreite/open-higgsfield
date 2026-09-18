import { aspect, resolution, seconds } from "./defaults";
import type { FalRoutes, ModelEntry } from "./types";

const WAN_ASPECT = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;

export const wan3Settings = {
  aspectRatio: aspect(WAN_ASPECT),
  resolution: resolution(["480p", "720p", "1080p"], "720p"),
  duration: seconds(2, 30, 5),
  generateAudio: { type: "boolean", default: true },
} as const satisfies ModelEntry["settings"];

/** Wan 3.0 and Wan 3.0 Prime share every field; only the endpoint differs. A
    start frame fixes the picture's shape, so the image endpoint takes no aspect ratio. */
export function wan3Routes(prefix: string): FalRoutes {
  const dials = {
    resolution: "resolution",
    duration: "duration",
    generateAudio: "audio",
  };
  return {
    text: { path: `${prefix}/text-to-video`, settings: { ...dials, aspectRatio: "aspect_ratio" } },
    image: {
      path: `${prefix}/image-to-video`,
      start: "start_image_url",
      end: "end_image_url",
      settings: dials,
    },
  };
}

export const wan3: ModelEntry = {
  id: "wan-3",
  surface: "video",
  label: "Wan 3.0",
  roles: { start: 1, end: 1 },
  settings: wan3Settings,
  routes: wan3Routes("alibaba/wan-3.0"),
};
