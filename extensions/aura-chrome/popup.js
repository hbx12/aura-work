const BRIDGE_URL = "http://127.0.0.1:47826";

async function bridgeFetch(path, options = {}) {
  const stored = await chrome.storage.local.get(["sessionToken"]);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (stored.sessionToken) {
    headers["X-Aura-Session-Token"] = stored.sessionToken;
  }
  const resp = await fetch(`${BRIDGE_URL}${path}`, { ...options, headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `Bridge error ${resp.status}`);
  return data;
}

const statusEl = document.getElementById("status");
const pairSection = document.getElementById("pair-section");
const taskSection = document.getElementById("task-section");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "status err" : "status";
}

async function loadSession() {
  const stored = await chrome.storage.local.get(["sessionToken", "clientName", "projectId"]);
  if (!stored.sessionToken) return false;
  pairSection.hidden = true;
  taskSection.hidden = false;
  document.getElementById("paired-as").textContent = `Paired as ${stored.clientName ?? "Chrome"}`;
  await loadProjects(stored.projectId);
  return true;
}

async function loadProjects(selectedId) {
  const data = await bridgeFetch("/v1/projects");
  const sel = document.getElementById("project");
  sel.replaceChildren();
  for (const p of data.projects ?? []) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

document.getElementById("pair-btn").addEventListener("click", async () => {
  try {
    setStatus("Pairing…");
    const code = document.getElementById("pair-code").value.trim();
    const name = document.getElementById("client-name").value.trim() || "Chrome";
    const result = await bridgeFetch("/v1/pair/claim", {
      method: "POST",
      body: JSON.stringify({
        code,
        name,
        clientType: "chrome-extension",
      }),
    });
    await chrome.storage.local.set({
      sessionToken: result.sessionToken,
      clientName: name,
      projectId: result.projectId ?? null,
    });
    setStatus("Paired!");
    await loadSession();
  } catch (e) {
    setStatus(e.message, true);
  }
});

async function extractPage(tabId) {
  const resp = await chrome.tabs.sendMessage(tabId, { type: "extract-page" });
  if (!resp?.ok) throw new Error(resp?.error ?? "Could not read page");
  return resp;
}

async function waitForApproval(permissionId) {
  for (let i = 0; i < 120; i++) {
    const st = await bridgeFetch(`/v1/chrome/page-read/status/${permissionId}`);
    if (st.denied) throw new Error("Page read denied in Aura desktop.");
    if (st.approved) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timed out waiting for page read approval.");
}

document.getElementById("run-btn").addEventListener("click", async () => {
  try {
    setStatus("Sending…");
    const projectId = document.getElementById("project").value;
    const prompt = document.getElementById("prompt").value.trim();
    if (!prompt) throw new Error("Enter a prompt.");
    await chrome.storage.local.set({ projectId });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let pageUrl;
    let pageTitle;
    let pageContent;

    if (document.getElementById("include-page").checked && tab?.id) {
      const page = await extractPage(tab.id);
      pageUrl = page.url;
      pageTitle = page.title;
      const req = await bridgeFetch("/v1/chrome/page-read/request", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          pageUrl: page.url,
          pageTitle: page.title,
        }),
      });
      setStatus("Waiting for approval in Aura desktop…");
      await waitForApproval(req.permissionId);
      await bridgeFetch("/v1/chrome/page-read/submit", {
        method: "POST",
        body: JSON.stringify({
          permissionId: req.permissionId,
          content: page.content,
        }),
      });
      pageContent = page.content;
      setStatus("Page approved — creating task…");
    }

    const result = await bridgeFetch("/v1/task/create", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        prompt,
        source: "chrome-extension",
        pageUrl,
        pageTitle,
        pageContent,
        autoStart: true,
      }),
    });
    setStatus(`Task started: ${result.task?.title ?? result.task?.id ?? "ok"}`);
  } catch (e) {
    setStatus(e.message, true);
  }
});

loadSession().catch(() => {});
