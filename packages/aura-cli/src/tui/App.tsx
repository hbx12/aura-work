import { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
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
  const { streaming, cancel, send } = useStream();

  const projectPath = process.cwd();
  const projectName = projectPath.split(/[\\/]/).pop() || 'project';

  useEffect(() => {
    if (config?.defaultModel && !currentModel) setCurrentModel(config.defaultModel);
  }, [config]);

  // No API key warning
  useEffect(() => {
    if (!configLoading && config && !config.apiKeys) {
      setMessages([{
        role: 'system',
        content: 'No API key found. Run: aura-work config set apiKeys.openai YOUR_KEY',
        timestamp: new Date().toISOString(),
      }]);
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
          content: typeof args === 'string' ? args : JSON.stringify(args),
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
        setMessages(prev => [...prev, {
          role: 'system',
          content: `Error: ${err}`,
          timestamp: new Date().toISOString(),
        }]);
      },
    });
  }, [sessionId, createSession, send, currentModel, projectPath, messages.length]);

  // Ctrl+C
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
        <Text color="cyan">Loading config...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows - 1}>
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Text bold color="cyan"> Aura Work</Text>
        <Text color="gray">{displayModel}</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {messages.length === 0 ? (
          <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Text color="cyan" bold>{'  ╭─────────────────────────────────────╮'}</Text>
            <Text color="cyan" bold>{'  │                                     │'}</Text>
            <Text color="cyan" bold>{'  │       ✦ Aura Work CLI ✦             │'}</Text>
            <Text color="cyan" bold>{'  │                                     │'}</Text>
            <Text color="cyan" bold>{'  │  Type a message to start chatting   │'}</Text>
            <Text color="cyan" bold>{'  │  /help for commands                 │'}</Text>
            <Text color="cyan" bold>{'  │  Ctrl+L clear • Ctrl+C exit         │'}</Text>
            <Text color="cyan" bold>{'  │                                     │'}</Text>
            <Text color="cyan" bold>{'  ╰─────────────────────────────────────╯'}</Text>
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
      />

      {/* Input */}
      <InputArea
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={streaming}
        placeholder={streaming ? 'AI is responding... (Esc to cancel)' : 'Type a message or / for commands'}
      />
    </Box>
  );
}


