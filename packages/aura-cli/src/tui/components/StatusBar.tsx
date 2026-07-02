import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface StatusBarProps {
  session?: { id: string; name?: string } | null;
  model?: string;
  streaming: boolean;
  messageCount: number;
}

export function StatusBar({ session, model, streaming, messageCount }: StatusBarProps) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor="cyan"
    >
      <Box flexDirection="row">
        <Text bold color="cyan"> Aura Work</Text>
        {session && (
          <Text dimColor> | {session.name || session.id.slice(0, 8)}</Text>
        )}
      </Box>

      <Box flexDirection="row">
        {streaming && (
          <Box marginRight={1}>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
          </Box>
        )}
        <Text dimColor>{messageCount} msgs</Text>
        {model && <Text dimColor> | {model}</Text>}
      </Box>
    </Box>
  );
}
