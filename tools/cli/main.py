from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import typer

try:
    from .agent import OpslyReActAgent
    from .client import MCPClientError, OpslyMCPClient
    from .orchestrator_bridge import OrchestratorBridge
    from .research_client import ResearchClient
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
    from tools.cli.orchestrator_bridge import OrchestratorBridge
    from tools.cli.research_client import ResearchClient
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
    server_path = workspace_root / "apps" / "mcp" / "dist" / "index.js"
    if not server_path.exists():
        raise typer.BadParameter(
            "No se encontró apps/mcp/dist/index.js. Ejecuta primero el build de @intcloudsysops/mcp."
        )
    return ["node", str(server_path), "--stdio"]


def _render_research_report(
    *,
    query: str,
    tenant_slug: str,
    request_id: str,
    depth: int,
    duration_ms: int,
    payload: dict,
    sandbox_job: str | None = None,
    sandbox_state: str | None = None,
    search_error: str | None = None,
) -> str:
    ts = datetime.now(timezone.utc).isoformat()
    results = payload.get("results") if isinstance(payload.get("results"), list) else []
    lines = [
        "# Reporte de Investigacion Autonoma",
        "",
        f"- ID: {request_id}",
        f"- Fecha UTC: {ts}",
        f"- Tenant: {tenant_slug}",
        f"- Profundidad: {depth}",
        f"- Duracion: {duration_ms} ms",
        "",
        "## Consulta",
        "```",
        query,
        "```",
        "",
        "## Resultados",
    ]
    if search_error is not None:
        lines.extend([f"- Error de busqueda: {search_error}", ""])
    if not results:
        lines.append("- Sin resultados")
    else:
        for idx, item in enumerate(results, start=1):
            if isinstance(item, dict):
                title = str(item.get("title", "Sin titulo"))
                url = str(item.get("url", item.get("link", "n/a")))
                snippet = str(item.get("snippet", ""))
            else:
                title = "Sin titulo"
                url = "n/a"
                snippet = ""
            lines.extend(
                [
                    f"### {idx}. {title}",
                    f"- URL: {url}",
                    f"- Extracto: {snippet}",
                    "",
                ]
            )
    lines.extend(["## Sandbox"])
    if sandbox_job is None:
        lines.append("- No ejecutado")
    else:
        lines.append(f"- Job: {sandbox_job}")
        lines.append(f"- Estado: {sandbox_state or 'unknown'}")
    lines.extend(
        [
            "",
            "## Metadatos",
            f"- total_results: {len(results)}",
            "- generated_by: tools/cli research-run",
            "",
        ]
    )
    return "\n".join(lines)


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


@app.command("research-run")
def research_run(
    query: str = typer.Option(..., "--query", "-q", help="Consulta de investigacion"),
    tenant: str = typer.Option("platform", "--tenant", "-t", help="Tenant slug"),
    output: str = typer.Option("docs/research", "--output", "-o", help="Directorio de salida"),
    depth: int = typer.Option(1, "--depth", "-d", min=1, max=3, help="Profundidad 1-3"),
    save_artifacts: bool = typer.Option(False, "--save-artifacts", help="Guardar artefactos JSON"),
    run_sandbox: bool = typer.Option(True, "--run-sandbox/--no-run-sandbox", help="Encolar validacion sandbox"),
    execute: bool = typer.Option(False, "--execute", help="Realmente encola sandbox (sin esto usa dry-run)"),
    fail_fast: bool = typer.Option(False, "--fail-fast", help="Salir con error si falla /v1/search"),
) -> None:
    """Ejecuta investigacion via /v1/search y genera reporte markdown."""
    workspace_root = Path(__file__).resolve().parents[2]
    out_dir = workspace_root / output
    out_dir.mkdir(parents=True, exist_ok=True)
    request_id = str(uuid4())
    start = datetime.now(timezone.utc)

    console.print("[cyan]Iniciando investigacion...[/cyan]")
    research_client = ResearchClient()
    result = research_client.search(tenant_slug=tenant, query=query, max_results=5 if depth < 3 else 8)
    search_error: str | None = None
    payload: dict
    if not result.ok:
        search_error = result.error or "unknown"
        print_error(f"Error en /v1/search: {search_error}")
        if fail_fast:
            raise typer.Exit(code=1)
        payload = {"results": []}
    else:
        payload = result.payload

    sandbox_job_id: str | None = None
    sandbox_state: str | None = None
    if run_sandbox:
        bridge = OrchestratorBridge()
        sandbox_result = bridge.enqueue_sandbox_job(
            tenant_slug=tenant,
            command=f"echo research-validate:{request_id}",
            request_id=request_id,
            dry_run=not execute,
        )
        sandbox_job_id = sandbox_result.job_id
        sandbox_state = sandbox_result.status
        if execute and sandbox_job_id is not None:
            status_payload = bridge.get_job_status_by_path(job_id=sandbox_job_id, dry_run=False)
            sandbox_state = str(status_payload.get("state", sandbox_state))

    elapsed_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    report = _render_research_report(
        query=query,
        tenant_slug=tenant,
        request_id=request_id,
        depth=depth,
        duration_ms=elapsed_ms,
        payload=payload,
        sandbox_job=sandbox_job_id,
        sandbox_state=sandbox_state,
        search_error=search_error,
    )
    report_path = out_dir / f"research-{request_id}.md"
    report_path.write_text(report, encoding="utf-8")
    console.print(f"[green]Reporte:[/green] {report_path}")

    if save_artifacts:
        artifacts = out_dir / "artifacts" / request_id
        artifacts.mkdir(parents=True, exist_ok=True)
        (artifacts / "search-results.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        (artifacts / "sandbox-status.json").write_text(
            json.dumps({"job_id": sandbox_job_id, "state": sandbox_state}, indent=2),
            encoding="utf-8",
        )
        console.print(f"[green]Artefactos:[/green] {artifacts}")


if __name__ == "__main__":
    app()
