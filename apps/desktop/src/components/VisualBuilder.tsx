import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Icon } from "@aura-os/ui";

interface VisualBuilderProps {
  isAr?: boolean;
  projectId: string | null;
  onSuccess: (msg: string) => void;
  onCancel: () => void;
}

interface Node {
  id: string;
  type: string;
  x: number;
  y: number;
  title: string;
  config: Record<string, string>;
}

interface Connection {
  fromId: string;
  toId: string;
}

export function VisualBuilder({
  isAr = false,
  projectId,
  onSuccess,
  onCancel,
}: VisualBuilderProps) {
  const [skills, setSkills] = useState<any[]>([]);
  const [activeSkillName, setActiveSkillName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"list" | "editor">("list");
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Load existing visual skills
  const loadSkills = async () => {
    try {
      const list = await invoke<any[]>("list_visual_skills", { projectId });
      setSkills(list);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    void loadSkills();
  }, [projectId]);

  const handleCreateNew = () => {
    setName("");
    setDescription("");
    setNodes([
      { id: "start", type: "start", x: 100, y: 200, title: isAr ? "نقطة البداية (المتغيرات)" : "Start (Arguments)", config: { args: "cityName" } },
      { id: "output", type: "output", x: 700, y: 200, title: isAr ? "المخرجات النهائية" : "Output Result", config: { template: "Workflow completed: {{start.cityName}}" } }
    ]);
    setConnections([{ fromId: "start", toId: "output" }]);
    setSelectedNodeId(null);
    setActiveSkillName(null);
    setActiveTab("editor");
  };

  const handleLoadSkill = (skill: any) => {
    try {
      const graph = JSON.parse(skill.graphJson);
      setName(skill.name);
      setDescription(graph.description || "");
      setNodes(graph.nodes || []);
      setConnections(graph.connections || []);
      setSelectedNodeId(null);
      setActiveSkillName(skill.name);
      setActiveTab("editor");
    } catch (err) {
      setError(isAr ? "فشل قراءة ملف المخطط" : "Failed to parse graph file");
    }
  };

  const handleAddNode = (type: string) => {
    const id = `node_${Date.now()}`;
    let title = "";
    let config: Record<string, string> = {};

    switch (type) {
      case "prompt":
        title = isAr ? "توجيه ذكاء اصطناعي" : "AI Prompt";
        config = { prompt: "Tell me the weather in {{start.cityName}}" };
        break;
      case "read_file":
        title = isAr ? "قراءة ملف" : "Read File";
        config = { path: "package.json" };
        break;
      case "write_file":
        title = isAr ? "كتابة ملف" : "Write File";
        config = { path: "result.txt", content: "AI Output was: {{node_xxx.text}}" };
        break;
      case "command":
        title = isAr ? "أمر طرفية" : "Terminal Command";
        config = { command: "git status" };
        break;
      case "fetch":
        title = isAr ? "جلب ويب" : "Fetch Web Page";
        config = { url: "https://example.com" };
        break;
      case "code":
        title = isAr ? "كود JS مخصص" : "Custom JS Code";
        config = { code: "const val = input.trim();\nreturn val.toUpperCase();" };
        break;
    }

    const newNode: Node = { id, type, x: 350, y: 250, title, config };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    if (id === "start" || id === "output") return;
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest(".port")) return;
    setDraggingNodeId(id);
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setDragOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y,
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : n
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Connection port handlers
  const handlePortClick = (nodeId: string, isOutput: boolean) => {
    if (isOutput) {
      setConnectingFromId(nodeId);
    } else {
      if (connectingFromId && connectingFromId !== nodeId) {
        // Prevent duplicate connections
        const exists = connections.some(
          (c) => c.fromId === connectingFromId && c.toId === nodeId
        );
        if (!exists) {
          setConnections((prev) => [...prev, { fromId: connectingFromId, toId: nodeId }]);
        }
      }
      setConnectingFromId(null);
    }
  };

  const handleRemoveConnection = (fromId: string, toId: string) => {
    setConnections((prev) => prev.filter((c) => !(c.fromId === fromId && c.toId === toId)));
  };

  // Compilation script compiler
  const compileWorkflow = (): string => {
    // Process input arguments list
    const startNode = nodes.find((n) => n.id === "start");
    const argsStr = startNode?.config.args || "";
    const argsList = argsStr.split(",").map((a) => a.trim()).filter(Boolean);
    
    let argsSchema = "";
    let startVars = "";
    argsList.forEach((arg) => {
      argsSchema += `    ${arg}: tool.schema.string().describe("Input ${arg}"),\n`;
      startVars += `      ${arg}: args.${arg},\n`;
    });

    // Node compile loop
    let executionSteps = "";
    
    // Sort nodes roughly by X position as execution fallback order
    const sorted = [...nodes].sort((a, b) => a.x - b.x);

    sorted.forEach((node) => {
      if (node.id === "start" || node.id === "output") return;

      // Find input source nodes
      const incoming = connections.filter((c) => c.toId === node.id);
      const inputSource = incoming[0]?.fromId || "start";

      // Replace variables syntax {{nodeId.property}} to JavaScript template variable
      const replaceVars = (str: string) => {
        return str.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, path) => {
          const parts = path.split(".");
          const refNodeId = parts[0];
          const field = parts[1] || "value";
          return `\${outputs["${refNodeId}"]?.${field} || ""}`;
        });
      };

      if (node.type === "prompt") {
        const rawPrompt = node.config.prompt || "";
        const formattedPrompt = replaceVars(rawPrompt);
        executionSteps += `
    // AI Prompt Node: ${node.title}
    const prompt_${node.id} = \`${formattedPrompt}\`;
    const response_${node.id} = await callLLM(prompt_${node.id}, context);
    outputs["${node.id}"] = { text: response_${node.id}, value: response_${node.id} };
`;
      } else if (node.type === "read_file") {
        const rawPath = node.config.path || "";
        const formattedPath = replaceVars(rawPath);
        executionSteps += `
    // Read File Node: ${node.title}
    try {
      const readPath_${node.id} = path.resolve(context.directory, \`${formattedPath}\`);
      const fileData_${node.id} = await fs.readFile(readPath_${node.id}, "utf-8");
      outputs["${node.id}"] = { content: fileData_${node.id}, value: fileData_${node.id} };
    } catch (err) {
      throw new Error("Failed to read file: " + err.message);
    }
`;
      } else if (node.type === "write_file") {
        const rawPath = node.config.path || "";
        const rawContent = node.config.content || "";
        const formattedPath = replaceVars(rawPath);
        const formattedContent = replaceVars(rawContent);
        executionSteps += `
    // Write File Node: ${node.title}
    try {
      const writePath_${node.id} = path.resolve(context.directory, \`${formattedPath}\`);
      await fs.outputFile(writePath_${node.id}, \`${formattedContent}\`);
      outputs["${node.id}"] = { filePath: writePath_${node.id}, value: "Success" };
    } catch (err) {
      throw new Error("Failed to write file: " + err.message);
    }
`;
      } else if (node.type === "command") {
        const rawCmd = node.config.command || "";
        const formattedCmd = replaceVars(rawCmd);
        executionSteps += `
    // Terminal Command Node: ${node.title}
    try {
      const { execSync } = await import("child_process");
      const cmd_${node.id} = \`${formattedCmd}\`;
      const result_${node.id} = execSync(cmd_${node.id}, { cwd: context.directory }).toString();
      outputs["${node.id}"] = { output: result_${node.id}, value: result_${node.id} };
    } catch (err) {
      throw new Error("Terminal command failed: " + err.message);
    }
`;
      } else if (node.type === "fetch") {
        const rawUrl = node.config.url || "";
        const formattedUrl = replaceVars(rawUrl);
        executionSteps += `
    // Fetch Web Page Node: ${node.title}
    try {
      const res_${node.id} = await axios.get(\`${formattedUrl}\`);
      const data_${node.id} = typeof res_${node.id}.data === "object" ? JSON.stringify(res_${node.id}.data) : String(res_${node.id}.data);
      outputs["${node.id}"] = { content: data_${node.id}, value: data_${node.id} };
    } catch (err) {
      throw new Error("Fetch failed: " + err.message);
    }
`;
      } else if (node.type === "code") {
        const jsCode = node.config.code || "";
        executionSteps += `
    // Custom JS Code Node: ${node.title}
    const input_${node.id} = outputs["${inputSource}"] || {};
    const codeFn_${node.id} = new Function("input", \`${jsCode.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`);
    const val_${node.id} = codeFn_${node.id}(input_${node.id});
    outputs["${node.id}"] = { value: String(val_${node.id}) };
`;
      }
    });

    const outputNode = nodes.find((n) => n.id === "output");
    const rawTemplate = outputNode?.config.template || "";
    const compiledOutput = rawTemplate.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, path) => {
      const parts = path.split(".");
      const refNodeId = parts[0];
      const field = parts[1] || "value";
      return `\${outputs["${refNodeId}"]?.${field} || ""}`;
    });

    return `import { tool } from "@aura-os/plugin";
import axios from "axios";
import fs from "fs-extra";
import path from "path";

export default tool({
  description: "${description.replace(/"/g, '\\"')}",
  args: {
${argsSchema}  },
  execute: async (args, context) => {
    const outputs = {};
    
    // Start arguments
    outputs["start"] = {
${startVars}    };

${executionSteps}
    // Output Result Node
    return \`${compiledOutput}\`;
  }
});

// AI Model Call Helper
async function callLLM(prompt, context) {
  const port = process.env.AURA_AGENT_PORT || 47821;
  const token = process.env.AURA_AGENT_TOKEN;
  try {
    const res = await axios.post(\`http://127.0.0.1:\${port}/chat\`, {
      providerId: "gemini",
      modelId: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }]
    }, {
      headers: { "X-Aura-Agent-Token": token }
    });
    return res.data.content || res.data.message || "";
  } catch (err) {
    throw new Error("AI completion failed: " + err.message);
  }
}
`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(isAr ? "الرجاء كتابة اسم المهارة" : "Please specify skill name");
      return;
    }
    
    const graphJson = JSON.stringify({
      description,
      nodes,
      connections
    }, null, 2);

    const compiledJs = compileWorkflow();

    try {
      setLoading(true);
      await invoke("save_visual_skill", {
        projectId,
        name,
        graphJson,
        compiledJs
      });
      onSuccess(isAr ? `تم حفظ وتفعيل المهارة "${name}" بنجاح!` : `Skill "${name}" saved and activated successfully!`);
      setActiveTab("list");
      void loadSkills();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    if (window.confirm(isAr ? `هل أنت متأكد من حذف المهارة "${skillName}"؟` : `Are you sure you want to delete skill "${skillName}"?`)) {
      try {
        await invoke("delete_visual_skill", { projectId, name: skillName });
        void loadSkills();
      } catch (err) {
        setError(String(err));
      }
    }
  };

  const [loading, setLoading] = useState(false);

  // Render editor SVG lines
  const renderConnections = () => {
    return connections.map((conn, idx) => {
      const fromNode = nodes.find((n) => n.id === conn.fromId);
      const toNode = nodes.find((n) => n.id === conn.toId);
      if (!fromNode || !toNode) return null;

      // Port coords
      const x1 = fromNode.x + 220; // output port center
      const y1 = fromNode.y + 35;  // vertical center
      const x2 = toNode.x;         // input port center
      const y2 = toNode.y + 35;

      const dx = Math.abs(x2 - x1) * 0.5;
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      return (
        <g key={`${conn.fromId}-${conn.toId}-${idx}`}>
          <path
            d={pathData}
            fill="none"
            stroke="var(--accent-glow, #3a6fc4)"
            strokeWidth="3"
            style={{ filter: "drop-shadow(0px 0px 4px rgba(58, 111, 196, 0.4))" }}
          />
          <circle
            cx={(x1 + x2) / 2}
            cy={(y1 + y2) / 2}
            r="8"
            fill="var(--accent-glow, #3a6fc4)"
            className="conn-delete-btn"
            onClick={() => handleRemoveConnection(conn.fromId, conn.toId)}
            style={{ cursor: "pointer" }}
          />
        </g>
      );
    });
  };

  return (
    <div className="tab-pane flex-column" style={{ gap: "20px", height: "100%" }}>
      <div className="panel-header">
        <div className="prov-title">
          <Icon name="code" className="p-icon" />
          <div className="p-name">{isAr ? "بناء المهارات مرئياً" : "Visual Skill Builder"}</div>
        </div>
        {activeTab === "list" ? (
          <button className="btn primary" onClick={handleCreateNew}>
            {isAr ? "إنشاء مهارة جديدة" : "New Skill Graph"}
          </button>
        ) : (
          <div className="flex-row" style={{ gap: "10px" }}>
            <button className="btn primary" onClick={handleSave} disabled={loading}>
              {isAr ? "حفظ وتفعيل" : "Save & Activate"}
            </button>
            <button className="btn secondary" onClick={() => { setActiveTab("list"); onCancel(); }}>
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="status-banner error flex-row" style={{ gap: "10px" }}>
          <Icon name="info" />
          <div>{error}</div>
        </div>
      )}

      {activeTab === "list" ? (
        <div className="panel-body list-view flex-column" style={{ gap: "12px", overflowY: "auto" }}>
          {skills.length === 0 ? (
            <div className="empty-state text-center" style={{ padding: "60px 20px" }}>
              <Icon name="code" style={{ fontSize: "40px", opacity: 0.3 }} />
              <p style={{ marginTop: "12px", color: "var(--text-muted)" }}>
                {isAr ? "لا توجد مهارات مرئية مصممة بعد. اضغط على الزر في الأعلى لبناء أول مهارة!" : "No custom visual skills designed yet. Click New Skill Graph to start!"}
              </p>
            </div>
          ) : (
            skills.map((s, idx) => (
              <div key={idx} className="panel-row flex-row justify-between" style={{ padding: "16px", borderRadius: "8px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "15px" }}>{s.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                    {JSON.parse(s.graphJson).description || (isAr ? "لا يوجد وصف" : "No description")}
                  </div>
                </div>
                <div className="flex-row" style={{ gap: "10px" }}>
                  <button className="btn secondary sm" onClick={() => handleLoadSkill(s)}>
                    {isAr ? "تعديل" : "Edit"}
                  </button>
                  <button className="btn danger sm" onClick={() => handleDeleteSkill(s.name)}>
                    {isAr ? "حذف" : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-row" style={{ flex: 1, minHeight: 0, gap: "20px" }}>
          {/* Main Visual Editor Canvas */}
          <div
            ref={canvasRef}
            className="canvas-editor-area"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            style={{
              flex: 1,
              position: "relative",
              background: "var(--bg-editor, #121214)",
              backgroundImage: "radial-gradient(var(--border) 1px, transparent 0)",
              backgroundSize: "24px 24px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              overflow: "hidden",
              userSelect: "none"
            }}
          >
            {/* SVG connections overlay */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "auto",
              }}
            >
              {renderConnections()}
            </svg>

            {/* Nodes representation */}
            {nodes.map((node) => (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={() => setSelectedNodeId(node.id)}
                style={{
                  position: "absolute",
                  left: node.x,
                  top: node.y,
                  width: "220px",
                  background: "var(--bg-card, #1c1c1f)",
                  border: selectedNodeId === node.id ? "2px solid var(--accent-glow, #3a6fc4)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0px 4px 12px rgba(0,0,0,0.5)",
                  cursor: draggingNodeId === node.id ? "grabbing" : "grab",
                  zIndex: selectedNodeId === node.id ? 10 : 2,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Node Header */}
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "between",
                    fontWeight: 600,
                    fontSize: "13px",
                    color: node.id === "start" || node.id === "output" ? "#ffca28" : "var(--text)",
                  }}
                >
                  <span style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {node.title}
                  </span>
                  {node.id !== "start" && node.id !== "output" && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      style={{ cursor: "pointer", opacity: 0.6, fontSize: "14px" }}
                      title={isAr ? "احذف العقدة" : "Delete Node"}
                    >
                      ×
                    </span>
                  )}
                </div>

                {/* Ports layer */}
                <div
                  style={{
                    padding: "16px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* Input Port (unless Start node) */}
                  {node.id !== "start" && (
                    <div
                      className="port input-port"
                      onClick={() => handlePortClick(node.id, false)}
                      style={{
                        position: "absolute",
                        left: "-8px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: connectingFromId && connectingFromId !== node.id ? "#34a853" : "var(--border)",
                        border: "2px solid var(--bg-card)",
                        cursor: "pointer",
                      }}
                      title={isAr ? "منفذ مدخلات" : "Input Port"}
                    />
                  )}

                  {/* Output Port (unless Output node) */}
                  {node.id !== "output" && (
                    <div
                      className="port output-port"
                      onClick={() => handlePortClick(node.id, true)}
                      style={{
                        position: "absolute",
                        right: "-8px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: connectingFromId === node.id ? "var(--accent-glow, #3a6fc4)" : "var(--border)",
                        border: "2px solid var(--bg-card)",
                        cursor: "pointer",
                      }}
                      title={isAr ? "منفذ مخرجات" : "Output Port"}
                    />
                  )}

                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {node.type === "prompt" && (isAr ? "توليد نص عبر النموذج" : "Generate LLM Text")}
                    {node.type === "code" && (isAr ? "كود جافاسكريبت حر" : "Run Custom Script")}
                    {node.type === "read_file" && (isAr ? "قراءة ملف من المجلد" : "Read relative file")}
                    {node.type === "write_file" && (isAr ? "كتابة ملف بالمجلد" : "Write file")}
                    {node.type === "command" && (isAr ? "تنفيذ أمر نظام" : "Run shell command")}
                    {node.type === "fetch" && (isAr ? "تحميل موقع ويب" : "Scrape website")}
                    {node.id === "start" && (isAr ? "مدخلات استدعاء الأداة" : "Tool Call Args")}
                    {node.id === "output" && (isAr ? "النتيجة المرجعة" : "Result template")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Properties / Control Sidebar */}
          <div
            className="flex-column"
            style={{
              width: "320px",
              background: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              padding: "16px",
              gap: "16px",
              overflowY: "auto"
            }}
          >
            <div>
              <label className="form-label">{isAr ? "اسم المهارة بالإنجليزية" : "Skill Technical Name"}</label>
              <input
                type="text"
                className="form-input"
                placeholder="my_visual_skill"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={activeSkillName !== null}
              />
            </div>
            <div>
              <label className="form-label">{isAr ? "وصف المهارة" : "Description"}</label>
              <textarea
                className="form-input"
                style={{ height: "60px", resize: "none" }}
                placeholder="Explain what this visual skill does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "0" }} />

            {/* Quick Nodes Adder */}
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
                {isAr ? "إضافة عقدة للوحة الرسم" : "Add Node to Canvas"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button className="btn secondary sm" onClick={() => handleAddNode("prompt")}>
                  {isAr ? "+ ذكاء اصطناعي" : "+ AI Prompt"}
                </button>
                <button className="btn secondary sm" onClick={() => handleAddNode("code")}>
                  {isAr ? "+ كود مخصص" : "+ JS Code"}
                </button>
                <button className="btn secondary sm" onClick={() => handleAddNode("read_file")}>
                  {isAr ? "+ قراءة ملف" : "+ Read File"}
                </button>
                <button className="btn secondary sm" onClick={() => handleAddNode("write_file")}>
                  {isAr ? "+ كتابة ملف" : "+ Write File"}
                </button>
                <button className="btn secondary sm" onClick={() => handleAddNode("command")}>
                  {isAr ? "+ تشغيل أمر" : "+ Command"}
                </button>
                <button className="btn secondary sm" onClick={() => handleAddNode("fetch")}>
                  {isAr ? "+ جلب ويب" : "+ Fetch Web"}
                </button>
              </div>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "0" }} />

            {/* Active Node Editor Settings */}
            {selectedNodeId ? (
              <div className="flex-column" style={{ gap: "12px" }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--accent-glow, #3a6fc4)" }}>
                  {isAr ? `تعديل خيارات: ${nodes.find(n => n.id === selectedNodeId)?.title}` : `Configuring: ${nodes.find(n => n.id === selectedNodeId)?.title}`}
                </div>

                {/* Start Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "start" && (
                  <div>
                    <label className="form-label">{isAr ? "وسيطات المدخلات (مفصولة بفواصل)" : "Arguments (comma-separated)"}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nodes.find(n => n.id === selectedNodeId)?.config.args || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, args: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* Prompt Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "prompt" && (
                  <div>
                    <label className="form-label">{isAr ? "نص التوجيه (Prompt)" : "Prompt Content"}</label>
                    <textarea
                      className="form-input"
                      style={{ height: "120px" }}
                      value={nodes.find(n => n.id === selectedNodeId)?.config.prompt || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, prompt: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* File Nodes configuration */}
                {(nodes.find(n => n.id === selectedNodeId)?.type === "read_file" ||
                  nodes.find(n => n.id === selectedNodeId)?.type === "write_file") && (
                  <div className="flex-column" style={{ gap: "10px" }}>
                    <div>
                      <label className="form-label">{isAr ? "مسار الملف النسبي" : "Relative File Path"}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={nodes.find(n => n.id === selectedNodeId)?.config.path || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNodeId
                                ? { ...n, config: { ...n.config, path: val } }
                                : n
                            )
                          );
                        }}
                      />
                    </div>
                    {nodes.find(n => n.id === selectedNodeId)?.type === "write_file" && (
                      <div>
                        <label className="form-label">{isAr ? "محتوى الملف المراد كتابته" : "Content to Write"}</label>
                        <textarea
                          className="form-input"
                          style={{ height: "90px" }}
                          value={nodes.find(n => n.id === selectedNodeId)?.config.content || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === selectedNodeId
                                  ? { ...n, config: { ...n.config, content: val } }
                                  : n
                              )
                            );
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Command Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "command" && (
                  <div>
                    <label className="form-label">{isAr ? "أمر سطر الأوامر" : "Shell Command"}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nodes.find(n => n.id === selectedNodeId)?.config.command || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, command: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* Fetch Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "fetch" && (
                  <div>
                    <label className="form-label">{isAr ? "رابط الويب (URL)" : "Web Page URL"}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={nodes.find(n => n.id === selectedNodeId)?.config.url || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, url: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* Code Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "code" && (
                  <div>
                    <label className="form-label">{isAr ? "كود JavaScript (يرجع قيمة)" : "JS Code (return value)"}</label>
                    <textarea
                      className="form-input"
                      style={{ height: "180px", fontFamily: "monospace", fontSize: "12px", direction: "ltr" }}
                      value={nodes.find(n => n.id === selectedNodeId)?.config.code || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, code: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                {/* Output Node configuration */}
                {nodes.find(n => n.id === selectedNodeId)?.type === "output" && (
                  <div>
                    <label className="form-label">{isAr ? "قالب النتيجة النهائية" : "Output Template"}</label>
                    <textarea
                      className="form-input"
                      style={{ height: "100px" }}
                      value={nodes.find(n => n.id === selectedNodeId)?.config.template || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNodeId
                              ? { ...n, config: { ...n.config, template: val } }
                              : n
                          )
                        );
                      }}
                    />
                  </div>
                )}

                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {isAr ? "ملاحظة: يمكنك الإشارة لنتائج العقد الأخرى باستخدام {{node_id.value}}" : "Tip: Reference other nodes output using {{node_id.value}}"}
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0" }}>
                {isAr ? "اضغط على أي عقدة لتعديل خياراتها التفصيلية" : "Select any node on the canvas to configure it"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
