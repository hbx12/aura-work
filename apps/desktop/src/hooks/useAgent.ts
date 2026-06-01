import { invoke } from "@tauri-apps/api/core";

import { useCallback, useState } from "react";



export interface ChatResult {

  text: string;

  providerId: string;

  modelId: string;

  routingPolicy: string;

  routingReason: string;

  inputTokens?: number | null;

  outputTokens?: number | null;

  estimatedCostUsd?: number | null;

  costUnknown: boolean;

  usageId: string;

  requiresFallbackApproval: boolean;

  fallbackFrom?: string | null;

}



export interface TaskUsageRecord {

  id: string;

  projectId?: string | null;

  providerId: string;

  modelId: string;

  inputTokens?: number | null;

  outputTokens?: number | null;

  estimatedCostUsd?: number | null;

  routingPolicy: string;

  createdAt: string;

}



export interface SidecarStatus {

  running: boolean;

  phase?: number;

  status?: string;

  message?: string;

}



export interface RunChatOptions {

  message: string;

  projectId?: string | null;

  messages?: { role: string; content: string }[];

  preferredProvider?: string | null;

  preferredModel?: string | null;

  fallbackApproved?: boolean;

}



export function useAgent() {

  const [running, setRunning] = useState(false);

  const [lastUsage, setLastUsage] = useState<TaskUsageRecord | null>(null);

  const [sidecar, setSidecar] = useState<SidecarStatus>({ running: false });



  const checkSidecar = useCallback(async () => {

    const status = await invoke<SidecarStatus>("get_sidecar_status");

    setSidecar(status);

    return status;

  }, []);



  const loadLatestUsage = useCallback(async (projectId?: string | null) => {

    const usage = await invoke<TaskUsageRecord | null>("get_latest_usage", {

      projectId: projectId ?? null,

    });

    setLastUsage(usage);

    return usage;

  }, []);



  const runChat = async (options: RunChatOptions): Promise<ChatResult> => {

    setRunning(true);

    try {

      const result = await invoke<ChatResult>("run_chat", {

        input: {

          projectId: options.projectId ?? null,

          message: options.message,

          taskType: "general",

          preferredProvider: options.preferredProvider ?? null,

          preferredModel: options.preferredModel ?? null,

          messages: options.messages ?? null,

          fallbackApproved: options.fallbackApproved ?? false,

        },

      });

      if (!result.requiresFallbackApproval && result.usageId) {

        await loadLatestUsage(options.projectId);

      }

      return result;

    } finally {

      setRunning(false);

    }

  };



  return {

    running,

    lastUsage,

    sidecar,

    checkSidecar,

    loadLatestUsage,

    runChat,

  };

}



export function formatCost(usage: TaskUsageRecord | null): {

  usd: string;

  tok: string;

  model: string;

} {

  if (!usage) return { usd: "$0.00", tok: "0 tok", model: "—" };

  const inTok = usage.inputTokens ?? 0;

  const outTok = usage.outputTokens ?? 0;

  const total = inTok + outTok;

  const usd =

    usage.estimatedCostUsd != null

      ? `$${usage.estimatedCostUsd.toFixed(4)}`

      : total > 0

        ? "cost unknown"

        : "$0.00";

  return {

    usd,

    tok: `${total.toLocaleString()} tok`,

    model: `${usage.providerId}/${usage.modelId}`,

  };

}

