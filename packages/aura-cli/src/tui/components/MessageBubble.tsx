import { Box, Text } from 'ink';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface MessageBubbleProps {
  message: Message;
  selected?: boolean;
}

export function MessageBubble({ message, selected }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const borderColor = isUser ? 'blue' : isSystem ? 'yellow' : 'green';
  const roleLabel = isUser ? 'You' : isSystem ? 'System' : 'Aura';
  const roleColor = isUser ? 'blue' : isSystem ? 'yellow' : 'green';

  // Extract text content
  let displayContent = message.content;
  if (!displayContent && message.parts) {
    displayContent = message.parts
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text)
      .join('\n');
  }

  return (
    <Box
      flexDirection="column"
      marginY={1}
      borderStyle="round"
      borderColor={selected ? 'cyan' : borderColor}
      paddingX={1}
    >
      <Box>
        <Text bold color={roleColor}>{roleLabel}</Text>
        {message.timestamp && (
          <Text dimColor> {new Date(message.timestamp).toLocaleTimeString()}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text wrap="wrap">{displayContent}</Text>
      </Box>
    </Box>
  );
}
