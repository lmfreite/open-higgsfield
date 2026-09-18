import { aspect, asString, seconds } from "./defaults";
import type { ModelEntry } from "./types";

export const klingO3: ModelEntry = {
  id: "kling-o3",
  surface: "video",
  label: "Kling O3",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: seconds(3, 15, 5),
  },
  routes: {
    text: {
      path: "fal-ai/kling-video/o3/pro/text-to-video",
      settings: { aspectRatio: "aspect_ratio", duration: asString("duration") },
    },
    image: {
      path: "fal-ai/kling-video/o3/pro/image-to-video",
      start: "image_url",
      end: "end_image_url",
      settings: { duration: asString("duration") },
    },
  },
};
