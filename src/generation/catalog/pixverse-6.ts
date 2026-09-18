import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = {
  resolution: "resolution",
  duration: "duration",
  generateAudio: "generate_audio_switch",
};

export const pixverse6: ModelEntry = {
  id: "pixverse-6",
  surface: "video",
  label: "PixVerse 6",
  roles: { start: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9"]),
    resolution: resolution(["360p", "540p", "720p", "1080p"], "720p"),
    duration: seconds(1, 15, 5),
    generateAudio: { type: "boolean", default: false },
  },
  routes: {
    text: {
      path: "fal-ai/pixverse/v6/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: { path: "fal-ai/pixverse/v6/image-to-video", start: "image_url", settings: dials },
  },
};
