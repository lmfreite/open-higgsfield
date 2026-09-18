import { aspect, resolution, seconds } from "./defaults";
import { ltx25Routes } from "./ltx-2.5-fast";
import type { ModelEntry } from "./types";

export const ltx25Pro: ModelEntry = {
  id: "ltx-2.5-pro",
  surface: "video",
  label: "LTX 2.5 Pro",
  roles: { start: 1, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16"]),
    resolution: resolution(["720p", "1080p"], "1080p"),
    duration: seconds(6, 10, 6, 2),
    generateAudio: { type: "boolean", default: true },
  },
  routes: ltx25Routes("pro"),
};
