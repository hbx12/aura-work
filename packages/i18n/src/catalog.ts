/** Source strings for Aura OS i18n — emitted to Weblate-compatible JSON via `npm run build:locales`. */
export type LocaleId =
  | "en"
  | "ar"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "zh-CN"
  | "zh-TW"
  | "ja"
  | "ko"
  | "hi"
  | "id"
  | "tr"
  | "ru"
  | "it"
  | "nl"
  | "pl"
  | "vi"
  | "th"
  | "fa";

export const RTL_LOCALES: LocaleId[] = ["ar", "fa"];

export const SUPPORTED_LOCALES: { id: LocaleId; labelKey: string; nativeName: string }[] = [
  { id: "en", labelKey: "lang.en", nativeName: "English" },
  { id: "ar", labelKey: "lang.ar", nativeName: "العربية" },
  { id: "es", labelKey: "lang.es", nativeName: "Español" },
  { id: "fr", labelKey: "lang.fr", nativeName: "Français" },
  { id: "de", labelKey: "lang.de", nativeName: "Deutsch" },
  { id: "pt", labelKey: "lang.pt", nativeName: "Português" },
  { id: "zh-CN", labelKey: "lang.zh-CN", nativeName: "简体中文" },
  { id: "zh-TW", labelKey: "lang.zh-TW", nativeName: "繁體中文" },
  { id: "ja", labelKey: "lang.ja", nativeName: "日本語" },
  { id: "ko", labelKey: "lang.ko", nativeName: "한국어" },
  { id: "hi", labelKey: "lang.hi", nativeName: "हिन्दी" },
  { id: "id", labelKey: "lang.id", nativeName: "Bahasa Indonesia" },
  { id: "tr", labelKey: "lang.tr", nativeName: "Türkçe" },
  { id: "ru", labelKey: "lang.ru", nativeName: "Русский" },
  { id: "it", labelKey: "lang.it", nativeName: "Italiano" },
  { id: "nl", labelKey: "lang.nl", nativeName: "Nederlands" },
  { id: "pl", labelKey: "lang.pl", nativeName: "Polski" },
  { id: "vi", labelKey: "lang.vi", nativeName: "Tiếng Việt" },
  { id: "th", labelKey: "lang.th", nativeName: "ไทย" },
  { id: "fa", labelKey: "lang.fa", nativeName: "فارسی" },
];

