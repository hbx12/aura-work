import { Icon } from "./Icon";

interface ProviderBrandIconProps {
  name?: string;
  size?: number;
  className?: string;
}

export function ProviderBrandIcon({ name, size = 18, className }: ProviderBrandIconProps) {
  const common = {
    className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };

  switch (name) {
    case "brand-aura-cloud":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2.7 20.1 7.4v9.2L12 21.3l-8.1-4.7V7.4L12 2.7Zm0 3.1L6.55 8.95v6.1L12 18.2l5.45-3.15v-6.1L12 5.8Z" />
          <path d="M12 8.05 15.4 10v4L12 15.95 8.6 14v-4L12 8.05Z" opacity="0.72" />
          <path d="M6.2 8.8 12 12.1l5.8-3.3v2.35L12 14.45l-5.8-3.3V8.8Z" opacity="0.42" />
        </svg>
      );
    case "brand-openai":
      return (
        <svg {...common} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.4 4.8c1.4-2.1 4.6-2.1 6 0l.55.84 1.02-.05c2.55-.13 4.42 2.5 3.24 4.76l-.48.91.55.84c1.39 2.14-.03 5.01-2.58 5.2l-1.02.08-.48.91c-1.19 2.26-4.36 2.73-5.9.69l-.61-.82-1.02.08c-2.55.19-4.53-2.33-3.47-4.65l.43-.94-.61-.82c-1.54-2.04-.25-4.97 2.29-5.29l1.01-.13.43-.94Z" />
          <path d="M8.6 6.15 12 8.1l3.4-1.95" />
          <path d="M6.1 11.3 9.5 9.35v-3.9" />
          <path d="m8.5 17.9.05-3.95-3.4-1.95" />
          <path d="M15.4 17.85 12 15.9l-3.4 1.95" />
          <path d="M17.9 12.7 14.5 14.65v3.9" />
          <path d="m15.5 6.1-.05 3.95 3.4 1.95" />
          <path d="m9.5 9.35 2.5-1.45 2.5 1.45v2.9L12 13.7l-2.5-1.45Z" />
        </svg>
      );
    case "brand-anthropic":
      return (
        <svg {...common} fill="currentColor">
          <path d="M5.45 18.75 10.15 5.2h2.38l-4.7 13.55H5.45Z" />
          <path d="M14.18 18.75 9.48 5.2h2.38l4.7 13.55h-2.38Z" opacity="0.72" />
          <path d="M8.05 14.1h7.9l.7 2.05h-9.3l.7-2.05Z" />
        </svg>
      );
    case "brand-gemini":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2.8c.86 4.62 4.58 8.34 9.2 9.2-4.62.86-8.34 4.58-9.2 9.2-.86-4.62-4.58-8.34-9.2-9.2 4.62-.86 8.34-4.58 9.2-9.2Z" />
          <path d="M18.3 3.6c.27 1.45 1.45 2.63 2.9 2.9-1.45.27-2.63 1.45-2.9 2.9-.27-1.45-1.45-2.63-2.9-2.9 1.45-.27 2.63-1.45 2.9-2.9Z" opacity="0.68" />
        </svg>
      );
    case "brand-deepseek":
      return (
        <svg {...common} fill="currentColor">
          <path d="M3.35 13.2c1.25-4.45 5.35-7.55 10.25-7.2 4.02.29 7.05 2.89 7.55 6.18.48 3.18-2.02 6.12-6.02 6.75-3.83.61-7.77-.92-9.9-3.78-.44-.59-1.14-.89-1.88-.78-.5.07-.83-.38-.63-.85l.63-1.32Z" />
          <path d="M17.85 6.7c1.13-1.68 2.4-2.47 3.85-2.34-.14 1.58-.98 2.75-2.52 3.5l-1.33-1.16Z" />
          <path d="M7.1 15.55c2.25 1.35 5.18 1.73 7.9 1.04 1.62-.41 2.87-1.23 3.65-2.32-.54 2.1-2.8 3.84-5.66 4.21-2.58.33-5.05-.39-6.83-1.93l.94-1Z" opacity="0.34" />
          <circle cx="14.8" cy="10.35" r="1.05" fill="var(--bg-base, #fff)" />
        </svg>
      );
    case "brand-ollama":
      return (
        <svg {...common} fill="currentColor">
          <path d="M8.15 21V9.2c0-3.35 2.23-6.2 5.18-6.2 2.87 0 5.02 2.48 5.02 5.86V21h-2.52v-5.1h-5.16V21H8.15Z" />
          <path d="M5.65 11.7c-.92-1.15-1.37-2.46-1.35-3.93.02-1.42.5-2.7 1.45-3.83 1.33 1.75 1.9 3.63 1.7 5.63-.1.92-.39 1.63-.88 2.13h-.92Z" />
          <circle cx="12.15" cy="8.7" r=".82" fill="var(--bg-base, #fff)" />
          <circle cx="16.1" cy="8.7" r=".82" fill="var(--bg-base, #fff)" />
        </svg>
      );
    case "brand-minimax":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4 6.2c0-1.2 1.34-1.92 2.34-1.26L12 8.67l5.66-3.73C18.66 4.28 20 5 20 6.2v11.6h-2.7V9.6l-5.3 3.5-5.3-3.5v8.2H4V6.2Z" />
          <path d="M8.45 16.1h7.1v2.45h-7.1V16.1Z" opacity="0.55" />
        </svg>
      );
    case "brand-qwen":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2.9c5.03 0 9.1 4.07 9.1 9.1s-4.07 9.1-9.1 9.1-9.1-4.07-9.1-9.1S6.97 2.9 12 2.9Zm0 2.55A6.55 6.55 0 1 0 12 18.55 6.55 6.55 0 0 0 12 5.45Z" />
          <path d="M13.35 13.15h5.95v2.4h-3.25l2.15 2.15-1.7 1.7-3.15-3.15v-3.1Z" />
        </svg>
      );
    case "brand-lmstudio":
      return (
        <svg {...common} fill="currentColor">
          <path d="M4 5.2C4 4.54 4.54 4 5.2 4h13.6c.66 0 1.2.54 1.2 1.2v9.55c0 .66-.54 1.2-1.2 1.2H5.2c-.66 0-1.2-.54-1.2-1.2V5.2Z" />
          <path d="M8.2 18.05h7.6V20h-7.6v-1.95Z" />
          <path d="M10.75 15.2h2.5v3.4h-2.5v-3.4Z" />
          <path d="M7.15 7.15h4.3v1.9h-2v4.05h-2.3V7.15Z" fill="var(--bg-base, #fff)" />
          <path d="M12.65 7.15h4.2v5.95h-2.25V9.05h-1.95v-1.9Z" fill="var(--bg-base, #fff)" opacity="0.72" />
        </svg>
      );
    case "brand-openai-compatible":
      return <Icon name="braces" size={size} className={className} />;
    default:
      return <Icon name={name ?? "bot"} size={size} className={className} />;
  }
}
