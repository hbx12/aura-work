import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getCommandSuggestions, type SlashCommand } from '../../commands/slash/index.js';

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBox({ value, onChange, onSubmit, disabled, placeholder }: InputBoxProps) {
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(value.length);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (value.startsWith('/') && value.length > 0) {
      const matches = getCommandSuggestions(value);
      setSuggestions(matches.slice(0, 6));
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

    if (key.ctrl) {
      if (inputChar === 'a') { setCursorPos(0); return; }
      if (inputChar === 'e') { setCursorPos(value.length); return; }
      if (inputChar === 'u') { onChange(''); setCursorPos(0); return; }
      return;
    }

    if (key.tab && suggestions.length > 0 && showSuggestions) {
      const selected = suggestions[selectedIndex];
      if (selected) {
        onChange(`/${selected.name} `);
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

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

    if (key.escape) {
      if (suggestions.length > 0 && showSuggestions) {
        setShowSuggestions(false);
      }
      return;
    }

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

    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(cursorPos - 1);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorPos(Math.max(0, cursorPos - 1));
      return;
    }
    if (key.rightArrow) {
      setCursorPos(Math.min(value.length, cursorPos + 1));
      return;
    }

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
        <Box flexDirection="column" paddingX={2}>
          {suggestions.map((cmd, i) => (
            <Box key={cmd.name}>
              <Text color={i === selectedIndex ? 'cyan' : 'gray'}>
                {i === selectedIndex ? ' > ' : '   '}
              </Text>
              <Text color={i === selectedIndex ? 'cyan' : 'gray'} bold={i === selectedIndex}>
                /{cmd.name.padEnd(12)}
              </Text>
              <Text color="gray">{cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}
      <Box paddingX={1}>
        <Text color="cyan" bold>{' > '}</Text>
        {value.length === 0 ? (
          <Text color="gray">{placeholder || 'Type a message or / for commands'}</Text>
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
