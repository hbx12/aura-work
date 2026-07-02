import { Box, Text } from 'ink';
import type { ModelInfo } from '../hooks/useConfig.js';

interface OnboardingPanelProps {
  model: ModelInfo;
}

export function OnboardingPanel({ model }: OnboardingPanelProps) {
  if (model.state === 'configured') return null;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {model.state === 'env_detected' ? (
        <>
          <Text color="green"> API key detected from environment</Text>
          <Text color="gray">   Provider: {model.provider} (from {model.detectedEnvKey})</Text>
          <Text color="gray">   Model: {model.model}</Text>
          <Text> </Text>
          <Text color="cyan">   Tip: Set a default model with /model</Text>
        </>
      ) : (
        <>
          <Text color="yellow"> No model configured</Text>
          <Text> </Text>
          <Text color="white">   Choose a provider to start:</Text>
          <Text> </Text>
          <Text color="cyan">     /model      </Text><Text color="gray">select model</Text>
          <Text color="cyan">     /provider   </Text><Text color="gray">configure provider</Text>
          <Text color="cyan">     /doctor     </Text><Text color="gray">check setup</Text>
          <Text> </Text>
          <Text color="gray">   Tip: set OPENAI_API_KEY, ANTHROPIC_API_KEY, or use Ollama locally.</Text>
        </>
      )}
    </Box>
  );
}
