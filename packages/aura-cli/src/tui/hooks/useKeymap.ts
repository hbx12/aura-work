import { useInput } from 'ink';

interface KeymapHandlers {
  onExit?: () => void;
  onToggleInfo?: () => void;
  onClear?: () => void;
  onHelp?: () => void;
}

export function useKeymap(handlers: KeymapHandlers) {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      handlers.onExit?.();
    }
    if (key.ctrl && input === 'i') {
      handlers.onToggleInfo?.();
    }
    if (key.ctrl && input === 'l') {
      handlers.onClear?.();
    }
    if (key.ctrl && input === 'h') {
      handlers.onHelp?.();
    }
  });
}
