import { aspect, asString, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = {
  duration: asString("duration"),
  generateAudio: "generate_audio",
};

export const kling26: ModelEntry = {
  id: "kling-2.6",
  surface: "video",
  label: "Kling 2.6",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1"]),
    duration: seconds(5, 10, 5, 5),
    generateAudio: { type: "boolean", default: true },
  },
  routes: {
    text: {
      path: "fal-ai/kling-video/v2.6/pro/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: "fal-ai/kling-video/v2.6/pro/image-to-video",
      start: "start_image_url",
      end: "end_image_url",
      settings: dials,
    },
  },
};
