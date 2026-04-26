# Obsidian Plugins to Install (Manual)

These plugins enhance Obsidian sync + productivity. Install via Obsidian UI.

## Essential (Required for Auto-Sync)

### Obsidian Git (by Vinzent03)

- **Purpose:** Auto-commit + push changes to GitHub
- **Install:** Settings → Community plugins → Browse → Search "Obsidian Git" → Install → Enable
- **Configure:**
  - Auto pull on startup: ON
  - Auto push after every file save: ON
  - Commit message format: `docs: {{message}}`
  - Push interval: 5 min (or immediate on save)
- **Result:** Changes sync to GitHub automatically on Cmd+S

## Optional (Nice to Have)

### Dataview

- Query .md files as databases
- Show backlinks in a table

### Templater

- Advanced template variables with date/time formatting

### Excalidraw

- Whiteboard diagrams embedded in notes
- Good for architecture sketches

---

## Setup Instructions

1. Open Obsidian
2. Settings (gear icon, bottom-left)
3. Community plugins → Browse
4. Search plugin name → Install → Enable
5. Configure per instructions above

---

## Testing Auto-Sync (Obsidian Git)

After installing:

1. Edit any .md file in Obsidian
2. Press Cmd+S (Mac) / Ctrl+S (Windows)
3. Wait 5–10 seconds
4. Check GitHub commits — should see `docs: ...`

If it worked: ✅ Auto-sync is active
If not: Check Obsidian Git settings → auto-push enabled?
