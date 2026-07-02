import { Box, Text } from 'ink';

interface StatusLineProps {
  messageCount: number;
  streaming: boolean;
  model: string;
  session: string | null;
}

export function StatusLine({ messageCount, streaming, model, session }: StatusLineProps) {
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Box>
        <Text color="gray">
          {messageCount} msgs
          {session ? ` • ${session.slice(0, 8)}` : ''}
        </Text>
      </Box>
      <Box>
        {streaming && <Text color="yellow">⟳ streaming </Text>}
        <Text color="gray">Ctrl+C exit • /help commands</Text>
      </Box>
    </Box>
  );
}