export type MessageKey =
  | "app.name"
  | "nav.tasks"
  | "nav.files"
  | "nav.git"
  | "nav.browser"
  | "nav.computer"
  | "nav.schedule"
  | "nav.providers"
  | "nav.plugins"
  | "nav.memory"
  | "memory.subtitle"
  | "memory.pendingTitle"
  | "memory.pendingDesc"
  | "memory.saved"
  | "memory.empty"
  | "memory.pendingSection"
  | "memory.emptyHint"
  | "memory.approve"
  | "memory.reject"
  | "memory.delete"
  | "nav.audit"
  | "nav.settings"
  | "settings.title"
  | "settings.subtitle"
  | "settings.language"
  | "settings.languageDesc"
  | "settings.systemLanguage"
  | "settings.updates"
  | "settings.updatesDesc"
  | "settings.checkUpdates"
  | "settings.upToDate"
  | "settings.updateAvailable"
  | "settings.packaging"
  | "settings.packagingDesc"
  | "settings.vmImage"
  | "settings.vmImageOk"
  | "settings.vmImageFail"
  | "settings.bundledRuntime"
  | "settings.extension"
  | "settings.cliCompanion"
  | "settings.cliDesc"
  | "settings.pet"
  | "settings.petDesc"
  | "common.save"
  | "common.loading"
  | "task.welcome.subtitle"
  | "task.sidecar.ready"
  | "task.sidecar.offline"
  | "lang.en"
  | "lang.ar"
  | "lang.es"
  | "lang.fr"
  | "lang.de"
  | "lang.pt"
  | "lang.zh-CN"
  | "lang.zh-TW"
  | "lang.ja"
  | "lang.ko"
  | "lang.hi"
  | "lang.id"
  | "lang.tr"
  | "lang.ru"
  | "lang.it"
  | "lang.nl"
  | "lang.pl"
  | "lang.vi"
  | "lang.th"
  | "lang.fa"
  | "sidebar.projects"
  | "sidebar.search"
  | "sidebar.tasks"
  | "sidebar.noTasks"
  | "providers.title"
  | "providers.subtitle"
  | "providers.routing"
  | "providers.section"
  | "providers.active"
  | "providers.local"
  | "providers.noKey"
  | "providers.keySet"
  | "providers.onDevice"
  | "providers.keyBtn"
  | "providers.testBtn"
  | "providers.loading"
  | "providers.modelsCount"
  | "settings.languageUpdated"
  | "settings.appearance"
  | "settings.appearanceDesc"
  | "settings.theme"
  | "settings.themeDesc"
  | "settings.themeSystem"
  | "settings.themeLight"
  | "settings.themeDark"
  | "settings.themeAmoled"
  | "settings.themeBlue"
  | "settings.themeHighContrast"
  | "settings.themeCyberpunk"
  | "settings.themeForest"
  | "settings.themePastel"
  | "settings.themeSunset"
  | "settings.themeSepia"
  | "settings.themeNord"
  | "settings.themeDracula"
  | "settings.themeMatrix"
  | "settings.themeSakura"
  | "settings.themeSakuraDark"
  | "settings.themeCoffee"
  | "settings.themeOcean"
  | "settings.themeUpdated"
  | "settings.vm"
  | "settings.vmStart"
  | "settings.vmStop"
  | "settings.vmStarted"
  | "settings.vmStopped"
  | "settings.browser"
  | "settings.browserStart"
  | "settings.browserStop"
  | "settings.browserStarted"
  | "settings.browserStopped"
  | "settings.plugins"
  | "settings.pluginsStart"
  | "settings.pluginsStop"
  | "settings.pluginsStarted"
  | "settings.pluginsStopped"
  | "settings.vault"
  | "settings.vaultEncrypted"
  | "settings.vaultExport"
  | "settings.vaultImport"
  | "settings.vaultExportPw"
  | "settings.vaultImportData"
  | "settings.vaultExportBtn"
  | "settings.vaultImportBtn"
  | "settings.vaultExported"
  | "settings.vaultImported"
  | "settings.pricing"
  | "settings.pricingDesc"
  | "settings.pricingBtn"
  | "settings.bundled"
  | "settings.sidecars"
  | "common.cancel"
  | "common.running"
  | "common.stopped"
  | "common.offline"
  | "common.start"
  | "common.stop"
  | "app.loadingProjects"
  | "app.noProjectsTitle"
  | "app.noProjectsDesc"
  | "app.newProject"
  | "provider.key.localDesc"
  | "provider.key.cloudDesc"
  | "provider.key.apiKey"
  | "provider.key.baseUrl"
  | "provider.key.remove"
  | "provider.key.saved"
  | "provider.key.fetchingModels"
  | "provider.key.authMethod"
  | "provider.key.codexAccount"
  | "provider.key.googleAccount"
  | "provider.key.claudeAccount"
  | "provider.key.apiKeyMode"
  | "provider.key.codexDesc"
  | "provider.key.connectCodex"
  | "provider.key.connectGoogle"
  | "provider.key.connectClaude"
  | "provider.key.codexConnected"
  | "provider.key.codexWaiting"
  | "provider.key.codexDeviceHint"
  | "provider.key.codexDevicePolling"
  | "provider.key.codexDeviceCode"
  | "provider.key.codexDeviceCodeLabel"
  | "provider.key.codexDeviceOpenLink"
  | "provider.key.codexDeviceTimeout"
  | "provider.key.codexDeviceBrowserOpened"
  | "provider.key.codexBrowserOpened"
  | "plugins.subtitle"
  | "plugins.addPlugin"
  | "plugins.installed"
  | "plugins.active"
  | "plugins.tools"
  | "plugins.helper"
  | "plugins.helperOffline"
  | "plugins.empty"
  | "plugins.scopeLocal"
  | "plugins.uninstall"
  | "plugins.mcpServers"
  | "plugins.running"
  | "plugins.addServer"
  | "plugins.serverName"
  | "plugins.command"
  | "plugins.args"
  | "plugins.added"
  | "plugins.noMcp"
  | "plugins.remove"
  | "plugins.marketplace"
  | "plugins.syncRegistry"
  | "plugins.stopHelper"
  | "schedule.subtitle"
  | "schedule.new"
  | "schedule.name"
  | "schedule.project"
  | "schedule.prompt"
  | "schedule.cadence"
  | "schedule.permissions"
  | "schedule.create"
  | "schedule.list"
  | "schedule.empty"
  | "schedule.next"
  | "schedule.details"
  | "schedule.noDescription"
  | "schedule.lastRun"
  | "schedule.runNow"
  | "schedule.resume"
  | "schedule.pause"
  | "schedule.delete"
  | "schedule.deleteConfirm"
  | "schedule.history"
  | "schedule.noRuns"
  | "schedule.created"
  | "schedule.resumed"
  | "schedule.paused"
  | "schedule.manual"
  | "schedule.hourly"
  | "schedule.daily"
  | "schedule.weekdays"
  | "schedule.weekly"
  | "schedule.custom"
  | "computer.experimental"
  | "computer.subtitle"
  | "computer.startHelper"
  | "computer.allowedApps"
  | "computer.noTitle"
  | "computer.helperDesc"
  | "computer.windowsFound"
  | "computer.listWindows"
  | "computer.refresh"
  | "computer.blocked"
  | "computer.blockedDefault"
  | "computer.blockedDesc"
  | "computer.blockedTag"
  | "computer.retention"
  | "computer.retainOn"
  | "computer.retainOff"
  | "computer.retentionUpdated"
  | "computer.noScreenshots"
  | "chat.placeholder"
  | "chat.send"
  | "chat.runTask"
  | "chat.autoModel"
  | "chat.modeAsk"
  | "chat.modeAct"
  | "chat.thinking"
  | "chat.error"
  | "files.title"
  | "files.subtitle"
  | "files.projectFiles"
  | "files.loading"
  | "files.selectFile"
  | "files.pendingEdits"
  | "files.approveWrite"
  | "browser.title"
  | "browser.subtitle"
  | "browser.helper"
  | "browser.running"
  | "browser.stopped"
  | "browser.backend"
  | "browser.profiles"
  | "browser.start"
  | "browser.stop"
  | "browser.webview"
  | "browser.go"
  | "browser.urlPlaceholder"
  | "browser.urlInvalid"
  | "git.title"
  | "git.subtitle"
  | "git.branch"
  | "git.clean"
  | "git.dirty"
  | "git.noChanges"
  | "git.diff"
  | "git.noDiff"
  | "git.proposeCommit"
  | "git.commitMessage"
  | "git.approveCommit"
  | "git.pendingCommits"
  | "git.notRepo"
  | "git.loading"
  | "git.initRepo"
  | "git.changes"
  | "cloud.title"
  | "cloud.subtitle"
  | "cloud.server"
  | "cloud.serverReachable"
  | "cloud.serverOffline"
  | "cloud.signInOrRegister"
  | "cloud.signIn"
  | "cloud.register"
  | "cloud.signOut"
  | "cloud.account"
  | "cloud.serverUrl"
  | "cloud.email"
  | "cloud.password"
  | "cloud.displayName"
  | "cloud.sync"
  | "cloud.syncDesc"
  | "cloud.enableSync"
  | "cloud.disableSync"
  | "cloud.syncNow"
  | "cloud.syncHelper"
  | "cloud.startHelper"
  | "cloud.stopHelper"
  | "cloud.pairing"
  | "cloud.generatePairing"
  | "cloud.pairedDevices"
  | "cloud.noPairedDevices"
  | "cloud.online"
  | "cloud.signedIn"
  | "cloud.thisDevice"
  | "cloud.revoke"
  | "cloud.notSignedIn"
  | "cloud.syncActive"
  | "cloud.syncHelperOffline"
  | "cloud.syncDisabled"
  | "cloud.recoveryKey"
  | "task.plan.planSteps"
  | "task.plan.proposedPlan"
  | "task.plan.approved"
  | "task.plan.approveRun"
  | "task.approval.highRisk"
  | "task.approval.needsApproval"
  | "task.approval.allowOnce"
  | "task.approval.deny"
  | "task.approval.auditRecorded"
  | "task.summary.complete"
  | "task.thinking.default"
  | "ctx.sidecar"
  | "ctx.vm"
  | "ctx.browser"
  | "ctx.plugins"
  | "ctx.cloud"
  | "ctx.usage"
  | "ctx.routing"
  | "sidebar.newProject"
  | "sidebar.newTask"
  | "nav.account"
  | "app.breadcrumb.tasks"
  | "chat.fallback.title"
  | "chat.fallback.approve"
  | "chat.fallback.deny"
  | "chat.continue"
  | "chat.continueTask"
  | "routing.quality-first.title"
  | "routing.quality-first.subtitle"
  | "routing.cost-first.title"
  | "routing.cost-first.subtitle"
  | "routing.privacy-first.title"
  | "routing.privacy-first.subtitle"
  | "routing.local-only.title"
  | "routing.local-only.subtitle"
  | "routing.manual.title"
  | "routing.manual.subtitle"
  | "chat.you"
  | "chat.aura"
  | "chat.emptyResponse"
  | "chat.taskFallback"
  | "chat.taskPlaceholder"
  | "task.state"
  | "task.welcome.desc"
  | "task.plan.collapsed"
  | "task.plan.proposed"
  | "task.thinking.working"
  | "task.thinking.coordinator"
  | "task.sidecar.offlineHint"
  | "ctx.linuxWorkspace"
  | "ctx.vmRunning"
  | "ctx.vmOffline"
  | "ctx.browserHelper"
  | "ctx.browserRunning"
  | "ctx.browserOffline"
  | "ctx.pluginsHelper"
  | "ctx.toolsAvailable"
  | "ctx.pluginsOffline"
  | "ctx.auraCloud"
  | "ctx.notSignedIn"
  | "ctx.syncActive"
  | "ctx.syncOffline"
  | "ctx.syncDisabled"
  | "ctx.vmOfflineHint"
  | "ctx.browserOfflineHint"
  | "ctx.pluginsOfflineHint"
  | "ctx.syncOfflineHint"
  | "sidebar.account";

export type MessageCatalog = Record<MessageKey, string>;

