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