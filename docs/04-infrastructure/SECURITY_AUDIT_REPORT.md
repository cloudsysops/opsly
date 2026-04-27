# Informe de auditoría de seguridad (automatizado en repo)

**Fecha:** 2026-04-06  
**Alcance:** monorepo Opsly — sin acceso a Doppler/VPS ni a secretos reales.

## npm audit

- **Raíz del monorepo:** `npm audit` → **0** vulnerabilidades (reporte JSON, todas las severidades en 0 al momento de la corrida).
- **Workspace `apps/api`:** mismo resultado (dependencias resueltas vía lockfile raíz).

Recomendación: ejecutar `npm audit` en CI en cada PR y ante cambios de `package-lock.json`.

## Escaneo heurístico de secretos en Git

Comando usado (patrones de alto riesgo):

```bash
rg -n --glob '!node_modules/**' --glob '!.git/**' -i \
  'sk_live_[0-9a-zA-Z]{20,}|ghp_[0-9a-zA-Z]{36}|xox[bpa]-|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----' .
```

**Resultado:** sin coincidencias en el árbol de trabajo analizado.

**Limitaciones:** no sustituye TruffleHog, Gitleaks ni revisión manual; no escanea historial Git profundo ni blobs remotos.

## Row Level Security (Supabase)

Revisión estática de `supabase/migrations/0007_rls_policies.sql`:

- RLS **habilitado** en: `platform.tenants`, `platform.subscriptions`, `platform.audit_log`, `platform.port_allocations`.
- Políticas actuales: **`service_role_only`** — acceso vía `auth.role() = 'service_role'`.

**Implicación:** el API que usa `service_role` (service client) debe seguir restringido por red, tokens y buenas prácticas; los clientes con **anon key** no deben poder mutar estas tablas si las políticas se mantienen.

Revalidar tras nuevas migraciones que alteren RLS o expongan tablas al rol `authenticated` / `anon`.

## Conclusión

No se detectaron patrones obvios de secretos en el working tree ni vulnerabilidades npm en el reporte local. La postura RLS de plataforma es coherente con “solo service role” en las tablas citadas.

**Qué no se hizo:** pentest, revisión de dependencias trazadas en tiempo de ejecución, revisión de permisos IAM/DO, ni verificación en producción.
