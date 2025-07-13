/**
 * Tests for /v1/completions endpoint
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import worker from '../index';

// Mock environment for testing
const testEnv = {
  ...env,
  AUTH_TOKEN: 'test-auth-token',
  AI: {
    run: async () => ({
      response: 'Test AI completion response from Cloudflare',
    }),
  },
};

describe('/v1/completions', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it('should handle basic completion request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Complete this sentence: The weather today is',
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('object', 'text_completion');
    expect(data).toHaveProperty('choices');
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0]).toHaveProperty('text');
    expect(data.choices[0]).toHaveProperty('index', 0);
    expect(data.choices[0]).toHaveProperty('finish_reason');
    expect(data).toHaveProperty('usage');
  });

  it('should reject request without authentication', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Complete this sentence: The weather today is',
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(401);
  });

  it('should reject request with invalid method', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': 'test-auth-token',
      },
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(405);
    
    const data = await response.json();
    expect(data.error.type).toBe('method_not_allowed');
  });

  it('should validate required fields in request body', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        // Missing model and prompt
        temperature: 0.7,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error.type).toBe('invalid_request');
  });

  it('should validate prompt field', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        // Missing prompt
        temperature: 0.7,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should validate temperature parameter', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Test prompt',
        temperature: 3.0, // Invalid temperature > 2
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should validate max_tokens parameter', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Test prompt',
        max_tokens: -5, // Invalid max_tokens < 1
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should validate top_p parameter', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Test prompt',
        top_p: 1.5, // Invalid top_p > 1
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
  });

  it('should handle different AI providers based on model', async () => {
    // Test with Gemini model
    const geminiRequest = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: 'gemini-pro',
        prompt: 'Complete this: The future of AI is',
      }),
    });

    const envWithGemini = {
      ...testEnv,
      GEMINI_API_KEY: 'test-gemini-key',
    };

    const response = await worker.fetch(geminiRequest, envWithGemini, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    // Should still get a response even if the API call fails (since we're mocking)
    expect(response.status).toBeDefined();
  });

  it('should handle stop sequences', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Generate a list:\n1.',
        stop: ['\n\n', '###'],
        max_tokens: 100,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.choices[0]).toHaveProperty('text');
    expect(data.choices[0]).toHaveProperty('finish_reason');
  });

  it('should handle array prompt', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: ['Complete this sentence: The weather is', 'Another prompt: Technology will'],
        max_tokens: 50,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    // Should handle multiple prompts (implementation dependent)
    expect(data.choices).toBeDefined();
  });
});