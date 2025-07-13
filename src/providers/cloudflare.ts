/**
 * Cloudflare Workers AI provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, ChatMessage } from '../types.js';
import { resolveModel } from '../config.js';

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
    
    // Convert Cloudflare AI response to OpenAI format
    const responseText = response.response || response.content || response.text || JSON.stringify(response);
    
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
    
    // Convert chat response to completion format
    const choice = chatResponse.choices[0];
    
    return {
      id: `cmpl-${crypto.randomUUID()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        text: choice.message.content,
        index: 0,
        finish_reason: choice.finish_reason,
      }],
      usage: chatResponse.usage,
    };
  } catch (error) {
    console.error('Cloudflare AI completion error:', error);
    throw new Error(`Cloudflare AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Estimate tokens for prompt messages
 */
function estimatePromptTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const message of messages) {
    total += estimateTokens(message.content);
    total += 4; // Overhead for message formatting
  }
  return total;
}

/**
 * Simple token estimation
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimation: 4 characters per token
  return Math.ceil(text.length / 4);
}