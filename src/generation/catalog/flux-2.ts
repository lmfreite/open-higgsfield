import { imageAspect, imageSize } from "./defaults";
import type { ModelEntry } from "./types";

export const flux2: ModelEntry = {
  id: "flux-2",
  surface: "image",
  label: "Flux 2",
  roles: { reference: 8 },
  settings: { aspectRatio: imageAspect },
  routes: {
    text: { path: "fal-ai/flux-2-pro", settings: { aspectRatio: imageSize } },
    reference: {
      path: "fal-ai/flux-2-pro/edit",
      refs: "image_urls",
      settings: { aspectRatio: imageSize },
    },
  },
};
