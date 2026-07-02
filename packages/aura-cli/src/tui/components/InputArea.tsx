import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputArea({ value, onChange, onSubmit, disabled, placeholder }: InputAreaProps) {
  return (
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
  );
}
