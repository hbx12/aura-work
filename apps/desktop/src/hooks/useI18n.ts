import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTranslator,
  detectBrowserLocale,
  isRtlLocale,
  normalizeLocaleTag,
  SUPPORTED_LOCALES,
  type LocaleId,
} from "@aura-os/i18n";

export interface AppLocaleSettings {
  locale: string;
  useSystemLocale: boolean;
  rtl: boolean;
  systemLocale: string;
}

export interface LocaleInfo {
  id: string;
  label: string;
  rtl: boolean;
}

export interface PackagingInfo {
  appVersion: string;
  bundleVersion: string;
  nodeRuntimeBundled: boolean;
  nodeMinVersion: string;
  vmImage: {
    ok: boolean;
    imageId: string;
    version: string;
    expectedSha256: string;
    actualSha256?: string;
    signaturePresent: boolean;
    message: string;
  };
  sidecarCount: number;
  manifestPath?: string;
}

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  message: string;
  verification: string;
}

export interface UpdateInstallResult {
  installed: boolean;
  version?: string;
  message: string;
}

export function useI18n() {
  const [settings, setSettings] = useState<AppLocaleSettings | null>(null);
  const [locales, setLocales] = useState<LocaleInfo[]>([]);

  const refresh = useCallback(async () => {
    const [s, list] = await Promise.all([
      invoke<AppLocaleSettings>("get_app_locale"),
      invoke<LocaleInfo[]>("list_supported_locales"),
    ]);
    setSettings(s);
    setLocales(list);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const locale = (settings?.locale ?? detectBrowserLocale()) as LocaleId;
  const rtl = settings?.rtl ?? isRtlLocale(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
  }, [locale, rtl]);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const setLocale = useCallback(
    async (next: { locale?: string; useSystemLocale?: boolean }) => {
      const s = await invoke<AppLocaleSettings>("set_app_locale", { input: next });
      setSettings(s);
      return s;
    },
    [],
  );

  return {
    locale,
    rtl,
    settings,
    locales,
    supportedLocales: SUPPORTED_LOCALES,
    t,
    setLocale,
    refresh,
    normalizeLocaleTag,
  };
}

export function usePackaging() {
  const [info, setInfo] = useState<PackagingInfo | null>(null);
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);

  const refresh = useCallback(async () => {
    const data = await invoke<PackagingInfo>("get_packaging_info");
    setInfo(data);
    return data;
  }, []);

  const installUpdate = useCallback(async () => {
    setInstalling(true);
    try {
      return await invoke<UpdateInstallResult>("install_update");
    } finally {
      setInstalling(false);
    }
  }, []);

  const checkUpdates = useCallback(
    async (promptForInstall = true) => {
      setLoading(true);
      try {
        const result = await invoke<UpdateCheckResult>("check_for_updates");
        setUpdate(result);

        if (result.available && promptForInstall) {
          const version = result.latestVersion ?? "the latest version";
          const accepted = window.confirm(
            `Aura Work ${version} is available. Download and install this signed update now? Your local data will be preserved.`,
          );

          if (accepted) await installUpdate();
        }

        return result;
      } finally {
        setLoading(false);
      }
    },
    [installUpdate],
  );

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      checkUpdates(true).catch(console.error);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [checkUpdates]);

  return { info, update, loading, installing, refresh, checkUpdates, installUpdate };
}

export function usePendingOpenTask(onOpen: (taskId: string) => void) {
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const taskId = await invoke<string | null>("get_pending_open_task");
        if (!cancelled && taskId) {
          await invoke("clear_pending_open_task");
          onOpen(taskId);
        }
      } catch {
        /* desktop only */
      }
    };
    const id = setInterval(poll, 2000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [onOpen]);
}
