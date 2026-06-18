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
  const shell = document.createElement("div");
  shell.style.cssText = "padding:2rem;font-family:system-ui,sans-serif;max-width:40rem;line-height:1.5;color:#3d3832;background:#faf9f5;min-height:100vh";
  const title = document.createElement("h1");
  title.textContent = "Aura Work failed to start";
  title.style.marginTop = "0";
  const body = document.createElement("p");
  body.textContent = message;
  const commands = document.createElement("pre");
  commands.textContent = "npm install\nnpm run build:sidecars\nnpm run sidecar\nnpm run dev";
  commands.style.cssText = "background:#efece2;padding:1rem;border-radius:8px;overflow:auto";
  shell.append(title, body, commands);
  el.replaceChildren(shell);
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
