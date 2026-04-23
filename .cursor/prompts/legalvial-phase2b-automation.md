# LegalVial — Phase 2b automation prompt (fuente Drive)

## Fuente canónica (Google Drive)

- Documento: `CURSOR-PHASE2b-AUTOMATION-PROMPT: Complete Execution Guide`
- File ID: `1r2rCcsLZRG3gWYGq_IfS6pYn1Ub6853k4l4zoKRX2rY`
- Link: `https://docs.google.com/document/d/1r2rCcsLZRG3gWYGq_IfS6pYn1Ub6853k4l4zoKRX2rY/edit`

## Import automático al repo

```bash
export GOOGLE_DRIVE_IMPORT_SCOPE="https://www.googleapis.com/auth/drive.readonly"
export GOOGLE_AUTH_STRATEGY="service_account_first"
./scripts/import-google-doc.sh \
  --strategy service_account_first \
  --file-id "1r2rCcsLZRG3gWYGq_IfS6pYn1Ub6853k4l4zoKRX2rY" \
  --out ".cursor/prompts/legalvial-phase2b-automation.drive.txt"
```

## Snapshot importado (texto plano)

Opcional: tras correr el import, puedes versionar `.cursor/prompts/legalvial-phase2b-automation.drive.txt` como snapshot.

Si queda vacío, revisa el Google Doc en Drive (contenido aceptado/publicado en el cuerpo).
