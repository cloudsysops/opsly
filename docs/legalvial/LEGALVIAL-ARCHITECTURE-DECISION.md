# LegalVial — decisión ejecutiva (fuente Drive)

## Fuente canónica (Google Drive)

- Documento: `LEGALVIAL-ARCHITECTURE-DECISION: Executive Summary for Cristian`
- File ID: `1fg461BWfmpC6VH3CmV5B_eTddofm9T6grwZihT1W0SI`
- Link: `https://docs.google.com/document/d/1fg461BWfmpC6VH3CmV5B_eTddofm9T6grwZihT1W0SI/edit`

## Import automático al repo

```bash
export GOOGLE_DRIVE_IMPORT_SCOPE="https://www.googleapis.com/auth/drive.readonly"
export GOOGLE_AUTH_STRATEGY="service_account_first"
./scripts/import-google-doc.sh \
  --strategy service_account_first \
  --file-id "1fg461BWfmpC6VH3CmV5B_eTddofm9T6grwZihT1W0SI" \
  --out "docs/legalvial/LEGALVIAL-ARCHITECTURE-DECISION.drive.txt"
```

## Snapshot importado (texto plano)

Opcional: tras correr el import, puedes versionar `docs/legalvial/LEGALVIAL-ARCHITECTURE-DECISION.drive.txt` como snapshot.

Si queda vacío, revisa el Google Doc en Drive (contenido aceptado/publicado en el cuerpo).
