/**
 * Test suite for the AI Proxy Worker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';
import { Env, ChatCompletionRequest, CompletionRequest } from '../src/types';

describe('AI Proxy Worker', () => {
  let env: Env;
  let ctx: ExecutionContext;

  beforeEach(() => {
    env = {
      AUTH_TOKEN: 'test-token',
      OPENAI_API_KEY: 'test-openai-key',
      GEMINI_API_KEY: 'test-gemini-key',
    };
    
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const request = new Request('https://example.com/', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.providers).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
        },
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('/v1/chat/completions', () => {
    it('should reject requests without authentication', async () => {
      const chatRequest: ChatCompletionRequest = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
      };

      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest),
      });

      // Test without auth token
      const envNoAuth = { ...env, AUTH_TOKEN: undefined };
      const response = await worker.fetch(request, envNoAuth, ctx);

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid method', async () => {
      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(405);
    });

    it('should reject requests with invalid JSON', async () => {
      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
    });

    it('should reject requests with missing messages', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        // missing messages field
      };

      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
    });

    it('should accept valid chat completion request structure', async () => {
      const chatRequest: ChatCompletionRequest = {
        model: '@cf/meta/llama-4-scout-17b-16e-instruct', // Use Cloudflare model to avoid external API calls
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        temperature: 0.7,
        max_tokens: 100,
      };

      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest),
      });

      // Mock the AI binding to avoid external calls
      env.AI = {
        run: vi.fn().mockResolvedValue({
          response: 'Hello! I am doing well, thank you for asking.',
        }),
      } as any;

      const response = await worker.fetch(request, env, ctx);

      // Should not return error status codes
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(405);
    });
  });

  describe('/v1/completions', () => {
    it('should reject requests without authentication', async () => {
      const completionRequest: CompletionRequest = {
        model: 'gpt-3.5-turbo',
        prompt: 'Complete this sentence: The weather today is',
      };

      const request = new Request('https://example.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionRequest),
      });

      // Test without auth token
      const envNoAuth = { ...env, AUTH_TOKEN: undefined };
      const response = await worker.fetch(request, envNoAuth, ctx);

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid method', async () => {
      const request = new Request('https://example.com/v1/completions', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(405);
    });

    it('should reject requests with missing prompt', async () => {
      const completionRequest = {
        model: 'gpt-3.5-turbo',
        // missing prompt field
      };

      const request = new Request('https://example.com/v1/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionRequest),
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
    });

    it('should accept valid completion request structure', async () => {
      const completionRequest: CompletionRequest = {
        model: '@cf/meta/llama-4-scout-17b-16e-instruct', // Use Cloudflare model to avoid external API calls
        prompt: 'Complete this sentence: The weather today is',
        temperature: 0.7,
        max_tokens: 50,
      };

      const request = new Request('https://example.com/v1/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionRequest),
      });

      // Mock the AI binding to avoid external calls
      env.AI = {
        run: vi.fn().mockResolvedValue({
          response: 'sunny and pleasant.',
        }),
      } as any;

      const response = await worker.fetch(request, env, ctx);

      // Should not return error status codes
      expect(response.status).not.toBe(400);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(405);
    });
  });

  describe('/v1/tokenize', () => {
    it('should handle tokenize requests', async () => {
      const tokenizeRequest = {
        input: 'Hello, how are you doing today?',
        model: 'gpt-3.5-turbo',
      };

      const request = new Request('https://example.com/v1/tokenize', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenizeRequest),
      });

      const response = await worker.fetch(request, env, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tokens).toBeTypeOf('number');
      expect(data.tokens).toBeGreaterThan(0);
    });
  });

  describe('/v1/model-options', () => {
    it('should return available models', async () => {
      const request = new Request('https://example.com/v1/model-options', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await worker.fetch(request, env, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.object).toBe('list');
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('/v1/route-check', () => {
    it('should check route availability', async () => {
      const request = new Request('https://example.com/v1/route-check?model=gpt-3.5-turbo', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const response = await worker.fetch(request, env, ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.provider).toBeDefined();
      expect(data.model).toBe('gpt-3.5-turbo');
      expect(typeof data.available).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('https://example.com/unknown', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
    });

    it('should handle invalid JSON gracefully', async () => {
      const request = new Request('https://example.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: '{invalid json}',
      });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(400);
    });
  });
});