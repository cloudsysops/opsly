# N8N Import Guide — Discord to GitHub

Guia paso a paso para importar y verificar el workflow
`docs/n8n-workflows/discord-to-github.json` sin ejecucion automatica.

## 1) Pre-checks obligatorios

1. Verifica acceso a n8n:
   - URL: `https://n8n-intcloudsysops.ops.smiletripcare.com`
2. Verifica secreto en Doppler (comando operativo):

```bash
doppler secrets get GITHUB_TOKEN_N8N \
  --project ops-intcloudsysops --config prd --plain | wc -c
```

3. Resultado esperado:
   - `> 10` caracteres.
4. Resultado observado en esta ejecucion:
   - `Doppler Error: Could not find requested secret: GITHUB_TOKEN_N8N` y `0`.
   - Si ocurre, crear/cargar el secreto en `prd` antes de activar el flujo.

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

- `GITHUB_TOKEN_N8N`
- `DISCORD_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET` (recomendado para validacion de origen)

No hardcodear tokens en nodos.

## 4) Verificacion de nodos HTTP (sin adivinar)

### Nodo `Get ACTIVE-PROMPT SHA`
- Method: `GET`
- URL: `https://api.github.com/repos/cloudsysops/opsly/contents/docs/ACTIVE-PROMPT.md`
- Header: `Authorization: Bearer {{$env.GITHUB_TOKEN_N8N}}`

### Nodo `Update ACTIVE-PROMPT`
- Method: `PUT`
- URL: `https://api.github.com/repos/cloudsysops/opsly/contents/docs/ACTIVE-PROMPT.md`
- Headers:
  - `Authorization: Bearer {{$env.GITHUB_TOKEN_N8N}}`
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
export N8N_WEBHOOK_SECRET="<SECRET_COMPARTIDO>"
```

## 6) Probar webhook con curl (dry-run en payload)

> Esta prueba envia `dry_run: true` en el body.
> No se ejecuta automatizacion de infraestructura desde este comando.

```bash
curl -sk -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: $N8N_WEBHOOK_SECRET" \
  -d '{"content":"# test\necho hello","author":{"username":"Cristian"},"dry_run":true}'
```

## 7) Checklist de salida

- [ ] `GITHUB_TOKEN_N8N` disponible en Doppler `prd`.
- [ ] Workflow importado en n8n sin errores.
- [ ] Variables de entorno cargadas en n8n.
- [ ] Webhook URL copiada desde n8n.
- [ ] `curl` responde 200/2xx con payload `dry_run: true`.

