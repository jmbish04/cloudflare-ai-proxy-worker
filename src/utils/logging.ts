/**
 * Logging utilities for the AI Proxy Worker
 */

import { Env, LogEntry, AIProvider } from '../types.js';

interface DatabaseStatsResult {
  total_requests: number;
  total_tokens: number;
  avg_response_time: number;
}

interface DatabaseProviderResult {
  provider: AIProvider;
  count: number;
}
import { CONFIG } from '../config.js';

/**
 * Create a log entry
 */
export function createLogEntry(
  method: string,
  path: string,
  provider: AIProvider,
  model: string,
  sessionId: string | null,
  tokensUsed: number | undefined,
  responseTime: number,
  status: number
): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    method,
    path,
    provider,
    model,
    session_id: sessionId || undefined,
    tokens_used: tokensUsed,
    response_time: responseTime,
    status,
  };
}

/**
 * Log request to D1 database (if available)
 */
export async function logRequest(
  env: Env,
  logEntry: LogEntry
): Promise<void> {
  if (!CONFIG.ENABLE_LOGGING || !env.DB) {
    return;
  }
  
  try {
    // Insert log entry into D1 database
    await env.DB.prepare(`
      INSERT INTO logs (
        id, timestamp, method, path, provider, model, 
        session_id, tokens_used, response_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      logEntry.id,
      logEntry.timestamp,
      logEntry.method,
      logEntry.path,
      logEntry.provider,
      logEntry.model,
      logEntry.session_id,
      logEntry.tokens_used,
      logEntry.response_time,
      logEntry.status
    ).run();
  } catch (error) {
    // Log to console if D1 logging fails
    console.error('Failed to log to D1:', error);
  }
}

/**
 * Initialize D1 logging table (call this during setup)
 */
export async function initializeLogging(env: Env): Promise<void> {
  if (!env.DB) {
    return;
  }
  
  try {
    // Create logs table if it doesn't exist
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        session_id TEXT,
        tokens_used INTEGER,
        response_time INTEGER NOT NULL,
        status INTEGER NOT NULL
      )
    `).run();
    
    // Create indexes for better query performance
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)
    `).run();
    
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_provider ON logs(provider)
    `).run();
    
    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id)
    `).run();
  } catch (error) {
    console.error('Failed to initialize logging table:', error);
  }
}

/**
 * Get recent logs (for debugging/monitoring)
 */
export async function getRecentLogs(
  env: Env,
  limit: number = 100,
  provider?: AIProvider,
  sessionId?: string
): Promise<LogEntry[]> {
  if (!env.DB) {
    return [];
  }
  
  try {
    let query = 'SELECT * FROM logs';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (provider) {
      conditions.push('provider = ?');
      params.push(provider);
    }
    
    if (sessionId) {
      conditions.push('session_id = ?');
      params.push(sessionId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return result.results as unknown as LogEntry[];
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return [];
  }
}

/**
 * Get usage statistics
 */
export async function getUsageStats(
  env: Env,
  timeframeHours: number = 24
): Promise<{
  totalRequests: number;
  totalTokens: number;
  providerBreakdown: Record<AIProvider, number>;
  averageResponseTime: number;
}> {
  if (!env.DB) {
    return {
      totalRequests: 0,
      totalTokens: 0,
      providerBreakdown: { cloudflare: 0, openai: 0, gemini: 0 },
      averageResponseTime: 0,
    };
  }
  
  const timeThreshold = Date.now() - (timeframeHours * 60 * 60 * 1000);
  
  try {
    // Get overall stats
    const statsResult = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(COALESCE(tokens_used, 0)) as total_tokens,
        AVG(response_time) as avg_response_time
      FROM logs 
      WHERE timestamp > ?
    `).bind(timeThreshold).first() as any;
    
    // Get provider breakdown
    const providerResult = await env.DB.prepare(`
      SELECT provider, COUNT(*) as count
      FROM logs 
      WHERE timestamp > ?
      GROUP BY provider
    `).bind(timeThreshold).all();
    
    const providerBreakdown: Record<AIProvider, number> = {
      cloudflare: 0,
      openai: 0,
      gemini: 0,
    };
    
    for (const row of providerResult.results as any[]) {
      if (row.provider in providerBreakdown) {
        providerBreakdown[row.provider as AIProvider] = row.count;
      }
    }
    
    return {
      totalRequests: Number(statsResult?.total_requests) || 0,
      totalTokens: Number(statsResult?.total_tokens) || 0,
      providerBreakdown,
      averageResponseTime: Number(statsResult?.avg_response_time) || 0,
    };
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    return {
      totalRequests: 0,
      totalTokens: 0,
      providerBreakdown: { cloudflare: 0, openai: 0, gemini: 0 },
      averageResponseTime: 0,
    };
  }
}