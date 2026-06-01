const BRIDGE_URL = "http://127.0.0.1:47826";

async function bridgeFetch(path, options = {}) {
  const stored = JSON.parse(localStorage.getItem("auraOffice") || "{}");
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

async function getDocumentContext() {
  return Word.run(async (context) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.slice(0, 20000);
  });
}

async function applyDocumentEdit(text) {
  return Word.run(async (context) => {
    const range = context.document.getSelection();
    range.insertText(text, Word.InsertLocation.replace);
    await context.sync();
  });
}

function detectOfficeApp() {
  if (typeof Office !== "undefined" && Office.context?.host) {
    return Office.context.host.toLowerCase();
  }
  return "office-word";
}

function clientTypeForHost(host) {
  if (host.includes("excel")) return "office-excel";
  if (host.includes("powerpoint")) return "office-powerpoint";
  return "office-word";
}

function setStatus(msg, isError) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = isError ? "err" : "";
}

async function loadProjects(selectedId) {
  const data = await bridgeFetch("/v1/projects");
  const sel = document.getElementById("project");
  sel.innerHTML = "";
  for (const p of data.projects ?? []) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  }
}

Office.onReady(async () => {
  const stored = JSON.parse(localStorage.getItem("auraOffice") || "{}");
  if (stored.sessionToken) {
    document.getElementById("pair-section").style.display = "none";
    document.getElementById("task-section").style.display = "block";
    document.getElementById("paired-as").textContent = `Paired as ${stored.clientName ?? "Office"}`;
    await loadProjects(stored.projectId);
  }

  document.getElementById("pair-btn").onclick = async () => {
    try {
      setStatus("Pairing…");
      const code = document.getElementById("pair-code").value.trim();
      const name = document.getElementById("client-name").value.trim() || "Office";
      const host = detectOfficeApp();
      const result = await bridgeFetch("/v1/pair/claim", {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          clientType: clientTypeForHost(host),
        }),
      });
      localStorage.setItem(
        "auraOffice",
        JSON.stringify({
          sessionToken: result.sessionToken,
          clientName: name,
          projectId: result.projectId,
        }),
      );
      document.getElementById("pair-section").style.display = "none";
      document.getElementById("task-section").style.display = "block";
      setStatus("Paired!");
      await loadProjects(result.projectId);
    } catch (e) {
      setStatus(e.message, true);
    }
  };

  document.getElementById("run-btn").onclick = async () => {
    try {
      setStatus("Sending to Aura…");
      const projectId = document.getElementById("project").value;
      const prompt = document.getElementById("prompt").value.trim();
      if (!prompt) throw new Error("Enter a prompt.");
      const host = detectOfficeApp();
      let documentContext = "";
      if (document.getElementById("include-doc").checked) {
        if (host.includes("word")) {
          documentContext = await getDocumentContext();
        } else {
          documentContext = "[Document context extraction for Excel/PowerPoint: use selection in v1 task prompt]";
        }
      }
      const stored = JSON.parse(localStorage.getItem("auraOffice") || "{}");
      stored.projectId = projectId;
      localStorage.setItem("auraOffice", JSON.stringify(stored));

      const result = await bridgeFetch("/v1/task/create", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          prompt,
          source: clientTypeForHost(host),
          officeApp: host,
          documentContext,
          autoStart: true,
        }),
      });
      const summary = result.task?.summary || result.task?.state || "running";
      document.getElementById("result").textContent = `Task: ${result.task?.title}\nState: ${summary}`;
      setStatus("Task delegated to Aura desktop.");
    } catch (e) {
      setStatus(e.message, true);
    }
  };

  document.getElementById("apply-btn").onclick = async () => {
    const text = document.getElementById("result").textContent.trim();
    if (!text) return;
    if (!confirm("Apply this text to the document selection?")) return;
    try {
      await applyDocumentEdit(text);
      setStatus("Applied to selection.");
    } catch (e) {
      setStatus(e.message, true);
    }
  };
});
