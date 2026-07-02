# Aura Bot 🤖

Aura Bot is a GitHub Actions-based assistant for the aura-work repository. It reviews PRs, triages issues, replies to comments, and produces daily project health reports — all powered by DeepSeek and repository documentation.

## Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| **PR Review** | `aura-bot-pr.yml` | `pull_request_target`: opened, reopened, synchronize |
| **Issue Triage & Reply** | `aura-bot-issues.yml` | `issues`: opened + `issue_comment`: created |
| **Daily Health Scan** | `aura-bot-daily.yml` | `workflow_dispatch` + daily schedule (08:00 UTC) |

## What the Bot Can Do

- **PR Review**: Reviews PR title, description, and diff. Posts or updates one sticky comment with summary, risks, missing tests/docs, security notes, and next steps.
- **Issue Triage**: Classifies new issues (bug/feature/docs/question) and replies with guidance based on repository docs.
- **Comment Reply**: Replies when `@aura-bot` is mentioned or a clear question is asked and no maintainer has replied. It is rate-limited to 4 replies per issue unless `@hbx12` explicitly mentions `@aura-bot`.
- **Daily Scan**: Checks open issues and PRs, finds unanswered items older than 24 hours, updates a daily health report issue.

## What the Bot Cannot Do

- ❌ Approve, merge, or close PRs
- ❌ Request changes officially
- ❌ Execute PR code (uses `pull_request_target` with main checkout only)
- ❌ Access secrets beyond `DEEPSEEK_API_KEY`
- ❌ Modify repository settings, branches, or deployments
- ❌ Reply to bot comments or its own comments
- ❌ Change its GitHub actor name from `github-actions[bot]` (this requires a GitHub App or a dedicated bot account)

## Safety Rules

1. **No PR code execution**: The bot checks out `main` only and reads PR diffs via the GitHub API.
2. **Sticky comments**: Each bot action uses a unique HTML marker (`<!-- aura-bot:... -->`) to update existing comments instead of creating duplicates.
3. **Anti-spam**: The bot limits issue-thread replies to 4 per issue, and only `@hbx12` can override that limit by mentioning `@aura-bot`. It never replies to itself.
4. **Separate concurrency groups**: Aura Bot workflows use `aura-bot-*` concurrency groups and never block CI or deployment workflows.
5. **Docs-only answers**: The bot answers from repository Markdown files only. If it cannot find an answer, it says so and mentions `@hbx12`.
6. **Secrets safety**: `DEEPSEEK_API_KEY` is never logged or printed. The bot uses native Node 20 `fetch` and reads the key from `process.env`.

## Knowledge Sources

The bot reads these files (main branch only):

- `README.md`, `README.ar.md`
- `CONTRIBUTING.md`, `SECURITY.md`
- `LICENSE`, `NOTICE`
- `ROADMAP.md`, `CHANGELOG.md`
- `docs/**/*.md`
- `registry/**/*.md`

Every bot answer includes a "Sources checked" list.

## Architecture

```
scripts/aura-bot/
├── deepseek.mjs          # DeepSeek API client (Node 20 fetch)
├── github.mjs            # GitHub API client (issues, PRs, comments)
├── knowledge.mjs         # Loads & formats repo Markdown docs
├── pr-review.mjs         # PR review logic
├── issue-triage.mjs      # Issue classification & reply
├── comment-reply.mjs     # Comment reply with anti-spam
├── daily-scan.mjs        # Daily health report
└── sticky-comment.mjs    # Create-or-update comment helper
```
