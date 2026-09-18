import type { ModelEntry } from "./types";

export function parseSettings(
  model: ModelEntry,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(model.settings)) {
    const value = raw[key];
    if (field.type === "enum") {
      const picked = typeof value === "string" ? value : field.default;
      if (!field.values.includes(picked)) throw new Error(`Invalid ${key}`);
      out[key] = picked;
      continue;
    }
    if (field.type === "range") {
      const picked = typeof value === "number" ? value : field.default;
      if (picked < field.min || picked > field.max) throw new Error(`Invalid ${key}`);
      if (field.step && !onStep(picked, field.min, field.step)) throw new Error(`Invalid ${key}`);
      out[key] = picked;
      continue;
    }
    out[key] = typeof value === "boolean" ? value : field.default;
  }
  return out;
}

/** Some endpoints take only a few lengths ({5, 10}, {6, 8, 10}); a value between
    them is one fal would refuse, so it never leaves. Tolerant of float steps. */
function onStep(value: number, min: number, step: number): boolean {
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}
