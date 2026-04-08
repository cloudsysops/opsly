# Skills Opsly (Claude modo supremo)

Skills procedurales para trabajar en **Opsly** sin improvisar.

## Ubicación en repo

- **`skills/user/<nombre>/SKILL.md`** — fuente de verdad en git.

## Entornos con `/mnt/skills`

Si Claude Code u otro runtime monta skills en `/mnt/skills/user`, sincroniza o enlaza desde el clon:

```bash
# ejemplo: enlace simbólico (ajusta rutas)
ln -sfn /opt/opsly/skills/user /mnt/skills/user/opsly-repo
```

O copia los directorios `opsly-*` bajo `/mnt/skills/user/` tras cada `git pull`.
