import { getModel } from "./catalog";
import type { FalRoute, FalRoutes, GenerationPlane, MediaRole } from "./catalog/types";

type Mapped = { path: string; body: Record<string, unknown> };

export function toPlatform(plane: GenerationPlane): Mapped {
  const model = getModel(plane.model);
  const route = pickRoute(plane, model.routes);
  if (!route) throw new Error(`No fal endpoint for ${plane.model}`);
  return {
    path: typeof route.path === "function" ? route.path(plane.settings) : route.path,
    body: bodyFor(plane, route),
  };
}

function urls(plane: GenerationPlane, role: MediaRole): string[] {
  return (plane.media[role] ?? []).map((item) => item.url);
}

/** The media the plane carries decides the endpoint: a start or end image takes
    the image route, references and videos the reference route, nothing the text
    route. Intermediate frames outrank both — no image endpoint has a place for
    them, so a plane that carries any goes to the route that takes a whole set of
    pictures. A model whose only route does not match still gets it, so fal names
    what is missing instead of the studio guessing. */
function pickRoute(plane: GenerationPlane, { text, image, reference }: FalRoutes) {
  if (urls(plane, "middle").length > 0 && reference) return reference;
  const framed = urls(plane, "start").length > 0 || urls(plane, "end").length > 0;
  const referenced =
    urls(plane, "reference").length > 0 ||
    urls(plane, "video").length > 0 ||
    urls(plane, "audio").length > 0;
  if (framed && image) return image;
  if (referenced && reference) return reference;
  return text ?? image ?? reference;
}

function bodyFor(plane: GenerationPlane, route: FalRoute): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt: plane.prompt.text, ...route.fixed };

  for (const [key, target] of Object.entries(route.settings ?? {})) {
    const value = plane.settings[key];
    if (value === undefined) continue;
    Object.assign(body, typeof target === "function" ? target(value) : { [target]: value });
  }

  const single = (field: string | undefined, role: MediaRole) => {
    const [first] = urls(plane, role);
    if (field && first) body[field] = first;
  };
  const list = (field: string | undefined, role: MediaRole) => {
    const all = urls(plane, role);
    if (field && all.length > 0) body[field] = all;
  };
  single(route.start, "start");
  single(route.end, "end");
  single(route.video, "video");
  list(route.refs, "reference");
  if (route.frames) {
    const frames = [...urls(plane, "start"), ...urls(plane, "middle"), ...urls(plane, "end")];
    if (frames.length > 0) body[route.frames] = frames;
  }
  list(route.videos, "video");
  list(route.audios, "audio");
  return body;
}
