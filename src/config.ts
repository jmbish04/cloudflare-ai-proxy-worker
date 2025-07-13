/**
 * Configuration and model registry for the AI Proxy Worker
 */

import { AIProvider } from './types';

export const MODEL_REGISTRY: Record<AIProvider, Record<string, string>> = {
  cloudflare: {
    default: '@cf/meta/llama-4-scout-17b-16e-instruct',
    llama4: '@cf/meta/llama-4-scout-17b-16e-instruct',
    'llama-4-scout': '@cf/meta/llama-4-scout-17b-16e-instruct',
  },
  openai: {
    default: 'gpt-4',
    gpt4: 'gpt-4',
    'gpt-4': 'gpt-4',
    gpt3: 'gpt-3.5-turbo',
    'gpt-3.5': 'gpt-3.5-turbo',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
  },
  gemini: {
    default: 'gemini-1.5-pro-latest',
    'gemini-pro': 'gemini-1.5-pro-latest', // Legacy alias
    'gemini-1.5-pro': 'gemini-1.5-pro-latest',
    'gemini-1.5-pro-latest': 'gemini-1.5-pro-latest',
    'gemini-1.5-flash': 'gemini-1.5-flash-latest',
    'gemini-1.5-flash-latest': 'gemini-1.5-flash-latest',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
  },
};

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  cloudflare: '@cf/meta/llama-4-scout-17b-16e-instruct',
  openai: 'gpt-4',
  gemini: 'gemini-1.5-pro-latest',
};

/**
 * Resolve a model name to the canonical model ID for a provider
 */
export function resolveModel(provider: AIProvider, model?: string): string {
  if (!model) {
    return DEFAULT_MODELS[provider];
  }
  
  const registry = MODEL_REGISTRY[provider];
  return registry[model] || registry.default || DEFAULT_MODELS[provider];
}

/**
 * Determine the provider from a model name
 */
export function inferProvider(model: string): AIProvider {
  // Check Cloudflare models (they start with @cf/)
  if (model.startsWith('@cf/')) {
    return 'cloudflare';
  }
  
  // Check OpenAI models
  if (model.startsWith('gpt-')) {
    return 'openai';
  }
  
  // Check Gemini models
  if (model.includes('gemini')) {
    return 'gemini';
  }
  
  // Default to Cloudflare
  return 'cloudflare';
}

/**
 * Get all available models for a provider
 */
export function getModelsForProvider(provider: AIProvider): string[] {
  return Object.keys(MODEL_REGISTRY[provider]);
}

/**
 * Get all available models across all providers
 */
export function getAllModels(): Array<{ provider: AIProvider; models: string[] }> {
  return Object.keys(MODEL_REGISTRY).map(provider => ({
    provider: provider as AIProvider,
    models: getModelsForProvider(provider as AIProvider),
  }));
}

/**
 * Validate if a model is supported by a provider
 */
export function isModelSupported(provider: AIProvider, model: string): boolean {
  const registry = MODEL_REGISTRY[provider];
  return model in registry || model === registry.default;
}

/**
 * Configuration constants
 */
export const CONFIG = {
  // Default temperature for AI requests
  DEFAULT_TEMPERATURE: 0.7,
  
  // Maximum tokens for responses
  MAX_TOKENS: 4096,
  
  // Request timeout in milliseconds
  REQUEST_TIMEOUT: 30000,
  
  // Rate limiting
  RATE_LIMIT_PER_MINUTE: 100,
  
  // Logging configuration
  ENABLE_LOGGING: true,
  
  // CORS configuration
  CORS_ORIGINS: ['*'],
  
  // Authentication header name
  AUTH_HEADER: 'X-AUTH-TOKEN',
  
  // Session header/cookie name
  SESSION_HEADER: 'X-SESSION-ID',
  SESSION_COOKIE: 'session_id',
} as const;