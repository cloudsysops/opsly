# Opsly CLI Agent

Agente de terminal con soporte multi-provider y UI estilo Matrix.

## Instalacion

```bash
# Instalar dependencias (ejemplo rapido)
python3 -m pip install --user anthropic openai rich typer mcp

# O usar pyproject.toml
python3 -m pip install -e tools/tools/cli/
```

## Uso

```bash
# Chat con Anthropic (default)
npm run opsly:chat

# Chat modo Matrix
npm run opsly:chat:matrix

# Chat con OpenAI
npm run opsly:chat:openai

# Especificar modelo
python3 tools/tools/cli/main.py chat --model gpt-4.1

# Ajustar velocidad typewriter
python3 tools/tools/cli/main.py chat --speed 0.002
```

## Variables de entorno requeridas

```bash
# Para Anthropic
ANTHROPIC_API_KEY=your_key

# Para OpenAI
OPENAI_API_KEY=your_key
```

## Caracteristicas

- Multi-provider (Anthropic, OpenAI)
- UI estilo Matrix
- Streaming typewriter
- Integracion MCP
- Modo interactivo
