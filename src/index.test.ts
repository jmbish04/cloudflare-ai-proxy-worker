import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

describe('AI Proxy Worker', () => {
	describe('/v1/chat/completions endpoint', () => {
		it('should return 401 without proper authentication', async () => {
			const request = new Request('http://localhost/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-3.5-turbo',
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(401);
		});

		it('should return 400 for invalid request body', async () => {
			const request = new Request('http://localhost/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Auth-Token': 'test-token',
				},
				body: JSON.stringify({
					// Missing required model and messages
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(400);
		});

		it('should handle valid chat completion request', async () => {
			const request = new Request('http://localhost/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Auth-Token': 'test-token',
				},
				body: JSON.stringify({
					model: '@cf/meta/llama-3.1-8b-instruct',
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
				AI: {
					run: vi.fn().mockResolvedValue({
						response: 'Hello! How can I help you today?',
					}),
				},
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data).toHaveProperty('choices');
			expect(data).toHaveProperty('usage');
		});
	});

	describe('/v1/completions endpoint', () => {
		it('should return 401 without proper authentication', async () => {
			const request = new Request('http://localhost/v1/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-3.5-turbo',
					prompt: 'Hello',
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(401);
		});

		it('should return 400 for invalid request body', async () => {
			const request = new Request('http://localhost/v1/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Auth-Token': 'test-token',
				},
				body: JSON.stringify({
					// Missing required model and prompt
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(400);
		});

		it('should handle valid completion request', async () => {
			const request = new Request('http://localhost/v1/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Auth-Token': 'test-token',
				},
				body: JSON.stringify({
					model: '@cf/meta/llama-3.1-8b-instruct',
					prompt: 'Hello',
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
				AI: {
					run: vi.fn().mockResolvedValue({
						response: 'Hello! How can I help you today?',
					}),
				},
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data).toHaveProperty('choices');
			expect(data).toHaveProperty('usage');
		});
	});

	describe('/v1/tokenize endpoint', () => {
		it('should handle tokenization request', async () => {
			const request = new Request('http://localhost/v1/tokenize', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Auth-Token': 'test-token',
				},
				body: JSON.stringify({
					input: 'Hello, world!',
				}),
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data).toHaveProperty('tokens');
		});
	});

	describe('/v1/model-options endpoint', () => {
		it('should return available models', async () => {
			const request = new Request('http://localhost/v1/model-options', {
				method: 'GET',
				headers: {
					'X-Auth-Token': 'test-token',
				},
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data).toHaveProperty('object', 'list');
			expect(data).toHaveProperty('data');
			expect(Array.isArray(data.data)).toBe(true);
		});
	});

	describe('/v1/route-check endpoint', () => {
		it('should check route availability', async () => {
			const request = new Request('http://localhost/v1/route-check?model=gpt-3.5-turbo', {
				method: 'GET',
				headers: {
					'X-Auth-Token': 'test-token',
				},
			});

			const env = {
				X_AUTH_TOKEN: 'test-token',
			} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			
			const data = await response.json();
			expect(data).toHaveProperty('provider');
			expect(data).toHaveProperty('model');
			expect(data).toHaveProperty('available');
		});
	});

	describe('CORS handling', () => {
		it('should handle OPTIONS preflight requests', async () => {
			const request = new Request('http://localhost/v1/chat/completions', {
				method: 'OPTIONS',
				headers: {
					'Origin': 'https://example.com',
					'Access-Control-Request-Method': 'POST',
				},
			});

			const env = {} as any;

			const response = await worker.fetch(request, env, {} as any);
			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
		});
	});
});