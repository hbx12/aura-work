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
  const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';

  if (message.role === 'user') {
    return (
      <Box flexDirection="column" paddingX={1} marginY={0}>
        <Box>
          <Text bold color="green">╭── You</Text>
          {time && <Text dimColor> {time}</Text>}
        </Box>
        <Box paddingLeft={2}>
          <Text color="white">{message.content}</Text>
        </Box>
      </Box>
    );
  }

  if (message.role === 'assistant') {
    return (
      <Box flexDirection="column" paddingX={1} marginY={0}>
        <Box>
          <Text bold color="cyan">╭── Aura</Text>
          {time && <Text dimColor> {time}</Text>}
        </Box>
        <Box paddingLeft={2} flexDirection="column">
          <Text color="white">{message.content}</Text>
          {message.streaming && <Text color="cyan">█</Text>}
        </Box>
      </Box>
    );
  }

  if (message.role === 'tool') {
    return (
      <Box flexDirection="column" paddingX={1} marginY={0}>
        <Text color="gray">
          {'  ⚙ '}
          <Text bold>{message.toolName || 'tool'}</Text>
          {' • '}
          {message.content.split('\n')[0]}
        </Text>
      </Box>
    );
  }

  if (message.role === 'system') {
    return (
      <Box paddingX={1} marginY={0}>
        <Text dimColor>• {message.content}</Text>
      </Box>
    );
  }

  return null;
}
