import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/** Files the visitor attaches live in this folder of the project, one folder per
    device. fal cannot reach a localhost URL, so a file only leaves the machine at
    the moment a generation needs it — see `hostLocalMedia`. */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const UPLOAD_ROUTE = "/api/uploads/";

/** fal takes one PUT up to 90 MB; past that it wants a multipart upload. */
export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

/** What a role can be filled from — the same allow-list the file pickers use. */
export const UPLOAD_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
};

const DEVICE = "[A-Za-z0-9_-]{16,64}";
const FILE = "[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}";
const UPLOAD_URL = new RegExp(`^${UPLOAD_ROUTE}(${DEVICE})/(${FILE})$`);

export function uploadUrl(deviceId: string, filename: string): string {
  return `${UPLOAD_ROUTE}${deviceId}/${filename}`;
}

/** The file on disk behind a studio upload URL, or null for any other string.
    The pattern leaves no room for a separator or a leading dot, so nothing
    outside `uploads/<device>/` can be named. */
export function uploadPath(url: string): string | null {
  const match = UPLOAD_URL.exec(url);
  return match ? path.join(UPLOAD_DIR, match[1]!, match[2]!) : null;
}

export function contentTypeOf(filename: string): string | undefined {
  return UPLOAD_TYPES[path.extname(filename).toLowerCase()];
}

export type Host = (data: Buffer, contentType: string, filename: string) => Promise<string>;

/* An upload is hosted once and reused: the same attachment across a batch, or a
   second press with the same reference, should not travel twice. Kept shorter
   than fal's own retention so a cached URL is never one that has expired. */
const HOSTED_TTL_MS = 30 * 60_000;
const hosted = new Map<string, { url: string; at: number }>();

/** Puts every studio upload in a request body on fal's CDN and swaps in the
    URL it got back, so the model reads a file only this project holds. Anything
    else in the body — including a prompt that happens to look like a path — is
    left alone. */
export async function hostLocalMedia(
  body: Record<string, unknown>,
  host: Host,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "prompt") out[key] = value;
    else if (typeof value === "string") out[key] = await hostOne(value, host);
    else if (Array.isArray(value)) {
      out[key] = await Promise.all(
        value.map((item) => (typeof item === "string" ? hostOne(item, host) : item)),
      );
    } else out[key] = value;
  }
  return out;
}

async function hostOne(value: string, host: Host): Promise<string> {
  const file = uploadPath(value);
  if (!file) return value;

  let info;
  try {
    info = await stat(file);
  } catch {
    throw new Error(`Attachment ${path.basename(file)} is no longer in the uploads folder — attach it again`);
  }

  const key = `${file}:${info.mtimeMs}:${info.size}`;
  const cached = hosted.get(key);
  if (cached && Date.now() - cached.at < HOSTED_TTL_MS) return cached.url;

  const name = path.basename(file);
  const url = await host(await readFile(file), contentTypeOf(name) ?? "application/octet-stream", name);
  hosted.set(key, { url, at: Date.now() });
  return url;
}
