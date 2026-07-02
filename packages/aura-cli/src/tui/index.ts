import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

export function startTUI(options?: { sessionId?: string; model?: string; dir?: string }) {
  render(React.createElement(App, {
    sessionId: options?.sessionId,
    model: options?.model,
    dir: options?.dir,
  }));
}
