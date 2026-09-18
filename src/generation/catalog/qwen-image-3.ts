import { imageAspect, imageSize } from "./defaults";
import type { ModelEntry } from "./types";

export const qwenImage3: ModelEntry = {
  id: "qwen-image-3",
  surface: "image",
  label: "Qwen Image 3",
  roles: { reference: 8 },
  settings: { aspectRatio: imageAspect },
  routes: {
    text: { path: "alibaba/qwen-image-3/text-to-image", settings: { aspectRatio: imageSize } },
    reference: {
      path: "alibaba/qwen-image-3/edit",
      refs: "image_urls",
      settings: { aspectRatio: imageSize },
    },
  },
};
