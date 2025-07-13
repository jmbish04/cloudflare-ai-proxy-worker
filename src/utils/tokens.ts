/**
 * Token estimation utilities
 */

import { TokenizeRequest, TokenizeResponse, ChatCompletionResponse, CompletionResponse } from '../types';
import { get_encoding } from 'tiktoken';

/**
 * Estimate token count for text input using tiktoken for accurate counting
 */
export function estimateTokens(text: string, model?: string): number {
  if (!text || text.length === 0) {
    return 0;
  }
  
  // Use tiktoken for accurate token counting when possible
  try {
    // For OpenAI models, use tiktoken for accurate counting
    if (model && (model.includes('gpt') || model.startsWith('gpt-'))) {
      let encoding;
      if (model.includes('gpt-4')) {
        encoding = get_encoding('cl100k_base'); // GPT-4 uses cl100k_base
      } else if (model.includes('gpt-3.5') || model.includes('gpt-35')) {
        encoding = get_encoding('cl100k_base'); // GPT-3.5-turbo also uses cl100k_base
      } else {
        encoding = get_encoding('cl100k_base'); // Default for modern OpenAI models
      }
      
      const tokens = encoding.encode(text);
      encoding.free(); // Important: free the encoding to prevent memory leaks
      return tokens.length;
    }
  } catch (error) {
    // If tiktoken fails, fall back to estimation
    console.warn('Failed to use tiktoken, falling back to estimation:', error);
  }
  
  // For non-OpenAI models or when tiktoken fails, use improved estimation
  return fallbackTokenEstimation(text);
}

/**
 * Fallback token estimation for non-OpenAI models
 */
function fallbackTokenEstimation(text: string): number {
  // More accurate estimation based on linguistic patterns
  const words = text.split(/\s+/).filter(word => word.length > 0);
  let tokens = 0;
  
  for (const word of words) {
    // Improved word-to-token mapping
    if (word.length <= 3) {
      tokens += 1;
    } else if (word.length <= 8) {
      tokens += Math.ceil(word.length / 4);
    } else {
      // Long words are typically split into multiple tokens
      tokens += Math.ceil(word.length / 3.5);
    }
  }
  
  // Account for punctuation and special characters
  const punctuation = text.match(/[^\w\s]/g);
  if (punctuation) {
    tokens += Math.ceil(punctuation.length * 0.7);
  }
  
  // Add overhead for formatting
  tokens = Math.ceil(tokens * 1.15);
  
  return tokens;
}

/**
 * Estimate tokens for a chat conversation
 */
export function estimateTokensForChat(messages: Array<{ role: string; content: string }>, model?: string): number {
  let totalTokens = 0;
  
  // Each message has overhead for role and formatting
  const messageOverhead = 4; // Tokens for role, formatting, etc.
  
  for (const message of messages) {
    totalTokens += estimateTokens(message.content, model);
    totalTokens += messageOverhead;
  }
  
  // Add overhead for chat completion format
  totalTokens += 3; // For chat completion wrapper
  
  return totalTokens;
}

/**
 * Estimate tokens for prompt messages (for use in provider files)
 */
export function estimatePromptTokens(messages: Array<{ role: string; content: string }>, model?: string): number {
  let total = 0;
  for (const message of messages) {
    total += estimateTokens(message.content, model);
    total += 4; // Overhead for message formatting
  }
  return total;
}

/**
 * Get model-specific token limits
 */
export function getTokenLimit(model: string): number {
  // Model-specific token limits
  const limits: Record<string, number> = {
    // Cloudflare models
    '@cf/meta/llama-4-scout-17b-16e-instruct': 131072, // 131k context window
    
    // OpenAI models
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 4096,
    
    // Gemini models
    'gemini-pro': 32768,
    'gemini-1.5-pro': 2000000, // 2M tokens
  };
  
  return limits[model] || 4096; // Default fallback
}

/**
 * Check if token count is within model limits
 */
export function isWithinTokenLimit(tokens: number, model: string): boolean {
  const limit = getTokenLimit(model);
  return tokens <= limit;
}

/**
 * Process tokenize request
 */
export function handleTokenizeRequest(request: TokenizeRequest): TokenizeResponse {
  const tokens = estimateTokens(request.input, request.model);
  
  return {
    tokens,
    model: request.model || 'unknown',
  };
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, model: string, maxTokens?: number): string {
  const limit = maxTokens || getTokenLimit(model);
  const currentTokens = estimateTokens(text, model);
  
  if (currentTokens <= limit) {
    return text;
  }
  
  // Rough truncation - cut text proportionally
  const ratio = limit / currentTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 10% buffer
  
  return text.substring(0, targetLength) + '...';
}

/**
 * Convert chat completion response to text completion format
 * This utility reduces code duplication across provider files
 */
export function convertChatToCompletion(
  chatResponse: ChatCompletionResponse,
  model: string
): CompletionResponse {
  const choice = chatResponse.choices[0];
  
  return {
    id: `cmpl-${crypto.randomUUID()}`,
    object: 'text_completion',
    created: chatResponse.created,
    model,
    choices: [{
      text: choice.message.content,
      index: 0,
      finish_reason: choice.finish_reason,
    }],
    usage: chatResponse.usage,
  };
}