/**
 * Token estimation utilities
 */

import { TokenizeRequest, TokenizeResponse } from '../types';

/**
 * Estimate token count for text input
 * This is a simplified estimation - in production you might want to use tiktoken
 */
export function estimateTokens(text: string, model?: string): number {
  // Simple token estimation based on word count and characters
  // This is a rough approximation - real implementations would use tiktoken
  
  // Basic tokenization rules:
  // - Average 4 characters per token for English text
  // - Add tokens for punctuation and special characters
  // - Account for different model tokenization schemes
  
  if (!text || text.length === 0) {
    return 0;
  }
  
  // Count words
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // Estimate tokens
  let tokens = 0;
  
  for (const word of words) {
    // Most words are 1 token, longer words might be split
    if (word.length <= 4) {
      tokens += 1;
    } else {
      tokens += Math.ceil(word.length / 4);
    }
  }
  
  // Add tokens for punctuation and special characters
  const specialChars = text.match(/[^\w\s]/g);
  if (specialChars) {
    tokens += specialChars.length * 0.5; // Punctuation is usually partial tokens
  }
  
  // Add buffer for tokenizer overhead
  tokens = Math.ceil(tokens * 1.1);
  
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