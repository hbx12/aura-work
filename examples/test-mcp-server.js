#!/usr/bin/env node
const fs = require('fs');

function log(msg) {
  fs.writeSync(2, `[Test MCP] ${msg}\n`);
}

log("Starting test MCP server...");

let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk.toString('utf8');
  let lineEnd;
  while ((lineEnd = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) {
      handleRequest(line);
    }
  }
});

function handleRequest(line) {
  log(`Received: ${line}`);
  try {
    const req = JSON.parse(line);
    if (req.method === 'initialize') {
      sendResponse(req.id, {
        protocolVersion: req.params.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "test-mcp-server",
          version: "1.0.0"
        }
      });
    } else if (req.method === 'tools/list') {
      sendResponse(req.id, {
        tools: [
          {
            name: "test_echo",
            description: "Echoes back the message you send",
            inputSchema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "The message to echo"
                }
              },
              required: ["message"]
            }
          },
          {
            name: "get_current_time",
            description: "Returns the current system time",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        ]
      });
    } else if (req.method === 'tools/call') {
      const name = req.params.name;
      const args = req.params.arguments || {};
      if (name === 'test_echo') {
        sendResponse(req.id, {
          content: [
            {
              type: "text",
              text: `Hello! You said: "${args.message}"`
            }
          ]
        });
      } else if (name === 'get_current_time') {
        sendResponse(req.id, {
          content: [
            {
              type: "text",
              text: `The current system time is: ${new Date().toISOString()}`
            }
          ]
        });
      } else {
        sendError(req.id, -32601, `Method not found: ${name}`);
      }
    } else if (req.method === 'notifications/initialized') {
      log("Client initialized");
    } else {
      if (req.id !== undefined) {
        sendResponse(req.id, {});
      }
    }
  } catch (err) {
    log(`Error parsing line: ${err.message}`);
  }
}

function sendResponse(id, result) {
  const resp = JSON.stringify({
    jsonrpc: "2.0",
    id,
    result
  });
  log(`Sending response: ${resp}`);
  process.stdout.write(resp + '\n');
}

function sendError(id, code, message) {
  const resp = JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message }
  });
  log(`Sending error: ${resp}`);
  process.stdout.write(resp + '\n');
}
