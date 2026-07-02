import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { InputArea } from './components/InputArea.js';
import { MessageBubble } from './components/MessageBubble.js';
import { StatusLine } from './components/StatusLine.js';
import { useSession } from './hooks/useSession.js';
import { useConfig } from './hooks/useConfig.js';
import { useStream } from './hooks/useStream.js';
import { getCommandSuggestions, executeCommand, isSlashCommand } from '../commands/slash/index.js';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  streaming?: boolean;
  timestamp?: string;
}

interface AppProps {
  sessionId?: string;
  model?: string;
  dir?: string;
}

export function App({ sessionId: initialSessionId, model: initialModel }: AppProps) {
  const { exit } = useApp();
  const { config, loading: configLoading } = useConfig();
  const { activeSession, createSession } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [currentModel, setCurrentModel] = useState<string>(initialModel || '');
  const [agent, setAgent] = useState<string>('build');
  const [mode, setMode] = useState<string>('build');
  const { streaming, cancel, send } = useStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const projectPath = process.cwd();
  const projectName = projectPath.split(/[\\/]/).pop() || 'project';

  useEffect(() => {
    if (config?.defaultModel && !currentModel) setCurrentModel(config.defaultModel);
    if (config?.defaultAgent) setAgent(config.defaultAgent);
    if (config?.defaultMode) setMode(config.defaultMode);
  }, [config]);

  // Check for API key
  useEffect(() => {
    if (!configLoading && config) {
      const hasKey = config.apiKeys && Object.keys(config.apiKeys).length > 0;
      const hasEnvKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || 
                        process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY;
      if (!hasKey && !hasEnvKey) {
        setMessages([{
          role: 'system',
          content: '⚠ No API key configured. Set one of:\n  • aura config set apiKeys.openai YOUR_KEY\n  • set OPENAI_API_KEY=your-key\n  • set ANTHROPIC_API_KEY=your-key',
          timestamp: new Date().toISOString(),
        }]);
      }
    }
  }, [config, configLoading]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Slash command
    if (isSlashCommand(text)) {
      try {
        const result = await executeCommand(text, {
          sessionId: sessionId || undefined,
          model: currentModel || undefined,
          dir: projectPath,
        });
        if (result) {
          setMessages(prev => [...prev, { role: 'system', content: result, timestamp: new Date().toISOString() }]);
        }
        setInput('');
        return;
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}`, timestamp: new Date().toISOString() }]);
        setInput('');
        return;
      }
    }

    // Create session if needed
    let sid = sessionId;
    if (!sid) {
      const session = await createSession({ projectPath });
      sid = session?.id || `session-${Date.now()}`;
      setSessionId(sid);
    }

    // Add user message
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Add placeholder for AI response
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, timestamp: new Date().toISOString() }]);

    // Stream response
    await send(text, {
      model: currentModel || undefined,
      projectPath,
      sessionId: sid,
      onToken: (token: string) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + token };
          }
          return next;
        });
      },
      onToolCall: (name: string, args: any) => {
        setMessages(prev => [...prev, {
          role: 'tool',
          content: typeof args === 'string' ? args : JSON.stringify(args, null, 2),
          toolName: name,
          timestamp: new Date().toISOString(),
        }]);
      },
      onComplete: () => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, streaming: false };
          }
          return next;
        });
      },
      onError: (err: string) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last.content === '') {
            next.pop();
          }
          return [...next, {
            role: 'system' as const,
            content: `❌ Error: ${err}`,
            timestamp: new Date().toISOString(),
          }];
        });
      },
    });
  }, [sessionId, createSession, send, currentModel, projectPath, messages.length]);

  // Global keyboard shortcuts
  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      if (streaming) cancel();
      else exit();
    }
    if (key.ctrl && inputChar === 'l') {
      setMessages([]);
    }
    if (key.escape && streaming) {
      cancel();
    }
  });

  const displayModel = currentModel || config?.defaultModel || 'No model';

  if (configLoading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">⏳ Loading config...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows - 1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan"> ✦ Aura Work </Text>
          <Text color="gray">— </Text>
          <Text color="white">{projectName}</Text>
        </Box>
        <Box>
          <Text color="gray">{displayModel}</Text>
          <Text color="gray"> • </Text>
          <Text color="yellow">{agent}</Text>
          <Text color="gray"> • </Text>
          <Text color="magenta">{mode}</Text>
        </Box>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {messages.length === 0 ? (
          <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Text color="cyan" bold>╭─────────────────────────────────────────────╮</Text>
            <Text color="cyan" bold>│                                             │</Text>
            <Text color="cyan" bold>│         ✦ Welcome to Aura Work ✦            │</Text>
            <Text color="cyan" bold>│                                             │</Text>
            <Text color="cyan" bold>│  AI-powered coding assistant in your        │</Text>
            <Text color="cyan" bold>│  terminal. Type a message to start.         │</Text>
            <Text color="cyan" bold>│                                             │</Text>
            <Text color="gray" bold>│  /help     Show available commands           │</Text>
            <Text color="gray" bold>│  /model    Change AI model                  │</Text>
            <Text color="gray" bold>│  /clear    Clear chat history               │</Text>
            <Text color="gray" bold>│                                             │</Text>
            <Text color="gray" bold>│  Ctrl+C exit • Ctrl+L clear • Esc cancel    │</Text>
            <Text color="cyan" bold>│                                             │</Text>
            <Text color="cyan" bold>╰─────────────────────────────────────────────╯</Text>
          </Box>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
      </Box>

      {/* Status */}
      <StatusLine
        messageCount={messages.length}
        streaming={streaming}
        model={displayModel}
        session={sessionId}
        tokens={{ input: 0, output: 0 }}
        cost={0}
      />

      {/* Input */}
      <InputArea
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={streaming}
        placeholder={streaming ? 'AI is responding... (Esc to cancel)' : 'Type a message or / for commands...'}
      />
    </Box>
  );
}
