import Groq from "groq-sdk";

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

export function getAiClient(): Groq {
  return new Groq({ apiKey: getNextApiKey() });
}

export async function createChatCompletion(
  params: Omit<Groq.Chat.Completions.CompletionCreateParamsNonStreaming, "model"> & {
    model?: string;
  }
): Promise<Groq.Chat.ChatCompletion> {
  const client = getAiClient();
  return client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    ...params,
  });
}