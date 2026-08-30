---
status: active
owner: peskids
last_review: 2026-08-10
tenant: peskids
---

# Peskids — App móvil (Android + iOS)

Shell nativo **Capacitor 8** sobre la web viva (`https://www.peskids.com`).  
Misma sesión Supabase, mismos paneles `/familias` y `/teacher`. No hay segundo frontend.

| Campo | Valor |
|-------|--------|
| App ID | `com.peskids.app` |
| Scheme | `peskids://` |
| Config | [`apps/peskids/capacitor.config.ts`](../../../apps/peskids/capacitor.config.ts) |
| Web placeholder | `apps/peskids/capacitor-web/` |
| Android | `apps/peskids/android/` |
| iOS | `apps/peskids/ios/` |

## Audiencia MVP

Una sola app en stores. El login de la web decide el home (familia vs docente). Staff puede usar `/admin` dentro del WebView si hace falta; el icono de store apunta al portal familias.

## Requisitos locales

- Node 22+ (monorepo)
- **Android:** Android Studio + SDK + JDK 17
- **iOS:** macOS + Xcode 16+ (Apple Developer account para TestFlight)
- Placeholders Firebase (push):
  - `apps/peskids/google-services.json` → copiar a `android/app/` cuando haya proyecto FCM real
  - `apps/peskids/GoogleService-Info.plist` → añadir al target iOS en Xcode

## Comandos

```bash
# Sync WebView assets + plugins
cd apps/peskids && npm run cap:sync

# Android
./scripts/peskids-cap-android.sh            # sync
./scripts/peskids-cap-android.sh --open     # Android Studio
./scripts/peskids-cap-android.sh --build    # APK debug

# iOS
./scripts/peskids-cap-ios.sh                # sync
./scripts/peskids-cap-ios.sh --open         # Xcode

# Alias raíz
npm run peskids:cap:android
npm run peskids:cap:android:open
npm run peskids:cap:ios
```

Overrides de URL (QA / staging):

```bash
NEXT_PUBLIC_APP_URL=https://www.peskids.com npx cap sync
# o un preview interno; nunca cleartext HTTP en store builds
```

## Flujo de release (humano)

1. Web en prod sana: `curl -sf https://www.peskids.com/api/health`
2. `cd apps/peskids && npm run cap:sync`
3. **Android:** firmar release en Android Studio → Play Console (internal testing → production)
4. **iOS:** Signing Team + bundle id `com.peskids.app` → Archive → TestFlight → App Store
5. Push: crear apps FCM/APNs, reemplazar placeholders en raíz `apps/peskids/`, copiar `google-services.json` a `android/app/` (gitignored), re-sync, probar con usuario logueado
6. Universal / App Links:
   - Rellenar `TEAMID` en [`public/.well-known/apple-app-site-association`](../../../apps/peskids/public/.well-known/apple-app-site-association)
   - Rellenar SHA-256 de Play App Signing en [`public/.well-known/assetlinks.json`](../../../apps/peskids/public/.well-known/assetlinks.json)
   - Redeploy web Peskids (ventana nocturna) para publicar `.well-known`

## Checklist stores (primera subida)

- [ ] Cuenta Apple Developer + App Store Connect app `Peskids`
- [ ] Cuenta Google Play Console app `com.peskids.app`
- [ ] Privacy policy URL (usar `/legal` o página publicada)
- [ ] Capturas iPhone + Android (portal familias)
- [ ] Categoría: Educación / Estilo de vida
- [ ] Edad: 4+ (padres; contenido no dirigido a menores en la app)
- [ ] Internal testing / TestFlight con 2–3 familias piloto
- [ ] FCM + APNs reales (push)

## Qué NO hacer

- No crear un segundo monorepo Expo “en paralelo” sin ADR.
- No commitear `google-services.json` / plist **reales** (solo placeholders).
- No rebuild VPS / deploy pesado de día por un cambio solo de shell nativo.
- No apuntar `server.url` a IP pública ni HTTP.

## Relación con PWA

La PWA (`manifest.webmanifest` + `sw.js`) sigue válida para “Añadir a inicio”.  
La app de store es el mismo producto con icono + push nativo + back button.

## Enlaces

- CRM: [`TWENTY-CRM.md`](./TWENTY-CRM.md)
- Checklist cliente web: [`CLIENT-REVIEW-2026-08-06.md`](./CLIENT-REVIEW-2026-08-06.md)
