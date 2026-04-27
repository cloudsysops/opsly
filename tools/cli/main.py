from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

import typer

try:
    from .agent import OpslyReActAgent
    from .client import MCPClientError, OpslyMCPClient
    from .ui import (
        console,
        print_banner,
        print_error,
        print_hacker_response,
        print_provider_info,
        print_streaming_text,
        print_matrix_header,
        thinking_spinner,
    )
except ImportError:
    import sys
    from pathlib import Path as _Path

    sys.path.insert(0, str(_Path(__file__).resolve().parents[2]))
    from tools.cli.agent import OpslyReActAgent
    from tools.cli.client import MCPClientError, OpslyMCPClient
    from tools.cli.ui import (
        console,
        print_banner,
        print_error,
        print_hacker_response,
        print_provider_info,
        print_streaming_text,
        print_matrix_header,
        thinking_spinner,
    )

app = typer.Typer(help="Opsly Hacker CLI")


def _resolve_server_command(workspace_root: Path) -> list[str]:
    server_path = workspace_root / "apps" / "mcp" / "dist" / "index.js"
    if not server_path.exists():
        raise typer.BadParameter(
            "No se encontró apps/mcp/dist/index.js. Ejecuta primero el build de @intcloudsysops/mcp."
        )
    return ["node", str(server_path), "--stdio"]


@app.command()
def chat(
    provider: str = typer.Option(
        "anthropic",
        "--provider",
        "-p",
        help="Provider de LLM: anthropic, openai",
    ),
    model: Optional[str] = typer.Option(
        None,
        "--model",
        "-m",
        help="Modelo especifico (ej: claude-sonnet-4-20250514, gpt-4.1)",
    ),
    matrix: bool = typer.Option(
        True,
        "--matrix/--no-matrix",
        help="Activar modo visual Matrix",
    ),
    typewriter_speed: float = typer.Option(
        0.005,
        "--speed",
        "-s",
        help="Velocidad del efecto typewriter (segundos)",
    ),
    tenant_id: str = typer.Option("tenant_001", help="Tenant context for MCP tool calls."),
    mode: str = typer.Option("developer", help="Agent mode context passed to MCP tools."),
) -> None:
    """Start interactive hacker-style chat against Opsly MCP server."""
    workspace_root = Path(__file__).resolve().parents[2]
    server_command = _resolve_server_command(workspace_root)

    client = OpslyMCPClient(server_command=server_command, workspace_root=workspace_root)
    try:
        client.connect()
    except (MCPClientError, OSError) as exc:
        print_error(f"Error conectando al MCP server: {exc}")
        raise typer.Exit(code=1) from exc

    try:
        agent = OpslyReActAgent(client, provider=provider, model=model)
    except ValueError as exc:
        print_error(str(exc))
        client.close()
        raise typer.Exit(code=1) from exc

    if matrix:
        print_matrix_header()
    else:
        print_banner()
    print_provider_info(provider.upper(), agent.get_model_name())
    console.print(f"[green]Context => tenant={tenant_id}, mode={mode}[/green]")

    try:
        while True:
            prompt = typer.prompt("\n> ")
            normalized = prompt.strip().lower()
            if normalized in {"exit", "quit"}:
                console.print("[cyan]Bye.[/cyan]")
                break
            if prompt.strip() == "":
                continue

            with thinking_spinner():
                try:
                    steps = asyncio.run(
                        agent.run(
                            prompt,
                            on_final_chunk=lambda chunks: print_streaming_text(
                                chunks, delay=typewriter_speed
                            ),
                        )
                    )
                    console.print()
                except Exception as exc:  # noqa: BLE001
                    print_error(f"Error ejecutando agente: {exc}")
                    continue

            for step in steps:
                print_hacker_response(step)
    finally:
        client.close()


@app.command()
def matrix() -> None:
    """Alias para chat con modo Matrix forzado."""
    chat(provider="anthropic", matrix=True, typewriter_speed=0.003)


@app.command()
def openai() -> None:
    """Alias para chat con OpenAI."""
    chat(provider="openai", matrix=True)


if __name__ == "__main__":
    app()
