import { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StatusBar } from './components/StatusBar.js';
import { OnboardingPanel } from './components/OnboardingPanel.js';
import { MessageRow, type Message } from './components/MessageRow.js';
import { InputBox } from './components/InputBox.js';
import { FooterBar } from './components/FooterBar.js';
import { CommandPalette } from './components/CommandPalette.js';
import { useConfig } from './hooks/useConfig.js';
import { useSession } from './hooks/useSession.js';
import { useStream } from './hooks/useStream.js';
import { isSlashCommand, executeCommand } from '../commands/slash/index.js';

interface AppProps {
  sessionId?: string;
  model?: string;
  dir?: string;
}

export function App({ sessionId: initialSessionId, model: initialModel }: AppProps) {
  const { exit } = useApp();
  const configInfo = useConfig();
  const { session } = useSession(configInfo.projectPath);
  const { streaming, cancel, send } = useStream();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [cost, setCost] = useState(0);

  const modelDisplay = initialModel || configInfo.model.display;

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Handle slash commands
    if (isSlashCommand(text)) {
      if (text === '/help' || text === '/h') {
        setShowHelp(true);
        setInput('');
        return;
      }
      if (text === '/clear') {
        setMessages([]);
        setInput('');
        return;
      }

      try {
        const result = await executeCommand(text, {
          sessionId: session.id,
          model: initialModel || undefined,
          dir: configInfo.projectPath,
        });
        if (result) {
          setMessages(prev => [...prev, { role: 'system', content: result }]);
        }
      } catch (err: any) {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${err.message}` }]);
      }
      setInput('');
      return;
    }

    // Check if model is configured
    if (configInfo.model.state === 'not_configured') {
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'No model configured. Use /model to select a model, or set an API key (OPENAI_API_KEY, ANTHROPIC_API_KEY).',
      }]);
      setInput('');
      return;
    }

    // Send to AI
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    await send(text, {
      onToken: (token) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + token };
          }
          return next;
        });
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
      onError: (err) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && last.content === '') {
            next.pop();
          }
          return [...next, { role: 'system', content: `Error: ${err}` }];
        });
      },
    }, initialModel);
  }, [configInfo, session, send, initialModel]);

  // Global keyboard shortcuts
  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      if (streaming) cancel();
      else exit();
    }
    if (key.ctrl && inputChar === 'l') {
      setMessages([]);
    }
    if (key.escape) {
      if (showHelp) setShowHelp(false);
      if (streaming) cancel();
    }
  });

  const hasModel = configInfo.model.state === 'configured' || configInfo.model.state === 'env_detected';
  const showOnboarding = !hasModel && messages.length === 0;

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <StatusBar
        projectName={configInfo.projectName}
        model={modelDisplay}
        agent={configInfo.agent}
        mode={configInfo.mode}
        sessionId={session.id}
      />

      {/* Content area */}
      <Box flexDirection="column" minHeight={8}>
        {showHelp ? (
          <CommandPalette onClose={() => setShowHelp(false)} />
        ) : showOnboarding ? (
          <OnboardingPanel model={configInfo.model} />
        ) : messages.length === 0 ? (
          <Box paddingX={2} paddingY={1}>
            <Text color="gray">Ready. Type a message to start.</Text>
          </Box>
        ) : (
          messages.map((msg, i) => <MessageRow key={i} message={msg} />)
        )}
      </Box>

      {/* Input */}
      <InputBox
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={streaming}
        placeholder={streaming ? 'AI responding... (Esc to cancel)' : 'Type a message or / for commands'}
      />

      {/* Footer */}
      <FooterBar
        streaming={streaming}
        inputTokens={inputTokens}
        outputTokens={outputTokens}
        cost={cost}
        messageCount={messages.filter(m => m.role === 'user' || m.role === 'assistant').length}
      />
    </Box>
  );
}
