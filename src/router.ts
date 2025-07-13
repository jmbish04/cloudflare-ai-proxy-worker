/**
 * AI Router - Routes requests to appropriate AI providers
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, CodeReviewRequest, CodeReviewResponse, AIProvider } from './types.js';
import { inferProvider, resolveModel, isModelSupported } from './config.js';
import { handleCloudflareChat, handleCloudflareCompletion } from './providers/cloudflare.js';
import { handleOpenAIChat, handleOpenAICompletion } from './providers/openai.js';
import { handleGeminiChat, handleGeminiCompletion, handleGeminiCodeReview } from './providers/gemini.js';

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
 * Route code review request to appropriate provider
 */
export async function routeCodeReview(
  request: CodeReviewRequest,
  env: Env
): Promise<CodeReviewResponse> {
  // Determine provider - default to Gemini for code reviews
  const provider = request.provider || 'gemini';
  
  // Validate provider availability
  if (!isProviderAvailable(provider, env)) {
    throw new Error(`Provider ${provider} is not available or configured`);
  }
  
  // For now, only support Gemini for code reviews
  // Can be extended to support other providers in the future
  switch (provider) {
    case 'gemini':
      return await handleGeminiCodeReview(request, env);
    
    default:
      throw new Error(`Code review is not supported by provider: ${provider}. Please use 'gemini' provider.`);
  }
}

/**
 * Validate code review request parameters
 */
export function validateCodeReviewRequest(request: CodeReviewRequest): void {
  if (!request.code || request.code.trim().length === 0) {
    throw new Error('Code is required and cannot be empty');
  }
  
  if (request.code.length > 50000) {
    throw new Error('Code is too large. Maximum 50,000 characters allowed.');
  }
  
  // Validate optional parameters
  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 1)) {
    throw new Error('Temperature must be between 0 and 1');
  }
  
  if (request.focus_areas && request.focus_areas.length > 10) {
    throw new Error('Maximum 10 focus areas allowed');
  }
  
  // Validate focus areas if provided
  const validFocusAreas = ['style', 'performance', 'security', 'maintainability', 'correctness', 'best-practices'];
  if (request.focus_areas) {
    for (const area of request.focus_areas) {
      if (!validFocusAreas.includes(area)) {
        throw new Error(`Invalid focus area: ${area}. Valid areas: ${validFocusAreas.join(', ')}`);
      }
    }
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