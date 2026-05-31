import type {
  ChatMessage,
  ChatUsage,
  ModelInfo,
  ProviderId,
} from "@aura-os/shared";

export interface ProviderCredentials {
  apiKey?: string | null;
  baseUrl?: string | null;
  authMode?: string | null;
  accountId?: string | null;
  refreshToken?: string | null;
}

export interface ProviderConfigRow {
  providerId: ProviderId;
  enabled: boolean;
  baseUrl?: string | null;
  defaultModel?: string | null;
  manualModel?: string | null;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  onChunk?: (text: string) => void;
}

export type ChatEvent =
  | { type: "text-delta"; delta: string }
  | { type: "done"; usage: ChatUsage; text: string };

export interface CredentialStatus {
  valid: boolean;
  message?: string;
}

export interface ProviderAdapter {
  id: ProviderId;
  listModels(credentials: ProviderCredentials): Promise<ModelInfo[]>;
  validateCredentials(credentials: ProviderCredentials): Promise<CredentialStatus>;
  chat(
    request: ChatRequest,
    credentials: ProviderCredentials,
  ): Promise<{ text: string; usage: ChatUsage }>;
}

export interface PricingRow {
  providerId: string;
  modelId: string;
  displayName?: string | null;
  inputPerMillion?: number | null;
  outputPerMillion?: number | null;
}

export interface RouteRequestBody {
  policy: string;
  context: {
    taskType: string;
    sensitivity: string;
    allowedProviders: ProviderId[];
    userPreferredModel?: string | null;
    failedProvider?: ProviderId | null;
  };
  pricing: PricingRow[];
  configs: ProviderConfigRow[];
}

export interface RouteResponseBody {
  providerId: ProviderId;
  modelId: string;
  reason: string;
  requiresApproval?: boolean;
  fallbackFrom?: ProviderId | null;
}

export interface ValidateRequestBody {
  providerId: ProviderId;
  credentials: ProviderCredentials;
}

export interface ChatRequestBody {
  providerId: ProviderId;
  modelId: string;
  messages: ChatMessage[];
  credentials: ProviderCredentials;
}

export interface ChatResponseBody {
  text: string;
  usage: ChatUsage;
}
