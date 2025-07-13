/**
 * Google Gemini provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, ChatMessage } from '../types.js';
import { resolveModel } from '../config.js';
import { estimateTokens, estimatePromptTokens } from '../utils/tokens.js';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
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
  
  if (request.stream) {
    throw new Error('Streaming is not yet supported for Gemini provider');
  }
  
  const model = resolveModel('gemini', request.model);
  
  // Convert OpenAI format to Gemini format
  const conversionResult = convertToGeminiFormat(request.messages);
  
  const geminiRequest: any = {
    contents: conversionResult.contents,
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.max_tokens,
      topP: request.top_p,
      stopSequences: Array.isArray(request.stop) ? request.stop : request.stop ? [request.stop] : undefined,
    },
  };

  // Add system instruction if we have system messages
  if (conversionResult.systemInstruction) {
    geminiRequest.systemInstruction = {
      parts: [{ text: conversionResult.systemInstruction }],
    };
  }
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify(geminiRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { message: errorData };
      }
      
      // Handle specific Gemini API errors
      if (response.status === 400) {
        throw new Error(`Invalid request to Gemini API: ${parsedError.error?.message || parsedError.message || 'Bad request'}`);
      } else if (response.status === 401) {
        throw new Error('Invalid Gemini API key');
      } else if (response.status === 403) {
        throw new Error('Gemini API access denied - check your API key permissions');
      } else if (response.status === 429) {
        throw new Error('Gemini API rate limit exceeded');
      } else {
        throw new Error(`Gemini API error (${response.status}): ${parsedError.error?.message || parsedError.message || 'Unknown error'}`);
      }
    }
    
    const data = await response.json() as GeminiResponse;
    
    // Check for API-level errors
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message} (${data.error.code})`);
    }
    
    // Convert Gemini response to OpenAI format
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response generated from Gemini');
    }
    
    // Check for safety filtering
    const unsafeRating = candidate.safetyRatings?.find(rating => 
      rating.probability === 'HIGH' || rating.probability === 'MEDIUM'
    );
    
    if (candidate.finishReason === 'SAFETY' || unsafeRating) {
      throw new Error('Content was filtered by Gemini safety systems');
    }
    
    const content = candidate.content?.parts?.[0]?.text || '';
    const finishReason = mapGeminiFinishReason(candidate.finishReason);
    
    // Validate that we got actual content
    if (!content && finishReason !== 'content_filter') {
      throw new Error('Empty response from Gemini API');
    }
    
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
    throw error; // Re-throw the original error to preserve the message
  }
}

/**
 * Handle text completion using Google Gemini API
 */
export async function handleGeminiCompletion(
  request: CompletionRequest,
  env: Env
): Promise<CompletionResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }
  
  if (request.stream) {
    throw new Error('Streaming is not yet supported for Gemini provider');
  }
  
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
function convertToGeminiFormat(messages: ChatMessage[]): { contents: any[], systemInstruction?: string } {
  const geminiMessages: any[] = [];
  let systemInstruction: string | undefined;
  
  for (const message of messages) {
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('Message content must be a non-empty string');
    }
    
    // Handle system messages with proper system instruction
    if (message.role === 'system') {
      // Combine multiple system messages if present
      if (systemInstruction) {
        systemInstruction += '\n\n' + message.content;
      } else {
        systemInstruction = message.content;
      }
      continue; // Don't add system messages to contents
    }
    
    // Map OpenAI roles to Gemini roles
    let role = 'user';
    if (message.role === 'assistant') {
      role = 'model';
    } else if (message.role !== 'user') {
      // Handle any unsupported roles by converting to user
      console.warn(`Unsupported message role '${message.role}' converted to 'user'`);
      role = 'user';
    }
    
    geminiMessages.push({
      role,
      parts: [{
        text: message.content,
      }],
    });
  }
  
  // Gemini requires at least one message
  if (geminiMessages.length === 0) {
    throw new Error('At least one non-system message is required');
  }
  
  // Ensure alternating user/model pattern for multi-turn conversations
  if (geminiMessages.length > 1) {
    const normalizedMessages = normalizeConversationFlow(geminiMessages);
    return {
      contents: normalizedMessages,
      systemInstruction,
    };
  }
  
  return {
    contents: geminiMessages,
    systemInstruction,
  };
}

/**
 * Normalize conversation flow to ensure proper user/model alternation
 */
function normalizeConversationFlow(messages: any[]): any[] {
  const normalized: any[] = [];
  let lastRole: string | null = null;
  
  for (const message of messages) {
    // If we have consecutive messages with the same role, combine them
    if (lastRole === message.role && normalized.length > 0) {
      const lastMessage = normalized[normalized.length - 1];
      lastMessage.parts[0].text += '\n\n' + message.parts[0].text;
    } else {
      normalized.push(message);
      lastRole = message.role;
    }
  }
  
  return normalized;
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
    case 'OTHER':
      return null;
    case undefined:
    case null:
      return 'stop'; // Default to stop if no reason provided
    default:
      console.warn(`Unknown Gemini finish reason: ${geminiReason}`);
      return null;
  }
}