const en: MessageCatalog = {
  "app.name": "Aura Work",
  "nav.tasks": "Tasks",
  "nav.files": "Files",
  "nav.git": "Git",
  "nav.browser": "Browser",
  "nav.computer": "Computer use",
  "nav.schedule": "Scheduled",
  "nav.providers": "Providers",
  "nav.plugins": "Plugins & MCP",
  "nav.memory": "Memory",
  "memory.subtitle": "Project-scoped memories the agent can recall. New memories require your approval before they are saved.",
  "memory.pendingTitle": "No pending memories",
  "memory.pendingDesc": "When the agent proposes a memory, it will appear here for approval.",
  "memory.saved": "Saved memories",
  "memory.empty": "No saved memories yet for this project.",
  "memory.pendingSection": "Suggested memory · needs approval",
  "memory.emptyHint": "When the agent learns something useful during a task, it will propose a memory here for your approval.",
  "memory.approve": "Approve",
  "memory.reject": "Reject",
  "memory.delete": "Delete",
  "nav.audit": "Audit log",
  "nav.settings": "Settings",
  "settings.title": "Settings & vault",
  "settings.subtitle":
    "Local encrypted vault, language, signed updates, and bundled runtime verification.",
  "settings.language": "Language",
  "settings.languageDesc":
    "Display language for the app shell. Arabic and Persian use RTL layout.",
  "settings.systemLanguage": "Use system language",
  "settings.updates": "Updates",
  "settings.updatesDesc": "Signed in-app updates verified against the release public key.",
  "settings.checkUpdates": "Check for updates",
  "settings.upToDate": "You are on the latest version.",
  "settings.updateAvailable": "Update available: {version}",
  "settings.packaging": "Packaging & runtime",
  "settings.packagingDesc": "Bundled Node runtime and Linux VM image shipped with the installer.",
  "settings.vmImage": "VM image verification",
  "settings.vmImageOk": "VM image signature verified",
  "settings.vmImageFail": "VM image verification failed",
  "settings.bundledRuntime": "Bundled Node runtime",
  "settings.extension": "Chrome extension",
  "settings.cliCompanion": "CLI companion",
  "settings.cliDesc":
    "Pair `aura` CLI via Extensions → pair code. CLI uses the local bridge and cannot bypass permissions.",
  "settings.pet": "Desktop Pet",
  "settings.petDesc": "Choose and customize your interactive companion.",
  "common.save": "Save",
  "common.loading": "Loading…",
  "task.welcome.subtitle": "What would you like to work on?",
  "task.sidecar.ready": "Sidecar ready · v1.0.0",
  "task.sidecar.offline": "Sidecar offline",
  "lang.en": "English",
  "lang.ar": "Arabic",
  "lang.es": "Spanish",
  "lang.fr": "French",
  "lang.de": "German",
  "lang.pt": "Portuguese",
  "lang.zh-CN": "Chinese (Simplified)",
  "lang.zh-TW": "Chinese (Traditional)",
  "lang.ja": "Japanese",
  "lang.ko": "Korean",
  "lang.hi": "Hindi",
  "lang.id": "Indonesian",
  "lang.tr": "Turkish",
  "lang.ru": "Russian",
  "lang.it": "Italian",
  "lang.nl": "Dutch",
  "lang.pl": "Polish",
  "lang.vi": "Vietnamese",
  "lang.th": "Thai",
  "lang.fa": "Persian",
  "sidebar.projects": "Projects",
  "sidebar.search": "Search projects & tasks",
  "sidebar.tasks": "Tasks",
  "sidebar.noTasks": "No tasks yet",
  "providers.title": "AI providers",
  "providers.subtitle":
    "Bring your own keys. Keys are stored only in the local encrypted vault and never sync to Aura Cloud.",
  "providers.routing": "Routing policy",
  "providers.section": "Providers",
  "providers.active": "Active",
  "providers.local": "Local",
  "providers.noKey": "No key configured",
  "providers.keySet": "Key configured",
  "providers.onDevice": "On-device, no key required",
  "providers.keyBtn": "Key",
  "providers.testBtn": "Test",
  "providers.loading": "Loading providers…",
  "providers.modelsCount": "{count} models available",
  "settings.languageUpdated": "Language updated.",
  "settings.appearance": "Appearance",
  "settings.appearanceDesc": "Choose a built-in theme or follow the operating system.",
  "settings.theme": "Theme",
  "settings.themeDesc": "Switch instantly between built-in themes. System follows Windows, macOS, or Linux color mode.",
  "settings.themeSystem": "System",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.themeAmoled": "AMOLED",
  "settings.themeBlue": "Blue",
  "settings.themeHighContrast": "High contrast",
  "settings.themeCyberpunk": "Cyberpunk",
  "settings.themeForest": "Forest",
  "settings.themePastel": "Pastel",
  "settings.themeSunset": "Sunset",
  "settings.themeSepia": "Sepia",
  "settings.themeNord": "Nord",
  "settings.themeDracula": "Dracula",
  "settings.themeMatrix": "Matrix",
  "settings.themeSakura": "Sakura",
  "settings.themeSakuraDark": "Sakura Dark",
  "settings.themeCoffee": "Coffee",
  "settings.themeOcean": "Ocean",
  "settings.themeUpdated": "Theme updated.",
  "settings.vm": "Linux workspace (VM)",
  "settings.vmStart": "Start workspace",
  "settings.vmStop": "Stop workspace",
  "settings.vmStarted": "Linux workspace started.",
  "settings.vmStopped": "Linux workspace stopped.",
  "settings.browser": "Browser helper (Chromium)",
  "settings.browserStart": "Start browser helper",
  "settings.browserStop": "Stop browser helper",
  "settings.browserStarted": "Browser helper started.",
  "settings.browserStopped": "Browser helper stopped.",
  "settings.plugins": "Plugins helper",
  "settings.pluginsStart": "Start plugins helper",
  "settings.pluginsStop": "Stop plugins helper",
  "settings.pluginsStarted": "Plugins helper started.",
  "settings.pluginsStopped": "Plugins helper stopped.",
  "settings.vault": "Vault status",
  "settings.vaultEncrypted": "Encrypted vault",
  "settings.vaultExport": "Export vault",
  "settings.vaultImport": "Import vault",
  "settings.vaultExportPw": "Export password (min 8 chars)",
  "settings.vaultImportData": "Export file (base64)",
  "settings.vaultExportBtn": "Export & copy",
  "settings.vaultImportBtn": "Import vault",
  "settings.vaultExported": "Vault exported to clipboard. Store it safely.",
  "settings.vaultImported": "Vault imported successfully.",
  "settings.pricing": "Model pricing",
  "settings.pricingDesc":
    "Fetch auto-updated model pricing metadata. Falls back to bundled cache if remote is unavailable.",
  "settings.pricingBtn": "Update pricing",
  "settings.bundled": "Bundled",
  "settings.sidecars": "sidecars",
  "common.cancel": "Cancel",
  "common.running": "Running",
  "common.stopped": "Stopped",
  "common.offline": "Offline",
  "common.start": "Start",
  "common.stop": "Stop",
  "app.loadingProjects": "Loading projects…",
  "app.noProjectsTitle": "No projects yet",
  "app.noProjectsDesc": "Create a project to connect a local folder.",
  "app.newProject": "New project",
  "provider.key.localDesc":
    "Ollama runs locally — no API key. Set the base URL if Ollama is not on the default port.",
  "provider.key.cloudDesc":
    "API keys are stored in the encrypted local vault only. They never appear in SQLite or logs.",
  "provider.key.apiKey": "API key",
  "provider.key.baseUrl": "Base URL",
  "provider.key.remove": "Remove key",
  "provider.key.saved": "Key saved. Fetching models…",
  "provider.key.fetchingModels": "Loaded {count} models.",
  "provider.key.authMethod": "Sign-in method",
  "provider.key.codexAccount": "ChatGPT (Codex)",
  "provider.key.googleAccount": "Google Account",
  "provider.key.claudeAccount": "Claude Account",
  "provider.key.apiKeyMode": "API key",
  "provider.key.codexDesc":
    "Use your ChatGPT subscription. Click Connect — a device code appears here. Sign in at the link and enter the code.",
  "provider.key.connectCodex": "Connect ChatGPT account",
  "provider.key.connectGoogle": "Connect Google Account",
  "provider.key.connectClaude": "Connect Claude Account",
  "provider.key.codexConnected": "ChatGPT account connected.",
  "provider.key.codexWaiting": "Waiting for browser sign-in… Complete login in the browser window.",
  "provider.key.codexDeviceHint": "Starting device sign-in…",
  "provider.key.codexDevicePolling": "Waiting for sign-in… ({seconds}s)",
  "provider.key.codexDeviceCode": "Open the link below, sign in to ChatGPT, and enter this code:",
  "provider.key.codexDeviceCodeLabel": "Your device code",
  "provider.key.codexDeviceOpenLink": "Open sign-in page",
  "provider.key.codexDeviceTimeout": "Device sign-in timed out. Click Connect again after entering the code.",
  "provider.key.codexDeviceBrowserOpened":
    "Your browser should open for ChatGPT sign-in. Enter the device code shown below on that page.",
  "provider.key.codexBrowserOpened":
    "Your browser should open for ChatGPT sign-in. Complete login there — Aura Work will connect automatically.",
  "plugins.subtitle":
    "Extend Aura with plugins and Model Context Protocol servers. Permissions are scoped per project and every tool call is audited.",
  "plugins.addPlugin": "Add plugin",
  "plugins.installed": "Installed plugins",
  "plugins.active": "active",
  "plugins.tools": "tools",
  "plugins.helper": "Plugins helper",
  "plugins.helperOffline": "Start the helper to load plugins and MCP servers.",
  "plugins.empty": "No plugins installed yet.",
  "plugins.scopeLocal": "local install",
  "plugins.uninstall": "Uninstall",
  "plugins.mcpServers": "MCP servers",
  "plugins.running": "running",
  "plugins.addServer": "Add server",
  "plugins.serverName": "Server name",
  "plugins.command": "Command",
  "plugins.args": "Arguments",
  "plugins.added": "Added MCP server",
  "plugins.noMcp": "No MCP servers configured.",
  "plugins.remove": "Remove",
  "plugins.marketplace": "Marketplace",
  "plugins.syncRegistry": "Sync registry",
  "plugins.stopHelper": "Stop helper",
  "schedule.subtitle":
    "Recurring tasks run while Aura is open. Each schedule uses a pre-approved permission profile.",
  "schedule.new": "New schedule",
  "schedule.name": "Name",
  "schedule.project": "Project",
  "schedule.prompt": "Prompt / instructions",
  "schedule.cadence": "Cadence",
  "schedule.permissions": "Permission profile",
  "schedule.create": "Create schedule",
  "schedule.list": "Schedules",
  "schedule.empty": "No scheduled tasks yet.",
  "schedule.next": "next",
  "schedule.details": "Details",
  "schedule.noDescription": "No description",
  "schedule.lastRun": "Last run",
  "schedule.runNow": "Run now",
  "schedule.resume": "Resume",
  "schedule.pause": "Pause",
  "schedule.delete": "Delete",
  "schedule.deleteConfirm": "Delete \"{name}\"?",
  "schedule.history": "Run history",
  "schedule.noRuns": "No runs yet.",
  "schedule.created": "Scheduled task created.",
  "schedule.resumed": "Resumed \"{name}\".",
  "schedule.paused": "Paused \"{name}\".",
  "schedule.manual": "Manual only",
  "schedule.hourly": "Hourly",
  "schedule.daily": "Daily",
  "schedule.weekdays": "Weekdays",
  "schedule.weekly": "Weekly",
  "schedule.custom": "Custom cron",
  "computer.experimental": "Experimental",
  "computer.subtitle":
    "Aura can see the screen and control allowed desktop apps for project {project}. New app access always needs approval.",
  "computer.startHelper": "Start helper",
  "computer.allowedApps": "Allowed applications",
  "computer.noTitle": "(no title)",
  "computer.helperDesc": "Start the computer use helper before tasks can capture the screen.",
  "computer.windowsFound": "Found {count} window(s)",
  "computer.listWindows": "List windows",
  "computer.refresh": "Refresh",
  "computer.blocked": "Blocked by default",
  "computer.blockedDefault": "Sensitive applications",
  "computer.blockedDesc": "Banking, wallets, password managers, and similar apps are blocked.",
  "computer.blockedTag": "blocked",
  "computer.retention": "Screenshot retention",
  "computer.retainOn": "Kept in audit log",
  "computer.retainOff": "Discarded after use",
  "computer.retentionUpdated": "Retention setting updated.",
  "computer.noScreenshots": "No screenshots stored",
  "chat.placeholder": "Ask Aura anything…",
  "chat.send": "Send",
  "chat.runTask": "Run task",
  "chat.autoModel": "Auto (routing)",
  "chat.modeAsk": "Ask-first",
  "chat.modeAct": "Act without asking",
  "chat.thinking": "Thinking…",
  "chat.error": "Something went wrong.",
  "files.title": "File explorer",
  "files.subtitle":
    "Browse project files, edit in Monaco, and approve proposed diffs before they are written.",
  "files.projectFiles": "Project files",
  "files.loading": "Loading…",
  "files.selectFile": "Select a file to preview",
  "files.pendingEdits": "Pending edits (approval required)",
  "files.approveWrite": "Approve write",
  "browser.title": "Browser",
  "browser.subtitle":
    "Built-in WebView for user-visible browsing. Agent automation uses an isolated Chromium profile per project via the browser helper.",
  "browser.helper": "Browser helper (Chromium automation)",
  "browser.running": "Running",
  "browser.stopped": "Stopped",
  "browser.backend": "Backend",
  "browser.profiles": "{count} profile(s) loaded",
  "browser.start": "Start helper",
  "browser.stop": "Stop helper",
  "browser.webview": "WebView",
  "browser.go": "Go",
  "browser.urlPlaceholder": "https://…",
  "browser.urlInvalid": "Only http and https URLs are allowed.",
  "git.title": "Git status & diff",
  "git.subtitle":
    "Review changes and approve commits explicitly. Aura never pushes to remotes automatically.",
  "git.branch": "Branch",
  "git.clean": "clean",
  "git.dirty": "dirty",
  "git.noChanges": "No changes",
  "git.diff": "Diff",
  "git.noDiff": "(no diff)",
  "git.proposeCommit": "Propose commit",
  "git.commitMessage": "Commit message",
  "git.approveCommit": "Approve commit",
  "git.pendingCommits": "Pending commits (approval required)",
  "git.notRepo": "This project folder is not a Git repository yet.",
  "git.loading": "Loading Git status…",
  "git.initRepo": "Initialize Git repository",
  "git.changes": "Changes",
  "cloud.title": "Aura Cloud",
  "cloud.subtitle":
    "E2EE sync and remote dispatch. The cloud server stores encrypted blobs only — API keys never sync.",
  "cloud.server": "Cloud server",
  "cloud.serverReachable": "Aura Cloud reachable",
  "cloud.serverOffline": "Aura Cloud offline",
  "cloud.signInOrRegister": "Sign in or register",
  "cloud.signIn": "Sign in",
  "cloud.register": "Register",
  "cloud.signOut": "Sign out",
  "cloud.account": "Account",
  "cloud.serverUrl": "Server URL",
  "cloud.email": "Email",
  "cloud.password": "Password (min 8)",
  "cloud.displayName": "Display name (register)",
  "cloud.sync": "E2EE sync",
  "cloud.syncDesc": "Sync: tasks, settings, audit logs, plugin metadata — never API keys.",
  "cloud.enableSync": "Enable sync",
  "cloud.disableSync": "Disable sync",
  "cloud.syncNow": "Sync now",
  "cloud.syncHelper": "Cloud sync helper",
  "cloud.startHelper": "Start helper",
  "cloud.stopHelper": "Stop helper",
  "cloud.pairing": "Device pairing",
  "cloud.generatePairing": "Generate pairing code",
  "cloud.pairedDevices": "Paired devices",
  "cloud.noPairedDevices": "No paired devices yet.",
  "cloud.online": "Online",
  "cloud.signedIn": "Signed in",
  "cloud.thisDevice": "This device",
  "cloud.revoke": "Revoke",
  "cloud.notSignedIn": "Not signed in",
  "cloud.syncActive": "E2EE sync active",
  "cloud.syncHelperOffline": "Sync helper offline",
  "cloud.syncDisabled": "Sync disabled",
  "cloud.recoveryKey": "Recovery key",
  "task.plan.planSteps": "Plan · {count} steps",
  "task.plan.proposedPlan": "Proposed plan",
  "task.plan.approved": "Approved",
  "task.plan.approveRun": "Approve & run",
  "task.approval.highRisk": "High risk",
  "task.approval.needsApproval": "Needs approval",
  "task.approval.allowOnce": "Allow once",
  "task.approval.deny": "Deny",
  "task.approval.auditRecorded": "Recorded in audit log",
  "task.summary.complete": "Task complete",
  "task.thinking.default": "Aura is working…",
  "ctx.sidecar": "Agent sidecar",
  "ctx.vm": "Linux workspace",
  "ctx.browser": "Browser helper",
  "ctx.plugins": "Plugins helper",
  "ctx.cloud": "Aura Cloud",
  "ctx.usage": "Usage",
  "ctx.routing": "Routing",
  "sidebar.newProject": "New project",
  "sidebar.newTask": "New task",
  "nav.account": "Account",
  "app.breadcrumb.tasks": "Tasks",
  "chat.fallback.title": "Provider fallback approval",
  "chat.fallback.approve": "Allow fallback",
  "chat.fallback.deny": "Deny",
  "chat.continue": "Continue",
  "chat.continueTask": "Continue task",
  "routing.quality-first.title": "Quality-first",
  "routing.quality-first.subtitle": "Best model for the job. Default.",
  "routing.cost-first.title": "Cost-first",
  "routing.cost-first.subtitle": "Cheapest model that can do the task.",
  "routing.privacy-first.title": "Privacy-first",
  "routing.privacy-first.subtitle": "Prefer local; redact secrets before cloud.",
  "routing.local-only.title": "Local-only",
  "routing.local-only.subtitle": "Ollama only. No cloud requests.",
  "routing.manual.title": "Manual model",
  "routing.manual.subtitle": "Use the model you pick per provider.",
  "chat.you": "You",
  "chat.aura": "Aura",
  "chat.emptyResponse": "No response from the model.",
  "chat.taskFallback": "Task",
  "chat.taskPlaceholder": "Start a new task from the sidebar (+) or use Run task…",
  "task.state": "State",
  "task.welcome.desc": "Chat directly or run a formal task with plan approval and tools.",
  "task.plan.collapsed": "Plan · {count} steps",
  "task.plan.proposed": "Proposed plan",
  "task.thinking.working": "Aura is working…",
  "task.thinking.coordinator": "Coordinator running…",
  "task.sidecar.offlineHint": "Sidecar offline — run npm run sidecar",
  "ctx.linuxWorkspace": "Linux workspace",
  "ctx.vmRunning": "VM running",
  "ctx.vmOffline": "VM offline",
  "ctx.browserHelper": "Browser helper",
  "ctx.browserRunning": "Browser running",
  "ctx.browserOffline": "Browser offline",
  "ctx.pluginsHelper": "Plugins helper",
  "ctx.toolsAvailable": "{count} tools available",
  "ctx.pluginsOffline": "Plugins offline",
  "ctx.auraCloud": "Aura Cloud",
  "ctx.notSignedIn": "Not signed in",
  "ctx.syncActive": "E2EE sync active",
  "ctx.syncOffline": "Sync offline",
  "ctx.syncDisabled": "Sync disabled",
  "ctx.vmOfflineHint": "VM helper offline — npm run vm-helper",
  "ctx.browserOfflineHint": "Browser helper offline — npm run browser-helper",
  "ctx.pluginsOfflineHint": "Plugins helper offline — npm run plugins-helper",
  "ctx.syncOfflineHint": "Cloud sync offline — npm run cloud-sync",
  "sidebar.account": "Account",
};

