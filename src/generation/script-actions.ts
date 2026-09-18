"use server";

import { cookies } from "next/headers";

import { PLATFORM_KEY_COOKIE_OPTIONS } from "./credentials";
import { completeScript } from "./script-client";

/* The key for the script-writing model is not the fal key: it belongs to whatever
   provider the visitor points the base URL at. It is kept the same way — in an
   httpOnly cookie a server action reads — and SCRIPT_API_KEY in the server's
   environment is what a visitor without one falls back on. */
const SCRIPT_KEY_COOKIE = "script_api_key";

const MAX_BRIEF = 20_000;
const MAX_SYSTEM = 20_000;

export async function saveScriptKey(data: unknown) {
  const apiKey = field(data, "apiKey").trim();
  if (!apiKey) throw new Error("Enter an API key");
  const jar = await cookies();
  jar.set(SCRIPT_KEY_COOKIE, apiKey, PLATFORM_KEY_COOKIE_OPTIONS);
}

export async function clearScriptKey() {
  const jar = await cookies();
  jar.set(SCRIPT_KEY_COOKIE, "", { ...PLATFORM_KEY_COOKIE_OPTIONS, maxAge: 0 });
}

export async function hasScriptKey() {
  return (await readKey()) !== undefined;
}

export async function generateScript(data: unknown): Promise<{ text: string }> {
  const baseUrl = field(data, "baseUrl").trim();
  const model = field(data, "model").trim();
  const system = field(data, "system");
  const brief = field(data, "brief").trim();

  if (!baseUrl) throw new Error("Set the base URL first");
  if (!model) throw new Error("Set the model first");
  if (!brief) throw new Error("Write what the script is about");
  if (brief.length > MAX_BRIEF) throw new Error("The brief is too long");
  if (system.length > MAX_SYSTEM) throw new Error("The instructions are too long");

  const text = await completeScript({ baseUrl, model, system, brief }, { apiKey: await readKey() });
  return { text };
}

async function readKey(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SCRIPT_KEY_COOKIE)?.value || process.env.SCRIPT_API_KEY?.trim() || undefined;
}

function field(data: unknown, key: string): string {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid request");
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
