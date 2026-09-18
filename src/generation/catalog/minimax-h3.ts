import { aspect, resolution, seconds } from "./defaults";
import type { ModelEntry } from "./types";

const dials = { resolution: "resolution", duration: "duration" };

export const minimaxH3: ModelEntry = {
  id: "minimax-h3",
  surface: "video",
  label: "MiniMax H3",
  /* Start, up to three in between, end — five pictures. fal's endpoint has no
     timeline: with intermediates the whole set goes, in order, to the reference
     endpoint; with only a start and an end they stay real first and last frames. */
  roles: { start: 1, middle: 3, end: 1 },
  settings: {
    aspectRatio: aspect(["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]),
    resolution: resolution(["480P", "768P", "2K", "4K"], "768P"),
    duration: seconds(5, 15, 5),
  },
  routes: {
    text: {
      path: "minimax/h3/text-to-video",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
    image: {
      path: "minimax/h3/image-to-video",
      start: "image_url",
      end: "end_image_url",
      settings: dials,
    },
    reference: {
      path: "minimax/h3/reference-to-video",
      frames: "reference_image_urls",
      settings: { ...dials, aspectRatio: "aspect_ratio" },
    },
  },
};
