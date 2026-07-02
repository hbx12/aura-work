import { Box, Text } from 'ink';

interface FooterBarProps {
  streaming: boolean;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  messageCount: number;
}

export function FooterBar({ streaming, inputTokens, outputTokens, cost, messageCount }: FooterBarProps) {
  const hasUsage = (inputTokens && inputTokens > 0) || (outputTokens && outputTokens > 0);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between" width="100%">
      <Box>
        {streaming ? (
          <Text color="cyan"> streaming...</Text>
        ) : (
          <Text color="gray"> ready</Text>
        )}
      </Box>
      <Box>
        {hasUsage && (
          <>
            <Text color="gray"> in {inputTokens} </Text>
            <Text color="gray"> out {outputTokens} </Text>
          </>
        )}
        {cost !== undefined && cost > 0 && (
          <Text color="yellow"> cost ${cost.toFixed(4)} </Text>
        )}
        <Text color="gray"> ctrl+c to exit</Text>
      </Box>
    </Box>
  );
}
