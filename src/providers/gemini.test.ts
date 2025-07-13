/**
 * Tests for Gemini provider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGeminiChat, handleGeminiCompletion } from '../src/providers/gemini.js';
import { Env, ChatCompletionRequest, CompletionRequest } from '../src/types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: () => 'mock-uuid-123',
} as any;

describe('Gemini Provider', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      GEMINI_API_KEY: 'test-api-key',
    };
    vi.clearAllMocks();
  });

  describe('handleGeminiChat', () => {
    it('should handle basic chat completion successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Hello! How can I help you today?' }]
          },
          finishReason: 'STOP'
        }],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 15,
          totalTokenCount: 25
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      };

      const result = await handleGeminiChat(request, mockEnv);

      expect(result).toEqual({
        id: 'chatcmpl-mock-uuid-123',
        object: 'chat.completion',
        created: expect.any(Number),
        model: 'gemini-pro',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'test-api-key'
          }
        })
      );
    });

    it('should handle system messages correctly', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'I am a helpful assistant.' }]
          },
          finishReason: 'STOP'
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Who are you?' }
        ]
      };

      await handleGeminiChat(request, mockEnv);

      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);

      expect(requestBody.systemInstruction).toEqual({
        parts: [{ text: 'You are a helpful assistant.' }]
      });
      expect(requestBody.contents).toEqual([{
        role: 'user',
        parts: [{ text: 'Who are you?' }]
      }]);
    });

    it('should throw error when API key is missing', async () => {
      const envWithoutKey: Env = {};
      
      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(handleGeminiChat(request, envWithoutKey))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should throw error when streaming is requested', async () => {
      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true
      };

      await expect(handleGeminiChat(request, mockEnv))
        .rejects.toThrow('Streaming is not yet supported for Gemini provider');
    });

    it('should handle API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error": {"message": "Invalid API key"}}'),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(handleGeminiChat(request, mockEnv))
        .rejects.toThrow('Invalid Gemini API key');
    });

    it('should handle safety filtering', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: '' }]
          },
          finishReason: 'SAFETY',
          safetyRatings: [{
            category: 'HARM_CATEGORY_HARASSMENT',
            probability: 'HIGH'
          }]
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Inappropriate content' }]
      };

      await expect(handleGeminiChat(request, mockEnv))
        .rejects.toThrow('Content was filtered by Gemini safety systems');
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        candidates: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(handleGeminiChat(request, mockEnv))
        .rejects.toThrow('No response generated from Gemini');
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('{"error": {"message": "Rate limit exceeded"}}'),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(handleGeminiChat(request, mockEnv))
        .rejects.toThrow('Gemini API rate limit exceeded');
    });

    it('should handle multiple system messages', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Response' }]
          },
          finishReason: 'STOP'
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: ChatCompletionRequest = {
        model: 'gemini-pro',
        messages: [
          { role: 'system', content: 'First instruction.' },
          { role: 'system', content: 'Second instruction.' },
          { role: 'user', content: 'Hello' }
        ]
      };

      await handleGeminiChat(request, mockEnv);

      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);

      expect(requestBody.systemInstruction).toEqual({
        parts: [{ text: 'First instruction.\n\nSecond instruction.' }]
      });
    });
  });

  describe('handleGeminiCompletion', () => {
    it('should handle basic completion successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'This is a completion response.' }]
          },
          finishReason: 'STOP'
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: CompletionRequest = {
        model: 'gemini-pro',
        prompt: 'Complete this sentence:'
      };

      const result = await handleGeminiCompletion(request, mockEnv);

      expect(result).toEqual({
        id: 'cmpl-mock-uuid-123',
        object: 'text_completion',
        created: expect.any(Number),
        model: 'gemini-pro',
        choices: [{
          text: 'This is a completion response.',
          index: 0,
          finish_reason: 'stop'
        }],
        usage: expect.any(Object)
      });
    });

    it('should throw error when API key is missing', async () => {
      const envWithoutKey: Env = {};
      
      const request: CompletionRequest = {
        model: 'gemini-pro',
        prompt: 'Complete this:'
      };

      await expect(handleGeminiCompletion(request, envWithoutKey))
        .rejects.toThrow('Gemini API key not configured');
    });

    it('should throw error when streaming is requested', async () => {
      const request: CompletionRequest = {
        model: 'gemini-pro',
        prompt: 'Complete this:',
        stream: true
      };

      await expect(handleGeminiCompletion(request, mockEnv))
        .rejects.toThrow('Streaming is not yet supported for Gemini provider');
    });
  });
});