/**
 * Test suite for /v1/completions endpoint
 */

import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../index';
import { Env } from '../types';

describe('/v1/completions', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      OPENAI_API_KEY: 'test-openai-key',
      GEMINI_API_KEY: 'test-gemini-key',
      AI: {} as any, // Mock AI binding
      LOGS: {} as any, // Mock KV binding
    };
  });

  it('should return 405 for GET request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'GET',
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(405);
    const data = await response.json();
    expect(data.error.type).toBe('method_not_allowed');
  });

  it('should return 401 for unauthorized request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: 'Once upon a time',
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(401);
  });

  it('should return 400 for missing prompt', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        // Missing prompt
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('Prompt is required');
  });

  it('should return 400 for missing model', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        prompt: 'Once upon a time',
        // Missing model
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('Model is required');
  });

  it('should return 400 for invalid temperature', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: 'Once upon a time',
        temperature: -1, // Invalid: < 0
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('Temperature must be between 0 and 2');
  });

  it('should return 400 for invalid max_tokens', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: 'Once upon a time',
        max_tokens: 0, // Invalid: must be > 0
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('max_tokens must be greater than 0');
  });

  it('should return 400 for invalid top_p', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        prompt: 'Once upon a time',
        top_p: 2.0, // Invalid: > 1
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.message).toContain('top_p must be between 0 and 1');
  });

  it('should accept valid completion request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Once upon a time in a magical kingdom',
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.9,
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    // This will fail because we're not mocking the actual AI service,
    // but we should get past validation
    expect(response.status).not.toBe(400); // Should not be a validation error
  });

  it('should handle string prompt', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Simple string prompt',
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).not.toBe(400); // Should not be a validation error
  });

  it('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should return proper error structure', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        // Missing prompt
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('type');
    expect(data.error).toHaveProperty('code');
    expect(data.error.type).toBe('invalid_request');
    expect(data.error.code).toBe('invalid_request');
  });

  it('should accept various stop sequences', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Once upon a time',
        stop: ['\n', 'END'],
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).not.toBe(400); // Should not be a validation error
  });

  it('should accept single stop sequence as string', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Once upon a time',
        stop: '\n',
      }),
    });
    
    const response = await worker.fetch(request, env, {} as ExecutionContext);
    
    expect(response.status).not.toBe(400); // Should not be a validation error
  });
});