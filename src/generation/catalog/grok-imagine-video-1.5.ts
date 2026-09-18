import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const GROK_ASPECT = ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"] as const;

const dials = { resolution: "resolution", duration: "duration" };

export const grokImagineVideo15: ModelEntry = {
  id: "grok-imagine-video-1.5",
  surface: "video",
  label: "Grok Imagine Video 1.5",
  roles: { start: 1, reference: 8 },
  settings: {
    aspectRatio: aspect(GROK_ASPECT),
    resolution: resolution(["480p", "720p"], "720p"),
    duration: seconds(1, 15, 6),
  },
  routes: {
    text: {
      path: "xai/grok-imagine-video/v1.5/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: "xai/grok-imagine-video/v1.5/image-to-video",
      start: "image_url",
      settings: dials,
    },
    reference: {
      path: "xai/grok-imagine-video/v1.5/reference-to-video",
      refs: "reference_image_urls",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
  },
};
