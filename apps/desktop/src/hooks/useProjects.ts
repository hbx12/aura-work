import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@aura-os/ui";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await invoke<Project[]>("list_projects");
      setProjects(list);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createProject = async (name: string, folderPath: string, instructions?: string) => {
    const project = await invoke<Project>("create_project", {
      input: { name, folderPath, instructions: instructions || null },
    });
    await refresh();
    return project;
  };

  const pickFolder = async () => {
    return invoke<string | null>("pick_folder");
  };

  const deleteProject = async (id: string) => {
    await invoke("delete_project", { id });
    await refresh();
  };

  return { projects, loading, error, refresh, createProject, pickFolder, deleteProject };
}
