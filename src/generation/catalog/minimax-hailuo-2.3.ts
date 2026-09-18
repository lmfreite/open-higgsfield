import { asString, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = { duration: asString("duration") };

export const minimaxHailuo23: ModelEntry = {
  id: "minimax-hailuo-2.3",
  surface: "video",
  label: "MiniMax Hailuo 2.3",
  roles: { start: 1 },
  settings: { duration: seconds(6, 10, 6, 4) },
  routes: {
    text: { path: "fal-ai/minimax/hailuo-2.3/standard/text-to-video", settings: dials },
    image: {
      path: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
      start: "image_url",
      settings: dials,
    },
  },
};
