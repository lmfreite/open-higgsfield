import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = { resolution: "resolution", duration: "duration" };

export const wan27: ModelEntry = {
  id: "wan-2.7",
  surface: "video",
  label: "Wan 2.7",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: seconds(2, 15, 5),
  },
  routes: {
    text: {
      path: "fal-ai/wan/v2.7/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: "fal-ai/wan/v2.7/image-to-video",
      start: "image_url",
      end: "end_image_url",
      settings: dials,
    },
  },
};
