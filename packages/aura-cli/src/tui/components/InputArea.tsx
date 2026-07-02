import { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';
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
  const [cursorPos, setCursorPos] = useState(value.length);
  const { isRawModeSupported } = useStdin();

  useEffect(() => {
    if (value.startsWith('/')) {
      const matches = getCommandSuggestions(value);
      setSuggestions(matches.slice(0, 6));
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  useEffect(() => {
    setCursorPos(value.length);
  }, [value]);

  useInput((inputChar, key) => {
    if (disabled) return;

    // Tab - select suggestion
    if (key.tab && suggestions.length > 0) {
      const selected = suggestions[selectedIndex];
      if (selected) {
        onChange(`/${selected.name} `);
        setSuggestions([]);
      }
      return;
    }

    // Up/Down arrows - navigate suggestions
    if (key.upArrow && suggestions.length > 0) {
      setSelectedIndex(i => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow && suggestions.length > 0) {
      setSelectedIndex(i => Math.min(suggestions.length - 1, i + 1));
      return;
    }

    // Enter - submit
    if (key.return) {
      if (suggestions.length > 0 && value.startsWith('/')) {
        const selected = suggestions[selectedIndex];
        if (selected) {
          onChange(`/${selected.name} `);
          setSuggestions([]);
          return;
        }
      }
      onSubmit(value);
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(cursorPos - 1);
      }
      return;
    }

    // Left/Right arrows - move cursor
    if (key.leftArrow) {
      setCursorPos(Math.max(0, cursorPos - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos(Math.min(value.length, cursorPos + 1));
      return;
    }

    // Home
    if (key.home) {
      setCursorPos(0);
      return;
    }

    // End
    if (key.end) {
      setCursorPos(value.length);
      return;
    }

    // Regular character input
    if (inputChar && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPos) + inputChar + value.slice(cursorPos);
      onChange(newValue);
      setCursorPos(cursorPos + 1);
    }
  });

  const beforeCursor = value.slice(0, cursorPos);
  const atCursor = value[cursorPos] || ' ';
  const afterCursor = value.slice(cursorPos + 1);

  return (
    <Box flexDirection="column">
      {suggestions.length > 0 && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
          marginBottom={0}
        >
          {suggestions.map((cmd, i) => (
            <Text key={cmd.name} color={i === selectedIndex ? 'green' : 'gray'} bold={i === selectedIndex}>
              {i === selectedIndex ? '▸ ' : '  '}/{cmd.name.padEnd(12)} <Text dimColor>{cmd.description}</Text>
            </Text>
          ))}
          <Text dimColor>  Tab select • ↑↓ navigate • Esc dismiss</Text>
        </Box>
      )}
      <Box
        flexDirection="row"
        paddingX={1}
        borderStyle="round"
        borderColor={disabled ? 'gray' : 'cyan'}
      >
        <Text color="cyan" bold>{'> '}</Text>
        {value.length === 0 && !disabled ? (
          <Text dimColor>{placeholder || 'Type a message...'}</Text>
        ) : (
          <Text>
            <Text>{beforeCursor}</Text>
            <Text inverse>{atCursor}</Text>
            <Text>{afterCursor}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}


