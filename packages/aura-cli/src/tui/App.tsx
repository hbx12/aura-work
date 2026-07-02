import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { MessageBubble } from './components/MessageBubble.js';
import { InputArea } from './components/InputArea.js';
import { StatusBar } from './components/StatusBar.js';
import { InfoBar } from './components/InfoBar.js';
import { useSession } from './hooks/useSession.js';
import { useStream } from './hooks/useStream.js';

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
    streamMessage
  } = useStream({ dir });

  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(-1);

  // Handle keyboard shortcuts
  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      exit();
    }
    if (key.ctrl && inputChar === 'i') {
      setShowInfo(!showInfo);
    }
    if (key.escape) {
      setShowInfo(false);
    }
    if (key.upArrow && messages.length > 0) {
      setSelectedMessage(Math.max(0, selectedMessage - 1));
    }
    if (key.downArrow && messages.length > 0) {
      setSelectedMessage(Math.min(messages.length - 1, selectedMessage + 1));
    }
  });

  const handleSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setInput('');

    // Create session if needed
    if (!session) {
      await createSession();
    }

    // Stream the response
    await streamMessage(text, session?.id, model);
  }, [session, model, streamMessage, createSession]);

  const displayMessages = [...messages];
  if (currentResponse) {
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
              <Text bold color="cyan">Aura Work CLI</Text>
              <Text dimColor>Type a message to start</Text>
              <Text dimColor>Ctrl+C exit | Ctrl+I info</Text>
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
