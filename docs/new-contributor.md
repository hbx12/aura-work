# 🧑‍💻 New contributor guide — your first contribution

Welcome to **Aura Work**! This guide walks you through contributing for the first time.  
If you get stuck at any point, ask in [GitHub Discussions](https://github.com/hbx12/aura-work/discussions) or `#aura-os:matrix.org`.

---

## 1. Find your first issue

Look for issues tagged with any of these labels:

- [`good first issue`](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — designed for newcomers
- [`help wanted`](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22) — needs community help
- [`docs`](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3Adocs) — documentation
- [`i18n`](https://github.com/hbx12/aura-work/issues?q=is%3Aissue+is%3Aopen+label%3A%22i18n%22) — translations

### First-time tips

- Pick something small — a typo fix, a missing translation, or a docs improvement.
- Translations are great for a first PR! See the list of [supported languages](./features/i18n.md). Arabic, Persian, and Hindi translations are especially welcome.
- Comment on the issue saying you'd like to work on it so others know it's taken.

---

## 2. Set up your environment

### Requirements

- **Node.js** 20+
- **Rust** stable (install via [rustup](https://rustup.rs))
- **Git**
- Platform-specific:
  - **Windows:** WebView2 (comes with Windows 10+)
  - **macOS:** Xcode Command Line Tools
  - **Linux:** `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libglib2.0-dev`, `libsecret-1-dev`, `pkg-config`

### Clone & install

```bash
git clone https://github.com/hbx12/aura-work.git
cd aura-work
npm install
npm run build:sidecars
```

### Run the desktop app (Tauri)

```bash
npm run sidecar      # Terminal 1 — agent sidecar
npm run dev          # Terminal 2 — desktop UI
```

---

## 3. Create a branch

```bash
git checkout -b fix/your-change-name
```

Use a descriptive name like `fix/typo-readme` or `feat/add-hindi-translation`.

---

## 4. Make your change

- Match the existing code style.
- If you change UI, follow the [Aura Work design system](./features/design-system.md).
- **Never** commit API keys, tokens, or secrets.

---

## 5. Run quality checks

```bash
npm run build:sidecars
npm run test:sidecars
```

If you changed Rust code:

```bash
npm run test:rust
```

If you changed docs only, these checks are optional — but still run them if you can.

---

## 6. Commit & push

```bash
git add .
git commit -m "fix(docs): fix typo in README"
git push origin fix/your-change-name
```

Use [conventional commits](https://www.conventionalcommits.org/):

| Type       | Example                                        |
|------------|------------------------------------------------|
| `feat`     | `feat(task): add retry for failed tool calls`  |
| `fix`      | `fix(vault): handle empty provider list`       |
| `docs`     | `docs(i18n): update Weblate contributor guide` |
| `i18n`     | `i18n: add Hindi locale`                       |
| `test`     | `test: add agent loading unit tests`           |
| `security` | `security: bump dompurify to 3.4.10`           |

---

## 7. Open a pull request

1. Go to the [Aura Work repo](https://github.com/hbx12/aura-work) on GitHub.
2. Click **Compare & pull request**.
3. Fill in the PR template — be clear about what changed and why.
4. Link the issue you're fixing: `Closes #123`.
5. Click **Create pull request**.

A maintainer will review your PR within a few days. They may ask for tweaks — that's normal!

---

## 8. After your PR is merged 🎉

- Add yourself to `CONTRIBUTORS.md` (or ask a maintainer to).
- Celebrate! You're now an open-source contributor.

---

## Need help?

- **Discussions:** https://github.com/hbx12/aura-work/discussions
- **Matrix chat:** `#aura-os:matrix.org`
- **Discord:** *(coming soon)*

---

*Thank you for contributing to Aura Work!*
