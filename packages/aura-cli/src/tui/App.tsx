import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { MessageBubble } from './components/MessageBubble.js';
import { InputArea } from './components/InputArea.js';
import { StatusBar } from './components/StatusBar.js';
import { InfoBar } from './components/InfoBar.js';
import { useSession } from './hooks/useSession.js';
import { useStream } from './hooks/useStream.js';
import { loadConfig } from '../core/config.js';

interface AppProps {
  sessionId?: string;
  model?: string;
  dir?: string;
}

export function App({ sessionId, model, dir }: AppProps) {
  const { exit } = useApp();
  const {
    session,
    messages,
    sendMessage,
    loading,
    error,
    createSession
  } = useSession({ sessionId, dir });

  const {
    streaming,
    currentResponse,
    streamMessage,
    clearHistory
  } = useStream({ dir });

  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(-1);
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string, timestamp: string}>>([]);

  // Handle keyboard shortcuts
  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      exit();
    }
    if (key.ctrl && inputChar === 'i') {
      setShowInfo(!showInfo);
    }
    if (key.ctrl && inputChar === 'l') {
      // Clear screen
      setChatHistory([]);
      clearHistory();
    }
    if (key.escape) {
      setShowInfo(false);
    }
  });

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setInput('');

    // Handle slash commands locally
    if (text.startsWith('/')) {
      const parts = text.slice(1).split(' ');
      const cmd = parts[0];
      const args = parts.slice(1).join(' ');

      let response = '';

      switch (cmd) {
        case 'clear':
        case 'cls':
          setChatHistory([]);
          clearHistory();
          return;
        case 'help':
        case 'h':
        case '?':
          response = `Available commands:
/help     - Show this help
/clear    - Clear chat history
/model    - Show/set model
/theme    - Show/set theme
/providers - List providers
/config   - Show config
/doctor   - Check system health
/exit     - Exit CLI`;
          break;
        case 'model':
          if (args) {
            response = `Model set to: ${args}`;
          } else {
            const config = loadConfig();
            response = `Current model: ${config.defaultProvider || 'openai'}/${config.defaultModel || 'gpt-4o'}`;
          }
          break;
        case 'providers':
          response = `Available providers:
- openai (OPENAI_API_KEY)
- anthropic (ANTHROPIC_API_KEY)
- groq (GROQ_API_KEY)
- deepseek (DEEPSEEK_API_KEY)
- ollama (local, no key needed)`;
          break;
        case 'config':
          const cfg = loadConfig();
          response = JSON.stringify(cfg, null, 2);
          break;
        case 'doctor':
          response = `System check:
- Node.js: ${process.version}
- Platform: ${process.platform}
- CWD: ${process.cwd()}
- Config: ✓ loaded`;
          break;
        case 'exit':
        case 'quit':
        case 'q':
          exit();
          return;
        default:
          response = `Unknown command: /${cmd}. Type /help for available commands.`;
      }

      setChatHistory(prev => [...prev,
        { role: 'user', content: text, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      ]);
      return;
    }

    // Regular message - send to AI
    setChatHistory(prev => [...prev,
      { role: 'user', content: text, timestamp: new Date().toISOString() }
    ]);

    const response = await streamMessage(text, session?.id, model);

    if (response) {
      setChatHistory(prev => [...prev,
        { role: 'assistant', content: response, timestamp: new Date().toISOString() }
      ]);
    }
  }, [session, model, streamMessage, clearHistory, exit]);

  const displayMessages = [...chatHistory];
  if (currentResponse && streaming) {
    displayMessages.push({
      role: 'assistant',
      content: currentResponse,
      timestamp: new Date().toISOString()
    });
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Status Bar */}
      <StatusBar
        session={session}
        model={model}
        streaming={streaming}
        messageCount={displayMessages.length}
      />

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Chat area */}
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {loading ? (
            <Box justifyContent="center" alignItems="center" flexGrow={1}>
              <Text color="yellow">Loading session...</Text>
            </Box>
          ) : error ? (
            <Box justifyContent="center" alignItems="center" flexGrow={1}>
              <Text color="red">Error: {error}</Text>
            </Box>
          ) : displayMessages.length === 0 ? (
            <Box justifyContent="center" alignItems="center" flexGrow={1} flexDirection="column">
              <Text bold color="cyan">✦ Aura Work CLI</Text>
              <Text dimColor> </Text>
              <Text dimColor>Type a message to start chatting</Text>
              <Text dimColor>/help for commands | Ctrl+L clear | Ctrl+C exit</Text>
              <Text dimColor> </Text>
              {!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY && (
                <Text color="yellow">⚠ No API key found. Set OPENAI_API_KEY or run: aura-work config</Text>
              )}
            </Box>
          ) : (
            <Box flexDirection="column" flexGrow={1} overflowY="hidden">
              {displayMessages.slice(-20).map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  selected={i === selectedMessage}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Info sidebar */}
        {showInfo && (
          <InfoBar session={session} messages={displayMessages} />
        )}
      </Box>

      {/* Input area */}
      <InputArea
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={streaming}
        placeholder={streaming ? 'Generating...' : 'Type a message...'}
      />
    </Box>
  );
}
