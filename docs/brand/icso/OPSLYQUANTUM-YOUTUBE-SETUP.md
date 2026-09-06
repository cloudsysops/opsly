# opslyquantum — checklist YouTube OAuth (ICSO / Bitsitos)

Proyecto GCP canónico Opsly: **`opslyquantum`**.  
No uses el OAuth de SmileTripCare ni otro `client_secret` de Downloads.

## A. Cuenta correcta

1. En Chrome: entra con la cuenta Google que **posee** el proyecto `opslyquantum` (IntCloudSysOps / opsly).
2. Confirma el selector de proyecto arriba: **opslyquantum**.

CLI (opcional):

```bash
gcloud auth login
gcloud config set project opslyquantum
gcloud projects describe opslyquantum
```

## B. APIs (obligatorio)

1. Abre: https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=opslyquantum  
2. Clic **Enable** (YouTube Data API v3).

Opcional (misma sesión):

```bash
gcloud services enable youtube.googleapis.com --project=opslyquantum
```

## C. Pantalla de consentimiento OAuth

1. https://console.cloud.google.com/apis/credentials/consent?project=opslyquantum  
2. User type: **External** → Create.  
3. App name: `ICSO Bitsitos`  
4. User support email: el tuyo  
5. Developer contact: el tuyo  
6. Save → **Scopes** → Add:
   - `.../auth/youtube.upload`
   - `.../auth/youtube.readonly`
   - `.../auth/youtube.force-ssl`  
7. Test users: agrega **tu** Gmail (el dueño del canal Bitsitos).  
8. Back to dashboard → Publishing status puede quedar en **Testing** (suficiente para tu cuenta).

## D. Credencial OAuth client

1. https://console.cloud.google.com/apis/credentials?project=opslyquantum  
2. **+ Create credentials** → **OAuth client ID**  
3. Application type: **Desktop app** (recomendado)  
   - Name: `bitsitos-youtube-upload`  
4. Si eliges **Web application** en vez de Desktop, añade redirect:
   - `http://127.0.0.1:8768/oauth2callback`  
5. **Create** → **Download JSON**  
6. Guarda exactamente como:

```text
/Users/dragon/Downloads/youtube-oauth-client.json
```

## E. Doppler (yo lo corro cuando digas `json listo`)

```bash
./scripts/youtube-oauth-doppler-setup.sh \
  --client-json ~/Downloads/youtube-oauth-client.json
```

Eso escribe en `ops-intcloudsysops` / `prd`:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_REDIRECT_URI`

(Metadatos de canal ya están: `YOUTUBE_BITSITOS_CHANNEL_ID`, privacy, etc.)

## F. Verificar

```bash
npm run youtube:doppler:check
# o
doppler secrets --only-names --project ops-intcloudsysops --config prd | grep YOUTUBE
```

Luego upload:

```bash
npm run content:bitsitos:upload
```

## Errores típicos

| Síntoma | Causa |
|---------|--------|
| `access_denied` / app no verificada | Falta tu email en **Test users** |
| redirect_uri_mismatch | Client Web sin `http://127.0.0.1:8768/oauth2callback` |
| 403 YouTube API | API no enabled en **opslyquantum** |
| Canal equivocado | Login OAuth con otra cuenta Google |

## Qué NO hacer

- No reutilizar `client_secret_*smile*` / Supabase / otro proyecto.  
- No pegar secretos en el chat.  
- No poner `YOUTUBE_*` en git.
