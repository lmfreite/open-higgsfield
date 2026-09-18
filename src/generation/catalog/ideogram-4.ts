import { imageAspect, imageSize } from "./defaults";
import type { ModelEntry } from "./types";

export const ideogram4: ModelEntry = {
  id: "ideogram-4",
  surface: "image",
  label: "Ideogram 4.0",
  roles: {},
  settings: { aspectRatio: imageAspect },
  routes: {
    text: { path: "ideogram/v4", settings: { aspectRatio: imageSize } },
  },
};
