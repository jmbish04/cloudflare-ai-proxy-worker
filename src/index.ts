/**
 * Cloudflare AI Proxy Worker - OpenAI-compatible AI proxy
 * 
 * This worker provides OpenAI-compatible endpoints that can route requests
 * to different AI providers including Cloudflare Workers AI, OpenAI, and Gemini.
 */

import { Env, ChatCompletionRequest, CompletionRequest, TokenizeRequest, ModelOptionsResponse, RouteCheckResponse, ErrorResponse, GeminiRequest, GeminiResponse } from './types.js';
import { CONFIG, resolveModel, inferProvider, getAllModels } from './config.js';
import { verifyAuth, createUnauthorizedResponse, createCorsHeaders, getSessionId } from './utils/auth.js';
import { estimateTokens, handleTokenizeRequest } from './utils/tokens.js';
import { createLogEntry, logRequest, initializeLogging } from './utils/logging.js';
import { routeChatCompletion, routeCompletion, validateChatRequest, validateCompletionRequest, getAvailableProviders, isProviderAvailable } from './router.js';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const startTime = Date.now();
		const url = new URL(request.url);
		const method = request.method;
		
		// Handle CORS preflight requests
		if (method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: createCorsHeaders(request.headers.get('Origin') || undefined),
			});
		}
		
		// Add CORS headers to all responses
		const corsHeaders = createCorsHeaders(request.headers.get('Origin') || undefined);
		
		try {
			// Initialize logging (safe to call multiple times)
			await initializeLogging(env);
			
			// Route based on pathname
			switch (url.pathname) {
				case '/v1/chat/completions':
					return await handleChatCompletions(request, env, ctx, startTime, corsHeaders);
				
				case '/v1/completions':
					return await handleCompletions(request, env, ctx, startTime, corsHeaders);
				
				case '/gemini':
					return await handleGemini(request, env, ctx, startTime, corsHeaders);
				
				case '/v1/tokenize':
					return await handleTokenize(request, env, ctx, startTime, corsHeaders);
				
				case '/v1/model-options':
					return await handleModelOptions(request, env, ctx, startTime, corsHeaders);
				
				case '/v1/route-check':
					return await handleRouteCheck(request, env, ctx, startTime, corsHeaders);
				
				case '/':
				case '/health':
					return await handleHealth(request, env, ctx, startTime, corsHeaders);
				
				default:
					return createErrorResponse(
						'Not Found',
						'not_found',
						'The requested endpoint was not found',
						404,
						corsHeaders
					);
			}
		} catch (error) {
			console.error('Worker error:', error);
			return createErrorResponse(
				'Internal Server Error',
				'internal_error',
				error instanceof Error ? error.message : 'An unexpected error occurred',
				500,
				corsHeaders
			);
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * Handle /v1/chat/completions endpoint
 */
async function handleChatCompletions(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'POST') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only POST method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	try {
		const chatRequest: ChatCompletionRequest = await request.json();
		
		// Validate request
		validateChatRequest(chatRequest);
		
		// Route to appropriate provider
		const response = await routeChatCompletion(chatRequest, env);
		
		// Log the request
		const sessionId = getSessionId(request);
		const provider = chatRequest.provider || inferProvider(chatRequest.model);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/v1/chat/completions',
			provider,
			chatRequest.model,
			sessionId,
			response.usage?.total_tokens,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Chat completions error:', error);
		return createErrorResponse(
			'Bad Request',
			'invalid_request',
			error instanceof Error ? error.message : 'Invalid request',
			400,
			corsHeaders
		);
	}
}

/**
 * Handle /v1/completions endpoint
 */
async function handleCompletions(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'POST') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only POST method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	try {
		const completionRequest: CompletionRequest = await request.json();
		
		// Validate request
		validateCompletionRequest(completionRequest);
		
		// Route to appropriate provider
		const response = await routeCompletion(completionRequest, env);
		
		// Log the request
		const sessionId = getSessionId(request);
		const provider = completionRequest.provider || inferProvider(completionRequest.model);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/v1/completions',
			provider,
			completionRequest.model,
			sessionId,
			response.usage?.total_tokens,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Completions error:', error);
		return createErrorResponse(
			'Bad Request',
			'invalid_request',
			error instanceof Error ? error.message : 'Invalid request',
			400,
			corsHeaders
		);
	}
}

/**
 * Handle /v1/tokenize endpoint
 */
async function handleTokenize(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'POST') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only POST method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	try {
		const tokenizeRequest: TokenizeRequest = await request.json();
		
		if (!tokenizeRequest.input) {
			throw new Error('Input text is required');
		}
		
		const response = handleTokenizeRequest(tokenizeRequest);
		
		// Log the request
		const sessionId = getSessionId(request);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/v1/tokenize',
			'cloudflare', // Default provider for tokenization
			tokenizeRequest.model || 'unknown',
			sessionId,
			response.tokens,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Tokenize error:', error);
		return createErrorResponse(
			'Bad Request',
			'invalid_request',
			error instanceof Error ? error.message : 'Invalid request',
			400,
			corsHeaders
		);
	}
}

