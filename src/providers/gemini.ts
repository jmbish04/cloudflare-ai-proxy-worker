/**
 * Google Gemini provider implementation
 */

import { Env, ChatCompletionRequest, ChatCompletionResponse, CompletionRequest, CompletionResponse, ChatMessage, CodeReviewRequest, CodeReviewResponse, CodeReviewComment } from '../types.js';
import { resolveModel } from '../config.js';
import { estimateTokens, estimatePromptTokens } from '../utils/tokens.js';

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
function convertToGeminiFormat(messages: ChatMessage[]): { contents: any[], systemInstruction?: string } {
  const geminiMessages: any[] = [];
  let systemInstruction: string | undefined;
  
  for (const message of messages) {
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
    }
    
    geminiMessages.push({
      role,
      parts: [{
        text: message.content,
      }],
    });
  }
  
  return {
    contents: geminiMessages,
    systemInstruction,
  };
}

/**
 * Handle code review using Google Gemini API
 */
export async function handleGeminiCodeReview(
  request: CodeReviewRequest,
  env: Env
): Promise<CodeReviewResponse> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }
  
  const model = resolveModel('gemini', request.model);
  
  // Create a detailed prompt for code review
  const codeReviewPrompt = createCodeReviewPrompt(request);
  
  const chatRequest: ChatCompletionRequest = {
    model: request.model || 'gemini-pro',
    messages: [
      {
        role: 'system',
        content: 'You are an expert code reviewer. Analyze the provided code and return a detailed review in the specified JSON format. Focus on code quality, security, performance, maintainability, and best practices.'
      },
      {
        role: 'user',
        content: codeReviewPrompt
      }
    ],
    temperature: request.temperature || 0.3, // Lower temperature for more consistent reviews
    max_tokens: 4000,
  };
  
  try {
    const chatResponse = await handleGeminiChat(chatRequest, env);
    const reviewContent = chatResponse.choices[0]?.message?.content;
    
    if (!reviewContent) {
      throw new Error('No review generated from Gemini');
    }
    
    // Parse the structured review response
    const parsedReview = parseCodeReviewResponse(reviewContent);
    
    return {
      id: `review-${crypto.randomUUID()}`,
      object: 'code.review',
      created: Math.floor(Date.now() / 1000),
      model: request.model || 'gemini-pro',
      provider: 'gemini',
      summary: parsedReview.summary,
      overall_rating: parsedReview.overall_rating,
      comments: parsedReview.comments,
      usage: chatResponse.usage,
    };
  } catch (error) {
    console.error('Gemini code review error:', error);
    throw new Error(`Gemini code review error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a detailed prompt for code review
 */
function createCodeReviewPrompt(request: CodeReviewRequest): string {
  const focusAreas = request.focus_areas?.join(', ') || 'all areas';
  const language = request.language || 'unknown';
  const filename = request.filename || 'code snippet';
  const context = request.context ? `\n\nContext: ${request.context}` : '';
  
  return `Please review the following ${language} code from ${filename}:

\`\`\`${language}
${request.code}
\`\`\`${context}

Focus areas: ${focusAreas}

Please provide a comprehensive code review in the following JSON format:

{
  "summary": "Brief summary of the code and overall assessment",
  "overall_rating": "excellent|good|fair|needs-improvement",
  "comments": [
    {
      "line": 5,
      "severity": "warning|error|info|suggestion",
      "category": "style|performance|security|maintainability|correctness|best-practices",
      "message": "Description of the issue or observation",
      "suggestion": "Optional suggestion for improvement"
    }
  ]
}

Guidelines:
- Provide specific, actionable feedback
- Include line numbers when possible (1-indexed)
- Use appropriate severity levels
- Focus on meaningful issues, not nitpicks
- Suggest improvements where applicable
- Consider security, performance, maintainability, and best practices
- Keep suggestions constructive and helpful

Return only the JSON response, no additional text.`;
}

/**
 * Parse the code review response from Gemini
 */
function parseCodeReviewResponse(content: string): {
  summary: string;
  overall_rating: 'excellent' | 'good' | 'fair' | 'needs-improvement';
  comments: CodeReviewComment[];
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize the response
    const summary = parsed.summary || 'Code review completed';
    const overall_rating = ['excellent', 'good', 'fair', 'needs-improvement'].includes(parsed.overall_rating) 
      ? parsed.overall_rating 
      : 'fair';
    
    const comments: CodeReviewComment[] = Array.isArray(parsed.comments) 
      ? parsed.comments.map((comment: any) => ({
          line: typeof comment.line === 'number' ? comment.line : undefined,
          severity: ['info', 'warning', 'error', 'suggestion'].includes(comment.severity) 
            ? comment.severity 
            : 'info',
          category: ['style', 'performance', 'security', 'maintainability', 'correctness', 'best-practices'].includes(comment.category)
            ? comment.category
            : 'best-practices',
          message: comment.message || 'No message provided',
          suggestion: comment.suggestion || undefined,
        }))
      : [];
    
    return { summary, overall_rating, comments };
  } catch (error) {
    console.error('Failed to parse code review response:', error);
    
    // Fallback: create a basic review from the raw content
    return {
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      overall_rating: 'fair',
      comments: [{
        severity: 'info',
        category: 'best-practices',
        message: 'Automated parsing failed. Raw review: ' + content.substring(0, 500),
      }],
    };
  }
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