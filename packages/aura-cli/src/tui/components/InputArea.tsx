import { useState, useEffect } from 'react';
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
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (value.startsWith('/') && value.length > 0) {
      const matches = getCommandSuggestions(value);
      setSuggestions(matches.slice(0, 8));
      setSelectedIndex(0);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  useEffect(() => {
    setCursorPos(value.length);
  }, [value]);

  useInput((inputChar, key) => {
    if (disabled) return;

    // Ctrl shortcuts
    if (key.ctrl) {
      if (inputChar === 'a') { setCursorPos(0); return; }
      if (inputChar === 'e') { setCursorPos(value.length); return; }
      if (inputChar === 'u') { onChange(''); setCursorPos(0); return; }
      if (inputChar === 'k') { onChange(value.slice(0, cursorPos)); return; }
      if (inputChar === 'w') {
        const before = value.slice(0, cursorPos);
        const lastSpace = before.lastIndexOf(' ');
        const newValue = value.slice(0, Math.max(0, lastSpace)) + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(Math.max(0, lastSpace));
        return;
      }
      return;
    }

    // Tab - select suggestion
    if (key.tab && suggestions.length > 0 && showSuggestions) {
      const selected = suggestions[selectedIndex];
      if (selected) {
        onChange(`/${selected.name} `);
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    // Up/Down arrows - navigate suggestions or history
    if (key.upArrow) {
      if (suggestions.length > 0 && showSuggestions) {
        setSelectedIndex(i => Math.max(0, i - 1));
      }
      return;
    }
    if (key.downArrow) {
      if (suggestions.length > 0 && showSuggestions) {
        setSelectedIndex(i => Math.min(suggestions.length - 1, i + 1));
      }
      return;
    }

    // Escape - dismiss suggestions
    if (key.escape) {
      if (suggestions.length > 0 && showSuggestions) {
        setShowSuggestions(false);
      }
      return;
    }

    // Enter - submit
    if (key.return) {
      if (suggestions.length > 0 && showSuggestions && value.startsWith('/')) {
        const selected = suggestions[selectedIndex];
        if (selected) {
          onChange(`/${selected.name} `);
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
      }
      if (value.trim()) {
        onSubmit(value);
      }
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
      {suggestions.length > 0 && showSuggestions && (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
          marginBottom={0}
        >
          {suggestions.map((cmd, i) => (
            <Box key={cmd.name} flexDirection="row">
              <Text color={i === selectedIndex ? 'green' : 'gray'} bold={i === selectedIndex}>
                {i === selectedIndex ? ' ▸ ' : '   '}
              </Text>
              <Text color={i === selectedIndex ? 'green' : 'gray'} bold={i === selectedIndex}>
                /{cmd.name.padEnd(14)}
              </Text>
              <Text dimColor>{cmd.description}</Text>
            </Box>
          ))}
          <Box marginTop={0}>
            <Text dimColor>  Tab select • ↑↓ navigate • Esc dismiss</Text>
          </Box>
        </Box>
      )}
      <Box
        flexDirection="row"
        paddingX={1}
        borderStyle="round"
        borderColor={disabled ? 'gray' : 'cyan'}
      >
        <Text color="cyan" bold>{'❯ '}</Text>
        {value.length === 0 && !disabled ? (
          <Text dimColor>{placeholder || 'Type a message or / for commands...'}</Text>
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
