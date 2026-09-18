import { imageAspect, imageSize } from "./defaults";
import type { ModelEntry } from "./types";

export const zImageTurbo: ModelEntry = {
  id: "z-image-turbo",
  surface: "image",
  label: "Z-Image Turbo",
  roles: {},
  settings: { aspectRatio: imageAspect },
  routes: {
    text: { path: "fal-ai/z-image/turbo", settings: { aspectRatio: imageSize } },
  },
};
