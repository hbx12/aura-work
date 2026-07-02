import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getCommandSuggestions, type SlashCommand } from '../../commands/slash/index.js';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputArea({ value, onChange, onSubmit, disabled, placeholder }: InputAreaProps) {
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (value.startsWith('/')) {
      const matches = getCommandSuggestions(value);
      setSuggestions(matches.slice(0, 6));
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  return (
    <Box flexDirection="column">
      {suggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginBottom={0}
        >
          {suggestions.map((cmd, i) => (
            <Text key={cmd.name} color={i === selectedIndex ? 'green' : 'gray'}>
              {i === selectedIndex ? '▸ ' : '  '}/{cmd.name.padEnd(12)} {cmd.description}
            </Text>
          ))}
          <Text dimColor>  Tab to select • ↑↓ to navigate</Text>
        </Box>
      )}
      <Box
        flexDirection="row"
        paddingX={1}
        borderStyle="single"
        borderColor={disabled ? 'gray' : 'green'}
      >
        <Text color="green" bold>{'>'} </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          focus={!disabled}
        />
      </Box>
    </Box>
  );
}