/**
 * Handle /gemini endpoint - Direct Gemini API access
 */
async function handleGemini(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'POST') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only POST method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	// Check if Gemini is available
	if (!env.GEMINI_API_KEY) {
		return createErrorResponse(
			'Service Unavailable',
			'service_unavailable',
			'Gemini API key not configured',
			503,
			corsHeaders
		);
	}
	
	try {
		const geminiRequest: GeminiRequest = await request.json();
		
		// Validate basic structure
		if (!geminiRequest.contents || !Array.isArray(geminiRequest.contents)) {
			throw new Error('Request must include "contents" array');
		}
		
		// Validate contents structure
		for (const content of geminiRequest.contents) {
			if (!content.role || !content.parts || !Array.isArray(content.parts)) {
				throw new Error('Each content must have a role and parts array');
			}
		}
		
		// Use default model if not specified
		const model = geminiRequest.model || 'gemini-pro';
		
		// Forward request directly to Gemini API
		const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-goog-api-key': env.GEMINI_API_KEY,
			},
			body: JSON.stringify(geminiRequest),
		});
		
		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`Gemini API error: ${response.status} ${errorData}`);
		}
		
		const responseData: GeminiResponse = await response.json();
		
		// Log the request
		const sessionId = getSessionId(request);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/gemini',
			'gemini',
			model,
			sessionId,
			responseData.usageMetadata?.totalTokenCount,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Gemini endpoint error:', error);
		return createErrorResponse(
			'Bad Request',
			'invalid_request',
			error instanceof Error ? error.message : 'Invalid request',
			400,
			corsHeaders
		);
	}
}

/**
 * Handle /v1/model-options endpoint
 */
async function handleModelOptions(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'GET') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only GET method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	try {
		const availableProviders = getAvailableProviders(env);
		const allModels = getAllModels();
		
		const modelOptions: ModelOptionsResponse = {
			object: 'list',
			data: [],
		};
		
		// Add models from available providers only
		for (const { provider, models } of allModels) {
			if (availableProviders.includes(provider)) {
				for (const model of models) {
					modelOptions.data.push({
						id: model,
						object: 'model',
						provider,
						created: Math.floor(Date.now() / 1000),
					});
				}
			}
		}
		
		// Log the request
		const sessionId = getSessionId(request);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/v1/model-options',
			'cloudflare', // Default provider for metadata
			'none',
			sessionId,
			undefined,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(modelOptions), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Model options error:', error);
		return createErrorResponse(
			'Internal Server Error',
			'internal_error',
			error instanceof Error ? error.message : 'Failed to get model options',
			500,
			corsHeaders
		);
	}
}

/**
 * Handle /v1/route-check endpoint
 */
async function handleRouteCheck(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	if (request.method !== 'GET') {
		return createErrorResponse('Method Not Allowed', 'method_not_allowed', 'Only GET method is allowed', 405, corsHeaders);
	}
	
	// Verify authentication
	if (!verifyAuth(request, env)) {
		return createUnauthorizedResponse();
	}
	
	try {
		const url = new URL(request.url);
		const model = url.searchParams.get('model') || '@cf/meta/llama-4-scout-17b-16e-instruct';
		const provider = inferProvider(model);
		const available = isProviderAvailable(provider, env);
		
		const response: RouteCheckResponse = {
			provider,
			model,
			available,
			timestamp: Date.now(),
		};
		
		// Log the request
		const sessionId = getSessionId(request);
		const responseTime = Date.now() - startTime;
		
		const logEntry = createLogEntry(
			request.method,
			'/v1/route-check',
			provider,
			model,
			sessionId,
			undefined,
			responseTime,
			200
		);
		
		ctx.waitUntil(logRequest(env, logEntry));
		
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		});
	} catch (error) {
		console.error('Route check error:', error);
		return createErrorResponse(
			'Internal Server Error',
			'internal_error',
			error instanceof Error ? error.message : 'Failed to check route',
			500,
			corsHeaders
		);
	}
}

/**
 * Handle health check endpoint
 */
async function handleHealth(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	startTime: number,
	corsHeaders: Record<string, string>
): Promise<Response> {
	const availableProviders = getAvailableProviders(env);
	
	const health = {
		status: 'healthy',
		timestamp: Date.now(),
		version: '1.0.0',
		endpoints: [
			'/v1/chat/completions',
			'/v1/completions',
			'/gemini',
			'/v1/tokenize',
			'/v1/model-options',
			'/v1/route-check',
			'/health'
		],
		providers: {
			cloudflare: isProviderAvailable('cloudflare', env),
			openai: isProviderAvailable('openai', env),
			gemini: isProviderAvailable('gemini', env),
		},
		available_providers: availableProviders,
	};
	
	return new Response(JSON.stringify(health), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders,
		},
	});
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
	message: string,
	type: string,
	detail: string,
	status: number,
	corsHeaders: Record<string, string>
): Response {
	const errorResponse: ErrorResponse = {
		error: {
			message: detail,
			type,
			code: type,
		},
	};
	
	return new Response(JSON.stringify(errorResponse), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders,
		},
	});
}
