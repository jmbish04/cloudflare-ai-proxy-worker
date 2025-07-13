import { describe, it, expect, beforeEach } from 'vitest';
import worker from './index';
import { Env } from './types';

// Mock execution context
const createMockExecutionContext = (): ExecutionContext => ({
  waitUntil: () => {},
  passThroughOnException: () => {}
});

// Mock environment for testing
const getMockEnv = (): Env => ({
  AUTH_TOKEN: 'test-token',
  OPENAI_API_KEY: 'sk-test-key',
  GEMINI_API_KEY: 'test-gemini-key',
  AI: {
    run: async () => ({
      response: 'Test response from Cloudflare AI'
    })
  } as any,
  DB: undefined
});

describe('/v1/chat/completions endpoint', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = getMockEnv();
  });

  it('should handle valid chat completion request', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('object', 'chat.completion');
    expect(data).toHaveProperty('choices');
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0]).toHaveProperty('message');
    expect(data.choices[0].message).toHaveProperty('role', 'assistant');
    expect(data.choices[0].message).toHaveProperty('content');
  });

  it('should reject request without authentication', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(401);
  });

  it('should reject invalid request format', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        // Missing messages
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('message');
  });

  it('should reject GET method', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': 'test-token'
      }
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(405);
  });

  it('should validate message format', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'invalid_role', content: 'Hello' }
        ]
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(400);
  });

  it('should handle CORS preflight request', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com'
      }
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
  });
});

describe('/v1/completions endpoint', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = getMockEnv();
  });

  it('should handle valid text completion request', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        prompt: 'Complete this sentence: The weather today is',
        temperature: 0.7,
        max_tokens: 50
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('object', 'text_completion');
    expect(data).toHaveProperty('choices');
    expect(data.choices).toHaveLength(1);
    expect(data.choices[0]).toHaveProperty('text');
    expect(data.choices[0]).toHaveProperty('index', 0);
  });

  it('should reject request without authentication', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        prompt: 'Hello'
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(401);
  });

  it('should reject invalid request format', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        // Missing prompt
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('message');
  });

  it('should reject GET method', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'GET',
      headers: {
        'X-AUTH-TOKEN': 'test-token'
      }
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(405);
  });

  it('should validate parameter ranges', async () => {
    const request = new Request('http://localhost/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        prompt: 'Hello',
        temperature: 3.0 // Invalid temperature > 2
      })
    });

    const ctx = createMockExecutionContext();
    const response = await worker.fetch(request, mockEnv, ctx);
    
    expect(response.status).toBe(400);
  });
});