export type Surface = "image" | "video";
export type MediaRole = "start" | "end" | "reference" | "video" | "audio";

export type MediaItem = {
  id: string;
  url: string;
  role: MediaRole;
};

export type SettingField =
  | { type: "enum"; values: readonly string[]; default: string }
  | { type: "range"; min: number; max: number; default: number; step?: number }
  | { type: "boolean"; default: boolean };

/** How one catalog setting is written into a fal request: a field name sends
    the value as it is, a function returns the fields itself — for the enums fal
    declares as strings, or a dial that fal spells with a different vocabulary. */
export type FalSettings = Record<string, string | ((value: unknown) => Record<string, unknown>)>;

/** One fal endpoint and the way it reads a plane. Only what differs between
    endpoints is spelled out: a media role with no field is never sent. */
export type FalRoute = {
  /** fal endpoint id, e.g. "bytedance/seedance-2.0/text-to-video". A function
      when the endpoint follows a setting. */
  path: string | ((settings: Record<string, unknown>) => string);
  /** Field carrying the first start image. */
  start?: string;
  /** Field carrying the first end image. */
  end?: string;
  /** Field carrying every reference image, as a list. */
  refs?: string;
  /** Field carrying the first video. */
  video?: string;
  /** Field carrying every video, as a list. */
  videos?: string;
  /** Field carrying every audio, as a list. */
  audios?: string;
  settings?: FalSettings;
  /** Fields the endpoint always needs, whatever the plane says. */
  fixed?: Record<string, unknown>;
};

export type FalRoutes = {
  /** Used when the plane carries no media. */
  text?: FalRoute;
  /** Used when the plane carries a start or end image. */
  image?: FalRoute;
  /** Used when the plane carries reference images, videos or audio. */
  reference?: FalRoute;
};

export type ModelEntry = {
  id: string;
  surface: Surface;
  label: string;
  roles: Partial<Record<MediaRole, number>>;
  settings: Record<string, SettingField>;
  routes: FalRoutes;
};

export type GenerationPlane = {
  model: string;
  prompt: { text: string };
  media: Partial<Record<MediaRole, MediaItem[]>>;
  settings: Record<string, unknown>;
};
