# Phase 1 Test Plan - Local Agent Execution

**Objetivo:** Validar que el sistema de ejecución local funciona end-to-end: Prompt → Orchestrator → Cursor → Git Commit

**Duración estimada:** 15-20 minutos

---

## Pre-requisitos

- [ ] MacBook con Node.js 18+
- [ ] Redis corriendo (para BullMQ)
- [ ] Cursor IDE instalado en la máquina
- [ ] Rama `claude/opsly-defense-platform-sC0qH` checkout
- [ ] `npm ci` ejecutado

---

## Test Steps

### 1️⃣ Preparación (2 min)

**Terminal Principal:**
```bash
cd ~/opsly
git status  # Verificar branch correcta
npm ci      # Asegurar deps
```

**Verificar Redis:**
```bash
redis-cli ping
# Output esperado: PONG
```

### 2️⃣ Iniciar Sistema (3 min)

**Terminal Principal:**
```bash
bash scripts/run-local-agent-system.sh
```

**Output esperado:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Local Agent Execution System - Phase 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Node.js and npm available
✅ Previous instances terminated
✅ Orchestrator PID: XXXX
✅ Orchestrator is ready!
✅ Watcher PID: XXXX
✅ AutoCommit PID: XXXX

✨ Local Agent Execution System Running!
```

**Si falla:** Check `/tmp/orchestrator-run.log`

---

### 3️⃣ Verificar Orchestrator Ready (2 min)

**New Terminal - Health Check:**
```bash
curl -s http://localhost:3011/health | jq .
```

**Output esperado:**
```json
{
  "status": "ok",
  "service": "orchestrator",
  "role": "full",
  "mode": "full-stack"
}
```

---

### 4️⃣ Monitor Prompts (5 min)

**New Terminal - Watch Metadata:**
```bash
cd ~/opsly
while true; do 
  clear
  echo "=== Prompt Metadata ==="
  cat .cursor/prompts/.metadata.json 2>/dev/null | jq . || echo "Waiting for metadata..."
  echo ""
  echo "=== Prompt Files ==="
  ls -la .cursor/prompts/*.md 2>/dev/null | awk '{print $9, $5}' || echo "No prompts yet"
  echo ""
  echo "=== Responses ==="
  ls -la .cursor/prompts/responses/ 2>/dev/null | tail -5 || echo "No responses yet"
  sleep 3
done
```

**New Terminal - Watch Logs:**
```bash
# Terminal A: Watcher logs
tail -f /tmp/watcher.log

# Terminal B: AutoCommit logs  
tail -f /tmp/autocommit.log

# Terminal C: Orchestrator logs
tail -f /tmp/orchestrator-run.log
```

---

### 5️⃣ Test Prompt Already Exists (3 min)

**Check test prompt:**
```bash
cat .cursor/prompts/test-cursor-execution.md
```

**Output esperado:** Contenido del prompt de prueba

**Expected Flow:**

1. **Watcher detecta (~5 seg):**
   ```
   [LocalWatcher] Detected new prompt: test-cursor-execution.md
   [LocalWatcher] Submitting test-cursor-execution.md...
   [LocalWatcher] ✅ test-cursor-execution.md → Job XXXX
   ```

2. **Orchestrator enruta (~2 seg):**
   ```json
   {
     "event": "job_enqueue",
     "job_type": "intent_dispatch",
     "request_id": "...",
     "job_id": "XXXX"
   }
   ```

3. **Cursor executa (variable, 10-30 seg):**
   - Cursor IDE se abre con el prompt
   - Genera respuesta basada en el prompt
   - Escribe respuesta a `.cursor/responses/response-XXXX.md`

4. **AutoCommit detecta (~2 seg):**
   ```
   [AutoCommit] Detected response: response-XXXX.md
   [AutoCommit] ✅ Committed: response-XXXX.md
   [AutoCommit] ✅ Pushed to origin/claude/opsly-defense-platform-sC0qH
   ```

5. **Metadata actualiza:**
   ```json
   {
     "status": "completed",
     "completed_at": "2026-05-03T..."
   }
   ```

---

### 6️⃣ Verificar Resultados (5 min)

**Check if file was created:**
```bash
ls -la src/greeting.ts  # Should exist if Cursor executed
cat src/greeting.ts     # Should have the generated function
```

**Check git log:**
```bash
git log --oneline | head -3
# Should show: feat(job-XXXX): [executor] agent response completed
```

**Check response file:**
```bash
ls -la .cursor/prompts/responses/
cat .cursor/prompts/responses/response-*.md
```

**Check metadata final:**
```bash
cat .cursor/prompts/.metadata.json | jq .
```

---

## ✅ Success Criteria

For test to **PASS**, all must be true:

- [ ] Orchestrator started without errors
- [ ] Watcher detected test prompt within 10 seconds
- [ ] Job was enqueued (job_id > 0)
- [ ] Cursor IDE opened and executed prompt (manual verification)
- [ ] Response file created in `.cursor/responses/`
- [ ] AutoCommit detected response and created commit
- [ ] Git log shows new commit with job_id
- [ ] File `src/greeting.ts` exists (or whatever Cursor created)
- [ ] Metadata shows status = "completed"

---

## ❌ Troubleshooting

### Orchestrator won't start
```bash
# Check port 3011 in use
lsof -i :3011
# Kill if needed
kill -9 PID

# Check Redis
redis-cli ping  # Must return PONG
```

### Watcher not detecting prompt
```bash
# Check file exists
ls -la .cursor/prompts/test-cursor-execution.md

# Check watcher watching
grep "Watching" /tmp/watcher.log

# Check file has proper extension
# Must be .md file
```

### Cursor not executing
```bash
# Check Cursor is installed
which cursor

# Check if Cursor can read prompt
cat .cursor/prompts/test-cursor-execution.md

# Manual trigger (if needed)
open -a "Cursor" .cursor/prompts/test-cursor-execution.md
```

### AutoCommit not committing
```bash
# Check responses directory exists
ls -la .cursor/prompts/responses/

# Check git status
git status

# Check AutoCommit is running
grep "AutoCommit" /tmp/autocommit.log

# Manual commit test
cd .cursor/prompts/responses
git add response-*.md
git commit -m "manual test"
```

### Git push fails
```bash
# Check branch tracking
git branch -vv

# Check remote
git remote -v

# Manual push
git push origin claude/opsly-defense-platform-sC0qH
```

---

## 📊 Expected Timeline

| Step | Component | Expected Time |
|------|-----------|----------------|
| Prompt creation | Manual | 0 sec (pre-created) |
| Watcher detection | LocalWatcher | 1-5 sec |
| Job enqueue | Orchestrator | 1-2 sec |
| Cursor execution | Cursor IDE | 10-30 sec |
| Response detection | AutoCommit | 1-2 sec |
| Git commit+push | Git | 2-5 sec |
| **Total** | - | **~20-45 sec** |

---

## 🎯 Next Steps After Success

Once Phase 1 passes:

1. Create 2-3 more test prompts
2. Verify iteration works (prompt → response → next prompt auto-suggested)
3. Check metadata tracking all jobs
4. Verify git history shows clean commits

Then → **Phase 2: Iteration Manager + Agent Trainer**

---

## 📝 Notes

- Keep all 4-5 terminals open to see logs in real-time
- Metadata JSON auto-updates (watch with `jq` for pretty output)
- Response files are NOT committed (in .gitignore)
- Only the git commits matter for tracking
- If something fails, check the logs - they'll tell you exactly what happened

---

**Run this test now on your MacBook and let me know results! 🚀**
