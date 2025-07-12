/**
 * Type definitions for the AI Proxy Worker
 */

/**
 * Type definitions for the AI Proxy Worker
 */

/**
 * Type definitions for the AI Proxy Worker
 */

export interface Env {
  // Optional AI service API keys
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  
  // Authentication token for securing the proxy
  AUTH_TOKEN?: string;
  
  // Optional D1 database binding for logging
  DB?: any; // D1Database type
  
  // Cloudflare AI binding
  AI?: any; // Ai type
}

export type AIProvider = 'cloudflare' | 'openai' | 'gemini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  provider?: AIProvider;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CompletionRequest {
  model: string;
  provider?: AIProvider;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface CompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TokenizeRequest {
  input: string;
  model?: string;
}

export interface TokenizeResponse {
  tokens: number;
  model: string;
}

export interface ModelOption {
  id: string;
  object: 'model';
  provider: AIProvider;
  created: number;
}

export interface ModelOptionsResponse {
  data: ModelOption[];
  object: 'list';
}

export interface RouteCheckResponse {
  provider: AIProvider;
  model: string;
  available: boolean;
  timestamp: number;
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  provider: AIProvider;
  model: string;
  session_id?: string;
  tokens_used?: number;
  response_time: number;
  status: number;
}