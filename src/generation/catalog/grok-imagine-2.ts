import { IMAGE_ASPECT, aspectUnlessAuto, resolution } from "./defaults";
import type { ModelEntry } from "./types";

export const grokImagine2: ModelEntry = {
  id: "grok-imagine-2",
  surface: "image",
  label: "Grok Imagine 2.0",
  roles: { reference: 8 },
  settings: {
    aspectRatio: { type: "enum", values: IMAGE_ASPECT, default: "1:1" },
    resolution: resolution(["1k", "2k"], "1k"),
  },
  routes: {
    text: {
      path: "xai/grok-imagine-image/v2.0/text-to-image",
      settings: { aspectRatio: aspectUnlessAuto, resolution: "resolution" },
    },
    reference: {
      path: "xai/grok-imagine-image/v2.0/edit",
      refs: "image_urls",
      settings: { aspectRatio: aspectUnlessAuto, resolution: "resolution" },
    },
  },
};
