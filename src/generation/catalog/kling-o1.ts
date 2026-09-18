import { asString, seconds } from "./defaults";
import type { ModelEntry } from "./types";

export const klingO1: ModelEntry = {
  id: "kling-o1",
  surface: "video",
  label: "Kling O1 (Omni)",
  roles: { start: 1, end: 1 },
  settings: { duration: seconds(3, 10, 5) },
  routes: {
    image: {
      path: "fal-ai/kling-video/o1/image-to-video",
      start: "start_image_url",
      end: "end_image_url",
      settings: { duration: asString("duration") },
    },
  },
};
