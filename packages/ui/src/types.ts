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
  | "settings";

export type ThemeMode = "light" | "dark";

export type PermissionMode = "ask-first" | "act-without-asking";

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
  state: "running" | "done" | "wait" | "block" | "paused" | "draft";
  time: string;
  projectId: string;
}
