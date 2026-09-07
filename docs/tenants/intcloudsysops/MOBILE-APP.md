---
status: active
owner: icso
last_review: 2026-09-06
tenant: intcloudsysops
---

# ICSO — App móvil (Android + iOS)

Shell nativo **Capacitor 8** sobre la web viva (`https://icso.op-sly.com`, o
`NEXT_PUBLIC_APP_URL`). Es el mismo sitio ICSO (marketing + pipeline + Mission
Control) dentro del WebView, no un segundo frontend.

| Campo | Valor |
|-------|-------|
| App ID | `com.intcloudsysops.icso` |
| Scheme | `icso://` |
| Web URL | `https://icso.op-sly.com` (default) |
| Config | [`apps/icso/capacitor.config.ts`](../../../apps/icso/capacitor.config.ts) |
| Shared helper | [`scripts/cap-mobile.sh`](../../../scripts/cap-mobile.sh) via `config/mobile-apps.json` |
| Hub | [`docs/01-development/MOBILE-APPS.md`](../../01-development/MOBILE-APPS.md) |
| Web placeholder | `apps/icso/capacitor-web/` |
| Android | `apps/icso/android/` |
| iOS | `apps/icso/ios/` |

`apps/intcloudsysops/` is not a Capacitor target. The native ICSO shell lives only under `apps/icso/`.

## Alcance

ICSO es la **misma entidad que Opsly / IntCloud SysOps** (la agencia-propietaria
de la plataforma), no un tenant-cliente. La app nativa ICSO expone la agencia:
sitio público, intake de leads y Mission Control operativo. Los tenants-cliente
(Peskids, LocalRank, …) tienen sus propias apps nativas siguiendo el mismo patrón
(`scripts/cap-mobile.sh`).

## Requisitos locales

- Node 22+ (monorepo)
- **Android:** Android Studio + SDK + JDK 17
- **iOS:** macOS + Xcode 16+ (Apple Developer account para TestFlight)

## Comandos

```bash
cd apps/icso && npm run cap:sync

# Android
./scripts/icso-cap-android.sh              # sync
./scripts/icso-cap-android.sh --open       # Android Studio
./scripts/icso-cap-android.sh --build      # APK debug
./scripts/icso-cap-android.sh --dry-run

# iOS
./scripts/icso-cap-ios.sh                  # sync
./scripts/icso-cap-ios.sh --open           # Xcode

# Alias raíz
npm run icso:cap:android
npm run icso:cap:android:open
npm run icso:cap:android:build
npm run icso:cap:ios
npm run icso:cap:ios:open
```

Overrides de URL (QA / staging):

```bash
NEXT_PUBLIC_APP_URL=https://icso.op-sly.com npx cap sync
# nunca cleartext HTTP en builds de store
```

## Flujo de release (humano)

1. Web en prod sana: `curl -sf https://icso.op-sly.com` (o dominio comercial)
2. `cd apps/icso && npm run cap:sync`
3. **Android:** firmar release en Android Studio → Play Console
4. **iOS:** Signing Team + bundle id `com.intcloudsysops.icso` → Archive → TestFlight → App Store
5. Universal / App Links: rellenar `.well-known/apple-app-site-association` y
   `.well-known/assetlinks.json` en `apps/icso/public/` antes del deploy web.

## Checklist stores (primera subida)

- [ ] Cuenta Apple Developer + App Store Connect app `ICSO`
- [ ] Cuenta Google Play Console app `com.intcloudsysops.icso`
- [ ] Privacy policy URL publicada
- [ ] Capturas iPhone + Android
- [ ] Categoría: Negocios / Productividad
- [ ] Internal testing / TestFlight

## Qué NO hacer

- No crear un segundo monorepo (Expo/React Native) en paralelo sin ADR.
- No apuntar `server.url` a IP pública ni HTTP.
- No rebuild deploy pesado de día por un cambio solo de shell nativo.
- No commitear credenciales nativas reales.

## Relación con PWA

La PWA sigue válida para “Añadir a inicio”. La app de store es el mismo producto
con icono + navegación nativa.