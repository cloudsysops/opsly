# Google Drive — espejo de documentación Opsly

## Objetivo

Tener en **Google Drive** una copia de lectura de `AGENTS.md`, arquitectura y guías operativas para consulta rápida (humano o asistentes con **Google Drive conectado**).

## Lista de archivos a copiar

Origen de verdad en git: **`docs/opsly-drive-files.list`** (una ruta por línea, relativa a la raíz del repo).

Incluye, entre otros: `AGENTS.md`, `VISION.md`, `docs/ARCHITECTURE.md` (en el repo no existe `ARCHITECTURE-EXPLAINED.md`; se usa `ARCHITECTURE.md`), docs de seguridad, runbooks, scripts clave y `infra/terraform/tfplan.txt` si está presente en tu clon.

Regenerar la lista en el VPS (equivalente a `/tmp/opsly-drive-files.txt`):

```bash
cd /opt/opsly
cp docs/opsly-drive-files.list /tmp/opsly-drive-files.txt
cat /tmp/opsly-drive-files.txt
```

En Mac (workspace local), rutas típicas: raíz del clon `intcloudsysops` / `opsly`, no solo `/opt/opsly`.

## Instrucciones para Cristian (Mac o navegador)

1. Abre [Google Drive](https://drive.google.com).
2. **Nueva carpeta** llamada **`Opsly`** (o el nombre acordado en `.opsly-drive-config.json`).
3. Sube los archivos listados en `docs/opsly-drive-files.list` desde tu clon (arrastrar o **File → Upload**). Para muchos archivos: comprime una selección o usa **Google Drive for desktop**.
4. **Compartir la carpeta**
   - Clic derecho en la carpeta → **Share**.
   - Recomendado para asistentes: **Anyone with the link** → **Viewer** (o solo tu organización, según política).
   - Copia el enlace de la carpeta (formato `https://drive.google.com/drive/folders/...`).
5. **Pega el enlace** en la sección [Link compartido](#link-compartido) abajo (y opcionalmente en `.opsly-drive-config.json` → `folder_url`) y haz commit en el repo.

## Cómo puede usarlo Claude

- Claude **no** lee Drive por magia: hace falta que **tu** cuenta/workspace de Claude tenga **integración con Google Drive** activada (cuando el producto lo permita) y permisos sobre esa carpeta.
- Con el conector habilitado, en un chat puedes pedir explícitamente que busque o resuma **`AGENTS.md`** u otros docs en la carpeta **Opsly**.
- Sigue siendo válida la **URL raw** de GitHub para contexto sin Drive:  
  `https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md`

## Cuándo actualizar Drive

Tras cambios importantes en:

- `AGENTS.md` (estado, bloqueantes, próximo paso)
- `VISION.md`
- Arquitectura / seguridad / runbooks listados en `opsly-drive-files.list`

Sincronización **manual** salvo que añadas un script propio (no incluido en este repo).

## Link compartido

<!-- Cristian: pega aquí el enlace de la carpeta de Drive (vista solo lectura recomendada). -->

_Pendiente — añadir tras crear y compartir la carpeta._

---

## Configuración en repo

Metadatos: **`.opsly-drive-config.json`** en la raíz del repo (sin secretos).

Tras pegar el link definitivo, actualiza también `folder_url` en ese JSON y haz commit, por ejemplo:

```bash
git add docs/GOOGLE-DRIVE-SYNC.md .opsly-drive-config.json
git commit -m "config: google drive link added"
git push origin main
```
