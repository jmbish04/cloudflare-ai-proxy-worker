/**
 * AI Router - Routes requests to appropriate AI providers
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, AIProvider } from './types.js';
import { inferProvider, resolveModel, isModelSupported } from './config.js';
import { handleCloudflareChat, handleCloudflareCompletion } from './providers/cloudflare.js';
import { handleOpenAIChat, handleOpenAICompletion } from './providers/openai.js';
import { handleGeminiChat, handleGeminiCompletion } from './providers/gemini.js';

/**
 * Route chat completion request to appropriate provider
 */
export async function routeChatCompletion(
  request: ChatCompletionRequest,
  env: Env
): Promise<ChatCompletionResponse> {
  // Determine provider
  const provider = request.provider || inferProvider(request.model);
  
  // Validate model support
  if (!isModelSupported(provider, request.model)) {
    throw new Error(`Model ${request.model} is not supported by provider ${provider}`);
  }
  
  // Route to appropriate provider
  switch (provider) {
    case 'cloudflare':
      return await handleCloudflareChat(request, env);
    
    case 'openai':
      return await handleOpenAIChat(request, env);
    
    case 'gemini':
      return await handleGeminiChat(request, env);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Route completion request to appropriate provider
 */
export async function routeCompletion(
  request: CompletionRequest,
  env: Env
): Promise<CompletionResponse> {
  // Determine provider
  const provider = request.provider || inferProvider(request.model);
  
  // Validate model support
  if (!isModelSupported(provider, request.model)) {
    throw new Error(`Model ${request.model} is not supported by provider ${provider}`);
  }
  
  // Route to appropriate provider
  switch (provider) {
    case 'cloudflare':
      return await handleCloudflareCompletion(request, env);
    
    case 'openai':
      return await handleOpenAICompletion(request, env);
    
    case 'gemini':
      return await handleGeminiCompletion(request, env);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(provider: AIProvider, env: Env): boolean {
  switch (provider) {
    case 'cloudflare':
      return !!env.AI;
    
    case 'openai':
      return !!env.OPENAI_API_KEY;
    
    case 'gemini':
      return !!env.GEMINI_API_KEY;
    
    default:
      return false;
  }
}

/**
 * Get available providers
 */
export function getAvailableProviders(env: Env): AIProvider[] {
  const providers: AIProvider[] = [];
  
  if (isProviderAvailable('cloudflare', env)) {
    providers.push('cloudflare');
  }
  
  if (isProviderAvailable('openai', env)) {
    providers.push('openai');
  }
  
  if (isProviderAvailable('gemini', env)) {
    providers.push('gemini');
  }
  
  return providers;
}

/**
 * Get provider for a model with fallback logic
 */
export function selectProvider(model: string, env: Env): AIProvider {
  const preferredProvider = inferProvider(model);
  
  // Check if preferred provider is available
  if (isProviderAvailable(preferredProvider, env)) {
    return preferredProvider;
  }
  
  // Fallback to available providers
  const availableProviders = getAvailableProviders(env);
  
  if (availableProviders.length === 0) {
    throw new Error('No AI providers are available');
  }
  
  // Default to first available provider (preferably Cloudflare)
  if (availableProviders.includes('cloudflare')) {
    return 'cloudflare';
  }
  
  return availableProviders[0];
}

/**
 * Validate request parameters
 */
export function validateChatRequest(request: ChatCompletionRequest): void {
  if (!request.messages || request.messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }
  
  if (!request.model) {
    throw new Error('Model is required');
  }
  
  // Validate message format
  for (const message of request.messages) {
    if (!message.role || !message.content) {
      throw new Error('Each message must have a role and content');
    }
    
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new Error('Message role must be system, user, or assistant');
    }
  }
  
  // Validate optional parameters
  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
    throw new Error('Temperature must be between 0 and 2');
  }
  
  if (request.max_tokens !== undefined && request.max_tokens < 1) {
    throw new Error('max_tokens must be greater than 0');
  }
  
  if (request.top_p !== undefined && (request.top_p < 0 || request.top_p > 1)) {
    throw new Error('top_p must be between 0 and 1');
  }
}

/**
 * Validate completion request parameters
 */
export function validateCompletionRequest(request: CompletionRequest): void {
  if (!request.prompt) {
    throw new Error('Prompt is required');
  }
  
  if (!request.model) {
    throw new Error('Model is required');
  }
  
  // Validate optional parameters
  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
    throw new Error('Temperature must be between 0 and 2');
  }
  
  if (request.max_tokens !== undefined && request.max_tokens < 1) {
    throw new Error('max_tokens must be greater than 0');
  }
  
  if (request.top_p !== undefined && (request.top_p < 0 || request.top_p > 1)) {
    throw new Error('top_p must be between 0 and 1');
  }
}