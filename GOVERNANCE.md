# Governance

Aura OS is an open-source community project licensed under Apache-2.0.

## Project roles

| Role | Responsibility |
|------|----------------|
| **Maintainers** | Merge PRs, cut releases, security response — see [MAINTAINERS](./MAINTAINERS) |
| **Contributors** | Code, docs, translations, issues — anyone following [CONTRIBUTING.md](./CONTRIBUTING.md) |
| **Users** | Feedback via Issues and Discussions |

## Decision making

- **Routine changes** (bug fixes, docs, translations): maintainer review + passing CI.
- **Feature additions**: RFC optional for large changes; discuss in GitHub Discussions first.
- **Breaking changes**: require semver major bump, CHANGELOG entry, and migration notes.
- **Security**: maintainers coordinate fixes privately; releases may be expedited.

## Release authority

Only listed maintainers may:

- Publish signed GitHub Releases
- Push release tags (`v*.*.*`)
- Approve security advisories

## Trademark

"Aura OS" is the project name. Third-party distributions must not imply official endorsement without maintainer approval.

## Code of Conduct

All participants are bound by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Maintainers may restrict participation for violations.

## Changing governance

Proposed updates to this file require a PR with at least one maintainer approval and a 7-day comment period on Discussions.
