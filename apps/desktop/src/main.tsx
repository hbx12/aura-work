import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./AppErrorBoundary";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Missing #root element");
}

function showBootError(message: string) {
  const el = document.getElementById("root");
  if (!el) return;
  el.innerHTML = `<div style="padding:2rem;font-family:system-ui,sans-serif;max-width:40rem;line-height:1.5;color:#3d3832;background:#faf9f5;min-height:100vh">
    <h1 style="margin-top:0">Aura Work failed to start</h1>
    <p>${message}</p>
    <pre style="background:#efece2;padding:1rem;border-radius:8px;overflow:auto">npm install
npm run build:sidecars
npm run sidecar
npm run dev</pre>
  </div>`;
}

try {
  document.getElementById("boot-loader")?.remove();
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>,
  );
} catch (err) {
  showBootError(String(err));
}
