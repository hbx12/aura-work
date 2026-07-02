import { Box, Text } from 'ink';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolName?: string;
  streaming?: boolean;
}

interface MessageRowProps {
  message: Message;
}

export function MessageRow({ message }: MessageRowProps) {
  const { role, content, toolName, streaming } = message;

  if (role === 'system') {
    return (
      <Box paddingX={2}>
        <Text color="yellow">{content}</Text>
      </Box>
    );
  }

  if (role === 'tool') {
    return (
      <Box paddingX={2}>
        <Text color="gray">  tool </Text>
        <Text color="cyan">{toolName || 'unknown'}</Text>
        <Text color="gray"> {content.length > 80 ? content.slice(0, 80) + '...' : content}</Text>
      </Box>
    );
  }

  if (role === 'user') {
    return (
      <Box paddingX={2}>
        <Text color="blue" bold>You: </Text>
        <Text>{content}</Text>
      </Box>
    );
  }

  // Assistant
  return (
    <Box paddingX={2} flexDirection="column">
      <Box>
        <Text color="green" bold>Aura: </Text>
        {streaming && <Text color="cyan"> </Text>}
      </Box>
      {content ? (
        <Box paddingX={4}>
          <Text>{content}</Text>
        </Box>
      ) : streaming ? (
        <Box paddingX={4}>
          <Text color="cyan">Thinking...</Text>
        </Box>
      ) : null}
    </Box>
  );
}
