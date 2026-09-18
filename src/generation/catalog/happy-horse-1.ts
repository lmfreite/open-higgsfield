import { aspect, resolution, seconds } from "./defaults";
import type { FalRoutes, ModelEntry } from "./types";

const dials = { resolution: "resolution", duration: "duration" };

/** 1.0 and 1.1 share every field; only the endpoint differs. A start frame
    fixes the picture's shape, so the image endpoint takes no aspect ratio. */
export function happyHorseRoutes(prefix: string): FalRoutes {
  return {
    text: {
      path: `${prefix}/text-to-video`,
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: { path: `${prefix}/image-to-video`, start: "image_url", settings: dials },
  };
}

export const happyHorse1: ModelEntry = {
  id: "happy-horse-1",
  surface: "video",
  label: "Happy Horse 1.0",
  roles: { start: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: seconds(3, 15, 5),
  },
  routes: happyHorseRoutes("alibaba/happy-horse"),
};
