---
status: active
owner: operations
last_review: 2026-09-30
type: doc
tags:
  - opsly/doc
  - opsly/streaming
---

# Auditoría del backlog de PRs abiertos (2026-09-30)

**Por qué existe este doc:** al abrir #1681 (primer tenant `gaming-streamer`,
OpsAfterDark) se encontró que #1677 y #1680 —creados en las mismas 24-36h—
duplicaban funcionalidad (agente Twitch, rotación de escenas OBS) sin que
ninguna de las partes lo supiera. #1681 ya se reconcilió (se quitó lo
duplicado, ver su historial de commits). Este doc releva **los 40 PRs abiertos**
para no repetir el mismo choque en otro lado, y define el **orden de merge
recomendado para el camino crítico de streaming** (la meta: poder publicar
en Twitch/TikTok/YouTube/Kick de forma sostenible).

Generado leyendo título + body + archivos tocados de cada PR vía `gh pr view`.
Es una foto del 2026-09-30 — puede quedar desactualizado si se mergea/cierra
algo después.

## Camino crítico para publicar (streaming/Twitch/OBS/PC-gamer) — 10 PRs

| # | Estado | Título | Tamaño | Nota |
|---|---|---|---|---|
| #1679 | UNSTABLE | feat(streaming): manage Twitch/OBS secrets via Doppler, never on disk | +554/-12, 9 archivos | **Base de todo lo demás** — antes de este PR, Doppler prd no tenía NINGUNA var de streaming |
| #1678 | UNSTABLE | chore(ops): add setup-mac-ndi.sh for NDI on the Mac (opsly-quantum) | +81/-1, 2 archivos | Independiente, infra de la Mac |
| #1676 | UNSTABLE | fix(ai-dj): correct obs-websocket v5 authentication algorithm | +27/-7, 3 archivos | Bug fix aislado (Python, `apps/ai-dj`). Verificado: `packages/stream-ops-kit` (#1681) ya tiene el algoritmo correcto, no lo necesita |
| #1680 | UNSTABLE | feat(ops): BF6 focus-driven OBS scene automation | +204/-0, 2 archivos | Gana sobre el `scene-rotator.mjs` que tenía #1681 (ya removido de ahí) |
| #1677 | UNSTABLE | feat(twitch-agent): add Twitch Helix API agent for OpsAfterDark channel | +770/-7, 12 archivos | Gana sobre `vod-policy.mjs`/`twitch-eventsub.mjs` que tenía #1681 (ya removidos). **Depende de #1679** para tener credenciales reales |
| #1681 | UNSTABLE | feat(opsafterdark): first gaming-streamer tenant + shared stream-ops-kit engine | +6425/-0, 73 archivos | Ya reconciliado con #1677/#1680. Bloqueado por `package-lock.json` desincronizado (ver abajo) |
| #1604 | UNSTABLE | feat(obs): add display-capture source to the safe OBS websocket bridge | +26/-0, 2 archivos | Revisar si "safe OBS websocket bridge" es una capa compartida que #1677/#1680/#1681 deberían usar en vez de sus propias conexiones |
| #1616 | UNSTABLE | feat(agents): machine-claim lock for shared physical worker access v2 | +382/-0, 6 archivos | Relevante: evita que streaming y jobs de cómputo (`pc-gamer`/`home-gpu-01`) se peleen por la misma GPU a la vez |
| #1146 | DIRTY | feat: add PC gamer capability model routing | +460/-93, 9 archivos | Capa de ruteo — revisar antes de mergear, tiene conflictos (`DIRTY`) |
| #1211 | DIRTY | feat(compute): bootstrap PC Gamer content runtime with subagent workpack | +335/-1, 6 archivos | Tiene conflictos (`DIRTY`) — revisar contra #1146 |

### Orden de merge recomendado (camino crítico)

1. **#1679** (Doppler secrets) — nada más funciona con credenciales reales sin esto
2. **#1678** (Mac NDI) — independiente, sin riesgo
3. **#1676** (fix auth ai-dj) — bug fix aislado, bajo riesgo
4. **#1680** (escenas BF6) — sin dependencias duras
5. **#1677** (agente Twitch) — necesita #1679 mergeado primero para tener token real
6. **#1681** (tenant OpsAfterDark) — necesita el fix de `package-lock.json` (ver Bloqueos) antes de poder mergear limpio
7. **#1604, #1616, #1146, #1211** — revisar en ese orden; #1146/#1211 están `DIRTY` (conflictos de merge), resolver antes

### Solapamientos de archivo detectados (mismo archivo, PRs distintos)

- `AGENTS.md` — tocado por #1616, #1677, #1679 → conflicto de merge probable, revisar orden
- `docs/runbooks/STREAMING-GAMER-DJ-NDI.md` — tocado por #1677, #1678, #1679 → mismo runbook editado 3 veces en paralelo
- `lib/commerce-deals/__tests__/commerce-deals.test.ts` — tocado por #1676 y #1677 → probablemente incidental (snapshot de test), confirmar que no es un cambio real de lógica de negocio colado en un PR de streaming

### Bloqueo técnico común (#1679, #1677, #1681, y probablemente otros)

`npm ci` falla en varios de estos por `package-lock.json` raíz desincronizado
con los `package.json` nuevos que cada PR agrega. Confirmado en #1681: regenerar
el lockfile localmente (`npm install --ignore-scripts`) funciona pero produce
un diff de ~10,000 líneas no relacionadas (drift de versión de npm/Node local
vs. CI) — **necesita regenerarse desde un entorno que coincida con el de CI**,
no a mano desde cualquier lado.

## Otros clusters (no bloquean publicar, prioridad menor)

| Cluster | PRs | Nota |
|---|---|---|
| Content Studio / clips / publicación | #1185, #1628, #1629 | Relevante a mediano plazo (TikTok publisher adapter en #1629) pero no bloquea el streaming en vivo |
| Release / CI / governance | #1470, #1471, #1519, #1636, #1638, #1639, #1640, #1658 | Infraestructura de release, no de streaming |
| Revenue / Mission Control | #1255, #1276, #1436, #1441 | Ajeno a este objetivo |
| Founder OS / estrategia | #1202, #1203, #1206 | Ajeno a este objetivo |
| Peskids | #1335, #1336 | Ajeno a este objetivo |
| Sueltos | #1133, #1208, #1254, #1300, #1340, #1481, #1496, #1513, #1553, #1556 | Revisar caso a caso si hace falta, no urgente para publicar |

## Siguiente paso sugerido

No tocar el CI de los 30 PRs fuera del camino crítico sin pedirlo explícitamente
— este doc es para tener el mapa, no una autorización para mergear nada solo.
