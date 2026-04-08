# Opsly Google Cloud Skill

## Cuándo usar
Al integrar cualquier servicio de Google Cloud en Opsly.

## Proyecto GCP
- Nombre: opsly-platform
- Sin organización (cuenta personal Gmail)
- Service Account: opsly-drive-sync
- Secret: `GOOGLE_SERVICE_ACCOUNT_JSON` en Doppler `prd`

## Obtener access token desde service account

```bash
# scripts/lib/google-auth.sh
get_google_token() {
  local SA_JSON
  SA_JSON=$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON \
    --project ops-intcloudsysops --config prd --plain 2>/dev/null)

  if [[ -z "$SA_JSON" ]]; then
    echo ""
    return 1
  fi

  # Generar JWT y obtener token
  # Ver scripts/lib/google-auth.sh para implementación completa
}
```

## APIs disponibles y cuándo usarlas

| API | Cuándo | Free tier |
|-----|--------|-----------|
| Drive API | Sync docs | 1B requests/día |
| Sheets API | Reportes | 500 requests/100s |
| BigQuery | Analytics > 100k rows | 1TB queries/mes |
| Cloud Run | Workers sin servidor | 2M requests/mes |
| Vertex AI | Fine-tuning ML | $300 créditos |
| Speech-to-Text | Audio → texto | 60 min/mes |

## Reglas
- SIEMPRE service account (no OAuth personal)
- SIEMPRE token desde `GOOGLE_SERVICE_ACCOUNT_JSON`
- NUNCA hardcodear `project_id` (usar variable)
- Billing alert configurado en $10/mes
- Habilitar API antes de usar (`console.cloud.google.com`)

## Billing alert — configurar una vez
```
console.cloud.google.com
→ Billing → Budgets & Alerts
→ Create Budget
→ Amount: $10/mes
→ Alert at: 50%, 90%, 100%
→ Email: cboteros1@gmail.com
```

