# LegalVial — checklist Go-Live (producción)

Usar junto con [LEGALVIAL-LOCALRANK-MODEL.md](./LEGALVIAL-LOCALRANK-MODEL.md) y [LEGALVIAL-CONFIG-ZERO-TRUST.md](./LEGALVIAL-CONFIG-ZERO-TRUST.md).

## Seguridad y red

- [ ] SSH administrativo solo por Tailscale (no exponer 22 público sin restricción).
- [ ] Cloudflare Proxy ON en registros públicos del dominio de plataforma / tenant según política.
- [ ] UFW u homólogo: mínimo puertos; reglas alineadas a [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](../04-infrastructure/SECURITY_CHECKLIST.md).
- [ ] Secretos solo en Doppler `prd`; VPS `.env` regenerado con bootstrap documentado; sin valores en historial compartido.

## Datos y tenant

- [ ] Fila `platform.tenants` para slug `legalvial` (o definitivo) con `owner_email`, `plan`, `status` coherente.
- [ ] Schema tenant creado y migraciones aplicadas si aplica.
- [ ] `config/tenants/legalvial.json` revisado; `./scripts/validate-subclient-config.sh` OK.

## Stacks y salud

- [ ] `docker ps` muestra contenedores n8n + Uptime del tenant LegalVial.
- [ ] HTTPS `n8n-{slug}.{dominio}` y `uptime-{slug}.{dominio}` responden 200/302 esperado.
- [ ] `GET /api/health` API plataforma OK; health portal/tenant según [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](../04-infrastructure/SECURITY_CHECKLIST.md).

## Portal y producto

- [ ] Invitación enviada y aceptada; login portal LegalVial.
- [ ] Modo developer/managed operativo; métricas usage si aplica (`/api/portal/tenant/{slug}/usage`).
- [ ] Flujos n8n críticos probados (manual o smoke acotado).

## Operación

- [ ] Discord (u otro canal) recibe alertas de prueba.
- [ ] Backups: política confirmada; restauración documentada o ensayada en ventana de mantenimiento.
- [ ] Runbook de incidente: [incident.md](./incident.md) + notas específicas LegalVial si existen.

## Firma Go-Live

- **Responsable:** _______________
- **Fecha:** _______________
- **Rollback:** ver [LEGALVIAL-E2E-SOFTLAUNCH.md](./LEGALVIAL-E2E-SOFTLAUNCH.md)
