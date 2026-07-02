/**
 * Color utilities for Aura CLI
 * Theme-aware color helpers using chalk
 */
import chalk from 'chalk';
import { ThemeColors } from './index.js';

export class ThemeColorsUtil {
  private colors: ThemeColors;

  constructor(colors: ThemeColors) {
    this.colors = colors;
  }

  // Text colors
  get primary() { return chalk.hex(this.colors.primary); }
  get secondary() { return chalk.hex(this.colors.secondary); }
  get accent() { return chalk.hex(this.colors.accent); }
  get success() { return chalk.hex(this.colors.success); }
  get warning() { return chalk.hex(this.colors.warning); }
  get error() { return chalk.hex(this.colors.error); }
  get info() { return chalk.hex(this.colors.info); }
  get muted() { return chalk.hex(this.colors.muted); }
  get foreground() { return chalk.hex(this.colors.foreground); }

  // Background colors
  get bgPrimary() { return chalk.bgHex(this.colors.primary); }
  get bgSecondary() { return chalk.bgHex(this.colors.secondary); }
  get bgSelection() { return chalk.bgHex(this.colors.selection); }

  // Syntax highlighting
  get keyword() { return chalk.hex(this.colors.keyword); }
  get string() { return chalk.hex(this.colors.string); }
  get number() { return chalk.hex(this.colors.number); }
  get comment() { return chalk.hex(this.colors.comment); }
  get function() { return chalk.hex(this.colors.function); }
  get variable() { return chalk.hex(this.colors.variable); }
  get operator() { return chalk.hex(this.colors.operator); }

  // UI elements
  get border() { return chalk.hex(this.colors.border); }
  get selection() { return chalk.hex(this.colors.selection); }

  // Helper methods
  status(type: 'success' | 'warning' | 'error' | 'info', text: string): string {
    const colorFn = this[type];
    return colorFn(text);
  }

  role(role: 'user' | 'assistant' | 'system', text: string): string {
    switch (role) {
      case 'user': return this.primary(text);
      case 'assistant': return this.success(text);
      case 'system': return this.warning(text);
      default: return text;
    }
  }

  diff(type: 'added' | 'removed' | 'context', text: string): string {
    switch (type) {
      case 'added': return this.success(text);
      case 'removed': return this.error(text);
      case 'context': return this.muted(text);
      default: return text;
    }
  }

  severity(level: 'low' | 'medium' | 'high' | 'critical', text: string): string {
    switch (level) {
      case 'low': return this.info(text);
      case 'medium': return this.warning(text);
      case 'high': return this.error(text);
      case 'critical': return chalk.bgRed.white(text);
      default: return text;
    }
  }
}

// Create color utility from theme
export function createThemeColors(colors: ThemeColors): ThemeColorsUtil {
  return new ThemeColorsUtil(colors);
}
