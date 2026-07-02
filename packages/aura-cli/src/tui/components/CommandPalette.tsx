import { Box, Text } from 'ink';
import { getCommandSuggestions } from '../../commands/slash/index.js';

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const allCommands = getCommandSuggestions('/');

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>Available Commands</Text>
      <Text> </Text>
      {allCommands.map((cmd) => (
        <Box key={cmd.name}>
          <Text color="cyan">  /{cmd.name.padEnd(14)}</Text>
          <Text color="gray">{cmd.description}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text color="gray">  Press Esc to close</Text>
    </Box>
  );
}
