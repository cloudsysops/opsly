# Skills Opsly (Claude modo supremo)

Skills procedurales para trabajar en **Opsly** sin improvisar.

## Ubicación en repo

- **`skills/user/<nombre>/SKILL.md`** — fuente de verdad en git.
- **`manifest.json` (opcional)** junto a `SKILL.md`: `name`, `version`, `description`, `inputSchema` / `outputSchema` (JSON Schema como objetos JSON). Si existe, tiene prioridad sobre frontmatter para esos campos.
- **Frontmatter opcional** al inicio de `SKILL.md` (bloque `---` … `---`): puede ser **JSON** (objeto, una línea o varias) o **YAML simple** (`clave: valor` por línea para `name`, `version`, `description`). Compatible con lectura manual; el cuerpo del skill queda tras el segundo `---`.
- **Paquete `skills/manifest`**: `@intcloudsysops/skills-manifest` exporta `loadSkillMetadata`, `validateAllUserSkills`, `parseSimpleFrontmatter`, `parseManifestJsonObject`. Validación: `npm run validate-skills`; tests: `npm run test-skills-manifest` (raíz del repo).
- Skills incluidos: `opsly-context`, `opsly-quantum` (maestro / orquestación), `opsly-api`, `opsly-bash`, `opsly-llm`, `opsly-mcp`, `opsly-supabase`, `opsly-discord`, `opsly-tenant`, `opsly-feedback-ml`, `opsly-agent-teams`, `opsly-notebooklm`, `opsly-google-cloud`.

## Entornos con `/mnt/skills`

En muchos clones **no existe** `/mnt/skills` (es una ruta típica de runtimes tipo Claude Code). Usa siempre los paths bajo `skills/user/` del repo.

Si el runtime monta `/mnt/skills/user`, sincroniza o enlaza desde el clon:

```bash
# ejemplo: enlace simbólico (ajusta rutas)
ln -sfn /opt/opsly/skills/user /mnt/skills/user/opsly-repo
```

O copia los directorios `opsly-*` bajo `/mnt/skills/user/` tras cada `git pull`.