/** Per-locale overrides — Arabic/Persian use strict isolation (no English fallback). */
export const CATALOG: Record<LocaleId, Partial<MessageCatalog>> = {
  en,
  ar: {
    "app.name": "Aura Work",
    "nav.tasks": "المهام",
    "nav.files": "الملفات",
    "nav.git": "Git",
    "nav.browser": "المتصفح",
    "nav.computer": "استخدام الحاسوب",
    "nav.schedule": "المجدولة",
    "nav.providers": "المزوّدون",
    "nav.plugins": "الإضافات و MCP",
    "nav.memory": "الذاكرة",
    "memory.subtitle": "ذكريات مرتبطة بالمشروع يمكن للوكيل استدعاؤها. الذكريات الجديدة تتطلب موافقتك قبل الحفظ.",
    "memory.pendingTitle": "لا توجد ذكريات معلّقة",
    "memory.pendingDesc": "عندما يقترح الوكيل ذاكرة، ستظهر هنا للموافقة.",
    "memory.saved": "الذكريات المحفوظة",
    "memory.empty": "لا توجد ذكريات محفوظة لهذا المشروع بعد.",
    "memory.pendingSection": "ذاكرة مقترحة · تحتاج موافقة",
    "memory.emptyHint": "عندما يتعلّم الوكيل معلومة مفيدة أثناء مهمة، سيقترحها هنا للموافقة.",
    "memory.approve": "موافقة",
    "memory.reject": "رفض",
    "memory.delete": "حذف",
    "nav.audit": "سجل التدقيق",
    "nav.settings": "الإعدادات",
    "settings.title": "الإعدادات والخزنة",
    "settings.subtitle": "خزنة محلية مشفّرة، اللغة، التحديثات الموقّعة، والتحقق من حزمة التشغيل.",
    "settings.language": "اللغة",
    "settings.languageDesc": "لغة واجهة التطبيق. تستخدم العربية والفارسية تخطيطاً من اليمين إلى اليسار.",
    "settings.systemLanguage": "استخدام لغة النظام",
    "settings.updates": "التحديثات",
    "settings.updatesDesc": "تحديثات داخل التطبيق موقّعة ومُتحقّق منها.",
    "settings.checkUpdates": "التحقق من التحديثات",
    "settings.upToDate": "أنت على أحدث إصدار.",
    "settings.updateAvailable": "تحديث متاح: {version}",
    "settings.packaging": "الحزمة وبيئة التشغيل",
    "settings.packagingDesc": "تتضمن الحزمة Node وصورة Linux VM داخل المثبّت.",
    "settings.vmImage": "التحقق من صورة VM",
    "settings.vmImageOk": "تم التحقق من توقيع صورة VM",
    "settings.vmImageFail": "فشل التحقق من صورة VM",
    "settings.bundledRuntime": "بيئة Node مضمّنة",
    "settings.cliCompanion": "أداة CLI",
    "settings.extension": "إضافة Chrome",
    "settings.cliDesc": "اربط أداة aura CLI عبر الإضافات. لا يمكن للـ CLI تجاوز الصلاحيات.",
    "settings.pet": "الحيوان الأليف لسطح المكتب",
    "settings.petDesc": "اختر رفيقك التفاعلي لسطح المكتب وقم بتخصيصه.",
    "common.save": "حفظ",
    "common.loading": "جارٍ التحميل…",
    "common.cancel": "إلغاء",
    "common.running": "يعمل",
    "common.stopped": "متوقف",
    "common.offline": "غير متصل",
    "common.start": "تشغيل",
    "common.stop": "إيقاف",
    "task.welcome.subtitle": "ماذا تريد أن تعمل عليه؟",
    "task.sidecar.ready": "خدمة الوكيل جاهزة · v1.0.0",
    "task.sidecar.offline": "خدمة الوكيل غير متصلة",
    "lang.en": "English",
    "lang.ar": "العربية",
    "lang.es": "Español",
    "lang.fr": "Français",
    "lang.de": "Deutsch",
    "lang.pt": "Português",
    "lang.zh-CN": "简体中文",
    "lang.zh-TW": "繁體中文",
    "lang.ja": "日本語",
    "lang.ko": "한국어",
    "lang.hi": "हिन्दी",
    "lang.id": "Bahasa Indonesia",
    "lang.tr": "Türkçe",
    "lang.ru": "Русский",
    "lang.it": "Italiano",
    "lang.nl": "Nederlands",
    "lang.pl": "Polski",
    "lang.vi": "Tiếng Việt",
    "lang.th": "ไทย",
    "lang.fa": "فارسی",
    "sidebar.projects": "المشاريع",
    "sidebar.search": "بحث في المشاريع والمهام",
    "sidebar.tasks": "المهام",
    "sidebar.noTasks": "لا توجد مهام بعد",
    "providers.title": "مزوّدو الذكاء الاصطناعي",
    "providers.subtitle": "استخدم مفاتيحك الخاصة. تُخزَّن المفاتيح في خزنة محلية مشفّرة فقط ولا تُزامَن مع Aura Cloud.",
    "providers.routing": "سياسة التوجيه",
    "providers.section": "المزوّدون",
    "providers.active": "مفعّل",
    "providers.local": "محلي",
    "providers.noKey": "لم يُضبط مفتاح",
    "providers.keySet": "المفتاح مضبوط",
    "providers.onDevice": "على الجهاز، لا يلزم مفتاح",
    "providers.keyBtn": "مفتاح",
    "providers.testBtn": "اختبار",
    "providers.loading": "جارٍ تحميل المزوّدين…",
    "providers.modelsCount": "{count} نموذج متاح",
    "settings.languageUpdated": "تم تحديث اللغة.",
    "settings.appearance": "المظهر",
    "settings.appearanceDesc": "اختر ثيماً مدمجاً أو اتبع مظهر نظام التشغيل.",
    "settings.theme": "الثيم",
    "settings.themeDesc": "بدّل فوراً بين الثيمات المدمجة. خيار النظام يتبع وضع الألوان في Windows أو macOS أو Linux.",
    "settings.themeSystem": "النظام",
    "settings.themeLight": "فاتح",
    "settings.themeDark": "داكن",
    "settings.themeAmoled": "AMOLED",
    "settings.themeBlue": "أزرق",
    "settings.themeHighContrast": "تباين عالٍ",
    "settings.themeCyberpunk": "سايبربانك",
    "settings.themeForest": "غابة",
    "settings.themePastel": "باستيل",
    "settings.themeSunset": "غروب الشمس",
    "settings.themeSepia": "عتيق",
    "settings.themeNord": "نورد",
    "settings.themeDracula": "دراكولا",
    "settings.themeMatrix": "ماتريكس",
    "settings.themeSakura": "ساكورا",
    "settings.themeSakuraDark": "ساكورا الداكن",
    "settings.themeCoffee": "قهوة",
    "settings.themeOcean": "محيط",
    "settings.themeUpdated": "تم تحديث الثيم.",
    "settings.vm": "مساحة Linux (VM)",
    "settings.vmStart": "تشغيل مساحة Linux",
    "settings.vmStop": "إيقاف مساحة Linux",
    "settings.vmStarted": "تم تشغيل مساحة Linux.",
    "settings.vmStopped": "تم إيقاف مساحة Linux.",
    "settings.browser": "مساعد المتصفح (Chromium)",
    "settings.browserStart": "تشغيل مساعد المتصفح",
    "settings.browserStop": "إيقاف مساعد المتصفح",
    "settings.browserStarted": "تم تشغيل مساعد المتصفح.",
    "settings.browserStopped": "تم إيقاف مساعد المتصفح.",
    "settings.plugins": "مساعد الإضافات",
    "settings.pluginsStart": "تشغيل مساعد الإضافات",
    "settings.pluginsStop": "إيقاف مساعد الإضافات",
    "settings.pluginsStarted": "تم تشغيل مساعد الإضافات.",
    "settings.pluginsStopped": "تم إيقاف مساعد الإضافات.",
    "settings.vault": "حالة الخزنة",
    "settings.vaultEncrypted": "خزنة مشفرة",
    "settings.vaultExport": "تصدير الخزنة",
    "settings.vaultImport": "استيراد الخزنة",
    "settings.vaultExportPw": "كلمة مرور التصدير (8 أحرف على الأقل)",
    "settings.vaultImportData": "ملف التصدير (base64)",
    "settings.vaultExportBtn": "تصدير ونسخ",
    "settings.vaultImportBtn": "استيراد الخزنة",
    "settings.vaultExported": "تم تصدير الخزنة إلى الحافظة. احفظها بأمان.",
    "settings.vaultImported": "تم استيراد الخزنة بنجاح.",
    "settings.pricing": "أسعار النماذج",
    "settings.pricingDesc": "جلب بيانات أسعار النماذج المحدّثة. يُستخدم الذاكرة المؤقتة المحلية عند تعذّر الاتصال.",
    "settings.pricingBtn": "تحديث الأسعار",
    "settings.bundled": "مضمّن",
    "settings.sidecars": "خدمات جانبية",
    "app.loadingProjects": "جارٍ تحميل المشاريع…",
    "app.noProjectsTitle": "لا توجد مشاريع بعد",
    "app.noProjectsDesc": "أنشئ مشروعاً لربط مجلد محلي.",
    "app.newProject": "مشروع جديد",
    "provider.key.localDesc": "يعمل Ollama محلياً ولا يحتاج إلى مفتاح API. اضبط عنوان URL إذا لم يكن على المنفذ الافتراضي.",
    "provider.key.cloudDesc": "تُخزَّن مفاتيح API في الخزنة المحلية المشفّرة فقط. لا تظهر في قاعدة البيانات أو السجلات.",
    "provider.key.apiKey": "مفتاح API",
    "provider.key.baseUrl": "عنوان الخدمة",
    "provider.key.remove": "إزالة المفتاح",
    "provider.key.saved": "تم حفظ المفتاح. جارٍ جلب النماذج…",
    "provider.key.fetchingModels": "تم تحميل {count} نموذج.",
    "provider.key.authMethod": "طريقة تسجيل الدخول",
    "provider.key.codexAccount": "ChatGPT (Codex)",
    "provider.key.googleAccount": "حساب Google",
    "provider.key.claudeAccount": "حساب Claude",
    "provider.key.apiKeyMode": "مفتاح API",
    "provider.key.codexDesc": "استخدم اشتراك ChatGPT. اضغط اتصال — يظهر رمز الجهاز هنا. سجّل الدخول من الرابط وأدخل الرمز.",
    "provider.key.connectCodex": "ربط حساب ChatGPT",
    "provider.key.connectGoogle": "ربط حساب Google",
    "provider.key.connectClaude": "ربط حساب Claude",
    "provider.key.codexConnected": "تم ربط حساب ChatGPT.",
    "provider.key.codexWaiting": "بانتظار تسجيل الدخول من المتصفح… أكمل الدخول في نافذة المتصفح.",
    "provider.key.codexDeviceHint": "جارٍ بدء تسجيل الدخول برمز الجهاز…",
    "provider.key.codexDevicePolling": "بانتظار تسجيل الدخول… ({seconds} ث)",
    "provider.key.codexDeviceCode": "افتح الرابط أدناه، سجّل دخول ChatGPT، وأدخل هذا الرمز:",
    "provider.key.codexDeviceCodeLabel": "رمز الجهاز",
    "provider.key.codexDeviceOpenLink": "فتح صفحة تسجيل الدخول",
    "provider.key.codexDeviceTimeout": "انتهت مهلة تسجيل الدخول. اضغط اتصال مرة أخرى بعد إدخال الرمز.",
    "provider.key.codexDeviceBrowserOpened":
      "يُفترض أن يفتح المتصفح لتسجيل دخول ChatGPT. أدخل رمز الجهاز الظاهر أدناه في تلك الصفحة.",
    "provider.key.codexBrowserOpened":
      "يُفترض أن يفتح المتصفح لتسجيل دخول ChatGPT. أكمل الدخول هناك — Aura Work سيتصل تلقائياً.",
    "plugins.subtitle": "وسّع Aura بالإضافات وخوادم MCP. الصلاحيات محددة لكل مشروع وكل استدعاء أداة مُدقَّق.",
    "plugins.addPlugin": "إضافة إضافة",
    "plugins.installed": "الإضافات المثبتة",
    "plugins.active": "مفعّلة",
    "plugins.tools": "أدوات",
    "plugins.helper": "مساعد الإضافات",
    "plugins.helperOffline": "شغّل المساعد لتحميل الإضافات وخوادم MCP.",
    "plugins.empty": "لا توجد إضافات مثبتة بعد.",
    "plugins.scopeLocal": "تثبيت محلي",
    "plugins.uninstall": "إلغاء التثبيت",
    "plugins.mcpServers": "خوادم MCP",
    "plugins.running": "تعمل",
    "plugins.addServer": "إضافة خادم",
    "plugins.serverName": "اسم الخادم",
    "plugins.command": "الأمر",
    "plugins.args": "المعاملات",
    "plugins.added": "تمت إضافة خادم MCP",
    "plugins.noMcp": "لا توجد خوادم MCP.",
    "plugins.remove": "إزالة",
    "plugins.marketplace": "السوق",
    "plugins.syncRegistry": "مزامنة السجل",
    "plugins.stopHelper": "إيقاف المساعد",
    "schedule.subtitle": "المهام المتكررة تعمل أثناء فتح Aura. كل جدولة تستخدم ملف صلاحيات معتمد مسبقاً.",
    "schedule.new": "جدولة جديدة",
    "schedule.name": "الاسم",
    "schedule.project": "المشروع",
    "schedule.prompt": "التعليمات",
    "schedule.cadence": "التكرار",
    "schedule.permissions": "ملف الصلاحيات",
    "schedule.create": "إنشاء جدولة",
    "schedule.list": "الجدولات",
    "schedule.empty": "لا توجد مهام مجدولة بعد.",
    "schedule.next": "التالي",
    "schedule.details": "التفاصيل",
    "schedule.noDescription": "بدون وصف",
    "schedule.lastRun": "آخر تشغيل",
    "schedule.runNow": "تشغيل الآن",
    "schedule.resume": "استئناف",
    "schedule.pause": "إيقاف مؤقت",
    "schedule.delete": "حذف",
    "schedule.deleteConfirm": "حذف \"{name}\"؟",
    "schedule.history": "سجل التشغيل",
    "schedule.noRuns": "لا توجد عمليات تشغيل بعد.",
    "schedule.created": "تم إنشاء المهمة المجدولة.",
    "schedule.resumed": "تم استئناف \"{name}\".",
    "schedule.paused": "تم إيقاف \"{name}\" مؤقتاً.",
    "schedule.manual": "يدوي فقط",
    "schedule.hourly": "كل ساعة",
    "schedule.daily": "يومياً",
    "schedule.weekdays": "أيام الأسبوع",
    "schedule.weekly": "أسبوعياً",
    "schedule.custom": "تكرار Cron مخصص",
    "computer.experimental": "تجريبي",
    "computer.subtitle": "يمكن لـ Aura رؤية الشاشة والتحكم بالتطبيقات المسموحة للمشروع {project}. الوصول الجديد يحتاج موافقة.",
    "computer.startHelper": "تشغيل المساعد",
    "computer.allowedApps": "التطبيقات المسموحة",
    "computer.noTitle": "(بدون عنوان)",
    "computer.helperDesc": "شغّل مساعد استخدام الحاسوب قبل التقاط الشاشة.",
    "computer.windowsFound": "وُجد {count} نافذة",
    "computer.listWindows": "عرض النوافذ",
    "computer.refresh": "تحديث",
    "computer.blocked": "محظور افتراضياً",
    "computer.blockedDefault": "تطبيقات حساسة",
    "computer.blockedDesc": "البنوك والمحافظ ومديرو كلمات المرور محظورون.",
    "computer.blockedTag": "محظور",
    "computer.retention": "الاحتفاظ بلقطات الشاشة",
    "computer.retainOn": "محفوظ في سجل التدقيق",
    "computer.retainOff": "يُحذف بعد الاستخدام",
    "computer.retentionUpdated": "تم تحديث إعداد الاحتفاظ.",
    "computer.noScreenshots": "لا توجد لقطات محفوظة",
    "chat.placeholder": "اسأل Aura أي شيء…",
    "chat.send": "إرسال",
    "chat.runTask": "تشغيل مهمة",
    "chat.autoModel": "تلقائي (التوجيه)",
    "chat.modeAsk": "اسأل أولاً",
    "chat.modeAct": "نفّذ بدون سؤال",
    "chat.thinking": "يفكّر…",
    "chat.error": "حدث خطأ.",
    "files.title": "مستكشف الملفات",
    "files.subtitle":
      "تصفّح ملفات المشروع، وحرّر في Monaco، ووافق على الفروقات المقترحة قبل كتابتها.",
    "files.projectFiles": "ملفات المشروع",
    "files.loading": "جارٍ التحميل…",
    "files.selectFile": "اختر ملفاً للمعاينة",
    "files.pendingEdits": "تعديلات معلّقة (تتطلب موافقة)",
    "files.approveWrite": "الموافقة على الكتابة",
    "browser.title": "المتصفح",
    "browser.subtitle":
      "WebView مدمج للتصفح المرئي. يستخدم الوكيل ملف Chromium معزولاً لكل مشروع عبر مساعد المتصفح.",
    "browser.helper": "مساعد المتصفح (أتمتة Chromium)",
    "browser.running": "يعمل",
    "browser.stopped": "متوقف",
    "browser.backend": "الخلفية",
    "browser.profiles": "تم تحميل {count} ملف شخصي",
    "browser.start": "تشغيل المساعد",
    "browser.stop": "إيقاف المساعد",
    "browser.webview": "WebView",
    "browser.go": "انتقال",
    "browser.urlPlaceholder": "https://…",
    "browser.urlInvalid": "يُسمح فقط بعناوين http و https.",
    "git.title": "حالة Git والفروقات",
    "git.subtitle":
      "راجع التغييرات ووافق على الالتزامات صراحةً. لا يدفع Aura إلى المستودعات البعيدة تلقائياً.",
    "git.branch": "الفرع",
    "git.clean": "نظيف",
    "git.dirty": "غير نظيف",
    "git.noChanges": "لا توجد تغييرات",
    "git.diff": "الفرق",
    "git.noDiff": "(لا يوجد فرق)",
    "git.proposeCommit": "اقتراح التزام",
    "git.commitMessage": "رسالة الالتزام",
    "git.approveCommit": "الموافقة على الالتزام",
    "git.pendingCommits": "التزامات معلّقة (تتطلب موافقة)",
    "git.notRepo": "مجلد المشروع ليس مستودع Git بعد.",
    "git.loading": "جارٍ تحميل حالة Git…",
    "git.initRepo": "تهيئة مستودع Git",
    "git.changes": "التغييرات",
    "cloud.title": "Aura Cloud",
    "cloud.subtitle":
      "مزامنة E2EE وإرسال عن بُعد. يخزّن الخادم السحابي كتلًا مشفّرة فقط — مفاتيح API لا تُزامَن أبداً.",
    "cloud.server": "الخادم السحابي",
    "cloud.serverReachable": "Aura Cloud متاح",
    "cloud.serverOffline": "Aura Cloud غير متصل",
    "cloud.signInOrRegister": "تسجيل الدخول أو التسجيل",
    "cloud.signIn": "تسجيل الدخول",
    "cloud.register": "تسجيل",
    "cloud.signOut": "تسجيل الخروج",
    "cloud.account": "الحساب",
    "cloud.serverUrl": "عنوان الخادم",
    "cloud.email": "البريد الإلكتروني",
    "cloud.password": "كلمة المرور (8 أحرف على الأقل)",
    "cloud.displayName": "اسم العرض (التسجيل)",
    "cloud.sync": "مزامنة E2EE",
    "cloud.syncDesc": "المزامنة: المهام، الإعدادات، سجلات التدقيق، بيانات الإضافات — وليس مفاتيح API.",
    "cloud.enableSync": "تفعيل المزامنة",
    "cloud.disableSync": "تعطيل المزامنة",
    "cloud.syncNow": "مزامنة الآن",
    "cloud.syncHelper": "مساعد المزامنة السحابية",
    "cloud.startHelper": "تشغيل المساعد",
    "cloud.stopHelper": "إيقاف المساعد",
    "cloud.pairing": "إقران الأجهزة",
    "cloud.generatePairing": "إنشاء رمز إقران",
    "cloud.pairedDevices": "الأجهزة المقترنة",
    "cloud.noPairedDevices": "لا توجد أجهزة مقترنة بعد.",
    "cloud.online": "متصل",
    "cloud.signedIn": "مسجّل الدخول",
    "cloud.thisDevice": "هذا الجهاز",
    "cloud.revoke": "إلغاء الإقران",
    "cloud.notSignedIn": "لم تسجّل الدخول",
    "cloud.syncActive": "مزامنة E2EE نشطة",
    "cloud.syncHelperOffline": "مساعد المزامنة غير متصل",
    "cloud.syncDisabled": "المزامنة معطّلة",
    "cloud.recoveryKey": "مفتاح الاسترداد",
    "task.plan.planSteps": "الخطة · {count} خطوات",
    "task.plan.proposedPlan": "خطة مقترحة",
    "task.plan.approved": "موافق عليها",
    "task.plan.approveRun": "الموافقة والتشغيل",
    "task.approval.highRisk": "خطر مرتفع",
    "task.approval.needsApproval": "يتطلب موافقة",
    "task.approval.allowOnce": "السماح مرة واحدة",
    "task.approval.deny": "رفض",
    "task.approval.auditRecorded": "مُسجَّل في سجل التدقيق",
    "task.summary.complete": "اكتملت المهمة",
    "task.thinking.default": "Aura قيد العمل…",
    "ctx.sidecar": "خدمة الوكيل",
    "ctx.vm": "مساحة Linux",
    "ctx.browser": "مساعد المتصفح",
    "ctx.plugins": "مساعد الإضافات",
    "ctx.cloud": "Aura Cloud",
    "ctx.usage": "الاستخدام",
    "ctx.routing": "التوجيه",
    "sidebar.newProject": "مشروع جديد",
    "sidebar.newTask": "مهمة جديدة",
    "nav.account": "الحساب",
    "app.breadcrumb.tasks": "المهام",
    "chat.fallback.title": "الموافقة على التبديل الاحتياطي للمزوّد",
    "chat.fallback.approve": "السماح بالتبديل",
    "chat.fallback.deny": "رفض",
    "chat.continue": "متابعة",
    "chat.continueTask": "متابعة المهمة",
    "routing.quality-first.title": "الجودة أولاً",
    "routing.quality-first.subtitle": "أفضل نموذج للمهمة. الافتراضي.",
    "routing.cost-first.title": "التكلفة أولاً",
    "routing.cost-first.subtitle": "أرخص نموذج يمكنه إنجاز المهمة.",
    "routing.privacy-first.title": "الخصوصية أولاً",
    "routing.privacy-first.subtitle": "تفضيل المحلي وحذف الأسرار قبل إرسالها للسحاب.",
    "routing.local-only.title": "محلي فقط",
    "routing.local-only.subtitle": "تشغيل عبر Ollama فقط. بدون طلبات سحابية.",
    "routing.manual.title": "نموذج يدوي",
    "routing.manual.subtitle": "استخدم النموذج الذي تختاره لكل مزوّد.",
    "chat.you": "أنت",
    "chat.aura": "Aura",
    "chat.emptyResponse": "لا استجابة من النموذج.",
    "chat.taskFallback": "مهمة",
    "chat.taskPlaceholder": "ابدأ مهمة جديدة من الشريط الجانبي (+) أو استخدم تشغيل مهمة…",
    "task.state": "الحالة",
    "task.welcome.desc": "تحدّث مباشرة أو شغّل مهمة رسمية مع موافقة على الخطة والأدوات.",
    "task.plan.collapsed": "الخطة · {count} خطوات",
    "task.plan.proposed": "خطة مقترحة",
    "task.thinking.working": "Aura قيد العمل…",
    "task.thinking.coordinator": "المنسّق يعمل…",
    "task.sidecar.offlineHint": "خدمة الوكيل غير متصلة — شغّل npm run sidecar",
    "ctx.linuxWorkspace": "مساحة Linux",
    "ctx.vmRunning": "الآلة الافتراضية تعمل",
    "ctx.vmOffline": "الآلة الافتراضية متوقفة",
    "ctx.browserHelper": "مساعد المتصفح",
    "ctx.browserRunning": "المتصفح يعمل",
    "ctx.browserOffline": "المتصفح متوقف",
    "ctx.pluginsHelper": "مساعد الإضافات",
    "ctx.toolsAvailable": "{count} أداة متاحة",
    "ctx.pluginsOffline": "الإضافات متوقفة",
    "ctx.auraCloud": "Aura Cloud",
    "ctx.notSignedIn": "لم تسجّل الدخول",
    "ctx.syncActive": "مزامنة E2EE نشطة",
    "ctx.syncOffline": "المزامنة متوقفة",
    "ctx.syncDisabled": "المزامنة معطّلة",
    "ctx.vmOfflineHint": "مساعد VM غير متصل — npm run vm-helper",
    "ctx.browserOfflineHint": "مساعد المتصفح غير متصل — npm run browser-helper",
    "ctx.pluginsOfflineHint": "مساعد الإضافات غير متصل — npm run plugins-helper",
    "ctx.syncOfflineHint": "مزامنة السحابة غير متصلة — npm run cloud-sync",
    "sidebar.account": "الحساب",
  },
  es: {
    "nav.tasks": "Tareas",
    "nav.files": "Archivos",
    "nav.browser": "Navegador",
    "nav.settings": "Ajustes",
    "settings.title": "Ajustes y bóveda",
    "settings.language": "Idioma",
    "settings.updates": "Actualizaciones",
    "settings.checkUpdates": "Buscar actualizaciones",
    "common.save": "Guardar",
  },
  fr: {
    "nav.tasks": "Tâches",
    "nav.files": "Fichiers",
    "nav.browser": "Navigateur",
    "nav.settings": "Paramètres",
    "settings.title": "Paramètres et coffre",
    "settings.language": "Langue",
    "settings.updates": "Mises à jour",
    "settings.checkUpdates": "Rechercher des mises à jour",
    "common.save": "Enregistrer",
  },
  de: {
    "nav.tasks": "Aufgaben",
    "nav.files": "Dateien",
    "nav.settings": "Einstellungen",
    "settings.title": "Einstellungen & Tresor",
    "settings.language": "Sprache",
    "settings.updates": "Updates",
    "settings.checkUpdates": "Nach Updates suchen",
    "common.save": "Speichern",
  },
  pt: {
    "nav.tasks": "Tarefas",
    "nav.files": "Arquivos",
    "nav.settings": "Configurações",
    "settings.title": "Configurações e cofre",
    "settings.language": "Idioma",
    "common.save": "Salvar",
  },
  "zh-CN": {
    "nav.tasks": "任务",
    "nav.files": "文件",
    "nav.settings": "设置",
    "settings.title": "设置与保险库",
    "settings.language": "语言",
    "common.save": "保存",
  },
  "zh-TW": {
    "nav.tasks": "任務",
    "nav.files": "檔案",
    "nav.settings": "設定",
    "settings.title": "設定與保險庫",
    "settings.language": "語言",
    "common.save": "儲存",
  },
  ja: {
    "nav.tasks": "タスク",
    "nav.files": "ファイル",
    "nav.settings": "設定",
    "settings.title": "設定とボルト",
    "settings.language": "言語",
    "common.save": "保存",
  },
  ko: {
    "nav.tasks": "작업",
    "nav.files": "파일",
    "nav.settings": "설정",
    "settings.title": "설정 및 금고",
    "settings.language": "언어",
    "common.save": "저장",
  },
  hi: {
    "nav.tasks": "कार्य",
    "nav.files": "फ़ाइलें",
    "nav.settings": "सेटिंग्स",
    "settings.language": "भाषा",
    "common.save": "सहेजें",
  },
  id: {
    "nav.tasks": "Tugas",
    "nav.files": "Berkas",
    "nav.settings": "Pengaturan",
    "settings.language": "Bahasa",
    "common.save": "Simpan",
  },
  tr: {
    "nav.tasks": "Görevler",
    "nav.files": "Dosyalar",
    "nav.settings": "Ayarlar",
    "settings.language": "Dil",
    "common.save": "Kaydet",
  },
  ru: {
    "nav.tasks": "Задачи",
    "nav.files": "Файлы",
    "nav.settings": "Настройки",
    "settings.language": "Язык",
    "common.save": "Сохранить",
  },
  it: {
    "nav.tasks": "Attività",
    "nav.files": "File",
    "nav.settings": "Impostazioni",
    "settings.language": "Lingua",
    "common.save": "Salva",
  },
  nl: {
    "nav.tasks": "Taken",
    "nav.files": "Bestanden",
    "nav.settings": "Instellingen",
    "settings.language": "Taal",
    "common.save": "Opslaan",
  },
  pl: {
    "nav.tasks": "Zadania",
    "nav.files": "Pliki",
    "nav.settings": "Ustawienia",
    "settings.language": "Język",
    "common.save": "Zapisz",
  },
  vi: {
    "nav.tasks": "Tác vụ",
    "nav.files": "Tệp",
    "nav.settings": "Cài đặt",
    "settings.language": "Ngôn ngữ",
    "common.save": "Lưu",
  },
  th: {
    "nav.tasks": "งาน",
    "nav.files": "ไฟล์",
    "nav.settings": "การตั้งค่า",
    "settings.language": "ภาษา",
    "common.save": "บันทึก",
  },
  fa: {
    "nav.tasks": "وظایف",
    "nav.files": "فایل‌ها",
    "nav.browser": "مرورگر",
    "nav.settings": "تنظیمات",
    "settings.title": "تنظیمات و خزانه",
    "settings.language": "زبان",
    "settings.languageDesc": "زبان رابط برنامه. فارسی و عربی از چیدمان RTL استفاده می‌کنند.",
    "common.save": "ذخیره",
    "common.loading": "در حال بارگذاری…",
  },
};

export const STRICT_LOCALES: LocaleId[] = ["ar"];

export function resolveCatalog(locale: LocaleId): MessageCatalog {
  const overrides = CATALOG[locale] ?? {};
  if (locale === "en") return { ...en, ...overrides };
  if (STRICT_LOCALES.includes(locale)) {
    const result = {} as MessageCatalog;
    for (const key of Object.keys(en) as (keyof MessageCatalog)[]) {
      result[key] = overrides[key] ?? "";
    }
    return result;
  }
  return { ...en, ...overrides };
}
