---
status: canon
owner: operations
last_review: 2026-07-28
---

# Reconciliación — trabajo paralelo WhatsApp / Peskids

## Congelado (no integrar desde aquí)

| Origen | Contenido | Acción |
|--------|-----------|--------|
| `feat/localrank-connected-platform` | mezcla LocalRank + UI Peskids + experimento WACRM outbound | **No mergear** como un solo PR |
| `wacrm-send.ts` / ruta outbound especulativa | sin auth, confunde external_id | **Descartar**; outbound solo vía `lib/whatsapp-channel` + approval outbox |
| Índices Brain (`knowledge-index.json`, `file-index.json`) | ruido de regeneración | Solo en cierre documental separado |

## Conservado

| Origen | Contenido | Destino |
|--------|-----------|---------|
| PR #766 | UI clases por edad | Ya en `main` |
| PR #768 | Academy blueprint + guard GHL | Ya en `main` (CI verde) |
| Concepto selector de paneles (`7b0608a7`) | role switcher | Rama dedicada futura; **sin** allowlist de email en cliente |

## Rama canónica de este plan

`feat/academy-whatsapp-sandbox` desde `origin/main`.

Un tema por PR futuro si se divide: contracts → meta provider → persistence → admin → infra → GHL cleanup.
