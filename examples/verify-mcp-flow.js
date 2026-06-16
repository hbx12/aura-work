const { spawn } = require('child_process');
const http = require('http');

const PORT = 48999;
const TOKEN = 'test_token_of_at_least_32_characters_long_abcdef';

console.log('1. Starting test plugins-helper sidecar...');
const sidecar = spawn('node', ['sidecar/aura-plugins-helper/dist/index.js'], {
  env: {
    ...process.env,
    AURA_PLUGINS_PORT: PORT.toString(),
    AURA_SIDECAR_AUTH_TOKEN: TOKEN
  }
});

sidecar.stdout.on('data', (data) => {
  console.log(`[Sidecar stdout] ${data.toString().trim()}`);
});

sidecar.stderr.on('data', (data) => {
  console.error(`[Sidecar stderr] ${data.toString().trim()}`);
});

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  // Wait for sidecar to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('2. Sending POST /start...');
  let startRes = await request('POST', '/start');
  console.log('Start response:', startRes);

  console.log('3. Sending POST /config...');
  const configPayload = {
    plugins: [],
    mcpServers: [
      {
        id: 'aura_config_project_proj123_test-project-server',
        name: 'test-project-server',
        transport: 'stdio',
        command: 'node',
        args: ['/Users/hbx/Desktop/aura work/examples/test-mcp-server.js'],
        env: {
          'TEST_ENV_VAR': 'Hello from project-level config'
        },
        enabled: true
      }
    ],
    projectMcpSettings: [
      {
        projectId: 'proj123',
        serverId: 'aura_config_project_proj123_test-project-server',
        enabled: true
      }
    ]
  };

  let configRes = await request('POST', '/config', configPayload);
  console.log('Config response:', configRes);

  // Wait for MCP server to connect and list tools
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('4. Querying GET /tools...');
  let toolsRes = await request('GET', '/tools?projectId=proj123');
  console.log('Tools response:', JSON.stringify(toolsRes, null, 2));

  const mcpTools = toolsRes.data.mcp || [];
  const echoTool = mcpTools.find(t => t.name === 'test_echo');
  if (echoTool) {
    console.log('\nSUCCESS: test_echo tool successfully detected in MCP plugins helper!');
  } else {
    console.error('\nFAILURE: test_echo tool not found!');
  }

  console.log('5. Stopping sidecar...');
  sidecar.kill();
  process.exit(echoTool ? 0 : 1);
}

run().catch(err => {
  console.error('Error running test:', err);
  sidecar.kill();
  process.exit(1);
});
