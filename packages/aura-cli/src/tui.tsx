#!/usr/bin/env node
import { render } from 'ink';
import { App } from './tui/App.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('session', {
    alias: 's',
    type: 'string',
    description: 'Session ID to continue'
  })
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Model to use'
  })
  .option('dir', {
    alias: 'd',
    type: 'string',
    description: 'Working directory'
  })
  .help()
  .parseSync();

render(
  <App
    sessionId={argv.session}
    model={argv.model}
    dir={argv.dir}
  />
);

