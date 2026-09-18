import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { Readable } from "node:stream";

import { cookies } from "next/headers";

import { DEVICE_COOKIE } from "@/generation/device";
import { contentTypeOf, uploadPath, uploadUrl } from "@/generation/local-media";

type Params = { params: Promise<{ device: string; file: string }> };

/** Serves a saved attachment back to the studio — thumbnails, the viewer, the
    asset picker. Video needs byte ranges: without them a browser cannot seek. */
export async function GET(request: Request, { params }: Params): Promise<Response> {
  const { device, file } = await params;
  const location = uploadPath(uploadUrl(device, file));
  const type = contentTypeOf(file);
  if (!location || !type) return new Response(null, { status: 404 });

  let size: number;
  try {
    const info = await stat(location);
    if (!info.isFile()) return new Response(null, { status: 404 });
    size = info.size;
  } catch {
    return new Response(null, { status: 404 });
  }

  const headers = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    // The name carries a random suffix, so a URL always means the same bytes.
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  if (range) {
    return new Response(stream(location, range.start, range.end), {
      status: 206,
      headers: {
        ...headers,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
      },
    });
  }
  return new Response(stream(location, 0, size - 1), {
    headers: { ...headers, "Content-Length": String(size) },
  });
}

/** Removes a saved attachment from the folder. Only the browser that saved it may:
    the device cookie has to name the folder the file sits in. A file already gone
    counts as deleted, so a stale entry in the library can still be cleared. */
export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  const { device, file } = await params;
  const location = uploadPath(uploadUrl(device, file));
  if (!location) return new Response(null, { status: 404 });

  const jar = await cookies();
  if (jar.get(DEVICE_COOKIE)?.value !== device) return new Response(null, { status: 403 });

  try {
    await unlink(location);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[uploads] delete failed", error instanceof Error ? error.message : error);
      return new Response(null, { status: 500 });
    }
  }
  console.info("[uploads] deleted", { name: file });
  return new Response(null, { status: 204 });
}

function stream(location: string, start: number, end: number): ReadableStream {
  if (end < start) return new ReadableStream({ start: (controller) => controller.close() });
  return Readable.toWeb(createReadStream(location, { start, end })) as ReadableStream;
}

/** A single "bytes=a-b", "bytes=a-" or "bytes=-n" range; null when none was asked for. */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return "invalid";
  if (match[1] === "") {
    const tail = Number(match[2]);
    if (tail === 0) return "invalid";
    return { start: Math.max(0, size - tail), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || end < start) return "invalid";
  return { start, end };
}
