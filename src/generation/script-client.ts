export type ScriptRequest = {
  baseUrl: string;
  model: string;
  /** Standing instructions; left out of the request when empty. */
  system: string;
  brief: string;
};

/** A long script from a slow model can take a while, but not forever. */
const TIMEOUT_MS = 120_000;

/** Where a chat completion is asked for. The base is whatever the provider calls
    its API root — ".../v1", a local Ollama, a proxy — and the path is added,
    unless the visitor already pasted the whole endpoint. */
export function chatUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new Error("Base URL must look like https://api.example.com/v1");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Base URL must start with http:// or https://");
  }
  const path = url.pathname.replace(/\/+$/, "");
  const full = path.endsWith("/chat/completions") ? path : `${path}/chat/completions`;
  return `${url.origin}${full}${url.search}`;
}

/** Asks an OpenAI-compatible endpoint for a script and returns its text. The key
    is optional: a local model behind an open port takes none. */
export async function completeScript(
  request: ScriptRequest,
  options: { apiKey?: string; fetch?: typeof fetch } = {},
): Promise<string> {
  const url = chatUrl(request.baseUrl);
  const messages = [
    ...(request.system.trim() ? [{ role: "system", content: request.system }] : []),
    { role: "user", content: request.brief },
  ];

  console.info("[script] request", { url, model: request.model });
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: request.model, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (caught) {
    if (caught instanceof Error && (caught.name === "TimeoutError" || caught.name === "AbortError")) {
      throw new Error("The model did not answer within 2 minutes");
    }
    throw new Error(`Could not reach ${new URL(url).origin}`);
  }

  const payload = await readJson(response);
  console.info("[script] response", { status: response.status });
  if (!response.ok) throw new Error(errorMessage(response.status, payload));

  const text = textOf(payload);
  if (!text) throw new Error("The model answered without any text");
  return text;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** `choices[0].message.content` is a string on most providers and a list of
    typed parts on a few; either reads as the same text. */
function textOf(payload: unknown): string {
  const first = asRecord(Array.isArray(asRecord(payload).choices) ? (asRecord(payload).choices as unknown[])[0] : null);
  const content = asRecord(first.message).content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : asRecord(part).text))
      .filter((part): part is string => typeof part === "string")
      .join("")
      .trim();
  }
  return "";
}

/** Providers word failures differently: {error:{message}}, {error:"..."},
    {message}, {detail}. Whichever is there is the reason worth showing. */
function errorMessage(status: number, payload: unknown): string {
  const record = asRecord(payload);
  const nested = asRecord(record.error).message;
  const reason = [nested, record.error, record.message, record.detail].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (reason) return `${reason} (${status})`;
  if (typeof payload === "string" && payload.trim() && payload.length < 200) {
    return `${payload.trim()} (${status})`;
  }
  return `The model API answered ${status}`;
}
