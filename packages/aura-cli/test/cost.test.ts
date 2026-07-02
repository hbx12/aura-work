import { describe, it, expect, vi } from 'vitest';

// Mock the db module since cost.ts imports it at the top level
vi.mock('../src/core/db.js', () => ({
  getDatabase: vi.fn(),
}));

const {
  getModelPricing,
  calculateCost,
  formatCost,
  formatTokens,
} = await import('../src/core/cost.js');

describe('Cost', () => {
  it('should get pricing for known models', () => {
    const pricing = getModelPricing('gpt-4o');
    expect(pricing.input).toBe(2.50);
    expect(pricing.output).toBe(10.00);
  });

  it('should calculate cost correctly', () => {
    const cost = calculateCost('gpt-4o', 1000000, 1000000);
    expect(cost).toBeCloseTo(12.50, 2); // $2.50 + $10.00
  });

  it('should format cost', () => {
    expect(formatCost(1.50)).toBe('$1.50');
    expect(formatCost(0.005)).toBe('0.50¢');
  });

  it('should format tokens', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(1500000)).toBe('1.5M');
  });

  it('should handle free models', () => {
    const pricing = getModelPricing('ollama/llama3');
    expect(pricing.input).toBe(0);
    expect(pricing.output).toBe(0);
  });
});
