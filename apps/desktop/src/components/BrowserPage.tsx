import { useState } from "react";
import { Icon } from "@aura-os/ui";
import type { BrowserStatus } from "@aura-os/shared";

interface BrowserPageProps {
  projectName?: string;
  browserStatus: BrowserStatus | null;
  browserLoading?: boolean;
  onStartBrowser: () => Promise<BrowserStatus>;
  onStopBrowser: () => Promise<BrowserStatus>;
  t: (key: string, params?: Record<string, string>) => string;
}

export function BrowserPage({
  projectName,
  browserStatus,
  browserLoading,
  onStartBrowser,
  onStopBrowser,
  t,
}: BrowserPageProps) {
  const [url, setUrl] = useState("https://example.com");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setMessage(t("browser.urlError"));
      return;
    }
    setMessage(null);
    setFrameUrl(trimmed);
  };

  const displayUrl = frameUrl ?? url;
  const schMatch = displayUrl.match(/^(https?:\/\/)(.*)/);

  return (
    <div className="page">
      <div className="page-head">
        <div className="ph-row">
          <div className="htext">
            <h1>{t("browser.title")}</h1>
            <p>
              {projectName
                ? t("browser.subtitleProject", { name: projectName })
                : t("browser.subtitle")}
            </p>
          </div>
          <div className="ph-actions">
            <span className={`statpill${browserStatus?.running ? "" : " warn"}`}>
              {browserStatus?.running && <span className="live" />}
              <Icon name="globe" size={13} />
              {browserStatus?.running ? t("common.running") : t("common.offline")}
            </span>
          </div>
        </div>
      </div>
      <div className="browser">
        <div className="br-toolbar">
          <div className="br-nav">
            <button type="button" className="br-iconbtn" title={t("browser.go")} onClick={navigate}>
              <Icon name="rotate-cw" size={15} />
            </button>
          </div>
          <div className="br-url">
            <Icon name="lock" size={14} />
            <input
              type="url"
              className="u"
              style={{ all: "unset", flex: 1, minWidth: 0 }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigate()}
              placeholder={t("browser.urlPlaceholder")}
            />
            <button type="button" className="btn sm primary" onClick={navigate} disabled={busy}>
              {t("browser.go")}
            </button>
          </div>
          {projectName && (
            <span className="br-profile">
              <span className="pdot" />
              {projectName}
            </span>
          )}
        </div>
        {!browserStatus?.running && (
          <div className="injbar">
            <Icon name="shield" size={15} />
            <span className="t">
              <b>{t("browser.helperOffline")}</b> — {browserStatus?.remediation ?? t("browser.startHelper")}
            </span>
            <button
              type="button"
              className="btn sm primary"
              disabled={browserLoading || browserStatus?.running}
              onClick={async () => {
                setBusy(true);
                try {
                  await onStartBrowser();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("browser.startHelper")}
            </button>
          </div>
        )}
        {message && (
          <div className="injbar">
            <Icon name="alert-triangle" size={15} />
            <span className="t">{message}</span>
          </div>
        )}
        <div className="br-stage">
          <div className="br-viewport">
            {frameUrl ? (
              <iframe
                className="webshot"
                src={frameUrl}
                title={t("browser.frameTitle")}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{ border: "none", width: "100%", height: "100%" }}
              />
            ) : (
              <div className="webshot">
                <div className="ph-stripe" />
                <div className="ph-label">
                  <Icon name="globe" size={26} />
                  <span>{t("browser.placeholder")}</span>
                </div>
              </div>
            )}
          </div>
          <div className="br-side">
            <div>
              <div className="sec-label" style={{ marginBottom: 10 }}>
                {t("browser.helperSection")}
              </div>
              <div className="minilist">
                <div className="mini-row">
                  <Icon name="globe" size={14} />
                  <div>
                    <div className="mt">{browserStatus?.backendLabel ?? t("browser.helperOffline")}</div>
                    <div className="ms">
                      {t("browser.backendInfo", {
                        backend: browserStatus?.backend ?? "none",
                        count: String(browserStatus?.profiles?.length ?? 0),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sidecard">
              <div className="sc-t">{t("browser.webview")}</div>
              <div className="kv">
                <span className="k">URL</span>
                <span className="v">
                  {schMatch ? (
                    <>
                      <span className="sch">{schMatch[1]}</span>
                      {schMatch[2]}
                    </>
                  ) : (
                    displayUrl
                  )}
                </span>
              </div>
            </div>
            <div className="sidecard">
              <div className="sc-t">{t("nav.settings")}</div>
              <div className="panel-actions" style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={browserLoading || browserStatus?.running}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onStartBrowser();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("browser.startHelper")}
                </button>
                <button
                  type="button"
                  className="btn sm"
                  disabled={browserLoading || !browserStatus?.running}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onStopBrowser();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("browser.stopHelper")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
