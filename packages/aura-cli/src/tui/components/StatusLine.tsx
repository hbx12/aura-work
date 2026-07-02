import { Box, Text } from 'ink';

interface StatusLineProps {
  messageCount: number;
  streaming: boolean;
  model: string;
  session?: string | null;
  tokens?: { input: number; output: number };
  cost?: number;
}

export function StatusLine({ messageCount, streaming, model, session, tokens, cost }: StatusLineProps) {
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Box>
        <Text color="gray">{messageCount} msgs</Text>
        {session && (
          <>
            <Text color="gray"> • </Text>
            <Text color="gray">{session.slice(0, 12)}</Text>
          </>
        )}
      </Box>
      <Box>
        {streaming && (
          <Text color="cyan"> ⚡ Streaming... </Text>
        )}
        {tokens && (tokens.input > 0 || tokens.output > 0) && (
          <>
            <Text color="gray"> ↑{tokens.input} ↓{tokens.output} </Text>
          </>
        )}
        {cost !== undefined && cost > 0 && (
          <Text color="yellow"> ${cost.toFixed(4)} </Text>
        )}
      </Box>
    </Box>
  );
}
