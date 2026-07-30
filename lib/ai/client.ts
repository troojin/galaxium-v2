import { getRequestContext } from "@cloudflare/next-on-pages";
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletion,
} from "./types";

export type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionChoice,
  ChatCompletion,
} from "./types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const KEY_AMOUNT = "9";

function getGroqApiKeys(): string[] {
  const env = getRequestContext().env as Record<string, string | undefined>;
  const keys: string[] = [];
  const maxKeys = parseInt(KEY_AMOUNT, 10) || 0;

  if (env.GROK_API_KEY && env.GROK_API_KEY.trim().length > 0) {
    keys.push(env.GROK_API_KEY);
  }

  for (let i = 1; i <= maxKeys; i++) {
    const val = env[`GROK_API_KEY_${i}`];
    if (val && typeof val === "string" && val.trim().length > 0 && !keys.includes(val)) {
      keys.push(val);
    }
  }

  return keys;
}

let currentKeyIndex = Math.floor(Math.random() * 100);

function getNextApiKey(): string {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No GROK_API_KEY or GROK_API_KEY_* environment variables configured."
    );
  }
  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  return key;
}

async function fetchWithKeyFallback(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> {
  const keys = getGroqApiKeys();
  if (keys.length === 0) {
    throw new Error("No Groq API keys available.");
  }

  let lastErrorMsg = "";
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = getNextApiKey();

    const res = await fetch(`${GROQ_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return res;
    }

    lastErrorMsg = await res.text();

    if (res.status !== 429 && res.status !== 401) {
      throw new Error(`Groq API returned status ${res.status}: ${lastErrorMsg}`);
    }
  }

  throw new Error(
    `All ${keys.length} Groq API keys exhausted/rate-limited. Last error: ${lastErrorMsg}`
  );
}

export async function createChatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletion> {
  const model = params.model ?? "openai/gpt-oss-120b";
  const body = { ...params, model, stream: false };

  const res = await fetchWithKeyFallback("/chat/completions", body);
  return (await res.json()) as ChatCompletion;
}

export async function createChatCompletionStream(
  params: Omit<ChatCompletionParams, "stream">
): Promise<ReadableStream<Uint8Array>> {
  const model = params.model ?? "openai/gpt-oss-120b";
  const body = { ...params, model, stream: true };

  const res = await fetchWithKeyFallback("/chat/completions", body);

  if (!res.body) {
    throw new Error("Groq returned an empty response body.");
  }

  return res.body;
}