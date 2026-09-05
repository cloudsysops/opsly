---
status: canon
owner: operations
---

# Peskids: merge separado de producción

```text
PR -> CI/review -> main -> Peskids staging -> release-candidate -> production
```

Un PR revisado y verde puede fusionarse a `main` durante el día. Después del
CI exitoso, `Peskids staging` construye una sola imagen inmutable:
`ghcr.io/cloudsysops/peskids:sha-<commitSha>`.

La imagen se ejecuta como `peskids-staging`, separada del contenedor productivo
`peskids` y expuesta solo en `127.0.0.1:3304` del host de staging. Se verifican
health, homepage, login y el SHA expuesto por `/api/health`.

El workflow publica `release-candidate.json` con commit, tag, digest, staging,
smoke, seguridad y política de migraciones. No aplica migraciones productivas.

## Promoción

Actions -> **Promote Peskids release candidate** -> indicar el SHA completo.

La promoción valida candidato staging exitoso, tag/digest coincidentes,
environment `production` aprobado y ventana 22:00–06:00 `America/Bogota`.
Promueve la misma imagen; nunca recompila. Luego verifica health público,
homepage, login y SHA/tag. Si falla, restaura el último tag SHA conocido.

El environment `staging` requiere SSH, `DOPPLER_TOKEN_STG`, dominio y Supabase
de staging. `production` requiere SSH, `DOPPLER_TOKEN_PRD` y reviewers. Si falta
configuración, el workflow falla cerrado. No se usa `latest`.

`night-merge` queda como compatibilidad para PRs antiguos; ya no es necesario
para impedir merges diurnos.
