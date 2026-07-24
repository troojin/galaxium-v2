const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
  process.env.GROQ_API_KEY_6,
  process.env.GROQ_API_KEY_7,
  process.env.GROQ_API_KEY_8,
  process.env.GROQ_API_KEY_9,
].filter(Boolean) as string[];

if (GROQ_API_KEYS.length === 0) {
  throw new Error("No GROQ_API_KEY_* environment variables found.");
}

let currentKeyIndex = 0;

function getNextApiKey(): string {
  const key = GROQ_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface ChatCompletionParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  reasoning_effort?: string;
  [key: string]: unknown;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
    reasoning?: string;
  };
  finish_reason: string;
}

export interface ChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AiClient {
  apiKey: string;
}

export function getAiClient(): AiClient {
  return { apiKey: getNextApiKey() };
}

export async function createChatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletion> {
  const client = getAiClient();

  const model = params.model ?? "llama-3.3-70b-versatile";
  const body = {
    ...params,
    model,
    stream: false,
  };

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq returned ${res.status}: ${errText}`);
  }

  return (await res.json()) as ChatCompletion;
}

export async function createChatCompletionStream(
  params: Omit<ChatCompletionParams, "stream">
): Promise<ReadableStream<Uint8Array>> {
  const client = getAiClient();

  const model = params.model ?? "llama-3.3-70b-versatile";
  const body = {
    ...params,
    model,
    stream: true,
  };

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq returned ${res.status}: ${errText}`);
  }

  if (!res.body) {
    throw new Error("Response body is empty.");
  }

  return res.body;
}