import type { SettingField } from "./types";

/** fal declares some numbers as strings ("5") and others as numbers (5); the
    catalog keeps them all numbers and each route says which one it wants. */
export const asString = (field: string) => (value: unknown) => ({ [field]: String(value) });

export const shotType = (value: unknown) => ({ shot_type: value ? "intelligent" : "customize" });

/** "auto" is a choice fal only offers on some endpoints — elsewhere it is the
    default, so leaving the field out says the same thing. */
export const aspectUnlessAuto = (value: unknown) =>
  value === "auto" ? {} : { aspect_ratio: value };

/** Image endpoints size by preset, and fal has one for each ratio the studio offers. */
const IMAGE_SIZES: Record<string, string> = {
  "1:1": "square_hd",
  "4:3": "landscape_4_3",
  "3:4": "portrait_4_3",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
};

export const imageSize = (value: unknown) => {
  const preset = typeof value === "string" ? IMAGE_SIZES[value] : undefined;
  return preset ? { image_size: preset } : {};
};

export const IMAGE_ASPECT = ["auto", "1:1", "4:3", "3:4", "16:9", "9:16"] as const;

export const imageAspect: SettingField = {
  type: "enum",
  values: IMAGE_ASPECT,
  default: "1:1",
};

export function aspect(values: readonly string[], fallback = "16:9"): SettingField {
  return { type: "enum", values, default: fallback };
}

export function resolution(values: readonly string[], fallback: string): SettingField {
  return { type: "enum", values, default: fallback };
}

/** Whole seconds. A `step` above 1 is for endpoints that only take a few
    lengths — {5, 10} is min 5, max 10, step 5. */
export function seconds(min: number, max: number, fallback: number, step = 1): SettingField {
  return { type: "range", min, max, default: fallback, ...(step === 1 ? {} : { step }) };
}
