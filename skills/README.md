# Skills Opsly (Claude modo supremo)

Skills procedurales para trabajar en **Opsly** sin improvisar.

## Ubicación en repo

- **`skills/user/<nombre>/SKILL.md`** — fuente de verdad en git.
- Skills incluidos: `opsly-context`, `opsly-api`, `opsly-bash`, `opsly-llm`, `opsly-mcp`, `opsly-supabase`, `opsly-discord`, `opsly-tenant`, `opsly-feedback-ml`, `opsly-agent-teams`, `opsly-notebooklm`.

## Entornos con `/mnt/skills`

En muchos clones **no existe** `/mnt/skills` (es una ruta típica de runtimes tipo Claude Code). Usa siempre los paths bajo `skills/user/` del repo.

Si el runtime monta `/mnt/skills/user`, sincroniza o enlaza desde el clon:

```bash
# ejemplo: enlace simbólico (ajusta rutas)
ln -sfn /opt/opsly/skills/user /mnt/skills/user/opsly-repo
```

O copia los directorios `opsly-*` bajo `/mnt/skills/user/` tras cada `git pull`.
