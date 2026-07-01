import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { MarkdownText } from "../MarkdownText";

export function StreamingMsg({
  who,
  role,
  children,
  agent,
  streaming = false,
  liveText,
}: {
  who: string;
  role?: string;
  children: ReactNode;
  agent?: boolean;
  streaming?: boolean;
  liveText?: string | null;
}) {
  const text = typeof children === "string" ? children : "";
  const [displayed, setDisplayed] = useState(text);
  const prevText = useRef(text);

  useEffect(() => {
    if (!streaming || typeof children !== "string") {
      setDisplayed(text);
      prevText.current = text;
      return;
    }
    if (text === prevText.current) return;
    prevText.current = text;
    setDisplayed("");
    let index = 0;
    const tick = () => {
      index += Math.max(1, Math.ceil(text.length / 48));
      setDisplayed(text.slice(0, index));
      if (index < text.length) {
        window.requestAnimationFrame(tick);
      }
    };
    window.requestAnimationFrame(tick);
  }, [text, streaming, children]);

  const body =
    liveText && streaming
      ? liveText.replace(/```[\s\S]*$/g, "").trim() || liveText.slice(-280)
      : typeof children === "string"
        ? displayed
        : children;

  return (
    <div className={`msg fade${streaming && liveText ? " msg-live" : ""}`}>
      <div className={`av ${agent ? "agent" : "user"}`}>
        {agent ? <Icon name="bot" size={16} /> : "A"}
      </div>
      <div className="mbody">
        <div className="who">
          {who}
          {role && <span className="role">· {role}</span>}
        </div>
        <div className="text">
          {typeof body === "string" ? (
            <>
              <MarkdownText text={body} />
              {streaming && liveText && <span className="stream-cursor">▍</span>}
            </>
          ) : (
            body
          )}
        </div>
      </div>
    </div>
  );
}

export function Msg({
  who,
  role,
  children,
  agent,
}: {
  who: string;
  role?: string;
  children: ReactNode;
  agent?: boolean;
}) {
  return (
    <div className="msg fade">
      <div className={`av ${agent ? "agent" : "user"}`}>
        {agent ? <Icon name="bot" size={16} /> : "A"}
      </div>
      <div className="mbody">
        <div className="who">
          {who}
          {role && <span className="role">· {role}</span>}
        </div>
        <div className="text">
          {typeof children === "string" ? <MarkdownText text={children} /> : children}
        </div>
      </div>
    </div>
  );
}

interface SlashCommand {
  name: string;
  desc: string;
  icon: string;
  prompt: string;
}

const SLASH_COMMANDS_EN: SlashCommand[] = [
  {
    name: "/memory",
    desc: "Summarize and clean up project memory",
    icon: "brain",
    prompt: "Review the current project memories, summarize what has been learned, and clean up any redundant or outdated items.",
  },
  {
    name: "/git",
    desc: "Check git status and summarize modifications",
    icon: "git-commit",
    prompt: "Check git status and diff, summarize all recent code changes in detail, and suggest a clean commit message.",
  },
  {
    name: "/explain",
    desc: "Scan codebase and explain system architecture",
    icon: "file-code",
    prompt: "Scan the project workspace, read key configuration and code files, and write a comprehensive overview of the system's architecture and modules.",
  },
  {
    name: "/todo",
    desc: "Scan for TODO, FIXME, or HACK comments",
    icon: "list-checks",
    prompt: "Scan the codebase files for annotations like TODO, FIXME, or HACK, list them clearly, and organize them into actionable tasks.",
  },
  {
    name: "/test",
    desc: "Run build and test suite checks",
    icon: "terminal",
    prompt: "Run the build command and test suites in this workspace, report the results, and explain any errors found.",
  },
  {
    name: "/clean",
    desc: "Clean temporary build folders and caches",
    icon: "trash",
    prompt: "Search for temporary build files, caches, and dependency directories that can be safely cleaned, and propose a command to remove them.",
  },
  {
    name: "/docs",
    desc: "Propose edits to README and docs",
    icon: "file-text",
    prompt: "Scan the project documentation files (e.g., README.md, docs/) and source code, check for missing or outdated explanations, and propose edits to keep them up to date.",
  },
  {
    name: "/audit",
    desc: "Audit recent high-risk system executions",
    icon: "shield",
    prompt: "List the recent entries from the project's audit log, highlight high-risk actions (like shell executions or plugin calls), and verify their status.",
  },
  {
    name: "/status",
    desc: "Check readiness of all sidecars and VM",
    icon: "database",
    prompt: "Check the status of all sidecars, VM, and browser helper backends, verify database connection, and summarize system readiness.",
  },
  {
    name: "/files",
    desc: "List recent project files and modifications",
    icon: "file",
    prompt: "Scan the project workspace and list all files and folders, highlighting the most important configuration and source files.",
  },
  {
    name: "/search",
    desc: "Search the codebase for specific terms",
    icon: "search",
    prompt: "Scan the codebase files and search for recurring keywords or defined terms to show where they are referenced.",
  },
  {
    name: "/help",
    desc: "Show description of all slash commands",
    icon: "braces",
    prompt: "Provide instructions on the available slash commands, how they work, and what capabilities the agent has.",
  },
  {
    name: "/pet",
    desc: "Spawn a cute interactive pet companion on the screen",
    icon: "sparkles",
    prompt: "/pet ",
  },
];

const SLASH_COMMANDS_AR: SlashCommand[] = [
  {
    name: "/ذاكرة",
    desc: "تلخيص وتنظيف ذاكرة المشروع",
    icon: "brain",
    prompt: "راجع ذاكرة المشروع الحالية، ولخص أهم ما تعلمته، ونظف أي نقاط مكررة أو قديمة.",
  },
  {
    name: "/تعديلات",
    desc: "فحص حالة Git وتلخيص التعديلات",
    icon: "git-commit",
    prompt: "افحص حالة Git والتغييرات الأخيرة (diff)، ولخص جميع تعديلات الكود بالتفصيل، واقترح رسالة commit واضحة.",
  },
  {
    name: "/شرح",
    desc: "شرح بنية المشروع وهيكله البرمجي",
    icon: "file-code",
    prompt: "قم بمسح مساحة عمل المشروع، واقرأ ملفات الإعدادات والكود البرمجي الأساسية، واكتب نظرة شاملة تشرح البنية المعمارية للنظام والملفات.",
  },
  {
    name: "/مهام",
    desc: "البحث عن التعليقات التنبيهية TODO",
    icon: "list-checks",
    prompt: "ابحث في ملفات المشروع عن التعليقات التنبيهية مثل TODO أو FIXME أو HACK، واعرضها بشكل منظم كقائمة مهام قابلة للتنفيذ.",
  },
  {
    name: "/اختبار",
    desc: "تشغيل بناء الكود والاختبارات",
    icon: "terminal",
    prompt: "قم بتشغيل أمر البناء وحزمة الاختبارات في مساحة العمل هذه، واعرض النتائج بالتفصيل، واشرح أي أخطاء تظهر.",
  },
  {
    name: "/تنظيف",
    desc: "تنظيف الملفات المؤقتة والمجلدات الزائدة",
    icon: "trash",
    prompt: "ابحث عن ملفات البناء المؤقتة ومجلدات الكاش والاعتماديات التي يمكن الاستغناء عنها وتأمين تنظيفها، واقترح أمراً لحذفها بأمان.",
  },
  {
    name: "/توثيق",
    desc: "مراجعة وتحسين التوثيق وملف README",
    icon: "file-text",
    prompt: "افحص ملفات التوثيق الحالية (مثل README.md ومجلد docs) واقرأ الكود البرمجي، واقترح تحسينات وتعديلات لإبقائها محدثة.",
  },
  {
    name: "/تدقيق",
    desc: "مراجعة سجل العمليات الحساسة",
    icon: "shield",
    prompt: "اعرض المدخلات الأخيرة في سجل تدقيق المشروع، وسلط الضوء على العمليات عالية التأثير (مثل تشغيل أوامر shell أو أدوات الإضافات) وتحقق من حالتها.",
  },
  {
    name: "/حالة",
    desc: "فحص حالة الخوادم المساعدة والبيئة",
    icon: "database",
    prompt: "تحقق من حالة تشغيل كافة الخوادم المساعدة (sidecars) والبيئة المعزولة ومساعد المتصفح، وافحص اتصال قاعدة البيانات، ولخص مدى جاهزية النظام.",
  },
  {
    name: "/ملفات",
    desc: "عرض قائمة بجميع ملفات المشروع الأخيرة",
    icon: "file",
    prompt: "افحص مجلد المشروع واعرض قائمة بجميع الملفات والمجلدات الموجودة، مع توضيح الملفات الأكثر أهمية وحجمها وتاريخ تعديلها.",
  },
  {
    name: "/بحث",
    desc: "البحث في الكود البرمجي عن مصطلحات معينة",
    icon: "search",
    prompt: "قم بالبحث داخل ملفات المشروع البرمجية عن الكلمات المفتاحية الأكثر تكراراً أو المصطلحات المحددة لتوضيح أين يتم استخدامها.",
  },
  {
    name: "/مساعدة",
    desc: "عرض شرح الأوامر السريعة المتوفرة",
    icon: "braces",
    prompt: "قدم دليلاً إرشادياً يشرح الأوامر السريعة المتاحة (slash commands)، وكيفية عملها، والقدرات التي يمتلكها الوكيل لمساعدة المستخدم.",
  },
  // English fallbacks with Arabic prompt/desc
  {
    name: "/memory",
    desc: "تلخيص وتنظيف ذاكرة المشروع",
    icon: "brain",
    prompt: "راجع ذاكرة المشروع الحالية، ولخص أهم ما تعلمته، ونظف أي نقاط مكررة أو قديمة.",
  },
  {
    name: "/git",
    desc: "فحص حالة Git وتلخيص التعديلات",
    icon: "git-commit",
    prompt: "افحص حالة Git والتغييرات الأخيرة (diff)، ولخص جميع تعديلات الكود بالتفصيل، واقترح رسالة commit واضحة.",
  },
  {
    name: "/explain",
    desc: "شرح بنية المشروع وهيكله البرمجي",
    icon: "file-code",
    prompt: "قم بمسح مساحة عمل المشروع، واقرأ ملفات الإعدادات والكود البرمجي الأساسية، واكتب نظرة شاملة تشرح البنية المعمارية للنظام والملفات.",
  },
  {
    name: "/todo",
    desc: "البحث عن التعليقات التنبيهية TODO",
    icon: "list-checks",
    prompt: "ابحث في ملفات المشروع عن التعليقات التنبيهية مثل TODO أو FIXME أو HACK، واعرضها بشكل منظم كقائمة مهام قابلة للتنفيذ.",
  },
  {
    name: "/test",
    desc: "تشغيل بناء الكود والاختبارات",
    icon: "terminal",
    prompt: "قم بتشغيل أمر البناء وحزمة الاختبارات في مساحة العمل هذه، واعرض النتائج بالتفصيل، واشرح أي أخطاء تظهر.",
  },
  {
    name: "/clean",
    desc: "تنظيف الملفات المؤقتة والمجلدات الزائدة",
    icon: "trash",
    prompt: "ابحث عن ملفات البناء المؤقتة ومجلدات الكاش والاعتماديات التي يمكن الاستغناء عنها وتأمين تنظيفها، واقترح أمراً لحذفها بأمان.",
  },
  {
    name: "/docs",
    desc: "مراجعة وتحسين التوثيق وملف README",
    icon: "file-text",
    prompt: "افحص ملفات التوثيق الحالية (مثل README.md ومجلد docs) واقرأ الكود البرمجي، واقترح تحسينات وتعديلات لإبقائها محدثة.",
  },
  {
    name: "/audit",
    desc: "مراجعة سجل العمليات الحساسة",
    icon: "shield",
    prompt: "اعرض المدخلات الأخيرة في سجل تدقيق المشروع، وسلط الضوء على العمليات عالية التأثير (مثل تشغيل أوامر shell أو أدوات الإضافات) وتحقق من حالتها.",
  },
  {
    name: "/status",
    desc: "فحص حالة الخوادم المساعدة والبيئة",
    icon: "database",
    prompt: "تحقق من حالة تشغيل كافة الخوادم المساعدة (sidecars) والبيئة المعزولة ومساعد المتصفح، وافحص اتصال قاعدة البيانات، ولخص مدى جاهزية النظام.",
  },
  {
    name: "/files",
    desc: "عرض قائمة بجميع ملفات المشروع الأخيرة",
    icon: "file",
    prompt: "افحص مجلد المشروع واعرض قائمة بجميع الملفات والمجلدات الموجودة، مع توضيح الملفات الأكثر أهمية وحجمها وتاريخ تعديلها.",
  },
  {
    name: "/search",
    desc: "البحث في الكود البرمجي عن مصطلحات معينة",
    icon: "search",
    prompt: "قم بالبحث داخل ملفات المشروع البرمجية عن الكلمات المفتاحية الأكثر تكراراً أو المصطلحات المحددة لتوضيح أين يتم استخدامها.",
  },
  {
    name: "/help",
    desc: "عرض شرح الأوامر السريعة المتوفرة",
    icon: "braces",
    prompt: "قدم دليلاً إرشادياً يشرح الأوامر السريعة المتاحة (slash commands)، وكيفية عملها، والقدرات التي يمتلكها الوكيل لمساعدة المستخدم.",
  },
  {
    name: "/pet",
    desc: "استدعاء حيوان أليف لطيف وتفاعلي على الشاشة",
    icon: "sparkles",
    prompt: "/pet ",
  },
  {
    name: "/أليف",
    desc: "استدعاء حيوان أليف لطيف وتفاعلي على الشاشة",
    icon: "sparkles",
    prompt: "/أليف ",
  },
];

export function Composer({
  value,
  onChange,
  onSend,
  onRunTask,
  mode,
  onToggleMode,
  disabled,
  showRunTask = true,
  models = [],
  selectedModel = "auto",
  onModelChange,
  labels = {
    placeholder: "Ask Aura anything…",
    send: "Send",
    runTask: "Run task",
    startTask: "Start task",
    autoModel: "Auto (routing)",
    modeAsk: "Ask-first",
    modeAct: "Act without asking",
    running: "Thinking…",
  },
  locale,
  skills = [],
  messages = [],
  workspaceFiles = "",
  modelContextWindow = 128000,
  activeAgent = "build",
  onAgentChange,
  agents = [],
  mcpServers = [],
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onRunTask?: () => void;
  mode: "ask" | "act";
  onToggleMode: () => void;
  disabled?: boolean;
  showRunTask?: boolean;
  models?: { providerId: string; modelId: string; label: string }[];
  selectedModel?: string;
  onModelChange?: (v: string) => void;
  labels?: {
    placeholder: string;
    send: string;
    runTask: string;
    startTask?: string;
    autoModel: string;
    modeAsk: string;
    modeAct: string;
    running: string;
  };
  locale?: string;
  skills?: { name: string; prompt: string; description: string }[];
  messages?: { role: string; content: string }[];
  workspaceFiles?: string;
  modelContextWindow?: number;
  activeAgent?: string;
  onAgentChange?: (agent: string) => void;
  agents?: any[];
  mcpServers?: any[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [mentionIdx, setMentionIdx] = useState(0);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(isAr ? "التعرف على الصوت غير مدعوم في هذا المتصفح/النظام." : "Speech recognition is not supported in this browser/environment.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = isAr ? "ar-SA" : "en-US";

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onChange(value ? `${value} ${transcript}` : transcript);
      }
    };

    rec.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      let errMsg = isAr ? `فشل التعرف على الصوت. خطأ: ${event.error}` : `Speech recognition failed. Error: ${event.error}`;
      if (event.error === 'not-allowed') {
        errMsg += isAr ? " (يرجى التحقق من صلاحيات الميكروفون في إعدادات النظام)" : " (please check microphone permissions in system settings)";
      }
      alert(errMsg);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const showCommands = value.startsWith("/") && !value.includes(" ");
  const filterText = value.slice(1).toLowerCase();
  
  const isAr = locale?.startsWith("ar");
  const commandsList = isAr ? SLASH_COMMANDS_AR : SLASH_COMMANDS_EN;

  const AGENT_NAMES: Record<string, { en: string; ar: string }> = {
    build: { en: "Build / Develop", ar: "تطوير / بناء الكود" },
    plan: { en: "Plan / Analyze", ar: "تخطيط / تحليل" },
    general: { en: "General", ar: "الوكيل العام" },
    explore: { en: "Explore", ar: "المستكشف" },
    scout: { en: "Scout", ar: "المستطلع" },
  };

  const getAgentDisplayName = (name: string) => {
    const normalized = name.toLowerCase();
    const found = AGENT_NAMES[normalized];
    if (found) {
      return isAr ? found.ar : found.en;
    }
    return name.toUpperCase();
  };

  const textBeforeCursor = value.slice(0, selectionStart);
  const mentionMatch = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
  const showMentions = !!mentionMatch;
  const mentionQuery = mentionMatch ? mentionMatch[1].toLowerCase() : "";

  interface MentionItem {
    name: string;
    type: "agent" | "mcp";
    label: string;
    desc: string;
    icon: string;
  }

  const mentionItems: MentionItem[] = [];

  const finalAgents = agents.length > 0 ? agents : [
    { name: "build", description: isAr ? "أعمال تطوير كاملة مع تفعيل جميع الأدوات" : "Full development with all tools active" },
    { name: "plan", description: isAr ? "تحليل وتخطيط بدون إجراء تغييرات" : "Planning and analysis without mutation" },
    { name: "general", description: isAr ? "البحث في أسئلة معقدة وتنفيذ مهام" : "General research and implementation" },
    { name: "explore", description: isAr ? "استكشاف قواعد الشفرة وقراءة الملفات فقط" : "Explore codebase and read-only search" },
    { name: "scout", description: isAr ? "البحث في الوثائق الخارجية والتبعيات" : "Search external docs and dependencies" },
  ];

  for (const agent of finalAgents) {
    if (agent.hidden) continue;
    mentionItems.push({
      name: `@${agent.name}`,
      type: "agent",
      label: getAgentDisplayName(agent.name),
      desc: agent.description || "",
      icon: "bot",
    });
  }

  for (const srv of (mcpServers || [])) {
    mentionItems.push({
      name: `@mcp.${srv.name}`,
      type: "mcp",
      label: srv.name,
      desc: srv.enabled ? (isAr ? "خادم MCP مفعل" : "Enabled MCP Server") : (isAr ? "خادم MCP غير مفعل" : "Disabled MCP Server"),
      icon: "zap",
    });
  }

  const filteredMentions = mentionItems.filter((item) =>
    item.name.toLowerCase().includes(mentionQuery) ||
    item.label.toLowerCase().includes(mentionQuery) ||
    item.desc.toLowerCase().includes(mentionQuery)
  );

  const handleSelectMention = (item: MentionItem) => {
    if (!mentionMatch) return;
    const matchedText = mentionMatch[0];
    const startIdx = selectionStart - matchedText.length + (matchedText.startsWith(' ') ? 1 : 0);
    const endIdx = selectionStart;
    const insertText = item.name + " ";
    const newValue = value.slice(0, startIdx) + insertText + value.slice(endIdx);
    onChange(newValue);
    const newCursorPos = startIdx + insertText.length;
    setSelectionStart(newCursorPos);
    setMentionIdx(0);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };
  
  const customSkills = skills.map((s) => ({
    name: `/${s.name.replace(/\s+/g, "_")}`,
    icon: "puzzle",
    desc: s.description,
    prompt: s.prompt,
  }));

  const createSkillCommand = {
    name: isAr ? "/إنشاء_مهارة" : "/create-skill",
    icon: "plus",
    desc: isAr ? "دليل إرشادي لإنشاء مهارة جديدة وحفظها" : "Guide to create and save a new skill",
    prompt: isAr
      ? "اشرح لي خطوة بخطوة كيف يمكنني إنشاء مهارة (Skill) جديدة وحفظها في التطبيق، وما هي البنية المطلوبة لملف aura.plugin.json الخاص بالمهارة."
      : "Explain step-by-step how I can create a new custom Skill and save it in the app, and what is the required structure for the skill's aura.plugin.json.",
  };

  const finalCommands = [...commandsList, ...customSkills, createSkillCommand];

  const filteredCommands = finalCommands.filter((cmd) =>
    cmd.name.startsWith(value) ||
    cmd.name.slice(1).toLowerCase().startsWith(filterText)
  );

  const handleSelectCommand = (cmd: SlashCommand) => {
    onChange(cmd.prompt);
    setActiveIdx(0);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        {showCommands && filteredCommands.length > 0 && (
          <div className="composer-commands">
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.name}
                type="button"
                className={`composer-command-item${i === activeIdx ? " active" : ""}`}
                onClick={() => handleSelectCommand(cmd)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <Icon name={cmd.icon} size={14} />
                <span className="cmd-name">{cmd.name}</span>
                <span className="cmd-desc">{cmd.desc}</span>
              </button>
            ))}
          </div>
        )}
        {showMentions && filteredMentions.length > 0 && (
          <div className="composer-commands">
            {filteredMentions.map((item, i) => (
              <button
                key={item.name}
                type="button"
                className={`composer-command-item${i === mentionIdx ? " active" : ""}`}
                onClick={() => handleSelectMention(item)}
                onMouseEnter={() => setMentionIdx(i)}
              >
                <Icon name={item.icon} size={14} />
                <span className="cmd-name">{item.name}</span>
                <span className="cmd-desc">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder={labels.placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectionStart(e.target.selectionStart);
            setMentionIdx(0);
            setActiveIdx(0);
          }}
          onKeyUp={(e: any) => {
            setSelectionStart(e.target.selectionStart);
          }}
          onClick={(e: any) => {
            setSelectionStart(e.target.selectionStart);
          }}
          onFocus={(e: any) => {
            setSelectionStart(e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (showMentions && filteredMentions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIdx((prev) => (prev + 1) % filteredMentions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIdx((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleSelectMention(filteredMentions[mentionIdx]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                const spaceText = " ";
                const newValue = value.slice(0, selectionStart) + spaceText + value.slice(selectionStart);
                onChange(newValue);
                const newPos = selectionStart + spaceText.length;
                setSelectionStart(newPos);
                setTimeout(() => {
                  textareaRef.current?.setSelectionRange(newPos, newPos);
                }, 10);
              }
            } else if (showCommands && filteredCommands.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((prev) => (prev + 1) % filteredCommands.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleSelectCommand(filteredCommands[activeIdx]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onChange(value + " ");
              }
            } else {
              if (e.key === "Tab" && !value.trim() && onAgentChange && agents.length > 0) {
                e.preventDefault();
                const primaryAgents = agents.filter(a => (a.mode === "primary" || a.mode === "all") && !a.hidden);
                if (primaryAgents.length > 0) {
                  const curIdx = primaryAgents.findIndex(a => a.name === activeAgent);
                  const nextIdx = (curIdx + 1) % primaryAgents.length;
                  onAgentChange(primaryAgents[nextIdx].name);
                }
              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }
          }}
          disabled={disabled}
        />
        <div className="crow">
          {onModelChange && (
            <select
              className="composer-model-select"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled}
              title={labels.autoModel}
            >
              <option value="auto">{labels.autoModel}</option>
              {models.map((m) => (
                <option key={`${m.providerId}:${m.modelId}`} value={`${m.providerId}:${m.modelId}`}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          {onAgentChange && agents.length > 0 && (
            <select
              className="composer-agent-select"
              value={activeAgent}
              onChange={(e) => onAgentChange(e.target.value)}
              disabled={disabled}
              title={isAr ? "الوكيل النشط" : "Active Agent"}
            >
              {agents
                .filter(a => (a.mode === "primary" || a.mode === "all") && !a.hidden)
                .map((a) => (
                  <option key={a.name} value={a.name}>
                    {getAgentDisplayName(a.name)}
                  </option>
                ))}
            </select>
          )}
          <ContextUsageRing
            value={value}
            messages={messages}
            workspaceFiles={workspaceFiles}
            modelContextWindow={modelContextWindow}
          />
          <button type="button" className="chip-btn" onClick={onToggleMode}>
            <Icon name={mode === "ask" ? "shield-check" : "bot"} size={14} />
            {mode === "ask" ? labels.modeAsk : labels.modeAct}
          </button>
          <button
            type="button"
            className="chip-btn"
            onClick={toggleListening}
            title={isAr ? "إملاء صوتي" : "Voice Dictation"}
            style={{
              color: isListening ? "#ef4444" : "var(--fg-3)",
              background: isListening ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.02)",
              border: isListening ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-3)",
              animation: isListening ? "pulse-anim 1.5s infinite" : "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span style={{ fontSize: "11px" }}>
              {isListening ? (isAr ? "استماع..." : "Listening...") : (isAr ? "إملاء" : "Dictate")}
            </span>
          </button>
          <style>{`
            @keyframes pulse-anim {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.75; transform: scale(0.97); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div className="cspacer" />
          {showRunTask && onRunTask && mode === "ask" && (
            <button
              type="button"
              className="btn sm"
              onClick={onRunTask}
              disabled={disabled || !value.trim()}
              title={labels.startTask ?? labels.runTask}
            >
              <Icon name="list-checks" size={14} />
              {labels.startTask ?? labels.runTask}
            </button>
          )}
          <button type="button" className="btn primary sm" onClick={onSend} disabled={disabled || !value.trim()}>
            <Icon name="arrow-up" size={14} />
            {disabled ? labels.running : mode === "act" ? labels.startTask ?? labels.runTask : labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}

const CONTEXT_PANEL_LABELS = {
  sidecar: "Agent sidecar",
  sidecarReady: "Sidecar ready · v1.0.0",
  sidecarOffline: "Sidecar offline",
  linuxWorkspace: "Linux workspace",
  vmRunning: "VM running",
  vmOffline: "VM helper offline",
  browserHelper: "Browser helper",
  browserRunning: "Browser running",
  browserOffline: "Browser helper offline",
  pluginsHelper: "Plugins helper",
  toolsAvailable: "{count} tool(s) available",
  pluginsOffline: "Plugins helper offline",
  auraCloud: "Aura Cloud",
  notSignedIn: "Not signed in",
  syncActive: "E2EE sync active",
  syncOffline: "Sync helper offline",
  syncDisabled: "Sync disabled",
  usage: "Usage",
};

export function ContextPanel({
  cost,
  routingPolicy,
  sidecarRunning,
  vmRunning,
  vmBackend,
  browserRunning,
  browserBackend,
  pluginsRunning,
  pluginsToolCount,
  cloudSyncEnabled,
  cloudSyncRunning,
  cloudSignedIn,
  labels: labelOverrides,
}: {
  cost: { usd: string; tok: string; model: string };
  routingPolicy?: string;
  sidecarRunning?: boolean;
  vmRunning?: boolean;
  vmBackend?: string;
  browserRunning?: boolean;
  browserBackend?: string;
  pluginsRunning?: boolean;
  pluginsToolCount?: number;
  cloudSyncEnabled?: boolean;
  cloudSyncRunning?: boolean;
  cloudSignedIn?: boolean;
  labels?: Partial<typeof CONTEXT_PANEL_LABELS>;
}) {
  const labels = { ...CONTEXT_PANEL_LABELS, ...labelOverrides };
  const toolsAvailable = labels.toolsAvailable.replace(
    "{count}",
    String(pluginsToolCount ?? 0),
  );

  return (
    <div className="ctx">
      <div className="ctx-scroll">
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="cpu" size={13} />
            {labels.sidecar}
          </div>
          <div className="statusline">
            <span className={`pulse${sidecarRunning ? "" : " off"}`} />
            {sidecarRunning ? labels.sidecarReady : labels.sidecarOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="terminal" size={13} />
            {labels.linuxWorkspace}
          </div>
          <div className="statusline">
            <span className={`pulse${vmRunning ? "" : " off"}`} />
            {vmRunning ? (vmBackend ?? labels.vmRunning) : labels.vmOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="globe" size={13} />
            {labels.browserHelper}
          </div>
          <div className="statusline">
            <span className={`pulse${browserRunning ? "" : " off"}`} />
            {browserRunning ? (browserBackend ?? labels.browserRunning) : labels.browserOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="puzzle" size={13} />
            {labels.pluginsHelper}
          </div>
          <div className="statusline">
            <span className={`pulse${pluginsRunning ? "" : " off"}`} />
            {pluginsRunning ? toolsAvailable : labels.pluginsOffline}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="cloud" size={13} />
            {labels.auraCloud}
          </div>
          <div className="statusline">
            <span className={`pulse${cloudSyncRunning ? "" : " off"}`} />
            {!cloudSignedIn
              ? labels.notSignedIn
              : cloudSyncEnabled
                ? cloudSyncRunning
                  ? labels.syncActive
                  : labels.syncOffline
                : labels.syncDisabled}
          </div>
        </div>
        <div className="ctx-section">
          <div className="ctx-label">
            <Icon name="database" size={13} />
            {labels.usage}
          </div>
          <div className="cost-big">{cost.usd}</div>
          <div className="cost-sub">
            {cost.tok} · {cost.model} · {routingPolicy ?? "quality-first"}
          </div>
        </div>
      </div>
    </div>
  );
}

const TASK_WELCOME_LABELS = {
  titlePhase11:
    "Task engine + VM + Browser + Computer Use + Plugins + Cloud + Schedules + Extensions + i18n ready",
  titlePhase10:
    "Task engine + VM + Browser + Computer Use + Plugins + Cloud + Schedules + Extensions ready",
  titlePhase9:
    "Task engine + VM + Browser + Plugins + Cloud + Schedules + Extensions ready",
  titlePhase8: "Task engine + VM + Browser + Plugins + Cloud + Schedules ready",
  titlePhase7: "Task engine + VM + Browser + Plugins + Cloud ready",
  titlePhase6: "Task engine + VM + Browser + Plugins ready",
  titlePhase5: "Task engine + VM + Browser ready",
  titlePhase4: "Task engine + VM ready",
  titlePhase3: "Task engine ready",
  titlePhase2: "Test chat ready",
  titlePhase1: "No tasks yet",
  descPhase11:
    "Describe a task for project {projectName}. Aura plans steps in 20 languages, ships signed installers with bundled Node + VM image verification, exposes a CLI companion via the local bridge, and supports experimental computer use, Chrome/Office extensions, scheduled tasks, E2EE cloud sync, plugins/MCP, web browsing, and isolated shell. API keys never leave this device.",
  descPhase10:
    "Describe a task for project {projectName}. Aura plans steps, can use experimental computer use (per-app desktop approval), connects Chrome and Office via the local bridge, runs scheduled tasks, syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase9:
    "Describe a task for project {projectName}. Aura plans steps, connects Chrome and Office via the local bridge (with per-task page read approval), runs scheduled tasks, syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase8:
    "Describe a task for project {projectName}. Aura plans steps, runs scheduled tasks with pre-approved permission profiles (while the app is open), syncs E2EE via Aura Cloud, uses plugins/MCP, browses the web, and runs shell in an isolated workspace. API keys never leave this device.",
  descPhase7:
    "Describe a task for project {projectName}. Aura plans steps, syncs task history E2EE via Aura Cloud (optional), uses plugins/MCP tools, browses the web with source citations, runs shell in an isolated Linux workspace, and uses file tools. API keys never leave this device.",
  descPhase6:
    "Describe a task for project {projectName}. Aura plans steps, uses installed plugins and MCP tools (with permission prompts), browses the web with source citations, runs shell commands in an isolated Linux workspace, and uses file tools.",
  descPhase5:
    "Describe a task for project {projectName}. Aura plans steps, browses the web with permission prompts and source citations, runs shell commands in an isolated Linux workspace, uses file tools, and shows streamed output in the task log.",
  descPhase4:
    "Describe a task for project {projectName}. Aura plans steps, runs shell commands in an isolated Linux workspace (WSL or sandbox), uses file tools with permission prompts, and shows streamed output in the task log.",
  descPhase3:
    "Describe a task for project {projectName}. Aura will plan steps, use file tools with permission prompts, and show progress. Approve the plan before execution in Ask-first mode.",
  descPhase2: "Send a message to test provider routing in project {projectName}.",
  descPhase1: "Describe what you want Aura to do in project {projectName}.",
};

function welcomeTitle(phase: number, labels: typeof TASK_WELCOME_LABELS) {
  if (phase >= 11) return labels.titlePhase11;
  if (phase >= 10) return labels.titlePhase10;
  if (phase >= 9) return labels.titlePhase9;
  if (phase >= 8) return labels.titlePhase8;
  if (phase >= 7) return labels.titlePhase7;
  if (phase >= 6) return labels.titlePhase6;
  if (phase >= 5) return labels.titlePhase5;
  if (phase >= 4) return labels.titlePhase4;
  if (phase >= 3) return labels.titlePhase3;
  if (phase >= 2) return labels.titlePhase2;
  return labels.titlePhase1;
}

function welcomeDescription(phase: number, projectName: string, labels: typeof TASK_WELCOME_LABELS) {
  const key =
    phase >= 11
      ? "descPhase11"
      : phase >= 10
        ? "descPhase10"
        : phase >= 9
          ? "descPhase9"
          : phase >= 8
            ? "descPhase8"
            : phase >= 7
              ? "descPhase7"
              : phase >= 6
                ? "descPhase6"
                : phase >= 5
                  ? "descPhase5"
                  : phase >= 4
                    ? "descPhase4"
                    : phase >= 3
                      ? "descPhase3"
                      : phase >= 2
                        ? "descPhase2"
                        : "descPhase1";
  const text = labels[key as keyof typeof TASK_WELCOME_LABELS];
  const parts = text.split("{projectName}");
  if (parts.length === 1) return text;
  return (
    <>
      {parts[0]}
      <strong>{projectName}</strong>
      {parts[1]}
    </>
  );
}

export function TaskWelcome({
  projectName,
  phase = 1,
  labels: labelOverrides,
}: {
  projectName: string;
  phase?: number;
  labels?: Partial<typeof TASK_WELCOME_LABELS>;
}) {
  const labels = { ...TASK_WELCOME_LABELS, ...labelOverrides };

  return (
    <div className="empty-task">
      <div className="et-inner">
        <div className="et-mark">
          <div className="ring" />
          <div className="dot" />
        </div>
        <h1>{welcomeTitle(phase, labels)}</h1>
        <p className="et-sub">{welcomeDescription(phase, projectName, labels)}</p>
      </div>
    </div>
  );
}

const PLAN_BLOCK_LABELS = {
  collapsed: "Plan · {count} steps",
  approved: "Approved",
  proposedPlan: "Proposed plan",
  askFirst: "Ask-first",
  approveRun: "Approve & run",
};

export function PlanBlock({
  steps,
  onApprove,
  approved,
  collapsed,
  onExpand,
  labels: labelOverrides,
}: {
  steps: { id?: string | null; title: string; subtitle?: string | null; role?: string | null; status?: string | null }[];
  onApprove?: () => void;
  approved?: boolean;
  collapsed?: boolean;
  onExpand?: () => void;
  labels?: Partial<typeof PLAN_BLOCK_LABELS>;
}) {
  const labels = { ...PLAN_BLOCK_LABELS, ...labelOverrides };

  const getStatusIcon = (status?: string | null) => {
    switch (status) {
      case "completed":
        return <Icon name="check" size={14} style={{ color: "var(--success)" }} />;
      case "in_progress":
        return <Icon name="loader" size={14} style={{ color: "var(--accent)", animation: "spin 2s linear infinite" }} />;
      case "cancelled":
        return <Icon name="ban" size={14} style={{ color: "var(--danger)" }} />;
      case "pending":
      default:
        return <Icon name="more-horizontal" size={14} style={{ color: "var(--fg-3)" }} />;
    }
  };

  if (collapsed) {
    return (
      <button type="button" className="plan-collapsed fade" onClick={onExpand}>
        <Icon name="list-checks" size={15} />
        <span className="pc-t">{labels.collapsed.replace("{count}", String(steps.length))}</span>
        <span className="badge-soft">{labels.approved}</span>
        <span className="pc-chev">
          <Icon name="arrow-right" size={14} />
        </span>
      </button>
    );
  }
  return (
    <div className="plan fade">
      <div className="ph">
        <Icon name="list-checks" size={17} />
        <span className="ttl">{labels.proposedPlan}</span>
        <span className="badge-soft">{approved ? labels.approved : labels.askFirst}</span>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={s.status ? `todo-item todo-${s.status}` : ""}>
            <span className="num">
              {s.status ? getStatusIcon(s.status) : (i + 1)}
            </span>
            <span className="st" style={s.status === "cancelled" ? { textDecoration: "line-through", opacity: 0.6 } : {}}>
              {s.title}
              {s.subtitle && <div className="sub">{s.subtitle}</div>}
              {s.role && !s.subtitle && <div className="sub">{s.role}</div>}
            </span>
          </li>
        ))}
      </ol>
      {!approved && onApprove && (
        <div className="pf">
          <button type="button" className="btn primary sm" onClick={onApprove}>
            <Icon name="check" size={14} />
            {labels.approveRun}
          </button>
        </div>
      )}
    </div>
  );
}

function StepNode({ status }: { status: string }) {
  if (status === "done") {
    return (
      <div className="node done">
        <Icon name="check" size={12} />
      </div>
    );
  }
  if (status === "running" || status === "run") {
    return (
      <div className="node run">
        <Icon name="loader" size={12} className="spin" />
      </div>
    );
  }
  if (status === "block") {
    return (
      <div className="node block">
        <Icon name="alert-triangle" size={12} />
      </div>
    );
  }
  return <div className="node pend" />;
}

export function Steps({
  items,
}: {
  items: {
    title: string;
    role?: string | null;
    status: string;
    tool?: string | null;
    toolOk?: boolean | null;
    output?: string | null;
  }[];
}) {
  if (!items.length) return null;
  return (
    <div className="steps fade">
      {items.map((s, i) => (
        <div key={i} className={`step${s.status === "pend" ? " pending" : ""}`}>
          <div className="rail">
            <StepNode status={s.status} />
            {i < items.length - 1 && <div className="line" />}
          </div>
          <div className="sbody">
            <div className="stitle">
              {s.title}
              {s.role && <span className="role">· {s.role}</span>}
            </div>
            {s.tool && (
              <div className="tool">
                <Icon name="terminal" size={13} />
                {s.tool}
                {s.toolOk && (
                  <span className="ok">
                    <Icon name="check" size={13} />
                  </span>
                )}
              </div>
            )}
            {s.output && <div className="term">{s.output}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

const APPROVAL_LABELS = {
  highRisk: "High risk",
  needsApproval: "Needs approval",
  allowOnce: "Allow once",
  allowAlways: "Allow always (this project)",
  deny: "Deny",
  denied: "Denied",
  allowedAlways: "Allowed — always for this project",
  allowedOnce: "Allowed once",
  recordedAudit: "Recorded in audit log",
};

export function Approval({
  data,
  onDecide,
  decided,
  labels: labelOverrides,
}: {
  data: {
    title: string;
    desc: string;
    risk?: string;
    icon?: string;
  };
  onDecide?: (d: string) => void;
  decided?: string | null;
  labels?: Partial<typeof APPROVAL_LABELS>;
}) {
  const labels = { ...APPROVAL_LABELS, ...labelOverrides };
  const high = data.risk === "high" || data.risk === "critical";
  return (
    <div className={`approval fade${high ? " risk-high" : ""}`}>
      <div className="at">
        <div className="aic">
          <Icon name={data.icon ?? "alert-triangle"} size={18} />
        </div>
        <div>
          <div className="ah">
            {data.title}
            <span className="risk">{high ? labels.highRisk : labels.needsApproval}</span>
          </div>
          <div className="adesc">{data.desc}</div>
        </div>
      </div>
      {!decided && onDecide ? (
        <div className="acts">
          <button type="button" className="btn primary sm" onClick={() => onDecide("allow-once")}>
            {labels.allowOnce}
          </button>
          <button type="button" className="btn secondary sm" onClick={() => onDecide("allow-always-project")}>
            {labels.allowAlways}
          </button>
          <div className="cspacer" />
          <button type="button" className="btn danger sm" onClick={() => onDecide("deny")}>
            {labels.deny}
          </button>
        </div>
      ) : decided ? (
        <div className="acts">
          <span
            className="badge-soft"
            style={{
              color: decided === "deny" ? "var(--danger)" : "var(--success)",
              background: decided === "deny" ? "var(--danger-subtle)" : "var(--success-subtle)",
            }}
          >
            {decided === "deny"
              ? labels.denied
              : decided === "allow-always-project"
                ? labels.allowedAlways
                : labels.allowedOnce}
          </span>
          <span style={{ font: "var(--text-caption)", color: "var(--fg-3)", marginInlineStart: "auto" }}>
            {labels.recordedAudit}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const SUMMARY_LABELS = {
  taskComplete: "Task complete",
};

export function Summary({
  data,
  labels: labelOverrides,
}: {
  data: { points: string[]; files: { path: string; add?: number; del?: number }[] };
  labels?: Partial<typeof SUMMARY_LABELS>;
}) {
  const labels = { ...SUMMARY_LABELS, ...labelOverrides };
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    if (!data.points || data.points.length === 0) return;

    // Clean markdown text for reading
    const textToSpeak = data.points
      .map((p) => p.replace(/[*_`#-]/g, "")) // strip common md chars
      .join(". ");

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Auto-detect language
    const isArabic = /[\u0600-\u06FF]/.test(textToSpeak);
    utterance.lang = isArabic ? "ar-SA" : "en-US";

    // Select suitable voice
    if (window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.lang.startsWith(isArabic ? "ar" : "en"));
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="summary fade">
      <div className="sh" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={17} />
          {labels.taskComplete}
        </div>
        <button
          type="button"
          onClick={toggleSpeech}
          style={{
            color: speaking ? "#34d399" : "var(--fg-3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            gap: "6px",
            background: speaking ? "rgba(52, 211, 153, 0.15)" : "rgba(255,255,255,0.03)",
            border: speaking ? "1px solid rgba(52, 211, 153, 0.3)" : "1px solid var(--border-3)",
            transition: "all 0.2s ease",
          }}
          title={speaking ? "Stop reading" : "Read out loud"}
        >
          <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {speaking ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            )}
          </svg>
          <span>{speaking ? (data.points.some(p => /[\u0600-\u06FF]/.test(p)) ? "إيقاف" : "Stop") : (data.points.some(p => /[\u0600-\u06FF]/.test(p)) ? "استمع للملخص" : "Speak Summary")}</span>
        </button>
      </div>
      <ul>
        {data.points.map((p, i) => (
          <li key={i}>
            <Icon name="check" size={14} />
            <MarkdownText text={p} />
          </li>
        ))}
      </ul>
      {data.files.length > 0 && (
        <div className="files">
          {data.files.map((f, i) => (
            <div key={i} className="frow">
              <Icon name="file-diff" size={13} />
              <span className="fp">{f.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const THINKING_LABELS = {
  working: "Aura is working…",
};

export function Thinking({
  label,
  labels: labelOverrides,
}: {
  label?: string;
  labels?: Partial<typeof THINKING_LABELS>;
}) {
  const labels = { ...THINKING_LABELS, ...labelOverrides };

  return (
    <div className="msg fade">
      <div className="av agent">
        <Icon name="bot" size={16} />
      </div>
      <div className="mbody" style={{ paddingTop: 6 }}>
        <div className="thinking">
          <span />
          <span />
          <span />
          <em>{label ?? labels.working}</em>
        </div>
      </div>
    </div>
  );
}

export function ClarificationCard({
  data,
  onSubmit,
  isLatest = false,
  isArabic = false,
}: {
  data: {
    content: string;
    questions: Array<{
      id: string;
      question: string;
      reason?: string;
      options: Array<{
        label: string;
        value: string;
        recommended?: boolean;
        note?: string;
      }>;
      allowCustom?: boolean;
    }>;
    recommendedAction?: {
      label: string;
      value: string;
    };
  };
  onSubmit: (response: string) => void;
  isLatest?: boolean;
  isArabic?: boolean;
}) {
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of data.questions) {
      const opts = q.options || [];
      const rec = opts.find(o => o.recommended);
      if (rec) {
        initial[q.id] = rec.value;
      } else if (opts.length > 0) {
        initial[q.id] = opts[0].value;
      }
    }
    return initial;
  });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelectOption = (qid: string, val: string) => {
    if (submitted || !isLatest) return;
    setSelections(prev => ({ ...prev, [qid]: val }));
  };

  const handleCustomChange = (qid: string, val: string) => {
    if (submitted || !isLatest) return;
    setCustomAnswers(prev => ({ ...prev, [qid]: val }));
    setSelections(prev => ({ ...prev, [qid]: "__custom__" }));
  };

  const handleSubmit = () => {
    if (submitted || !isLatest) return;
    setSubmitted(true);
    const parts: string[] = [];
    for (const q of data.questions) {
      const selectedVal = selections[q.id];
      let displayVal = "";
      if (selectedVal === "__custom__") {
        displayVal = customAnswers[q.id] || "";
      } else {
        const opts = q.options || [];
        const opt = opts.find(o => o.value === selectedVal);
        displayVal = opt ? opt.label : selectedVal;
      }
      parts.push(`${q.question}: ${displayVal}`);
    }
    const followUp = isArabic
      ? `استخدم هذه الاختيارات:\n${parts.map(p => `- ${p}`).join("\n")}`
      : `Use these choices:\n${parts.map(p => `- ${p}`).join("\n")}`;
    onSubmit(followUp);
  };

  const handleUseRecommended = () => {
    if (submitted || !isLatest) return;
    const recommendedSelections = { ...selections };
    for (const q of data.questions) {
      const opts = q.options || [];
      const rec = opts.find(o => o.recommended);
      if (rec) {
        recommendedSelections[q.id] = rec.value;
      }
    }
    setSelections(recommendedSelections);
    const parts: string[] = [];
    for (const q of data.questions) {
      const selectedVal = recommendedSelections[q.id];
      const opts = q.options || [];
      const opt = opts.find(o => o.value === selectedVal);
      const displayVal = opt ? opt.label : selectedVal;
      parts.push(`${q.question}: ${displayVal}`);
    }
    const followUp = isArabic
      ? `استخدم هذه الاختيارات:\n${parts.map(p => `- ${p}`).join("\n")}`
      : `Use these choices:\n${parts.map(p => `- ${p}`).join("\n")}`;
    setSubmitted(true);
    onSubmit(followUp);
  };

  return (
    <div className="msg fade clarification-card-wrapper" style={{ marginBottom: "16px" }}>
      <div className="av agent" style={{ background: "var(--accent)" }}>
        <Icon name="shield-check" size={16} />
      </div>
      <div className="mbody">
        <div className="who">
          {isArabic ? "طلب توضيح من Aura" : "Aura Clarification Request"}
          <span className="role">· coordinator</span>
        </div>
        <div className="clarification-card" style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}>
          <p className="clarification-reason" style={{ margin: 0, font: "var(--text-body)", color: "var(--fg-1)" }}>{data.content}</p>

          <div className="clarification-questions" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {data.questions.map((q) => {
              const selectedValue = selections[q.id];
              const customVal = customAnswers[q.id] || "";
              return (
                <div key={q.id} className="clarification-question-item" style={{
                  borderTop: "1px solid var(--border-2)",
                  paddingTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  <div className="q-title-wrap">
                    <h4 className="q-title" style={{ margin: 0, font: "var(--text-body-sm)", fontWeight: 600, color: "var(--fg-2)" }}>{q.question}</h4>
                    {q.reason && <p className="q-reason" style={{ margin: "2px 0 0", font: "var(--text-caption)", color: "var(--fg-3)" }}>{q.reason}</p>}
                  </div>

                  <div className="q-options-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    {(q.options || []).map((opt) => {
                      const isSelected = selectedValue === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`q-opt-btn${isSelected ? " selected" : ""}`}
                          disabled={submitted || !isLatest}
                          style={{
                            background: isSelected ? "var(--accent)" : "var(--bg-3)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "var(--border-1)"}`,
                            color: isSelected ? "#fff" : "var(--fg-2)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            cursor: (submitted || !isLatest) ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            font: "var(--text-caption)",
                            transition: "all 0.2s"
                          }}
                          onClick={() => handleSelectOption(q.id, opt.value)}
                        >
                          <span className="opt-label">{opt.label}</span>
                          {opt.recommended && (
                            <span className="opt-recommended-badge" style={{
                              background: isSelected ? "rgba(255,255,255,0.2)" : "rgba(90,138,82,0.15)",
                              color: isSelected ? "#fff" : "var(--agent)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "bold"
                            }}>
                              {isArabic ? "موصى به" : "Recommended"}
                            </span>
                          )}
                          {opt.note && <span className="opt-note" style={{ opacity: 0.7, fontSize: "10px" }}>({opt.note})</span>}
                        </button>
                      );
                    })}

                    {q.allowCustom && (
                      <div className={`q-custom-wrap${selectedValue === "__custom__" ? " selected" : ""}`} style={{ display: "flex" }}>
                        <input
                          type="text"
                          className="q-custom-input"
                          placeholder={isArabic ? "إجابة مخصصة..." : "Custom answer..."}
                          value={customVal}
                          disabled={submitted || !isLatest}
                          style={{
                            background: "var(--bg-3)",
                            border: `1px solid ${selectedValue === "__custom__" ? "var(--accent)" : "var(--border-1)"}`,
                            color: "var(--fg-1)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            outline: "none",
                            font: "var(--text-caption)",
                            minWidth: "150px"
                          }}
                          onChange={(e) => handleCustomChange(q.id, e.target.value)}
                          onFocus={() => handleSelectOption(q.id, "__custom__")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isLatest && !submitted && (
            <div className="clarification-actions" style={{ display: "flex", gap: "8px", marginTop: "8px", borderTop: "1px solid var(--border-2)", paddingTop: "12px" }}>
              <button
                type="button"
                className="btn primary sm"
                onClick={handleSubmit}
              >
                {isArabic ? "إرسال الاختيارات" : "Submit Choices"}
              </button>
              {data.questions.some(q => q.options.some(o => o.recommended)) && (
                <button
                  type="button"
                  className="btn sm secondary"
                  style={{
                    background: "var(--bg-3)",
                    border: "1px solid var(--border-1)",
                    color: "var(--fg-2)"
                  }}
                  onClick={handleUseRecommended}
                >
                  {isArabic ? "استخدام الخيارات الموصى بها" : "Use Recommended"}
                </button>
              )}
            </div>
          )}

          {submitted && (
            <div className="clarification-submitted-badge" style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--agent)",
              font: "var(--text-caption)",
              marginTop: "8px",
              borderTop: "1px solid var(--border-2)",
              paddingTop: "12px"
            }}>
              <Icon name="check" size={14} />
              <span>{isArabic ? "تم إرسال الاختيارات بنجاح" : "Choices submitted successfully"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ContextUsageRing({
  value = "",
  messages = [],
  workspaceFiles = "",
  modelContextWindow = 128000,
}: {
  value: string;
  messages: { role: string; content: string }[];
  workspaceFiles?: string;
  modelContextWindow?: number;
}) {
  const systemEst = 4000;
  const historyEst = Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4);
  const inputEst = Math.ceil(value.length / 4);
  const filesEst = Math.ceil((workspaceFiles || "").length / 4);
  const totalEst = systemEst + historyEst + inputEst + filesEst;
  const percentage = Math.min(100, Math.max(0, (totalEst / modelContextWindow) * 100));

  let statusClass = "low";
  let color = "#5a8a52"; // Emerald green
  if (percentage >= 90) {
    statusClass = "critical";
    color = "#b23b3b"; // Ruby red
  } else if (percentage >= 80) {
    statusClass = "high";
    color = "#d97706"; // Amber orange
  } else if (percentage >= 50) {
    statusClass = "medium";
    color = "#3b82f6"; // Sapphire blue
  }

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`ctx-usage-ring-wrap ${statusClass}`} style={{
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      cursor: "pointer"
    }}>
      <div className="ctx-ring-trigger" style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "6px",
        background: "var(--bg-3)",
        border: "1px solid var(--border-1)",
        height: "28px"
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: "block" }}>
          <circle
            cx="12"
            cy="12"
            r={radius}
            stroke="var(--border-2)"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="12"
            cy="12"
            r={radius}
            stroke={color}
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="ctx-text" style={{ color, fontSize: "11px", fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>{percentage.toFixed(0)}%</span>
      </div>

      <div className="ctx-ring-dropdown" style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        right: 0,
        width: "250px",
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: "8px",
        padding: "12px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        display: "none",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000
      }}>
        <h5 className="dropdown-title" style={{ margin: 0, font: "var(--text-body-sm)", fontWeight: 600, color: "var(--fg-1)" }}>Context Allocation</h5>
        <div className="breakdown-grid" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
          <div className="breakdown-item" style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-2)" }}>
            <span className="b-label">System Prompt:</span>
            <span className="b-val" style={{ fontWeight: 600 }}>{systemEst.toLocaleString()} tok</span>
          </div>
          <div className="breakdown-item" style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-2)" }}>
            <span className="b-label">Workspace:</span>
            <span className="b-val" style={{ fontWeight: 600 }}>{filesEst.toLocaleString()} tok</span>
          </div>
          <div className="breakdown-item" style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-2)" }}>
            <span className="b-label">Chat History:</span>
            <span className="b-val" style={{ fontWeight: 600 }}>{historyEst.toLocaleString()} tok</span>
          </div>
          <div className="breakdown-item" style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-2)" }}>
            <span className="b-label">Next Prompt:</span>
            <span className="b-val" style={{ fontWeight: 600 }}>{inputEst.toLocaleString()} tok</span>
          </div>
          <div style={{ borderTop: "1px solid var(--border-2)", margin: "4px 0" }} />
          <div className="breakdown-item total" style={{ display: "flex", justifyContent: "space-between", color: "var(--fg-1)", fontWeight: "bold" }}>
            <span className="b-label">Total:</span>
            <span className="b-val">{totalEst.toLocaleString()} / {modelContextWindow.toLocaleString()}</span>
          </div>
        </div>

        {percentage >= 90 ? (
          <div className="ctx-warning critical" style={{
            background: "rgba(178, 59, 59, 0.1)",
            border: "1px solid rgba(178, 59, 59, 0.3)",
            color: "#e88080",
            padding: "8px",
            borderRadius: "6px",
            fontSize: "10px",
            marginTop: "4px"
          }}>
            <strong>⚠️ Critical Context Limit!</strong>
            <p style={{ margin: "2px 0 0" }}>Consider typing /context to compact history or starting a fresh task.</p>
          </div>
        ) : percentage >= 80 ? (
          <div className="ctx-warning warning" style={{
            background: "rgba(217, 119, 6, 0.1)",
            border: "1px solid rgba(217, 119, 6, 0.3)",
            color: "#f59e0b",
            padding: "8px",
            borderRadius: "6px",
            fontSize: "10px",
            marginTop: "4px"
          }}>
            <strong>⚠️ High Context Warning</strong>
            <p style={{ margin: "2px 0 0" }}>Starting a fresh task soon is recommended to keep models accurate.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

