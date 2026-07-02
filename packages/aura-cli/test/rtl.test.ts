import { describe, it, expect } from 'vitest';
import {
  isRTLChar,
  hasRTL,
  isPrimarilyRTL,
  rtlReorder,
  stripDirectionMarks
} from '../src/themes/rtl.js';

describe('RTL Support', () => {
  it('should detect Arabic characters as RTL', () => {
    expect(isRTLChar('ا')).toBe(true);
    expect(isRTLChar('ب')).toBe(true);
    expect(isRTLChar('A')).toBe(false);
  });

  it('should detect RTL in mixed text', () => {
    expect(hasRTL('Hello مرحبا')).toBe(true);
    expect(hasRTL('Hello World')).toBe(false);
  });

  it('should identify primarily RTL text', () => {
    expect(isPrimarilyRTL('مرحبا بالعالم')).toBe(true);
    expect(isPrimarilyRTL('Hello World')).toBe(false);
  });

  it('should reorder RTL text', () => {
    const result = rtlReorder('مرحبا');
    expect(result).toBeDefined();
  });

  it('should strip direction marks', () => {
    expect(stripDirectionMarks('\u200Ftext\u200E')).toBe('text');
  });
});
