/**
 * Google Gemini provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, ChatMessage } from '../types.js';
import { resolveModel } from '../config.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Handle chat completion using Google Gemini API
 */
export async function handleGeminiChat(
  request: ChatCompletionRequest,
  env: Env
): Promise<ChatCompletionResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }
  
  const model = resolveModel('gemini', request.model);
  
  // Convert OpenAI format to Gemini format
  const geminiMessages = convertToGeminiFormat(request.messages);
  
  const geminiRequest = {
    contents: geminiMessages,
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.max_tokens,
      topP: request.top_p,
      stopSequences: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
    },
  };
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorData}`);
    }
    
    const data = await response.json() as GeminiResponse;
    
    // Convert Gemini response to OpenAI format
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response generated from Gemini');
    }
    
    const content = candidate.content?.parts?.[0]?.text || '';
    const finishReason = mapGeminiFinishReason(candidate.finishReason);
    
    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: finishReason,
      }],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || estimatePromptTokens(request.messages),
        completion_tokens: data.usageMetadata?.candidatesTokenCount || estimateTokens(content),
        total_tokens: data.usageMetadata?.totalTokenCount || (estimatePromptTokens(request.messages) + estimateTokens(content)),
      },
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle text completion using Google Gemini API
 */
export async function handleGeminiCompletion(
  request: CompletionRequest,
  env: Env
): Promise<CompletionResponse> {
  // Convert completion request to chat format
  const chatRequest: ChatCompletionRequest = {
    model: request.model,
    messages: [
      { role: 'user', content: request.prompt },
    ],
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: request.stream,
    stop: request.stop,
    top_p: request.top_p,
  };
  
  const chatResponse = await handleGeminiChat(chatRequest, env);
  
  // Convert chat response to completion format
  const choice = chatResponse.choices[0];
  
  return {
    id: `cmpl-${crypto.randomUUID()}`,
    object: 'text_completion',
    created: chatResponse.created,
    model: request.model,
    choices: [{
      text: choice.message.content,
      index: 0,
      finish_reason: choice.finish_reason,
    }],
    usage: chatResponse.usage,
  };
}

/**
 * Convert OpenAI messages to Gemini format
 */
function convertToGeminiFormat(messages: ChatMessage[]): any[] {
  const geminiMessages: any[] = [];
  
  for (const message of messages) {
    let role = 'user';
    
    // Map OpenAI roles to Gemini roles
    if (message.role === 'assistant') {
      role = 'model';
    } else if (message.role === 'system') {
      role = 'user'; // Gemini doesn't have system role, treat as user
    }
    
    geminiMessages.push({
      role,
      parts: [{
        text: message.content,
      }],
    });
  }
  
  return geminiMessages;
}

/**
 * Map Gemini finish reason to OpenAI format
 */
function mapGeminiFinishReason(geminiReason?: string): 'stop' | 'length' | 'content_filter' | null {
  switch (geminiReason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
      return 'content_filter';
    default:
      return null;
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