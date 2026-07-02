/**
 * Cost tracking and budget management for Aura CLI
 */

import { getDatabase } from './db.js';

// Pricing per 1M tokens (USD)
export interface ModelPricing {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

// Known model pricing
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1-preview': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },

  // Anthropic
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },

  // Google
  'gemini-pro': { input: 0.50, output: 1.50 },
  'gemini-pro-vision': { input: 0.50, output: 1.50 },
  'gemini-ultra': { input: 7.00, output: 21.00 },

  // Local (free)
  'ollama/*': { input: 0, output: 0 },
  'lmstudio/*': { input: 0, output: 0 },
};

// Usage record
export interface UsageRecord {
  id: string;
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  cost: number;
  timestamp: string;
}

// Budget configuration
export interface BudgetConfig {
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  alertThreshold?: number; // Percentage (0-100)
  hardLimit?: boolean; // Stop execution when limit reached
}

// Budget status
export interface BudgetStatus {
  daily: { spent: number; limit?: number; remaining?: number };
  weekly: { spent: number; limit?: number; remaining?: number };
  monthly: { spent: number; limit?: number; remaining?: number };
  alerts: string[];
}

// Get pricing for a model
export function getModelPricing(model: string): ModelPricing {
  // Check exact match
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Check wildcard matches
  for (const [pattern, pricing] of Object.entries(MODEL_PRICING)) {
    if (pattern.includes('*')) {
      const prefix = pattern.replace('*', '');
      if (model.startsWith(prefix)) {
        return pricing;
      }
    }
  }

  // Default pricing
  return { input: 3.00, output: 15.00 };
}

// Calculate cost for token usage
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheWriteTokens?: number
): number {
  const pricing = getModelPricing(model);

  let cost = 0;
  cost += (inputTokens / 1_000_000) * pricing.input;
  cost += (outputTokens / 1_000_000) * pricing.output;

  if (cacheReadTokens && pricing.cacheRead) {
    cost += (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  }
  if (cacheWriteTokens && pricing.cacheWrite) {
    cost += (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  }

  return cost;
}

// Record usage
export async function recordUsage(
  sessionId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
  cacheWriteTokens?: number
): Promise<UsageRecord> {
  const db = await getDatabase();
  const cost = calculateCost(model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens);

  const record: UsageRecord = {
    id: `${sessionId}-${Date.now()}`,
    sessionId,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    cost,
    timestamp: new Date().toISOString(),
  };

  await db.recordUsage({
    id: record.id,
    sessionId: record.sessionId,
    model: record.model,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    cost: record.cost,
  });

  return record;
}

// Get usage summary
export async function getUsageSummary(
  sessionId?: string,
  period?: 'day' | 'week' | 'month'
): Promise<{
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { tokens: number; cost: number }>;
}> {
  const db = await getDatabase();

  const now = new Date();
  let startDate: Date | undefined;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const usage = await db.getUsage(sessionId, startDate?.toISOString());

  let totalTokens = 0;
  let totalCost = 0;
  const byModel: Record<string, { tokens: number; cost: number }> = {};

  for (const record of usage) {
    const tokens = record.inputTokens + record.outputTokens;
    totalTokens += tokens;
    totalCost += record.cost;

    if (!byModel[record.model]) {
      byModel[record.model] = { tokens: 0, cost: 0 };
    }
    byModel[record.model].tokens += tokens;
    byModel[record.model].cost += record.cost;
  }

  return { totalTokens, totalCost, byModel };
}

// Format cost for display
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(2)}`;
}

// Format token count
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

// Check budget
export async function checkBudget(sessionId: string): Promise<BudgetStatus> {
  const db = await getDatabase();
  const config = await db.getBudgetConfig(sessionId);

  const dailyUsage = await getUsageSummary(sessionId, 'day');
  const weeklyUsage = await getUsageSummary(sessionId, 'week');
  const monthlyUsage = await getUsageSummary(sessionId, 'month');

  const alerts: string[] = [];

  const status: BudgetStatus = {
    daily: {
      spent: dailyUsage.totalCost,
      limit: config?.dailyLimit,
      remaining: config?.dailyLimit ? config.dailyLimit - dailyUsage.totalCost : undefined,
    },
    weekly: {
      spent: weeklyUsage.totalCost,
      limit: config?.weeklyLimit,
      remaining: config?.weeklyLimit ? config.weeklyLimit - weeklyUsage.totalCost : undefined,
    },
    monthly: {
      spent: monthlyUsage.totalCost,
      limit: config?.monthlyLimit,
      remaining: config?.monthlyLimit ? config.monthlyLimit - monthlyUsage.totalCost : undefined,
    },
    alerts,
  };

  // Check thresholds
  const threshold = config?.alertThreshold || 80;

  if (config?.dailyLimit && dailyUsage.totalCost >= config.dailyLimit * (threshold / 100)) {
    alerts.push(`Daily budget at ${Math.round((dailyUsage.totalCost / config.dailyLimit) * 100)}%`);
  }
  if (config?.weeklyLimit && weeklyUsage.totalCost >= config.weeklyLimit * (threshold / 100)) {
    alerts.push(`Weekly budget at ${Math.round((weeklyUsage.totalCost / config.weeklyLimit) * 100)}%`);
  }
  if (config?.monthlyLimit && monthlyUsage.totalCost >= config.monthlyLimit * (threshold / 100)) {
    alerts.push(`Monthly budget at ${Math.round((monthlyUsage.totalCost / config.monthlyLimit) * 100)}%`);
  }

  return status;
}

// Set budget configuration
export async function setBudget(
  sessionId: string,
  config: BudgetConfig
): Promise<void> {
  const db = await getDatabase();
  await db.setBudgetConfig(sessionId, config);
}

// Get cost optimization suggestions
export function getCostSuggestions(
  model: string,
  inputTokens: number,
  outputTokens: number
): string[] {
  const suggestions: string[] = [];
  const pricing = getModelPricing(model);

  // Suggest cheaper model if expensive
  if (pricing.input > 10) {
    suggestions.push('Consider using a cheaper model like gpt-4o-mini for simple tasks');
  }

  // Suggest caching if high input
  if (inputTokens > 10000) {
    suggestions.push('Use prompt caching to reduce input token costs');
  }

  // Suggest shorter responses
  if (outputTokens > 5000) {
    suggestions.push('Request shorter responses to reduce output token costs');
  }

  // Suggest batching
  if (inputTokens > 100000) {
    suggestions.push('Batch multiple requests to reduce overhead');
  }

  return suggestions;
}
