import { Box, Text } from 'ink';

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  streaming?: boolean;
  timestamp?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, toolName, streaming } = message;

  if (role === 'system') {
    return (
      <Box flexDirection="column" marginY={0} paddingX={1}>
        <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
          <Text color="yellow">⚠ System</Text>
          <Text>{content}</Text>
        </Box>
      </Box>
    );
  }

  if (role === 'tool') {
    return (
      <Box flexDirection="column" marginY={0} paddingX={1}>
        <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
          <Text color="gray">🔧 {toolName || 'Tool'}</Text>
          <Text dimColor>{content.length > 200 ? content.slice(0, 200) + '...' : content}</Text>
        </Box>
      </Box>
    );
  }

  if (role === 'user') {
    return (
      <Box flexDirection="column" marginY={0} paddingX={1}>
        <Box justifyContent="flex-end">
          <Box borderStyle="round" borderColor="blue" paddingX={1} flexDirection="column">
            <Text color="blue" bold>👤 You</Text>
            <Text>{content}</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Assistant
  return (
    <Box flexDirection="column" marginY={0} paddingX={1}>
      <Box borderStyle="round" borderColor={streaming ? 'cyan' : 'green'} paddingX={1} flexDirection="column">
        <Box>
          <Text color={streaming ? 'cyan' : 'green'} bold>✦ Aura</Text>
          {streaming && <Text color="cyan"> ⚡</Text>}
        </Box>
        {content ? (
          <Text>{content}</Text>
        ) : streaming ? (
          <Text color="cyan">Thinking...</Text>
        ) : null}
      </Box>
    </Box>
  );
}
