/**
 * Tests for the AI Proxy Worker endpoints
 * Updated to match the new implementation
 */

import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('AI Proxy Worker', () => {
  describe('Health endpoint', () => {
    it('returns health status (unit style)', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/health');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('providers');
      expect(data).toHaveProperty('available_providers');
    });

    it('returns health status (integration style)', async () => {
      const request = new Request('http://example.com/health');
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('healthy');
    });
  });

  describe('Model options endpoint', () => {
    it('returns available models (unit style)', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/v1/model-options');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('object', 'list');
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('returns available models (integration style)', async () => {
      const request = new Request('http://example.com/v1/model-options');
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.object).toBe('list');
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Route check endpoint', () => {
    it('checks model routing (unit style)', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>(
        'http://example.com/v1/route-check?model=@cf/meta/llama-4-scout-17b-16e-instruct'
      );
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('provider', 'cloudflare');
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('available');
    });

    it('checks model routing (integration style)', async () => {
      const request = new Request('http://example.com/v1/route-check?model=gpt-4');
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.provider).toBe('openai');
      expect(data.model).toBe('gpt-4');
    });
  });

  describe('Tokenize endpoint', () => {
    it('estimates tokens (unit style)', async () => {
      const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/v1/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'Hello world, how are you today?',
          model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('tokens');
      expect(data.tokens).toBeGreaterThan(0);
    });

    it('estimates tokens (integration style)', async () => {
      const request = new Request('http://example.com/v1/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'This is a test message.',
        }),
      });
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.tokens).toBe('number');
    });
  });

  describe('Error handling', () => {
    it('returns 404 for unknown endpoints', async () => {
      const request = new Request('http://example.com/unknown-endpoint');
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.message).toBe('Not Found');
    });

    it('returns 405 for invalid methods', async () => {
      const request = new Request('http://example.com/v1/model-options', {
        method: 'POST',
      });
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(405);
      const data = await response.json();
      expect(data.error.message).toBe('Method Not Allowed');
    });

    it('handles CORS preflight requests', async () => {
      const request = new Request('http://example.com/v1/chat/completions', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      const response = await SELF.fetch(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
});