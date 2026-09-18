import { aspect, asString, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = { resolution: "resolution", duration: asString("duration") };

export const wan26: ModelEntry = {
  id: "wan-2.6",
  surface: "video",
  label: "Wan 2.6",
  roles: { start: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: seconds(5, 15, 5, 5),
  },
  routes: {
    text: {
      path: "wan/v2.6/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: { path: "wan/v2.6/image-to-video", start: "image_url", settings: dials },
  },
};
