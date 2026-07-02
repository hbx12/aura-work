import { describe, it, expect } from 'vitest';
import { getTheme, getThemeNames, getThemesByType, detectSystemTheme } from '../src/themes/index.js';

describe('Themes', () => {
  it('should have 12 built-in themes', () => {
    const names = getThemeNames();
    expect(names.length).toBe(12);
  });

  it('should get theme by name', () => {
    const theme = getTheme('dracula');
    expect(theme.name).toBe('Dracula');
    expect(theme.type).toBe('dark');
  });

  it('should fallback to default theme', () => {
    const theme = getTheme('nonexistent');
    expect(theme.name).toBe('Aura Dark');
  });

  it('should filter themes by type', () => {
    const darkThemes = getThemesByType('dark');
    const lightThemes = getThemesByType('light');
    expect(darkThemes.length).toBeGreaterThan(0);
    expect(lightThemes.length).toBeGreaterThan(0);
  });

  it('should detect system theme', () => {
    const theme = detectSystemTheme();
    expect(['dark', 'light']).toContain(theme);
  });
});
