/**
 * OpenAI provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse } from '../types.js';
import { resolveModel } from '../config.js';

/**
 * Handle chat completion using OpenAI API
 */
export async function handleOpenAIChat(
  request: ChatCompletionRequest,
  env: Env
): Promise<ChatCompletionResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const model = resolveModel('openai', request.model);
  
  const openAIRequest = {
    model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: request.stream || false,
    stop: request.stop,
    top_p: request.top_p,
    frequency_penalty: request.frequency_penalty,
    presence_penalty: request.presence_penalty,
  };
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }
    
    const data = await response.json() as ChatCompletionResponse;
    
    // Ensure the response matches our expected format
    return {
      ...data,
      model: request.model, // Keep the original model name from request
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle text completion using OpenAI API
 */
export async function handleOpenAICompletion(
  request: CompletionRequest,
  env: Env
): Promise<CompletionResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const model = resolveModel('openai', request.model);
  
  // Use chat completions API for better results with newer models
  if (model.startsWith('gpt-')) {
    // Convert to chat format
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
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
    };
    
    const chatResponse = await handleOpenAIChat(chatRequest, env);
    
    // Convert to completion format
    return {
      id: `cmpl-${crypto.randomUUID()}`,
      object: 'text_completion',
      created: chatResponse.created,
      model: request.model,
      choices: [{
        text: chatResponse.choices[0].message.content,
        index: 0,
        finish_reason: chatResponse.choices[0].finish_reason,
      }],
      usage: chatResponse.usage,
    };
  }
  
  // For older models, use the legacy completions endpoint
  const openAIRequest = {
    model,
    prompt: request.prompt,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: request.stream || false,
    stop: request.stop,
    top_p: request.top_p,
    frequency_penalty: request.frequency_penalty,
    presence_penalty: request.presence_penalty,
  };
  
  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }
    
    const data = await response.json() as CompletionResponse;
    
    // Ensure the response matches our expected format
    return {
      ...data,
      model: request.model, // Keep the original model name from request
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}