# OpsAfterDark Dual Recording (H+V) — Evidence & Config

**Date:** 2026-10-05  
**Host:** smdqcia-pc / home-gpu-01 (RTX 3060)  
**OBS:** 32.2.2 + Aitum Vertical (vertical-canvas) 1.6.4 — **not reinstalled**  
**Mode:** TEST copy only (OpsAfterDark-DualRec-TEST) — production OpsAfterDark preserved in backup  
**Stream:** never started during this work

## Inspection (pre-change)

| Component | Status |
|---|---|
| Aitum Vertical 1.6.4 | Present at `C:\ProgramData\obs-studio\plugins\vertical-canvas` |
| Other plugins | advanced-scene-switcher 1.36.1, obs-shaderfilter, obs-multi-rtmp |
| NVENC | Available (obs-nvenc) |
| Active collection | `OpsAfterDark.backup-opencode-20261002-213403.json` |
| Prior vertical | canvas 1080×1920 already configured; `recording_match_main=false` |
| Main canvas | Base 2560×1440 @ 60 FPS; record was hybrid_mp4 @ 2560×1440 |

## Backup (verifiable)

- Root: `D:\Content\Media\OBS\_backups\OpsAfterDark-dualrec-20261005-234235`
- `MANIFEST.json` with SHA256 (VERIFY_FAIL=0)
- Rollback: `D:\Content\Media\OBS\_backups\OpsAfterDark-dualrec-20261005-234235\ROLLBACK.ps1`

## TEST configuration

### Profile `OpsAfterDark-DualRec-TEST`
- Base canvas: **2560×1440** (preserves existing layouts)
- Output encode: **1920×1080 @ 60 FPS**
- Rec format: **mkv**
- Encoder: **obs_nvenc_h264_tex**
- Path: `D:\Content\Media\OBS\horizontal`
- Filename: `%CCYY-%MM-%DD_%hh-%mm-%ss_OpsAfterDark_H1920x1080`

### Aitum Vertical (TEST config applied)
- Canvas: **1080×1920**
- `recording_match_main=true` (dual local record without live)
- `streaming_match_main=false`
- Path: `D:\Content\Media\OBS\vertical`
- Format: **mkv**
- Encoder: inherit NVENC (empty record_encoder → `vertical_canvas_record_video_encoder` / obs_nvenc_h264_tex)
- New vertical scenes (shared sources, no recursive capture):
  - `V_GAMING` — Game Capture fill/crop + HUD + Marca + Overlay PiP
  - `V_CODING` — VIBE.Ubuntu + Mission Control panel
  - `V_FACTORY_FOCUS` — Mission Control full + branding

### Shared capture
- Same `Game Capture` source UUID `b2a82ed7-ee37-4c36-823c-997e00f5d3ff` referenced on both canvases
- No second OBS instance, no display capture of OBS itself

## 60s local dual-record test

Stream active: **false** throughout.

| File | Container | Size | Duration | Video | FPS | Audio |
|---|---|---|---|---|---|---|
| `horizontal\2026-10-05_23-44-10_OpsAfterDark_H1920x1080.mkv` | matroska | 2.43 MB | 79.77 s | 1920×1080 h264 | 60/1 | 4× AAC 48 kHz |
| `vertical\2026-10-05_23-44-11_OpsAfterDark_H1920x1080-vertical.mkv` | matroska | 2.36 MB | 79.72 s | 1080×1920 h264 | 60/1 | 4× AAC 48 kHz |

Outputs present: `adv_file_output` 1920×1080 + `vertical_canvas_record`.

### Runtime samples
- activeFps ≈ **60.0** stable
- CPU ≈ 11–34%
- GPU util ≈ 14–29%, VRAM ≈ 2.1 GB, temp 55–59 °C

### Audio sync
- Horizontal: A/V start delta **0 ms**
- Vertical: audio starts **+21 ms** (~1.26 frames @ 60) — acceptable

### Frame QA
- Extracted frames show **near-black** (YAVG≈0.44) because `Game Capture` targets `bf6.exe` and no game was running during the smoke test.
- H and V frame hashes **differ** (independent compositions; not a duplicated identical canvas).
- No recursive OBS-in-OBS imagery observed.
- **Follow-up:** re-run 60s with an active game/window for visual composition QA.

### Naming note (Aitum)
When `recording_match_main=true`, Aitum wrote vertical as `…_H1920x1080-vertical.mkv` (main stem + `-vertical`). Differentiation also enforced by folder (`horizontal/` vs `vertical/`). Content OS can key off path + `-vertical` suffix.

## Rollback

```powershell
# Stop OBS first
& 'D:\Content\Media\OBS\_backups\OpsAfterDark-dualrec-20261005-234235\ROLLBACK.ps1'
# Then restore user.ini activation to production names if needed:
# Profile=OpsAfterDark / SceneCollectionFile=OpsAfterDark.backup-opencode-20261002-213403.json
# vertical-canvas\config.json.bak-pre-dualrec-test
```

Also: `user.ini.bak-pre-dualrec-test` and `config.json.bak-pre-dualrec-test`.

## Production promotion (requires explicit approval)
TEST is active in `user.ini` while OBS is open for validation. To promote: copy TEST profile/scene settings into production OpsAfterDark after visual QA with live game, or keep DualRec-TEST as the working profile.

Do **not** start stream/publish without authorization.