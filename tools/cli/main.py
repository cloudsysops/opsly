from __future__ import annotations

from pathlib import Path

import typer

try:
    from .agent import OpslyReActAgent
    from .client import MCPClientError, OpslyMCPClient
    from .ui import (
        console,
        print_banner,
        print_error,
        print_hacker_response,
        print_streaming_text,
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
        print_streaming_text,
        thinking_spinner,
    )

app = typer.Typer(help="Opsly Hacker CLI")


def _resolve_server_command(workspace_root: Path) -> list[str]:
    candidates = [
        workspace_root / "apps" / "mcp" / "dist" / "index.js",
        workspace_root / "apps" / "mcp" / "dist" / "src" / "index.js",
    ]
    server_path = next((path for path in candidates if path.exists()), None)
    if server_path is None:
        raise typer.BadParameter(
            "No se encontró apps/mcp/dist/index.js (o dist/src/index.js). Ejecuta primero el build de @intcloudsysops/mcp."
        )
    return ["node", str(server_path), "--stdio"]


@app.command()
def chat(
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

    agent = OpslyReActAgent(client)
    print_banner()
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
                    steps = agent.run(prompt, on_final_chunk=print_streaming_text)
                except Exception as exc:  # noqa: BLE001
                    print_error(f"Error ejecutando agente: {exc}")
                    continue

            for step in steps:
                print_hacker_response(step)
    finally:
        client.close()


@app.command()
def matrix() -> None:
    """Alias para chat con modo Matrix."""
    chat()


@app.command()
def openai() -> None:
    """Alias para chat con provider OpenAI."""
    chat()


if __name__ == "__main__":
    app()
