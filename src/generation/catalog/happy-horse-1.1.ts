import { aspect, resolution, seconds } from "./defaults";
import { happyHorseRoutes } from "./happy-horse-1";
import type { ModelEntry } from "./types";

export const happyHorse11: ModelEntry = {
  id: "happy-horse-1.1",
  surface: "video",
  label: "Happy Horse 1.1",
  roles: { start: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21", "5:4", "4:5"]),
    resolution: resolution(["720p", "1080p"], "720p"),
    duration: seconds(3, 15, 5),
  },
  routes: happyHorseRoutes("alibaba/happy-horse/v1.1"),
};
