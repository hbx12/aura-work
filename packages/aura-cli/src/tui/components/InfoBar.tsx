import { Box, Text } from 'ink';

interface Message {
  role: string;
  content?: string;
  timestamp?: string;
  model?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

interface InfoBarProps {
  session?: { id: string; name?: string; model?: string } | null;
  messages: Message[];
}

export function InfoBar({ session, messages }: InfoBarProps) {
  const totalTokens = messages.reduce((sum, m) => {
    if (m.usage) {
      return sum + (m.usage.inputTokens || 0) + (m.usage.outputTokens || 0);
    }
    return sum;
  }, 0);

  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const lastModel = assistantMessages[assistantMessages.length - 1]?.model;

  return (
    <Box
      flexDirection="column"
      width={30}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text bold color="cyan">Session Info</Text>
      <Box marginTop={1}>
        <Text dimColor>ID: </Text>
        <Text>{session?.id?.slice(0, 12) || 'N/A'}</Text>
      </Box>
      {session?.name && (
        <Box>
          <Text dimColor>Name: </Text>
          <Text>{session.name}</Text>
        </Box>
      )}
      <Box>
        <Text dimColor>Messages: </Text>
        <Text>{messages.length}</Text>
      </Box>
      {totalTokens > 0 && (
        <Box>
          <Text dimColor>Tokens: </Text>
          <Text>{totalTokens.toLocaleString()}</Text>
        </Box>
      )}
      {lastModel && (
        <Box>
          <Text dimColor>Model: </Text>
          <Text>{lastModel}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">Shortcuts</Text>
        <Text dimColor>Ctrl+C  Exit</Text>
        <Text dimColor>Ctrl+I  Toggle info</Text>
        <Text dimColor>↑↓      Navigate</Text>
        <Text dimColor>Esc     Close info</Text>
      </Box>
    </Box>
  );
}
