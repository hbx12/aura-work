import { describe, it, expect } from 'vitest';
import { assessRisk, shouldAutoApprove } from '../src/core/security/index.js';

describe('Security', () => {
  it('should assess low risk for read operations', () => {
    const { riskLevel } = assessRisk('read file contents');
    expect(riskLevel).toBe('low');
  });

  it('should assess medium risk for write operations', () => {
    const { riskLevel } = assessRisk('write file');
    expect(riskLevel).toBe('medium');
  });

  it('should assess high risk for delete operations', () => {
    const { riskLevel } = assessRisk('delete file');
    expect(riskLevel).toBe('high');
  });

  it('should auto-approve low risk', () => {
    expect(shouldAutoApprove('low')).toBe(true);
  });

  it('should not auto-approve high risk', () => {
    expect(shouldAutoApprove('high')).toBe(false);
  });

  it('should not auto-approve critical risk', () => {
    expect(shouldAutoApprove('critical')).toBe(false);
  });
});
