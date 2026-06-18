export interface TaskTemplate {
  name: string;
  description: string;
  icon: string;
  prompt: string;
  category: string;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    name: "Code Review",
    description: "Review code for bugs, performance, and style",
    icon: "search",
    category: "Review",
    prompt: `Review the project codebase focusing on:
1. Bugs and logic errors
2. Performance bottlenecks
3. Code style and consistency
4. Security vulnerabilities
5. Missing error handling

List all issues found with file paths, severity, and suggested fixes.`,
  },
  {
    name: "Refactor",
    description: "Restructure code for better maintainability",
    icon: "refresh-cw",
    category: "Refactor",
    prompt: `Analyze the project codebase and propose refactoring improvements:
1. Identify repeated code that could be extracted into shared utilities
2. Suggest better module/component organization
3. Recommend type improvements
4. Identify overly complex functions that need simplification

Provide specific file paths and concrete refactoring suggestions.`,
  },
  {
    name: "Debug Issue",
    description: "Debug and fix a specific problem in the code",
    icon: "bug",
    category: "Debug",
    prompt: `Help me debug the following issue:

[Describe your bug or problem here]

Please:
1. Analyze the relevant code to find the root cause
2. Propose a fix with specific code changes
3. Consider edge cases and potential regressions`,
  },
  {
    name: "Generate Docs",
    description: "Create or update code documentation",
    icon: "file-text",
    category: "Documentation",
    prompt: `Generate comprehensive documentation for the project:
1. Overview of the codebase architecture
2. API documentation for key functions and modules
3. Setup and installation instructions
4. Usage examples
5. Any configuration or environment variables

Focus on accuracy and clarity. Use Markdown formatting.`,
  },
  {
    name: "Add Tests",
    description: "Write unit/integration tests for code",
    icon: "check-square",
    category: "Testing",
    prompt: `Write tests for the project covering:
1. Unit tests for core functions and utilities
2. Integration tests for key workflows
3. Edge cases and error conditions
4. Mock external dependencies where appropriate

Use the project's existing test framework and conventions.`,
  },
  {
    name: "Security Audit",
    description: "Check for security vulnerabilities",
    icon: "shield",
    category: "Security",
    prompt: `Perform a security audit of the codebase:
1. Check for injection vulnerabilities (XSS, SQL injection, command injection)
2. Review authentication and authorization logic
3. Check for sensitive data exposure
4. Review dependency vulnerabilities
5. Check for insecure deserialization
6. Review input validation

For each finding, provide severity, file path, and remediation steps.`,
  },
  {
    name: "Performance Tuning",
    description: "Identify and fix performance issues",
    icon: "zap",
    category: "Optimization",
    prompt: `Analyze the project for performance improvements:
1. Identify slow database queries or API calls
2. Check for unnecessary re-renders or computations
3. Review caching opportunities
4. Check bundle size and loading performance
5. Suggest specific optimizations with code examples`,
  },
  {
    name: "Architecture Review",
    description: "Review and improve project architecture",
    icon: "layers",
    category: "Review",
    prompt: `Review the project architecture and suggest improvements:
1. Evaluate the current component/module structure
2. Check for proper separation of concerns
3. Review data flow patterns
4. Suggest architectural improvements
5. Consider scalability and maintainability`,
  },
  {
    name: "Set up CI/CD",
    description: "Configure continuous integration and deployment",
    icon: "git-commit",
    category: "Infrastructure",
    prompt: `Help me set up CI/CD for this project:
1. Recommend a CI/CD platform
2. Create pipeline configuration for linting, testing, and building
3. Set up automated deployment steps
4. Configure environment variables and secrets
5. Add status badges to README`,
  },
  {
    name: "Dependency Audit",
    description: "Review and update project dependencies",
    icon: "package",
    category: "Maintenance",
    prompt: `Audit the project's dependencies:
1. List all outdated dependencies
2. Identify deprecated or unmaintained packages
3. Check for breaking changes in major version updates
4. Suggest alternatives for problematic dependencies
5. Create a migration plan for updates`,
  },
  {
    name: "Database Schema",
    description: "Design or review database schema",
    icon: "database",
    category: "Design",
    prompt: `Help me design/review the database schema:
1. Review table structure and relationships
2. Check index strategy and query performance
3. Review migration strategy
4. Consider data integrity and constraints
5. Suggest schema optimizations`,
  },
  {
    name: "API Design",
    description: "Design or review API endpoints",
    icon: "globe",
    category: "Design",
    prompt: `Review and improve the API design:
1. Evaluate RESTful conventions and endpoint structure
2. Review request/response formats
3. Check error handling patterns
4. Review authentication and authorization
5. Suggest API versioning strategy`,
  },
];
