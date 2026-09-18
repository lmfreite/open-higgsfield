import { imageAspect, imageSize } from "./defaults";
import type { ModelEntry } from "./types";

export const recraft41: ModelEntry = {
  id: "recraft-4.1",
  surface: "image",
  label: "Recraft 4.1",
  roles: {},
  settings: { aspectRatio: imageAspect },
  routes: {
    text: { path: "fal-ai/recraft/v4.1/text-to-image", settings: { aspectRatio: imageSize } },
  },
};
