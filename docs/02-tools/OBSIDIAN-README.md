# Obsidian Vault — Opsly Docs

## What is This?

`docs/` is an **Obsidian Vault**. Obsidian is a local Markdown editor with:

- **Graph View:** Visualize how docs relate to each other
- **Backlinks:** See what references each document
- **Fast Search:** Find any doc instantly
- **Wikilinks:** Use `[[Document Name]]` to navigate

## Quick Start

### 1. Open Vault in Obsidian

```
Download: https://obsidian.md/download

In Obsidian:
  File → Open vault → Select this repo's docs/ folder
  Trust plugin author when prompted
```

### 2. Install Obsidian Git (Auto-Sync)

```
Settings → Community plugins → Browse
Search: "Obsidian Git" (by Vinzent03)
Install → Enable

Configure:
  ✅ Auto pull on startup
  ✅ Auto push after every file save
```

### 3. Mapa completo del vault

Abre [`index.md`](../index.md) (MOC): ahí están enlazadas **todas** las carpetas
de primer nivel bajo `docs/`. Para regenerar el inventario de notas:

`npm run obsidian:file-index` (escribe `.obsidian/file-index.json`).

### 4. Start Navigating

- **Graph View** (icon top-left): see doc relationships
- **Search** (Cmd+Shift+F): find anything
- Click `[[wikilinks]]` to jump between docs
- Edit → Cmd+S → auto-syncs to GitHub

---

## Navigation Shortcuts

| Action          | Mac         | Windows      |
| --------------- | ----------- | ------------ |
| Search docs     | Cmd+Shift+F | Ctrl+Shift+F |
| Toggle graph    | Cmd+Shift+G | Ctrl+Shift+G |
| New note        | Cmd+N       | Ctrl+N       |
| Command palette | Cmd+P       | Ctrl+P       |

---

## Key Documents

- [[index|Documentation Index (MOC)]] — mapa completo del vault
- [[README|Docs README]] — índice y stubs
- [[STRUCTURE-GUARDRAILS]] — dónde crear cada tipo de doc
- [`01-development/ROADMAP.md`](01-development/ROADMAP.md) — roadmap vivo
- [`00-architecture/OPENCLAW-ARCHITECTURE.md`](../00-architecture/OPENCLAW-ARCHITECTURE.md) — OpenClaw
- [`02-tools/KNOWLEDGE-SYSTEM.md`](KNOWLEDGE-SYSTEM.md) — NotebookLM + índice repo

---

## How Sync Works

```
You (edit in Obsidian)
  ↓ Cmd+S
Obsidian Git (auto-commit + push)
  ↓
GitHub (remote backup + audit trail)
  ↓
GitHub Actions (validate wikilinks + reindex)
  ↓
Agents (Claude, Cursor) read latest docs
```

---

## Wikilink Syntax

```markdown
[[index]] # Link to index.md
[[STRUCTURE-GUARDRAILS|guardrails]] # Custom link text
[[README#Brain Map]] # Link to section (if heading exists)
```

File naming: `[[My Doc]]` → busca `My Doc.md` en el vault (espacios permitidos)

---

## Troubleshooting

**Wikilinks show red (broken)?**
File doesn't exist or name mismatch. Check: `[[Doc Name]]` → `docs/Doc-Name.md`

**Changes not syncing?**
Obsidian Git not installed or auto-push disabled. Re-read step 2.

**Graph shows isolated islands?**
Docs not linked. Add `[[Related Doc]]` at bottom of document.
