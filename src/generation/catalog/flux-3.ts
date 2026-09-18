import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = {
  resolution: "resolution",
  duration: "duration",
  generateAudio: "generate_audio",
};

export const flux3: ModelEntry = {
  id: "flux-3",
  surface: "video",
  label: "Flux 3",
  roles: { start: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "2:1"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: seconds(5, 20, 5),
    generateAudio: { type: "boolean", default: true },
  },
  routes: {
    text: {
      path: "blackforestlabs/flux-3/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: { path: "blackforestlabs/flux-3/image-to-video", start: "image_url", settings: dials },
  },
};
