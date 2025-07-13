import { SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Chat Completions Endpoint', () => {
  beforeAll(() => {
    // Setup test environment
  });

  it('should handle basic chat completion request', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      AI: {
        run: async () => 'Hello! I am doing well, thank you for asking.'
      }
    };

    const response = await SELF.fetch(request, env);
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

  it('should validate required fields', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        // Missing model and messages
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      AI: {
        run: async () => 'Test response'
      }
    };

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should require authentication', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Missing X-AUTH-TOKEN
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      AI: {
        run: async () => 'Test response'
      }
    };

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(401);
  });

  it('should handle OpenAI models', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      OPENAI_API_KEY: 'test-openai-key',
    };

    // Mock fetch for OpenAI API
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello from OpenAI' },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
    }), { status: 200 });

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(200);

    global.fetch = originalFetch;
  });

  it('should handle Gemini models', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        model: 'gemini-pro',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      GEMINI_API_KEY: 'test-gemini-key',
    };

    // Mock fetch for Gemini API
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: 'Hello from Gemini' }]
        },
        finishReason: 'STOP'
      }]
    }), { status: 200 });

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(200);

    global.fetch = originalFetch;
  });

  it('should validate message format', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'invalid-role', content: 'Hello' } // Invalid role
        ]
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      AI: {
        run: async () => 'Test response'
      }
    };

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(400);
  });

  it('should validate temperature range', async () => {
    const request = new Request('http://localhost/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-TOKEN': 'test-token',
      },
      body: JSON.stringify({
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        temperature: 3.0 // Invalid temperature > 2
      }),
    });

    const env = {
      AUTH_TOKEN: 'test-token',
      AI: {
        run: async () => 'Test response'
      }
    };

    const response = await SELF.fetch(request, env);
    expect(response.status).toBe(400);
  });
});