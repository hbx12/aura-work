/**
 * Aura CLI Theme System
 * 12 built-in themes with dark/light mode support
 */

export interface ThemeColors {
  // Base colors
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;

  // UI elements
  background: string;
  foreground: string;
  border: string;
  selection: string;

  // Syntax highlighting
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  operator: string;
}

export interface Theme {
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
}

// Built-in themes
export const themes: Record<string, Theme> = {
  // Dark themes
  'aura-dark': {
    name: 'Aura Dark',
    type: 'dark',
    colors: {
      primary: '#82aaff',
      secondary: '#c792ea',
      accent: '#ffcb6b',
      success: '#c3e88d',
      warning: '#ffcb6b',
      error: '#ff5370',
      info: '#89ddff',
      muted: '#546e7a',
      background: '#0d1117',
      foreground: '#d6deeb',
      border: '#1e3a5f',
      selection: '#1e3a5f',
      keyword: '#c792ea',
      string: '#addb67',
      number: '#f78c6c',
      comment: '#637777',
      function: '#82aaff',
      variable: '#d6deeb',
      operator: '#89ddff',
    }
  },
  'midnight': {
    name: 'Midnight',
    type: 'dark',
    colors: {
      primary: '#7aa2f7',
      secondary: '#bb9af7',
      accent: '#e0af68',
      success: '#9ece6a',
      warning: '#e0af68',
      error: '#f7768e',
      info: '#7dcfff',
      muted: '#565f89',
      background: '#1a1b26',
      foreground: '#a9b1d6',
      border: '#292e42',
      selection: '#292e42',
      keyword: '#bb9af7',
      string: '#9ece6a',
      number: '#ff9e64',
      comment: '#565f89',
      function: '#7aa2f7',
      variable: '#a9b1d6',
      operator: '#89ddff',
    }
  },
  'dracula': {
    name: 'Dracula',
    type: 'dark',
    colors: {
      primary: '#bd93f9',
      secondary: '#ff79c6',
      accent: '#f1fa8c',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555',
      info: '#8be9fd',
      muted: '#6272a4',
      background: '#282a36',
      foreground: '#f8f8f2',
      border: '#44475a',
      selection: '#44475a',
      keyword: '#ff79c6',
      string: '#f1fa8c',
      number: '#bd93f9',
      comment: '#6272a4',
      function: '#50fa7b',
      variable: '#f8f8f2',
      operator: '#ff79c6',
    }
  },
  'monokai': {
    name: 'Monokai',
    type: 'dark',
    colors: {
      primary: '#66d9ef',
      secondary: '#f92672',
      accent: '#e6db74',
      success: '#a6e22e',
      warning: '#fd971f',
      error: '#f92672',
      info: '#66d9ef',
      muted: '#75715e',
      background: '#272822',
      foreground: '#f8f8f2',
      border: '#3e3d32',
      selection: '#49483e',
      keyword: '#f92672',
      string: '#e6db74',
      number: '#ae81ff',
      comment: '#75715e',
      function: '#a6e22e',
      variable: '#f8f8f2',
      operator: '#f92672',
    }
  },
  'nord': {
    name: 'Nord',
    type: 'dark',
    colors: {
      primary: '#88c0d0',
      secondary: '#b48ead',
      accent: '#ebcb8b',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      info: '#88c0d0',
      muted: '#4c566a',
      background: '#2e3440',
      foreground: '#d8dee9',
      border: '#3b4252',
      selection: '#434c5e',
      keyword: '#81a1c1',
      string: '#a3be8c',
      number: '#b48ead',
      comment: '#616e88',
      function: '#88c0d0',
      variable: '#d8dee9',
      operator: '#81a1c1',
    }
  },
  'tokyo-night': {
    name: 'Tokyo Night',
    type: 'dark',
    colors: {
      primary: '#7aa2f7',
      secondary: '#bb9af7',
      accent: '#e0af68',
      success: '#9ece6a',
      warning: '#e0af68',
      error: '#f7768e',
      info: '#7dcfff',
      muted: '#565f89',
      background: '#1a1b26',
      foreground: '#a9b1d6',
      border: '#292e42',
      selection: '#292e42',
      keyword: '#bb9af7',
      string: '#9ece6a',
      number: '#ff9e64',
      comment: '#565f89',
      function: '#7aa2f7',
      variable: '#a9b1d6',
      operator: '#89ddff',
    }
  },

  // Light themes
  'aura-light': {
    name: 'Aura Light',
    type: 'light',
    colors: {
      primary: '#2166ae',
      secondary: '#6c3483',
      accent: '#b7791f',
      success: '#276749',
      warning: '#b7791f',
      error: '#c0392b',
      info: '#2980b9',
      muted: '#95a5a6',
      background: '#ffffff',
      foreground: '#2c3e50',
      border: '#ecf0f1',
      selection: '#d5e8f7',
      keyword: '#6c3483',
      string: '#276749',
      number: '#b7791f',
      comment: '#95a5a6',
      function: '#2166ae',
      variable: '#2c3e50',
      operator: '#2980b9',
    }
  },
  'github-light': {
    name: 'GitHub Light',
    type: 'light',
    colors: {
      primary: '#0366d6',
      secondary: '#6f42c1',
      accent: '#e36209',
      success: '#28a745',
      warning: '#e36209',
      error: '#d73a49',
      info: '#0366d6',
      muted: '#6a737d',
      background: '#ffffff',
      foreground: '#24292e',
      border: '#e1e4e8',
      selection: '#dbedff',
      keyword: '#d73a49',
      string: '#032f62',
      number: '#005cc5',
      comment: '#6a737d',
      function: '#6f42c1',
      variable: '#24292e',
      operator: '#d73a49',
    }
  },
  'solarized-light': {
    name: 'Solarized Light',
    type: 'light',
    colors: {
      primary: '#268bd2',
      secondary: '#6c71c4',
      accent: '#b58900',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      info: '#2aa198',
      muted: '#93a1a1',
      background: '#fdf6e3',
      foreground: '#657b83',
      border: '#eee8d5',
      selection: '#eee8d5',
      keyword: '#859900',
      string: '#2aa198',
      number: '#d33682',
      comment: '#93a1a1',
      function: '#268bd2',
      variable: '#657b83',
      operator: '#859900',
    }
  },
  'one-light': {
    name: 'One Light',
    type: 'light',
    colors: {
      primary: '#4078f2',
      secondary: '#a626a4',
      accent: '#986801',
      success: '#50a14f',
      warning: '#986801',
      error: '#e45649',
      info: '#0184bc',
      muted: '#a0a1a7',
      background: '#fafafa',
      foreground: '#383a42',
      border: '#e5e5e6',
      selection: '#bfceff',
      keyword: '#a626a4',
      string: '#50a14f',
      number: '#986801',
      comment: '#a0a1a7',
      function: '#4078f2',
      variable: '#383a42',
      operator: '#a626a4',
    }
  },

  // High contrast
  'high-contrast-dark': {
    name: 'High Contrast Dark',
    type: 'dark',
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff',
      muted: '#808080',
      background: '#000000',
      foreground: '#ffffff',
      border: '#404040',
      selection: '#008080',
      keyword: '#ff00ff',
      string: '#00ff00',
      number: '#ffff00',
      comment: '#808080',
      function: '#00ffff',
      variable: '#ffffff',
      operator: '#ff00ff',
    }
  },
  'high-contrast-light': {
    name: 'High Contrast Light',
    type: 'light',
    colors: {
      primary: '#0000ff',
      secondary: '#800080',
      accent: '#808000',
      success: '#008000',
      warning: '#808000',
      error: '#800000',
      info: '#0000ff',
      muted: '#808080',
      background: '#ffffff',
      foreground: '#000000',
      border: '#c0c0c0',
      selection: '#00ffff',
      keyword: '#800080',
      string: '#008000',
      number: '#808000',
      comment: '#808080',
      function: '#0000ff',
      variable: '#000000',
      operator: '#800080',
    }
  },
};

// Default theme
export const DEFAULT_THEME = 'aura-dark';

// Get theme by name
export function getTheme(name: string): Theme {
  return themes[name] || themes[DEFAULT_THEME];
}

// Get all theme names
export function getThemeNames(): string[] {
  return Object.keys(themes);
}

// Get themes by type
export function getThemesByType(type: 'dark' | 'light'): Theme[] {
  return Object.values(themes).filter(t => t.type === type);
}

// Detect system theme (dark/light)
export function detectSystemTheme(): 'dark' | 'light' {
  // Check environment variables
  if (process.env.COLORFGBG) {
    const parts = process.env.COLORFGBG.split(';');
    if (parts.length >= 2) {
      const bg = parseInt(parts[1]);
      return bg < 8 ? 'dark' : 'light';
    }
  }

  // Default to dark
  return 'dark';
}

// Apply theme to config
export function applyTheme(themeName: string): ThemeColors {
  const theme = getTheme(themeName);
  return theme.colors;
}
