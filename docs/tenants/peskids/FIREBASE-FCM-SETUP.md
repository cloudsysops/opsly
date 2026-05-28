---
status: draft
owner: operations
last_review: 2026-05-28
type: tenant
tags:
  - opsly/tenant
  - peskids/firebase
---

# Peskids — Firebase Cloud Messaging (FCM)

Proyecto Firebase: **`peskids-f1aec`**. Push unificado web (PWA) + Android + iOS vía FCM.

## Archivos en repo

| Archivo | Ruta |
|---------|------|
| Android | `apps/peskids/android/app/google-services.json` |
| iOS | `apps/peskids/ios/App/App/GoogleService-Info.plist` |
| Copias Capacitor | `apps/peskids/google-services.json`, `GoogleService-Info.plist` |

**No commitear:** `apps/peskids/.secrets/`, `config/peskids-firebase-admin.json`, `.env.local`.

## Doppler (`ops-intcloudsysops` / `prd` y `stg`)

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Cliente web |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Cliente web |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Cliente web |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Cliente web |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Cliente web + FCM |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Cliente web |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push (FCM) |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics (opcional) |

Local: copiar nombres a `apps/peskids/.env.local` (gitignored).

## Producción (build Docker)

`NEXT_PUBLIC_*` se **hornean en build** (`apps/peskids/Dockerfile`). Doppler en runtime no basta para el cliente.

1. Sincronizar Doppler → GitHub Secrets:

```bash
./scripts/sync-peskids-firebase-secrets-to-github.sh --dry-run
./scripts/sync-peskids-firebase-secrets-to-github.sh
```

2. Merge a `main` → CI verde → workflow **Deploy Peskids** (rebuild GHCR + VPS).

Manual: Actions → **Deploy Peskids** → Run workflow.

## Código

- `apps/peskids/lib/firebase.ts` — init web
- `apps/peskids/lib/firebase-messaging.ts` — token FCM + VAPID
- `apps/peskids/components/pwa/sw-register.tsx` — FCM si hay API key; fallback VAPID legacy
- `apps/peskids/public/firebase-messaging-sw.js` — service worker FCM

## Verificación

**Local:** `cd apps/peskids && npm run dev` → http://localhost:3004 → permitir notificaciones.

**Producción:** [Firebase Console → Messaging](https://console.firebase.google.com/project/peskids-f1aec/notification) → campaña de prueba (Web).

**Capacitor:** `npm run cap:ios` / `npm run cap:android` tras cambios nativos.

**Android (CLI, Java 21 + SDK):**

```bash
npm run peskids:cap:android              # raíz monorepo
npm run peskids:cap:android:open         # abre Android Studio
npm run cap:android:build                # desde apps/peskids
```

Script: `scripts/peskids-cap-android.sh` (`--dry-run`, `--sync-only`, `--variant release`).

APK debug: `apps/peskids/android/app/build/outputs/apk/debug/app-debug.apk`

## Admin SDK (backend)

Solo si añades `firebase-admin` en API:

- Local: `apps/peskids/.secrets/firebase-admin.json` o `config/peskids-firebase-admin.json`
- Producción: preferir JSON en Doppler (clave dedicada), no en git

## Enlaces

- [[DOPPLER-SETUP|Doppler Peskids]]
- [[OPS-RUNBOOK|Ops runbook]]
- Firebase Console: https://console.firebase.google.com/project/peskids-f1aec
