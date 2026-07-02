import { Box, Text } from 'ink';

interface StatusBarProps {
  projectName: string;
  model: string;
  agent: string;
  mode: string;
  sessionId?: string;
}

export function StatusBar({ projectName, model, agent, mode, sessionId }: StatusBarProps) {
  const shortSession = sessionId ? sessionId.replace('session-', '').slice(0, 8) : null;

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} justifyContent="space-between" width="100%">
      <Box>
        <Text bold color="cyan"> Aura Work </Text>
        <Text color="gray"> </Text>
        <Text color="white">{projectName}</Text>
      </Box>
      <Box>
        <Text color="gray">model: </Text>
        <Text color={model === 'not set' ? 'yellow' : 'green'}>{model}</Text>
        <Text color="gray"> </Text>
        <Text color="gray">agent: </Text>
        <Text color="white">{agent}</Text>
        <Text color="gray"> </Text>
        <Text color="gray">mode: </Text>
        <Text color="white">{mode}</Text>
        {shortSession && (
          <>
            <Text color="gray"> </Text>
            <Text color="gray">session: </Text>
            <Text color="gray">{shortSession}</Text>
          </>
        )}
      </Box>
    </Box>
  );
}
