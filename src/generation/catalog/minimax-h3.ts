import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = { resolution: "resolution", duration: "duration" };

export const minimaxH3: ModelEntry = {
  id: "minimax-h3",
  surface: "video",
  label: "MiniMax H3",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["480P", "768P", "2K", "4K"], "768P"),
    duration: seconds(5, 15, 5),
  },
  routes: {
    text: {
      path: "minimax/h3/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: "minimax/h3/image-to-video",
      start: "image_url",
      end: "end_image_url",
      settings: dials,
    },
  },
};
