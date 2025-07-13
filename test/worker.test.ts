/**
 * Tests for AI Proxy Worker endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock environment for testing
const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  GEMINI_API_KEY: 'test-gemini-key',
  AUTH_TOKEN: 'test-auth-token',
};

// Mock context for Cloudflare Workers
const mockCtx = {
  waitUntil: (promise: Promise<any>) => promise,
  passThroughOnException: () => {},
};

// Import the worker function
import Worker from '../src/index';

describe('AI Proxy Worker', () => {
  let request: Request;
  
  beforeEach(() => {
    // Reset request for each test
    request = new Request('http://localhost:8787/', {
      method: 'GET',
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const request = new Request('http://localhost:8787/health', {
        method: 'GET',
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.providers).toBeDefined();
    });
  });

  describe('/v1/chat/completions', () => {
    it('should reject requests without auth token', async () => {
      const request = new Request('http://localhost:8787/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(401);
    });

    it('should reject GET requests', async () => {
      const request = new Request('http://localhost:8787/v1/chat/completions', {
        method: 'GET',
        headers: { 'X-AUTH-TOKEN': 'test-auth-token' },
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(405);
    });

    it('should validate request body structure', async () => {
      const request = new Request('http://localhost:8787/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-auth-token'
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(400);
    });
  });

  describe('/v1/completions', () => {
    it('should reject requests without auth token', async () => {
      const request = new Request('http://localhost:8787/v1/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: 'Hello',
        }),
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(401);
    });

    it('should reject GET requests', async () => {
      const request = new Request('http://localhost:8787/v1/completions', {
        method: 'GET',
        headers: { 'X-AUTH-TOKEN': 'test-auth-token' },
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(405);
    });

    it('should validate request body structure', async () => {
      const request = new Request('http://localhost:8787/v1/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-auth-token'
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(400);
    });
  });

  describe('Model Options', () => {
    it('should return available models with auth', async () => {
      const request = new Request('http://localhost:8787/v1/model-options', {
        method: 'GET',
        headers: { 'X-AUTH-TOKEN': 'test-auth-token' },
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.object).toBe('list');
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Route Check', () => {
    it('should check model routing', async () => {
      const request = new Request('http://localhost:8787/v1/route-check?model=gpt-4', {
        method: 'GET',
        headers: { 'X-AUTH-TOKEN': 'test-auth-token' },
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.provider).toBeDefined();
      expect(data.model).toBe('gpt-4');
      expect(typeof data.available).toBe('boolean');
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests', async () => {
      const request = new Request('http://localhost:8787/v1/chat/completions', {
        method: 'OPTIONS',
        headers: { 'Origin': 'http://localhost:3000' },
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('http://localhost:8787/unknown-endpoint', {
        method: 'GET',
      });

      const response = await Worker.fetch(request, mockEnv, mockCtx);
      expect(response.status).toBe(404);
    });
  });
});