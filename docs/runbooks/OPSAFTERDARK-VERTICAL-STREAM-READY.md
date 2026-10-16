# OpsAfterDark — Vertical Streaming Readiness (TEST)

**Profile:** `OpsAfterDark-DualRec-TEST` (canonical OpsAfterDark **not** overwritten)  
**Date:** 2026-10-05  
**Backup/rollback preserved:** `D:\Content\Media\OBS\_backups\OpsAfterDark-dualrec-20261005-234235` (+ `ROLLBACK.ps1`)

## Why vertical only recorded before (root cause)

1. `stream_outputs` was **empty** (0 destinations).
2. `streaming_match_main=false` and `streaming_video_bitrate=0`.
3. During this session, **Aitum Stream Suite 1.2.4** (bundled in OBS at `Program Files\obs-studio\obs-plugins\64bit\aitum-stream-suite.dll`) loaded and **blocked** standalone Vertical Canvas (`Failed to initialize module 'vertical-canvas.dll'`), which also dropped dual vertical file recording until Suite was disabled.

## Plugin decision (no new installs)

| Plugin | Action |
|---|---|
| Aitum Vertical Canvas **1.6.4** | **Restored / active** — proven dual-record path |
| Aitum Stream Suite **1.2.4** | **Temporarily disabled** → renamed to `aitum-stream-suite.dll.disabled-opsly-20261005` (needs admin to re-enable) |
| Other existing plugins | Untouched |

Re-enable Suite only after migrating vertical outputs into `aitum.json` — do **not** run Suite + Vertical Canvas together.

## Recording status (H / V)

| Axis | Status | Proof |
|---|---|---|
| **H record** | **READY** | `horizontal\2026-10-05_23-58-32_OpsAfterDark_H1920x1080.mkv` — 1920×1080 @ 60, MKV, NVENC, 4×AAC, ~31s |
| **V record** | **READY** | `vertical\…-vertical.mkv` — 1080×1920 @ 60, MKV, NVENC, 4×AAC, ~31s |
| Match | `recording_match_main=true` | Both start with main Start Recording |

## Streaming status (H / V)

| Axis | Status | Notes |
|---|---|---|
| **H stream Twitch** | Config present | `service.json` Twitch, key **PRESENT** (len=45), server=auto |
| **H stream YouTube** | Config present | multi-rtmp target YouTube RTMPS, key **PRESENT** (len=24) |
| **H stream Kick** | **NOT IN PROFILE** | No Kick target found in multi-rtmp/service — **pending** if still required |
| **V stream YouTube mobile** | **PREPARED, DISABLED** | Destination stub: `rtmps://a.rtmps.youtube.com:443/live2`, key **EMPTY** (len=0), `enabled=false` |
| **V stream TikTok Live** | **PREPARED, DISABLED** | Destination stub name only; server+key **EMPTY**, `enabled=false` |
| **V simultaneous with H** | **Supported by contract** | `streaming_match_main=true` — Vertical outputs start with main Start Streaming **when enabled + keyed** |
| **Public / private live test** | **NOT RUN** | Blocked: empty V keys + policy (no public). No private destination authorized |

## Destinations & permissions checklist

| Destination | Orientation | Server ready | Key | Enabled | Action needed |
|---|---|---|---|---|---|
| Twitch | H | yes (auto) | present | via OBS Stream | Keep as-is |
| YouTube | H | RTMPS live2 | present | multi-rtmp | Keep as-is |
| Kick | H | — | — | — | Add multi-rtmp target + key if required |
| YouTube Vertical | V | RTMPS live2 | **pending** | false | Create **separate** YT Live (unlisted/private) stream key; paste into Aitum Vertical → enable |
| TikTok Live | V | **pending** | **pending** | false | TikTok Live access + Live Studio RTMP/server+key (often rotates); enable only then |

Independent V while H streams: **yes** (separate Aitum Vertical RTMP encoder/output), once destinations enabled.

## Performance (dual record sample, no live)

- FPS: **60.0** stable  
- CPU: ~24–35%  
- GPU util: ~13–25%, VRAM ~2.1 GB  
- **NVENC sessions: 2** during H+V record (confirmed)  
- NIC: Ethernet **1 Gbps** (capacity OK; ISP upload still governs live)

### NVENC budget warning (RTX 3060 GeForce ≈ 3 concurrent encodes)

| Mode | Sessions | Fit |
|---|---|---|
| H+V record only | 2 | OK |
| H+V stream only | 2 | OK |
| H+V stream **+** H+V record | 4 | **OVER LIMIT** — avoid; record one axis or remux/VOD later |

Recommended live bitrates (prepared): H stream **6000** CBR (existing) + V stream **4500** ≈ **10.5 Mbps** video (+ audio). Leave ~30% upload headroom (≥15 Mbps sustained preferred).

## Visual evidence

| File | Notes |
|---|---|
| `_tests\visual\H_CODING_4.png` | Horizontal composition with real desktop/IDE content |
| `_tests\visual\H_Gaming.png` | Gaming scene (no BF6 process — capture idle) |
| `_tests\visual\frame-horizontal.jpg` | From dual-rec H: clock + OpsAfterDark brand |
| `_tests\visual\frame-vertical.jpg` | From dual-rec V: independent 9:16 layout, centered brand |

**Battlefield:** not installed/running in default Steam library (only CS:GO found). `Game Capture` still targets `bf6.exe` — **visual QA of V_GAMING with live game + camera/HUD/chat/alerts still pending** once BF is open.

## Config ready for approval

On TEST profile only:

1. Vertical Canvas active; Suite disabled (documented).  
2. Dual MKV H/V recording verified.  
3. V stream destinations stubbed, **disabled**, keys empty.  
4. `streaming_match_main=true` ready for simultaneous start.  
5. Horizontal Twitch + YouTube untouched.  
6. No public stream started.

### Approval gates before go-live

- [ ] Paste YouTube **vertical** stream key (prefer unlisted/private first test) → enable destination  
- [ ] Paste TikTok Live server+key → enable destination  
- [ ] Confirm Kick H target (add or waive)  
- [ ] Confirm ISP upload ≥ ~15 Mbps  
- [ ] Decide record policy during live (recommend **stream-only** or single-axis record)  
- [ ] Open Battlefield + validate `V_GAMING` framing (cam/HUD/chat/alerts/audio)  
- [ ] Explicit authorization for first private live test  

### Rollback

- Collection/profile backup: `D:\Content\Media\OBS\_backups\OpsAfterDark-dualrec-20261005-234235\ROLLBACK.ps1`  
- Suite re-enable (admin): rename `aitum-stream-suite.dll.disabled-opsly-20261005` → `aitum-stream-suite.dll` (will again conflict with Vertical Canvas)  
- Vertical config bak: `config.json.bak-pre-vertical-stream-prep`