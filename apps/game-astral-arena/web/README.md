# Astral Arena Web Preview

Target URL: **https://astral-arena.op-sly.com**

This directory contains the static serving layer for the Godot Web export.

## Build

From a machine with Godot 4.7.2 + export templates:

```bash
godot --headless \
  --path apps/game-astral-arena \
  --export-release "Web" ../../dist/astral-arena-web/index.html
```

Godot's Web target emits HTML + WebAssembly + JavaScript + PCK files.

The current preset is **single-threaded** for maximum browser compatibility and
to avoid requiring SharedArrayBuffer cross-origin isolation headers.

## Serve locally

```bash
docker build -f apps/game-astral-arena/web/Dockerfile -t astral-arena-web .
docker run --rm -p 8080:8080 astral-arena-web
```

Then open `http://localhost:8080`.

## Production preview

The VPS deployment uses Traefik with the `traefik-public` network and the host
`astral-arena.op-sly.com`.

The web preview is a testing surface. Steam remains the commercial desktop
distribution target.
