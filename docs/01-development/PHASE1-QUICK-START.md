# Phase 1 - Quick Start (5 min)

## 🚀 Just Run This

```bash
cd ~/opsly
git checkout claude/opsly-defense-platform-sC0qH
npm ci
bash scripts/run-local-agent-system.sh
```

That's it. System will:
- ✅ Start Orchestrator on port 3011
- ✅ Start LocalPromptWatcher watching `.cursor/prompts/`
- ✅ Start LocalGitAutoCommit watching `.cursor/responses/`
- ✅ Detect test prompt automatically
- ✅ Route to Cursor IDE
- ✅ Auto-commit results to git

---

## 📍 Watch 4 Things In Real-Time

**Terminal 1 - Orchestrator Health:**
```bash
while true; do curl -s http://localhost:3011/health | jq .status; sleep 5; done
```

**Terminal 2 - Metadata Updates:**
```bash
cd ~/opsly && watch -n 1 'cat .cursor/prompts/.metadata.json 2>/dev/null | jq .'
```

**Terminal 3 - Watcher Logs:**
```bash
tail -f /tmp/watcher.log
```

**Terminal 4 - Git Commits:**
```bash
cd ~/opsly && watch -n 2 'git log --oneline | head -5'
```

---

## ✅ Wait For This Flow

```
1. [Watcher] Detected new prompt: test-cursor-execution.md
2. [Watcher] ✅ test-cursor-execution.md → Job XXXX
3. [Orchestrator] job_enqueue (job_id=XXXX)
4. [Cursor] Opens and executes prompt (you'll see IDE open)
5. [Response] response-XXXX.md created
6. [AutoCommit] ✅ Committed: response-XXXX.md
7. [Git] Push to origin/claude/opsly-defense-platform-sC0qH
8. [Metadata] status = "completed"
```

**Timeline: ~30-60 seconds total**

---

## 🎯 Success Looks Like This

```bash
# Terminal 2 (Metadata):
{
  "test-cursor-execution.md": {
    "status": "completed",
    "job_id": "12345",
    "submitted_at": "2026-05-03T12:00:00.000Z",
    "completed_at": "2026-05-03T12:00:30.000Z"
  }
}

# Terminal 4 (Git):
feat(job-12345): [executor] agent response completed
```

And:
```bash
# File created by Cursor
ls -la src/greeting.ts
cat src/greeting.ts
```

---

## ⚠️ If It Stalls

**Watcher not detecting?**
```bash
# Manual trigger
touch .cursor/prompts/test-cursor-execution.md
```

**Cursor not executing?**
```bash
# Check if Cursor is available
which cursor
# Open manually
open -a "Cursor" .cursor/prompts/test-cursor-execution.md
```

**Logs are your friend:**
```bash
cat /tmp/orchestrator-run.log | tail -20
cat /tmp/watcher.log | tail -20
cat /tmp/autocommit.log | tail -20
```

---

## 📋 Checklist

- [ ] Running on correct branch
- [ ] Orchestrator says "ok" on health check
- [ ] See "[LocalWatcher] Watching ..." in watcher.log
- [ ] See "[AutoCommit] Watching ..." in autocommit.log
- [ ] Metadata JSON shows job_id after ~5 sec
- [ ] Cursor IDE opens with prompt
- [ ] Response file appears in `.cursor/responses/`
- [ ] Git log shows new commit
- [ ] Final file exists (e.g., `src/greeting.ts`)

---

## 🔄 Try More Prompts

Once first test passes:

```bash
cat > .cursor/prompts/test-2-api.md << 'EOF'
---
agent_role: executor
max_steps: 5
goal: "Create a simple Express API route"
---

Create a TypeScript Express route handler for GET /api/hello
that returns { message: "Hello from Opsly" }
EOF
```

Same flow happens automatically. Just watch the logs.

---

## 📞 Questions?

Check logs first:
```bash
grep -i error /tmp/*.log
grep "failed\|Error" /tmp/watcher.log
grep "failed\|Error" /tmp/autocommit.log
```

---

**Ready? Run it now and tell me when it completes! 🚀**
