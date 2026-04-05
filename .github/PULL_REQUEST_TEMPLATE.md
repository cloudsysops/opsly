<!--
================================================================================
PLANTILLA DE PULL REQUEST — Opsly (.github/PULL_REQUEST_TEMPLATE.md)
================================================================================
Qué hace: rellena el cuerpo del PR en GitHub con secciones y checklist comunes.
Cuándo se activa: al crear un PR (GitHub inserta este texto en la descripción).
Reutilizar en otro proyecto: copia el archivo, cambia checklist (scripts, CI) y
  enlaces; renombra equipos/Doppler si aplica.
================================================================================
-->

## Resumen

<!-- Una o dos frases: qué cambia este PR y por qué. -->

## Tipo de cambio

<!--
Esta sección clasifica el PR para changelog y revisión.
- feature: comportamiento nuevo visible para usuarios u operadores.
- fix: corrige un fallo sin cambiar el contrato a propósito.
- infra: compose, VPS, CI, redes, imágenes, Terraform.
- docs: solo documentación o comentarios de gobernanza.
- chore: formato, deps menores, refactors sin impacto funcional.
-->

- [ ] feature
- [ ] fix
- [ ] infra
- [ ] docs
- [ ] chore

## Impacto en tenants

<!--
Indica si los clientes multi-tenant se ven afectados.
- ninguno: solo dev, docs, o cambios sin tocar runtime de tenants.
- requiere migration: hay SQL en supabase/migrations o cambio de esquema.
- requiere redeploy: hay que actualizar imágenes, compose en VPS o variables en Doppler.
-->

- [ ] ninguno
- [ ] requiere migration (Supabase / esquema)
- [ ] requiere redeploy (VPS, imágenes, Doppler)

## Checklist

<!--
Cada ítem ayuda a mantener calidad y seguridad del monorepo.
- type-check: alineado con pre-commit / Turbo en el repo.
- Doppler: secretos fuera del código; nunca pegar valores en el PR.
- validate-config: valida JSON, DNS, Doppler mínimo y SSH según entorno local.
- AGENTS.md: obligatorio si cambias arquitectura, flujo de deploy o decisiones fijas.
- Terraform: si tocáis infra/terraform/, el plan debe revisarse antes de aplicar.
-->

- [ ] `npm run type-check` (o el type-check del monorepo) pasó localmente
- [ ] No hay secretos en el código; los valores van en Doppler (u otro gestor acordado)
- [ ] `./scripts/validate-config.sh` pasó cuando aplica (deploy / DNS / Doppler configurados en la máquina)
- [ ] `AGENTS.md` actualizado si cambió arquitectura, flujos o decisiones de sesión
- [ ] Si toqué `infra/terraform/`: revisé `terraform plan` (o equivalente) y lo enlazo o describo abajo

## Cómo probar

<!-- Pasos concretos, URLs de staging, o N/A con justificación breve. -->

## Terraform / infra (solo si aplica)

<!-- Enlace al plan, issue, o “N/A”. -->

## Notas para quien revisa

<!-- Contexto, trade-offs, riesgos, enlaces a issues. -->
