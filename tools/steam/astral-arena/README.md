# Astral Arena SteamPipe

This directory contains **templates only**. Steam AppID/depot IDs are assigned by Steamworks and must not be invented or committed as fake production values.

## Required environment / local values

- Steamworks AppID
- Windows depot ID
- dedicated Steam build account
- local Steamworks SDK ContentBuilder path

Never commit passwords or Steam Guard secrets.

## Initial shipping model

1. Build the Windows game into a clean staging directory.
2. Copy staged files into Steamworks `ContentBuilder/content/astral-arena/windows`.
3. Render the VDF templates with the real AppID/depot IDs locally or in an authorized release job.
4. Upload to a private Steam beta branch first.
5. Install through the Steam client on a clean machine.
6. Run smoke tests.
7. Promote manually after human approval.

Steamworks integration APIs (achievements, cloud saves, etc.) are a later phase. SteamPipe delivery comes first.
