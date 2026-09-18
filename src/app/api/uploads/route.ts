import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTIONS,
  resolveDeviceId,
  sanitizeFilename,
} from "@/generation/device";
import { MAX_UPLOAD_BYTES, UPLOAD_DIR, contentTypeOf, uploadUrl } from "@/generation/local-media";

// Writes to this machine's disk, so it is for a studio you run yourself. Anyone
// who can hit this route can fill the folder — gate it when auth exists.

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "Send the file as form field \"file\"");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "File is over 90 MB");

  const name = storedName(file.name);
  if (!contentTypeOf(name)) return fail(415, "Use a JPG, PNG, WebP, GIF, MP4 or WAV file");

  const jar = await cookies();
  const device = resolveDeviceId(jar.get(DEVICE_COOKIE)?.value);
  const folder = path.join(UPLOAD_DIR, device.deviceId);
  try {
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    console.error("[uploads] write failed", error instanceof Error ? error.message : error);
    return withDeviceCookie(fail(500, "Could not write to the uploads folder"), device);
  }

  console.info("[uploads] saved", { name, bytes: file.size });
  return withDeviceCookie(NextResponse.json({ url: uploadUrl(device.deviceId, name) }), device);
}

/** The name the file keeps on disk: what it was called, made safe, plus a random
    suffix so two files named "image.png" never replace each other. */
function storedName(original: string): string {
  const { name, ext } = path.parse(sanitizeFilename(original));
  return `${name.slice(0, 120)}-${randomBytes(4).toString("hex")}${ext.toLowerCase()}`;
}

function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function withDeviceCookie(
  response: NextResponse,
  device: { deviceId: string; minted: boolean },
): NextResponse {
  if (device.minted) response.cookies.set(DEVICE_COOKIE, device.deviceId, DEVICE_COOKIE_OPTIONS);
  return response;
}
