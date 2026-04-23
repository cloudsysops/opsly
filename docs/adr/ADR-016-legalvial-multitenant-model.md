# ADR-016 — LegalVial: modelo multi-tenant (subcliente de LocalRank)

## Fuente canónica (Google Drive)

- Documento: `ADR-016: LEGALVIAL MULTITENANT MODEL`
- File ID: `1CUr3SoHuCaK6bVi06xlx6aew9yXSNaw_80vKHfTBxpU`
- Link: `https://docs.google.com/document/d/1CUr3SoHuCaK6bVi06xlx6aew9yXSNaw_80vKHfTBxpU/edit`

## Import automático al repo

Este ADR se importa desde Drive con:

```bash
export GOOGLE_DRIVE_IMPORT_SCOPE="https://www.googleapis.com/auth/drive.readonly"
export GOOGLE_AUTH_STRATEGY="service_account_first"
./scripts/import-google-doc.sh \
  --strategy service_account_first \
  --file-id "1CUr3SoHuCaK6bVi06xlx6aew9yXSNaw_80vKHfTBxpU" \
  --out "docs/adr/ADR-016-legalvial-multitenant-model.drive.txt"
```

Notas operativas:

- Comparte el Google Doc con el `client_email` de la Service Account configurada en `GOOGLE_SERVICE_ACCOUNT_JSON` (Opsly).
- Si `ADR-016-legalvial-multitenant-model.drive.txt` queda vacío, normalmente el documento en Drive **no tiene cuerpo publicado** (solo título, o cambios solo como sugerencias sin aceptar).

## Snapshot importado (texto plano)

Opcional: tras correr el import, puedes versionar `docs/adr/ADR-016-legalvial-multitenant-model.drive.txt` como “snapshot” del documento.

Si ese archivo queda vacío (solo BOM), el Google Doc en Drive **no tiene cuerpo exportable** todavía (revisa sugerencias sin aceptar, o contenido fuera del cuerpo).
