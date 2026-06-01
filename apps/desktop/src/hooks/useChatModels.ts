import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export interface ChatModelOption {
  providerId: string;
  modelId: string;
  label: string;
}

export function parseModelSelection(value: string): {
  preferredProvider: string | null;
  preferredModel: string | null;
} {
  if (!value || value === "auto") {
    return { preferredProvider: null, preferredModel: null };
  }
  const sep = value.indexOf(":");
  if (sep <= 0) return { preferredProvider: null, preferredModel: null };
  return {
    preferredProvider: value.slice(0, sep),
    preferredModel: value.slice(sep + 1),
  };
}

export function modelSelectionValue(providerId: string, modelId: string) {
  return `${providerId}:${modelId}`;
}

export function useChatModels(refreshKey = 0) {
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await invoke<ChatModelOption[]>("list_chat_models");
      setModels(list);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return { models, loading, refresh };
}
