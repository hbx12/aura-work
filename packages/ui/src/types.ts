export type AppView =
  | "tasks"
  | "files"
  | "git"
  | "browser"
  | "schedule"
  | "providers"
  | "plugins"
  | "computer"
  | "memory"
  | "audit"
  | "terminal"
  | "settings";

export type ThemeMode = "light" | "dark" | "amoled" | "blue" | "high-contrast" | "cyberpunk" | "forest" | "pastel" | "sunset" | "sepia" | "nord" | "dracula" | "matrix" | "sakura" | "sakura-dark" | "coffee" | "ocean" | "luxury" | "emerald-luxury" | "rose-luxury" | "velvet-luxury" | "bronze-luxury" | "platinum-luxury" | "crimson-luxury" | "sapphire-luxury" | "amethyst-luxury" | "amber-luxury";
export type ThemePreference = ThemeMode | "system";

export type PermissionMode = "read-only" | "ask-first" | "act-without-asking";

export interface Project {
  id: string;
  name: string;
  folderPath: string;
  instructions?: string | null;
  permissionMode: PermissionMode;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  name: string;
  state: "running" | "done" | "wait" | "block" | "paused" | "draft" | "rolled_back";
  time: string;
  projectId: string;
}
