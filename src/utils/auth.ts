/**
 * Authentication utilities
 */

import { Env } from '../types.js';
import { CONFIG } from '../config.js';

/**
 * Verify authentication token from request
 */
export function verifyAuth(request: Request, env: Env): boolean {
  // If no AUTH_TOKEN is configured, allow all requests
  if (!env.AUTH_TOKEN) {
    return true;
  }
  
  // Check for token in headers
  const headerToken = request.headers.get(CONFIG.AUTH_HEADER);
  if (headerToken && headerToken === env.AUTH_TOKEN) {
    return true;
  }
  
  // Check for token in URL params (less secure, but sometimes necessary)
  const url = new URL(request.url);
  const paramToken = url.searchParams.get('auth_token');
  if (paramToken && paramToken === env.AUTH_TOKEN) {
    return true;
  }
  
  return false;
}

/**
 * Get session ID from request
 */
export function getSessionId(request: Request): string | null {
  // Check headers first
  const headerSessionId = request.headers.get(CONFIG.SESSION_HEADER);
  if (headerSessionId) {
    return headerSessionId;
  }
  
  // Check cookies
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    return cookies[CONFIG.SESSION_COOKIE] || null;
  }
  
  return null;
}

/**
 * Parse cookies from cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const i = cookie.indexOf('=');
    if (i > 0) {
      const key = cookie.substring(0, i).trim();
      const value = cookie.substring(i + 1);
      cookies[key] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Create CORS headers
 */
export function createCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && CONFIG.CORS_ORIGINS.includes('*') 
    ? origin 
    : CONFIG.CORS_ORIGINS[0] || '*';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-AUTH-TOKEN, X-SESSION-ID',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: {
        message: 'Unauthorized. Please provide a valid auth token.',
        type: 'authentication_error',
        code: 'unauthorized',
      },
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...createCorsHeaders(),
      },
    }
  );
}