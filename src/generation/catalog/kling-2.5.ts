import { aspect, asString, seconds } from "./defaults";
import type { ModelEntry } from "./types";

export const kling25: ModelEntry = {
  id: "kling-2.5",
  surface: "video",
  label: "Kling 2.5",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: seconds(5, 10, 5, 5),
  },
  routes: {
    text: {
      path: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
      settings: { aspectRatio: "aspect_ratio", duration: asString("duration") },
    },
    image: {
      path: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      start: "image_url",
      end: "tail_image_url",
      settings: { duration: asString("duration") },
    },
  },
};
