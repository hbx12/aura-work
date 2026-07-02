import fs from 'fs';

const data = JSON.parse(fs.readFileSync('registry/marketplace.json', 'utf8'));

const newItems = [
  // === Skills ===
  {
    id: 'skill.aura-code-review',
    type: 'skill',
    name: 'Code Review',
    version: '1.0.0',
    summary: 'Automated code review with best practices, security checks, and style enforcement.',
    description: 'A code review skill that analyzes code for bugs, security vulnerabilities, performance issues, and style violations. Provides detailed feedback with suggestions for improvement.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'aura-code-review/icon.svg',
    cover: 'aura-code-review/cover.svg',
    categories: ['Quality', 'Security', 'Development'],
    tags: ['code-review', 'linting', 'security', 'best-practices'],
    risk: 'low',
    auth: { type: 'none' },
    install: { kind: 'skill', prompt: 'You are Aura Code Review. Analyze code for bugs, security vulnerabilities, performance issues, and style violations. Provide detailed feedback with specific suggestions for improvement.' },
    permissions: ['read_file'],
    setup: ['Install the skill from Aura Marketplace.', 'Provide code files or directories to review.', 'Review the detailed feedback report.'],
    tools: [
      { name: 'review_code', description: 'Review code for issues and improvements.' },
      { name: 'generate_report', description: 'Generate a detailed code review report.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'مراجعة الكود', summary: 'مراجعة آلية للكود مع أفضل الممارسات وفحص الأمان وإنفاذ الأسلوب.', description: 'مهارة مراجعة الكود التي تحلل الكود بحثاً عن الأخطاء والثغرات الأمنية ومشاكل الأداء وانتهاكات الأسلوب.', setup: ['ثبّت المهارة من متجر Aura.', 'قدم ملفات الكود للمراجعة.', 'راجع تقرير المراجعة المفصل.'], tools: [{ name: 'مراجعة الكود', description: 'مراجعة الكود للمشاكل والتحسينات.' }, { name: 'إنشاء تقرير', description: 'إنشاء تقرير مراجعة كود مفصل.' }], categories: ['جودة', 'أمان', 'تطوير'] }
    }
  },
  {
    id: 'skill.aura-testing',
    type: 'skill',
    name: 'Test Generator',
    version: '1.0.0',
    summary: 'Generate unit tests, integration tests, and e2e tests automatically.',
    description: 'A test generation skill that creates comprehensive test suites for your code. Supports unit tests, integration tests, and end-to-end tests with multiple testing frameworks.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'aura-testing/icon.svg',
    cover: 'aura-testing/cover.svg',
    categories: ['Testing', 'Quality', 'Development'],
    tags: ['testing', 'unit-tests', 'integration-tests', 'e2e'],
    risk: 'low',
    auth: { type: 'none' },
    install: { kind: 'skill', prompt: 'You are Aura Test Generator. Generate comprehensive test suites for code. Support unit tests, integration tests, and end-to-end tests with multiple testing frameworks.' },
    permissions: ['read_file', 'write_file'],
    setup: ['Install the skill from Aura Marketplace.', 'Provide code files to generate tests for.', 'Review and run the generated tests.'],
    tools: [
      { name: 'generate_unit_tests', description: 'Generate unit tests for code.' },
      { name: 'generate_integration_tests', description: 'Generate integration tests.' },
      { name: 'generate_e2e_tests', description: 'Generate end-to-end tests.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'مولد الاختبارات', summary: 'إنشاء اختبارات وحدة واختبارات تكامل واختبارات شاملة تلقائياً.', description: 'مهارة إنشاء الاختبارات التي تنشئ مجموعات اختبارات شاملة للكود. تدعم اختبارات الوحدة والتكامل والاختبارات الشاملة.', setup: ['ثبّت المهارة من متجر Aura.', 'قدم ملفات الكود لإنشاء الاختبارات.', 'راجع وشغّل الاختبارات المُنشأة.'], tools: [{ name: 'إنشاء اختبارات وحدة', description: 'إنشاء اختبارات وحدة للكود.' }, { name: 'إنشاء اختبارات تكامل', description: 'إنشاء اختبارات تكامل.' }, { name: 'إنشاء اختبارات شاملة', description: 'إنشاء اختبارات شاملة.' }], categories: ['اختبار', 'جودة', 'تطوير'] }
    }
  },
  {
    id: 'skill.aura-api-docs',
    type: 'skill',
    name: 'API Documentation',
    version: '1.0.0',
    summary: 'Generate OpenAPI/Swagger documentation from code and comments.',
    description: 'An API documentation skill that generates comprehensive API documentation from code comments and annotations. Supports OpenAPI/Swagger, GraphQL, and REST APIs.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'aura-api-docs/icon.svg',
    cover: 'aura-api-docs/cover.svg',
    categories: ['Documentation', 'API', 'Development'],
    tags: ['api', 'documentation', 'openapi', 'swagger'],
    risk: 'low',
    auth: { type: 'none' },
    install: { kind: 'skill', prompt: 'You are Aura API Documentation. Generate comprehensive API documentation from code comments and annotations. Support OpenAPI/Swagger, GraphQL, and REST APIs.' },
    permissions: ['read_file', 'write_file'],
    setup: ['Install the skill from Aura Marketplace.', 'Provide API code files.', 'Generate and review documentation.'],
    tools: [
      { name: 'generate_openapi', description: 'Generate OpenAPI/Swagger documentation.' },
      { name: 'generate_graphql_docs', description: 'Generate GraphQL documentation.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'توثيق API', summary: 'إنشاء توثيق OpenAPI/Swagger من الكود والتعليقات.', description: 'مهارة توثيق API التي تنشئ توثيقاً شاملاً من تعليقات الكود والتعليقات التوضيحية. تدعم OpenAPI/Swagger و GraphQL و REST APIs.', setup: ['ثبّت المهارة من متجر Aura.', 'قدم ملفات كود API.', 'أنشئ وراجع التوثيق.'], tools: [{ name: 'إنشاء OpenAPI', description: 'إنشاء توثيق OpenAPI/Swagger.' }, { name: 'إنشاء GraphQL', description: 'إنشاء توثيق GraphQL.' }], categories: ['توثيق', 'API', 'تطوير'] }
    }
  },
  // === MCP Connectors ===
  {
    id: 'mcp.github',
    type: 'mcp',
    name: 'GitHub MCP',
    version: '1.0.0',
    summary: 'Interact with GitHub repositories, issues, pull requests, and more.',
    description: 'MCP connector for GitHub API. Enables managing repositories, issues, pull requests, files, and comments using a personal access token.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-github/icon.svg',
    cover: 'mcp-github/cover.svg',
    categories: ['Development', 'Integration', 'Git'],
    tags: ['github', 'git', 'repositories', 'issues', 'pull-requests'],
    risk: 'medium',
    auth: { type: 'token', description: 'GitHub Personal Access Token' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-github'] },
    permissions: ['network'],
    setup: ['Create a GitHub Personal Access Token.', 'Copy the token to Aura vault.', 'Configure repository access.'],
    tools: [
      { name: 'list_repos', description: 'List repositories.' },
      { name: 'create_issue', description: 'Create a new issue.' },
      { name: 'create_pr', description: 'Create a pull request.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'GitHub MCP', summary: 'التفاعل مع مستودعات GitHub والقضايا وطلبات السحب.', description: 'موصل MCP لـ GitHub API. يتيح إدارة المستودعات والقضايا وطلبات السحب والملفات والتعليقات.', setup: ['أنشئ GitHub Personal Access Token.', 'انسخ الرمز إلى خزنة Aura.', 'Configure وصول المستودعات.'], tools: [{ name: 'قائمة المستودعات', description: 'عرض المستودعات.' }, { name: 'إنشاء قضية', description: 'إنشاء قضية جديدة.' }, { name: 'إنشاء طلب سحب', description: 'إنشاء طلب سحب.' }], categories: ['تطوير', 'تكامل', 'Git'] }
    }
  },
  {
    id: 'mcp.gitlab',
    type: 'mcp',
    name: 'GitLab MCP',
    version: '1.0.0',
    summary: 'Interact with GitLab repositories, issues, merge requests, and CI/CD.',
    description: 'MCP connector for GitLab API. Enables managing repositories, issues, merge requests, and CI/CD pipelines.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-gitlab/icon.svg',
    cover: 'mcp-gitlab/cover.svg',
    categories: ['Development', 'Integration', 'Git'],
    tags: ['gitlab', 'git', 'ci-cd', 'merge-requests'],
    risk: 'medium',
    auth: { type: 'token', description: 'GitLab Personal Access Token' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-gitlab'] },
    permissions: ['network'],
    setup: ['Create a GitLab Personal Access Token.', 'Copy the token to Aura vault.'],
    tools: [
      { name: 'list_projects', description: 'List projects.' },
      { name: 'create_issue', description: 'Create a new issue.' },
      { name: 'create_merge_request', description: 'Create a merge request.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'GitLab MCP', summary: 'التفاعل مع مستودعات GitLab والقضايا وطلبات الدمج و CI/CD.', description: 'موصل MCP لـ GitLab API. يتيح إدارة المستودعات والقضايا وطلبات الدمج وخطوط CI/CD.', setup: ['أنشئ GitLab Personal Access Token.', 'انسخ الرمز إلى خزنة Aura.'], tools: [{ name: 'قائمة المشاريع', description: 'عرض المشاريع.' }, { name: 'إنشاء قضية', description: 'إنشاء قضية جديدة.' }, { name: 'إنشاء طلب دمج', description: 'إنشاء طلب دمج.' }], categories: ['تطوير', 'تكامل', 'Git'] }
    }
  },
  {
    id: 'mcp.jira',
    type: 'mcp',
    name: 'Jira MCP',
    version: '1.0.0',
    summary: 'Interact with Jira issues, projects, and sprints.',
    description: 'MCP connector for Jira API. Enables managing issues, projects, sprints, and workflows.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-jira/icon.svg',
    cover: 'mcp-jira/cover.svg',
    categories: ['Project Management', 'Integration', 'Productivity'],
    tags: ['jira', 'project-management', 'issues', 'sprints'],
    risk: 'medium',
    auth: { type: 'token', description: 'Jira API Token' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-jira'] },
    permissions: ['network'],
    setup: ['Create a Jira API Token.', 'Copy the token to Aura vault.'],
    tools: [
      { name: 'list_issues', description: 'List issues.' },
      { name: 'create_issue', description: 'Create a new issue.' },
      { name: 'update_issue', description: 'Update an issue.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'Jira MCP', summary: 'التفاعل مع قضايا Jira والمشاريع والسباقات.', description: 'موصل MCP لـ Jira API. يتيح إدارة القضايا والمشاريع والسباقات وسير العمل.', setup: ['أنشئ Jira API Token.', 'انسخ الرمز إلى خزنة Aura.'], tools: [{ name: 'قائمة القضايا', description: 'عرض القضايا.' }, { name: 'إنشاء قضية', description: 'إنشاء قضية جديدة.' }, { name: 'تحديث قضية', description: 'تحديث قضية.' }], categories: ['إدارة مشاريع', 'تكامل', 'إنتاجية'] }
    }
  },
  {
    id: 'mcp.linear',
    type: 'mcp',
    name: 'Linear MCP',
    version: '1.0.0',
    summary: 'Interact with Linear issues, projects, and cycles.',
    description: 'MCP connector for Linear API. Enables managing issues, projects, cycles, and teams.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-linear/icon.svg',
    cover: 'mcp-linear/cover.svg',
    categories: ['Project Management', 'Integration', 'Productivity'],
    tags: ['linear', 'project-management', 'issues', 'cycles'],
    risk: 'medium',
    auth: { type: 'token', description: 'Linear API Key' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-linear'] },
    permissions: ['network'],
    setup: ['Create a Linear API Key.', 'Copy the key to Aura vault.'],
    tools: [
      { name: 'list_issues', description: 'List issues.' },
      { name: 'create_issue', description: 'Create a new issue.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'Linear MCP', summary: 'التفاعل مع قضايا Linear والمشاريع والدورات.', description: 'موصل MCP لـ Linear API. يتيح إدارة القضايا والمشاريع والدورات والفرق.', setup: ['أنشئ Linear API Key.', 'انسخ المفتاح إلى خزنة Aura.'], tools: [{ name: 'قائمة القضايا', description: 'عرض القضايا.' }, { name: 'إنشاء قضية', description: 'إنشاء قضية جديدة.' }], categories: ['إدارة مشاريع', 'تكامل', 'إنتاجية'] }
    }
  },
  {
    id: 'mcp.figma',
    type: 'mcp',
    name: 'Figma MCP',
    version: '1.0.0',
    summary: 'Interact with Figma designs, components, and assets.',
    description: 'MCP connector for Figma API. Enables reading designs, extracting components, and downloading assets.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-figma/icon.svg',
    cover: 'mcp-figma/cover.svg',
    categories: ['Design', 'Integration', 'Productivity'],
    tags: ['figma', 'design', 'ui', 'components'],
    risk: 'medium',
    auth: { type: 'token', description: 'Figma Personal Access Token' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-figma'] },
    permissions: ['network'],
    setup: ['Create a Figma Personal Access Token.', 'Copy the token to Aura vault.'],
    tools: [
      { name: 'get_file', description: 'Get Figma file data.' },
      { name: 'get_components', description: 'Get components from file.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'Figma MCP', summary: 'التفاعل مع تصاميم Figma والمكونات والأصول.', description: 'موصل MCP لـ Figma API. يتيح قراءة التصاميم واستخراج المكونات وتحميل الأصول.', setup: ['أنشئ Figma Personal Access Token.', 'انسخ الرمز إلى خزنة Aura.'], tools: [{ name: 'جلب الملف', description: 'جلب بيانات ملف Figma.' }, { name: 'جلب المكونات', description: 'جلب المكونات من الملف.' }], categories: ['تصميم', 'تكامل', 'إنتاجية'] }
    }
  },
  {
    id: 'mcp.vercel',
    type: 'mcp',
    name: 'Vercel MCP',
    version: '1.0.0',
    summary: 'Interact with Vercel deployments, projects, and domains.',
    description: 'MCP connector for Vercel API. Enables managing deployments, projects, and domains.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-vercel/icon.svg',
    cover: 'mcp-vercel/cover.svg',
    categories: ['Deployment', 'Integration', 'DevOps'],
    tags: ['vercel', 'deployment', 'hosting', 'serverless'],
    risk: 'medium',
    auth: { type: 'token', description: 'Vercel API Token' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-vercel'] },
    permissions: ['network'],
    setup: ['Create a Vercel API Token.', 'Copy the token to Aura vault.'],
    tools: [
      { name: 'list_deployments', description: 'List deployments.' },
      { name: 'create_deployment', description: 'Create a new deployment.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'Vercel MCP', summary: 'التفاعل مع نشرات Vercel والمشاريع والنطاقات.', description: 'موصل MCP لـ Vercel API. يتيح إدارة النشرات والمشاريع والنطاقات.', setup: ['أنشئ Vercel API Token.', 'انسخ الرمز إلى خزنة Aura.'], tools: [{ name: 'قائمة النشرات', description: 'عرض النشرات.' }, { name: 'إنشاء نشرة', description: 'إنشاء نشرة جديدة.' }], categories: ['نشر', 'تكامل', 'DevOps'] }
    }
  },
  {
    id: 'mcp.aws',
    type: 'mcp',
    name: 'AWS MCP',
    version: '1.0.0',
    summary: 'Interact with AWS services — S3, Lambda, EC2, and more.',
    description: 'MCP connector for AWS services. Enables managing S3 buckets, Lambda functions, EC2 instances, and other AWS resources.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-aws/icon.svg',
    cover: 'mcp-aws/cover.svg',
    categories: ['Cloud', 'Integration', 'DevOps'],
    tags: ['aws', 'cloud', 's3', 'lambda', 'ec2'],
    risk: 'high',
    auth: { type: 'token', description: 'AWS Access Key ID and Secret Access Key' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-aws'] },
    permissions: ['network'],
    setup: ['Create AWS IAM credentials.', 'Copy credentials to Aura vault.', 'Configure IAM policies.'],
    tools: [
      { name: 'list_s3_buckets', description: 'List S3 buckets.' },
      { name: 'invoke_lambda', description: 'Invoke a Lambda function.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'AWS MCP', summary: 'التفاعل مع خدمات AWS — S3 و Lambda و EC2 والمزيد.', description: 'موصل MCP لخدمات AWS. يتيح إدارة حاويات S3 ودوال Lambda و instances EC2 وموارد AWS الأخرى.', setup: ['أنشئ اعتمادات AWS IAM.', 'انسخ الاعتماديات إلى خزنة Aura.', 'Configure سياسات IAM.'], tools: [{ name: 'قائمة S3', description: 'عرض حاويات S3.' }, { name: 'استدعاء Lambda', description: 'استدعاء دالة Lambda.' }], categories: ['سحابة', 'تكامل', 'DevOps'] }
    }
  },
  {
    id: 'mcp.firebase',
    type: 'mcp',
    name: 'Firebase MCP',
    version: '1.0.0',
    summary: 'Interact with Firebase — Firestore, Auth, Storage, and Functions.',
    description: 'MCP connector for Firebase. Enables managing Firestore databases, authentication, storage, and cloud functions.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-firebase/icon.svg',
    cover: 'mcp-firebase/cover.svg',
    categories: ['Backend', 'Integration', 'Database'],
    tags: ['firebase', 'firestore', 'auth', 'backend'],
    risk: 'medium',
    auth: { type: 'token', description: 'Firebase Service Account Key' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-firebase'] },
    permissions: ['network'],
    setup: ['Get Firebase service account key.', 'Copy key to Aura vault.'],
    tools: [
      { name: 'query_firestore', description: 'Query Firestore database.' },
      { name: 'manage_auth', description: 'Manage authentication users.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'Firebase MCP', summary: 'التفاعل مع Firebase — Firestore و Auth و Storage و Functions.', description: 'موصل MCP لـ Firebase. يتيح إدارة قواعد بيانات Firestore والمصادقة والتخزين والدوال السحابية.', setup: ['احصل على مفتاح حساب خدمة Firebase.', 'انسخ المفتاح إلى خزنة Aura.'], tools: [{ name: 'استعلام Firestore', description: 'استعلام قاعدة بيانات Firestore.' }, { name: 'إدارة المصادقة', description: 'إدارة مستخدمي المصادقة.' }], categories: ['backend', 'تكامل', 'قاعدة بيانات'] }
    }
  },
  {
    id: 'mcp.openai',
    type: 'mcp',
    name: 'OpenAI MCP',
    version: '1.0.0',
    summary: 'Direct access to OpenAI APIs — GPT, DALL-E, Whisper, and more.',
    description: 'MCP connector for OpenAI APIs. Enables direct access to GPT models, DALL-E image generation, Whisper speech-to-text, and more.',
    publisher: { name: 'HBX', github: 'hbx12', verified: true },
    icon: 'mcp-openai/icon.svg',
    cover: 'mcp-openai/cover.svg',
    categories: ['AI', 'Integration', 'Productivity'],
    tags: ['openai', 'gpt', 'dall-e', 'whisper', 'ai'],
    risk: 'medium',
    auth: { type: 'token', description: 'OpenAI API Key' },
    install: { kind: 'mcp', command: ['npx', '-y', '@aura-os/mcp-openai'] },
    permissions: ['network'],
    setup: ['Create an OpenAI API Key.', 'Copy the key to Aura vault.'],
    tools: [
      { name: 'chat_completion', description: 'Create a chat completion.' },
      { name: 'generate_image', description: 'Generate an image with DALL-E.' }
    ],
    homepage: 'https://github.com/hbx12/aura-work',
    license: 'MIT',
    repository: 'https://github.com/hbx12/aura-work',
    localized: {
      ar: { name: 'OpenAI MCP', summary: 'وصول مباشر لـ OpenAI APIs — GPT و DALL-E و Whisper والمزيد.', description: 'موصل MCP لـ OpenAI APIs. يتيح الوصول المباشر لنماذج GPT وإنشاء صور DALL-E والتحويل الصوتي Whisper.', setup: ['أنشئ OpenAI API Key.', 'انسخ المفتاح إلى خزنة Aura.'], tools: [{ name: 'إكمال المحادثة', description: 'إنشاء إكمال محادثة.' }, { name: 'إنشاء صورة', description: 'إنشاء صورة بـ DALL-E.' }], categories: ['ذكاء اصطناعي', 'تكامل', 'إنتاجية'] }
    }
  }
];

// Add new items
for (const item of newItems) {
  // Check if already exists
  const existing = data.plugins.find((p) => p.id === item.id);
  if (!existing) {
    data.plugins.push(item);
    console.log('✅ Added: ' + item.id);
  } else {
    console.log('⏭️ Skipped (exists): ' + item.id);
  }
}

fs.writeFileSync('registry/marketplace.json', JSON.stringify(data, null, 2) + '\n');
console.log('\nDone! Total marketplace items: ' + data.plugins.length);
