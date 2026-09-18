import { wan3Routes, wan3Settings } from "./wan-3";
import type { ModelEntry } from "./types";

export const wan3Prime: ModelEntry = {
  id: "wan-3-prime",
  surface: "video",
  label: "Wan 3.0 Prime",
  roles: { start: 1, end: 1 },
  settings: wan3Settings,
  routes: wan3Routes("alibaba/wan-3.0-prime"),
};
