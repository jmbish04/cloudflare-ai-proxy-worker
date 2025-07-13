/**
 * Cloudflare Workers AI provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, ChatMessage } from '../types.js';
import { resolveModel } from '../config.js';
import { estimateTokens, estimatePromptTokens, convertChatToCompletion } from '../utils/tokens.js';

/**
 * Handle chat completion using Cloudflare Workers AI
 */
export async function handleCloudflareChat(
  request: ChatCompletionRequest,
  env: Env
): Promise<ChatCompletionResponse> {
  if (!env.AI) {
    throw new Error('Cloudflare AI binding not available');
  }
  
  const model = resolveModel('cloudflare', request.model);
  
  // Convert OpenAI format to Cloudflare AI format
  const cfRequest = {
    messages: request.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    stream: request.stream || false,
  };
  
  try {
    // Use type assertion for the AI binding since the exact type is complex
    const response = await (env.AI as any).run(model as any, cfRequest);
    
    // Convert Cloudflare AI response to OpenAI format with robust parsing
    let responseText: string;
    
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object') {
      // Try known response properties in order of preference
      if (response.response && typeof response.response === 'string') {
        responseText = response.response;
      } else if (response.content && typeof response.content === 'string') {
        responseText = response.content;
      } else if (response.text && typeof response.text === 'string') {
        responseText = response.text;
      } else if (response.choices && Array.isArray(response.choices) && response.choices[0]?.message?.content) {
        responseText = response.choices[0].message.content;
      } else {
        // Fallback to JSON stringify for debugging
        responseText = JSON.stringify(response);
      }
    } else {
      throw new Error(`Unexpected response format from Cloudflare AI: ${typeof response}`);
    }
    
    const choice = {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: responseText,
      },
      finish_reason: 'stop' as const,
    };
    
    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [choice],
      usage: {
        prompt_tokens: estimatePromptTokens(request.messages),
        completion_tokens: estimateTokens(choice.message.content),
        total_tokens: estimatePromptTokens(request.messages) + estimateTokens(choice.message.content),
      },
    };
  } catch (error) {
    console.error('Cloudflare AI error:', error);
    throw new Error(`Cloudflare AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle text completion using Cloudflare Workers AI
 */
export async function handleCloudflareCompletion(
  request: CompletionRequest,
  env: Env
): Promise<CompletionResponse> {
  if (!env.AI) {
    throw new Error('Cloudflare AI binding not available');
  }
  
  const model = resolveModel('cloudflare', request.model);
  
  // Convert completion request to chat format for better results
  const chatRequest: ChatCompletionRequest = {
    model: request.model,
    messages: [
      { role: 'user', content: request.prompt },
    ],
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: request.stream,
  };
  
  try {
    const chatResponse = await handleCloudflareChat(chatRequest, env);
    
    // Convert chat response to completion format using utility
    return convertChatToCompletion(chatResponse, request.model);
  } catch (error) {
    console.error('Cloudflare AI completion error:', error);
    throw new Error(`Cloudflare AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}