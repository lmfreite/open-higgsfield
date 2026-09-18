import { toAuthorizationHeader } from "./credentials";

export const FAL_QUEUE_URL = "https://queue.fal.run";
export const FAL_REST_URL = "https://rest.fal.ai";

const MODEL_ID = /^[a-z0-9][a-z0-9._/-]*$/i;
const REQUEST_ID = /^[a-z0-9-]+$/i;

/** Answers that mean "ask again", not "this run is lost". */
const TRANSIENT = new Set([408, 425, 429, 502, 503, 504]);

export class PlatformError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body));
    this.name = "PlatformError";
    this.status = status;
    this.body = body;
  }
}

export type QueuedGeneration = {
  status: string;
  requestId: string;
};

export type GenerationStatus = {
  status: string;
  requestId: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: unknown;
};

/** One request's answer inside a batched status poll. A request that errors
    carries its reason alone, so it cannot lose the answers standing beside it. */
export type StatusResult =
  | { requestId: string; status: GenerationStatus }
  | { requestId: string; error: string };

export type PlatformClientOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export function isModelId(model: string): boolean {
  return MODEL_ID.test(model) && !model.includes("..");
}

/* fal answers status and result under the app — owner and alias — never under
   the endpoint that was submitted: "fal-ai/kling-video/v3/pro/text-to-video"
   is polled at "fal-ai/kling-video". The studio only ever holds one string per
   run, so it carries both halves: "<request id>@<owner>~<alias>". */
export function packRequestId(path: string, requestId: string): string {
  const [owner, alias] = path.split("/");
  return `${requestId}@${owner}~${alias}`;
}

function unpackRequestId(packed: string): { id: string; app: string } {
  const [id, tail, ...rest] = packed.split("@");
  const [owner, alias, ...extra] = (tail ?? "").split("~");
  const app = `${owner}/${alias}`;
  if (
    !id ||
    !REQUEST_ID.test(id) ||
    !owner ||
    !alias ||
    rest.length > 0 ||
    extra.length > 0 ||
    !isModelId(app)
  ) {
    throw new PlatformError(400, { detail: "Invalid request id" });
  }
  return { id, app };
}

export function createPlatformClient(options: PlatformClientOptions) {
  const baseUrl = (options.baseUrl ?? FAL_QUEUE_URL).replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const auth = toAuthorizationHeader(options.apiKey);

  async function request(method: "GET" | "POST", url: string, body?: Record<string, unknown>) {
    console.info("[fal] request", { method, url, body: body ?? null });
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await readJson(response);
    console.info("[fal] response", { method, url, status: response.status, body: payload });
    if (!response.ok) throw new PlatformError(response.status, payload);
    return payload;
  }

  const send = (method: "GET" | "POST", path: string, body?: Record<string, unknown>) =>
    request(method, `${baseUrl}${path}`, body);

  return {
    /** Puts a file on fal's CDN and returns the URL a model can read it from. */
    async upload(data: Buffer, contentType: string, filename: string): Promise<string> {
      const initiated = asRecord(
        await request("POST", `${FAL_REST_URL}/storage/upload/initiate?storage_type=fal-cdn-v3`, {
          content_type: contentType,
          file_name: filename,
        }),
      );
      const uploadUrl = stringField(initiated, "upload_url");
      const fileUrl = stringField(initiated, "file_url");
      if (!uploadUrl || !fileUrl) {
        throw new PlatformError(502, { detail: "fal upload response missing upload_url" });
      }

      console.info("[fal] upload", { filename, contentType, bytes: data.byteLength });
      const put = await fetchImpl(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: new Blob([new Uint8Array(data)], { type: contentType }),
      });
      if (!put.ok) throw new PlatformError(put.status, await readJson(put));
      return fileUrl;
    },

    async submit(model: string, input: Record<string, unknown>): Promise<QueuedGeneration> {
      if (!isModelId(model)) throw new PlatformError(400, { detail: "Invalid model" });
      return mapQueued(model, await send("POST", `/${model}`, input));
    },

    async status(packed: string): Promise<GenerationStatus> {
      const { id, app } = unpackRequestId(packed);
      const waiting = (status: string): GenerationStatus => ({ status, requestId: packed });

      let state: Record<string, unknown>;
      try {
        state = asRecord(await send("GET", `/${app}/requests/${id}/status`));
      } catch (caught) {
        if (caught instanceof PlatformError && TRANSIENT.has(caught.status)) {
          return waiting("in_progress");
        }
        throw caught;
      }

      const raw = stringField(state, "status");
      if (raw === "IN_QUEUE") return waiting("queued");
      if (raw !== "COMPLETED") return waiting(raw?.toLowerCase() ?? "in_progress");
      if (state.error) return { ...waiting("failed"), error: describeFailure(state.error) };

      /* A run that finished badly answers its result request with the reason. */
      try {
        return mapResult(packed, await send("GET", `/${app}/requests/${id}`));
      } catch (caught) {
        if (!(caught instanceof PlatformError)) throw caught;
        if (TRANSIENT.has(caught.status)) return waiting("in_progress");
        return { ...waiting("failed"), error: caught.message };
      }
    },
  };
}

function mapQueued(model: string, payload: unknown): QueuedGeneration {
  const data = asRecord(payload);
  const requestId = stringField(data, "request_id");
  if (!requestId) throw new PlatformError(502, { detail: "fal response missing request_id" });
  return { status: "queued", requestId: packRequestId(model, requestId) };
}

/** Image models answer `images`, video models `video`; a few single-image
    models answer `image`. Whatever the model, the studio gets urls. */
function mapResult(packed: string, payload: unknown): GenerationStatus {
  const data = asRecord(payload);
  const fromList = Array.isArray(data.images)
    ? data.images.flatMap((item) => {
        const url = asRecord(item).url;
        return typeof url === "string" ? [{ url }] : [];
      })
    : [];
  const single = asRecord(data.image).url;
  const images = fromList.length > 0 ? fromList : typeof single === "string" ? [{ url: single }] : [];
  const videoUrl = asRecord(data.video).url;

  if (images.length === 0 && typeof videoUrl !== "string") {
    return { status: "failed", requestId: packed, error: "fal finished without an image or video" };
  }
  return {
    status: "completed",
    requestId: packed,
    ...(images.length > 0 ? { images } : {}),
    ...(typeof videoUrl === "string" ? { video: { url: videoUrl } } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function describeFailure(error: unknown): string {
  if (typeof error === "string" && error) return error;
  return messageFromBody(500, error);
}

/** fal's own reasons: a string, or a list of validation problems — one per
    field the endpoint refused — each naming where it went wrong. */
function messageFromBody(status: number, body: unknown): string {
  const record = asRecord(body);
  const detail = record.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const problems = detail.flatMap((item) => {
      const entry = asRecord(item);
      const message = stringField(entry, "msg");
      if (!message) return [];
      const where = Array.isArray(entry.loc) ? entry.loc.filter((part) => part !== "body") : [];
      return [where.length > 0 ? `${where.join(".")}: ${message}` : message];
    });
    if (problems.length > 0) return problems.join("; ");
  }
  const message = stringField(record, "message") ?? stringField(record, "error");
  if (message) return message;
  return `fal request failed (${status})`;
}
