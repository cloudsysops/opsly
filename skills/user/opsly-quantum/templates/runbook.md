# Runbook: {SERVICE_NAME}

## Descripción

{DESCRIPTION}

## Health (API plataforma)

Sustituye `BASE` por `domains.base` en `config/opsly.config.json` (ej. `ops.smiletripcare.com`):

```bash
curl -sf "https://api.BASE/api/health"
```

## Logs (si el servicio es contenedor Docker en VPS)

Solo SSH por Tailscale al host documentado en `AGENTS.md`; no exponer secretos en logs compartidos.

```bash
docker logs --tail 100 "{SERVICE_NAME}"
```

## Reinicio (ejemplo)

```bash
docker restart "{SERVICE_NAME}"
```

## Troubleshooting

### Servicio no responde

1. `docker ps` (o `docker compose ps`) en el host correcto.
2. Revisar logs del contenedor.
3. Verificar Traefik y DNS para el host público.

### Recursos

1. `docker stats` en ventana corta.
2. Si el disco del VPS >90 %: `docs/OPS-CLEANUP-PROCEDURES.md`.

## Contactos

- Equipo: según `AGENTS.md`
- Alertas Discord: webhook vía Doppler (no en repo)
