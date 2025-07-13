import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { Env } from '../src/types';

describe('AI Proxy Worker', () => {
  const env: Env = {
    AUTH_TOKEN: 'test-token',
  };

  describe('/v1/chat/completions', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(401);
    });

    it('should return 405 for non-POST requests', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'GET',
        headers: {
          'X-AUTH-TOKEN': 'test-token',
        },
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(405);
    });

    it('should validate request body', async () => {
      const request = new Request('http://localhost/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-token',
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(400);
    });
  });

  describe('/v1/completions', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          prompt: 'Hello',
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(401);
    });

    it('should return 405 for non-POST requests', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'GET',
        headers: {
          'X-AUTH-TOKEN': 'test-token',
        },
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(405);
    });

    it('should validate request body', async () => {
      const request = new Request('http://localhost/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-TOKEN': 'test-token',
        },
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(400);
    });
  });

  describe('Health check', () => {
    it('should return health status', async () => {
      const request = new Request('http://localhost/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('providers');
    });
  });

  describe('Unknown endpoints', () => {
    it('should return 404 for unknown paths', async () => {
      const request = new Request('http://localhost/unknown', {
        method: 'GET',
      });

      const response = await worker.fetch(request, env, {} as ExecutionContext);
      expect(response.status).toBe(404);
    });
  });
});