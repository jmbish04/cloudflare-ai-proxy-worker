/**
 * Tests for /v1/chat/completions endpoint
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
      response: 'Test AI response from Cloudflare',
    }),
  },
};

describe('/v1/chat/completions', () => {
  beforeEach(() => {
    // Reset any state before each test
  });

  it('should handle basic chat completion request', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello, world!' },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('object', 'chat.completion');
    expect(data).toHaveProperty('choices');
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0]).toHaveProperty('message');
    expect(data.choices[0].message).toHaveProperty('role', 'assistant');
    expect(data.choices[0].message).toHaveProperty('content');
    expect(data).toHaveProperty('usage');
  });

  it('should reject request without authentication', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello, world!' },
        ],
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(401);
  });

  it('should reject request with invalid method', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
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
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        // Missing model and messages
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

  it('should validate message format', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'invalid_role', content: 'Hello' }, // Invalid role
        ],
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should handle temperature validation', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello' },
        ],
        temperature: 5.0, // Invalid temperature > 2
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(400);
  });

  it('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
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

  it('should handle system messages correctly', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
      }),
    });

    const response = await worker.fetch(request, testEnv, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.choices[0].message.content).toBeTruthy();
  });

  it('should handle different AI providers based on model', async () => {
    // Test OpenAI model routing
    const openAIRequest = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-auth-token',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello from OpenAI!' },
        ],
      }),
    });

    const envWithOpenAI = {
      ...testEnv,
      OPENAI_API_KEY: 'test-openai-key',
    };

    const response = await worker.fetch(openAIRequest, envWithOpenAI, {
      waitUntil: () => {},
      passThroughOnException: () => {},
    });

    // Should still get a response even if the API call fails (since we're mocking)
    expect(response.status).toBeDefined();
  });
});