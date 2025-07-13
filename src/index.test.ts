/**
 * Basic tests for AI Proxy Worker endpoints
 */
import { describe, it, expect } from 'vitest';
import { Env } from './types.js';

// Mock environment for testing
const mockEnv: Env = {
  AUTH_TOKEN: 'test-auth-token',
  OPENAI_API_KEY: 'test-openai-key',
  GEMINI_API_KEY: 'test-gemini-key',
  DB: null as any, // Not needed for basic endpoint tests
  AI: null as any, // Not needed for basic endpoint tests
};

// Import the worker
import worker from './index.js';

describe('AI Proxy Worker', () => {
  describe('/v1/chat/completions endpoint', () => {
    it('should reject requests without authentication', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(401);
    });

    it('should accept valid POST requests with authentication', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-auth-token',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      // Should not be 401 (unauthorized) or 405 (method not allowed)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(405);
    });

    it('should reject GET requests', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'GET',
        headers: {
          'X-AUTH-TOKEN': 'test-auth-token',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(405);
      
      const errorData = await response.json();
      expect(errorData.error.type).toBe('method_not_allowed');
    });
  });

  describe('/v1/completions endpoint', () => {
    it('should reject requests without authentication', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: 'Hello',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(401);
    });

    it('should accept valid POST requests with authentication', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: 'Hello',
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-auth-token',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      // Should not be 401 (unauthorized) or 405 (method not allowed)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(405);
    });

    it('should reject GET requests', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'GET',
        headers: {
          'X-AUTH-TOKEN': 'test-auth-token',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(405);
      
      const errorData = await response.json();
      expect(errorData.error.type).toBe('method_not_allowed');
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests for CORS preflight', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
        },
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });

  describe('Health endpoint', () => {
    it('should return health status', async () => {
      const request = new Request('http://localhost/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, mockEnv, {} as any);
      expect(response.status).toBe(200);
      
      const healthData = await response.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData).toHaveProperty('providers');
    });
  });
});