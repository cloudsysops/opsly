# N8N Import Guide — Discord to GitHub

Guia paso a paso para importar y verificar el workflow
`docs/n8n-workflows/discord-to-github.json` sin ejecucion automatica.

## Estado actual (autodiagnostico)

- Fecha: 2026-04-08 (actualizado naming PAT)
- **PAT GitHub en Doppler `prd`:** usar **`GITHUB_TOKEN`** (nombre alineado a CLI `gh` y al resto del monorepo). **`GITHUB_TOKEN_N8N`** es solo **legado** (mismo valor permitido como fallback en código/scripts; ver [`GITHUB-TOKEN.md`](../GITHUB-TOKEN.md)).
- `DISCORD_WEBHOOK_URL` en Doppler `prd`: verificar longitud con el bucle de vars críticas.
- Siguiente accion operativa: tener al menos uno de los dos nombres con PAT válido (`repo` / Contents) y ejecutar la prueba del paso 6.

Comando típico (stdin, no pegar el token en argv):

```bash
doppler secrets set GITHUB_TOKEN --project ops-intcloudsysops --config prd
```

## 1) Pre-checks obligatorios

1. Verifica acceso a n8n:
   - URL: `https://n8n-intcloudsysops.ops.smiletripcare.com`
2. Verifica secreto en Doppler (comando operativo):

```bash
doppler secrets get GITHUB_TOKEN \
  --project ops-intcloudsysops --config prd --plain | wc -c
```

1. Resultado esperado:
   - `> 20` caracteres (PAT real).
1. Si falla, probar el nombre legado: `doppler secrets get GITHUB_TOKEN_N8N ...` — `check-tokens.sh` acepta **cualquiera de los dos**.

## 2) Importar JSON en n8n (manual)

1. En n8n: **Workflows** -> **Import from file**.
2. Selecciona: `docs/n8n-workflows/discord-to-github.json`.
3. Confirma nombre del workflow:
   - `Opsly Discord to GitHub ACTIVE-PROMPT`
4. Verifica nodos importados:
   - `Discord Webhook`
   - `Validate Message`
   - `Prepare ACTIVE-PROMPT`
   - `Get ACTIVE-PROMPT SHA`
   - `Update ACTIVE-PROMPT`
   - `Notify Discord Confirm`

## 3) Configurar variables de entorno en n8n

Configurar en el entorno de n8n:

- `GITHUB_TOKEN` (recomendado; el workflow importado usa `{{$env.GITHUB_TOKEN}}`)
- `DISCORD_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET_GH` (recomendado; legados: `N8N_WEBHOOK_SECRET`, `GITHUB_N8N`) para validacion de origen (`X-Opsly-Secret`). El nombre **`GITHUB_N8N`** es el antiguo; migrar el valor a **`N8N_WEBHOOK_SECRET_GH`** en Doppler.

Si solo tienes el **PAT** bajo el nombre legado `GITHUB_TOKEN_N8N`, en n8n puedes duplicar la variable como `GITHUB_TOKEN` con el mismo valor, o editar los nodos HTTP para usar `{{$env.GITHUB_TOKEN_N8N}}`.

No hardcodear tokens en nodos.

## 4) Verificacion de nodos HTTP (sin adivinar)

### Nodo `Get ACTIVE-PROMPT SHA`

- Method: `GET`
- URL: `https://api.github.com/repos/cloudsysops/opsly/contents/docs/ACTIVE-PROMPT.md`
- Header: `Authorization: Bearer {{$env.GITHUB_TOKEN}}`

### Nodo `Update ACTIVE-PROMPT`

- Method: `PUT`
- URL: `https://api.github.com/repos/cloudsysops/opsly/contents/docs/ACTIVE-PROMPT.md`
- Headers:
  - `Authorization: Bearer {{$env.GITHUB_TOKEN}}`
  - `Content-Type: application/json`

### Nodo `Notify Discord Confirm`

- Method: `POST`
- URL: `{{$env.DISCORD_WEBHOOK_URL}}`
- Body json:
  - `{"content":"📝 Tarea enviada a Cursor — ejecutara en ~30s"}`

## 5) Obtener URL de webhook despues de importar

1. Abre nodo `Discord Webhook`.
2. Copia la URL de `Production URL` (o `Test URL` para pruebas).
3. Exporta en terminal local:

```bash
export N8N_WEBHOOK_URL="<URL_WEBHOOK_COPIADA_DESDE_N8N>"
export N8N_WEBHOOK_SECRET_GH="<SECRET_COMPARTIDO>"
```

## 6) Probar webhook con curl (dry-run en payload)

> Esta prueba envia `dry_run: true` en el body.
> No se ejecuta automatizacion de infraestructura desde este comando.

```bash
curl -sk -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: $N8N_WEBHOOK_SECRET_GH" \
  -d '{"content":"@cursor # test\necho hello","author":{"username":"Cristian"},"target":"cursor","dry_run":true}'
```

Alternativa automatizada (helper del repo):

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/dispatch-discord-command.sh --content "@claude revisar health + resumen"
```

## 7) Checklist de salida

- [ ] `GITHUB_TOKEN` o `GITHUB_TOKEN_N8N` disponible en Doppler `prd` (y en env n8n si aplica).
- [ ] Workflow importado en n8n sin errores.
- [ ] Variables de entorno cargadas en n8n.
- [ ] Webhook URL copiada desde n8n.
- [ ] `curl` responde 200/2xx con payload `dry_run: true`.
