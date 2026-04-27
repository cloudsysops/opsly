from __future__ import annotations

import asyncio
from pathlib import Path
import time

import typer

try:
    from .agent import OpslyReActAgent
    from .client import MCPClientError, OpslyMCPClient
    from .deployment_pipeline import DeploymentPipeline
    from .docker_provisioner import DockerProvisioner
    from .mode_manager import ModeManager
    from .multi_orchestrator import MultiAgentOrchestrator
    from .smart_selector import SmartModeSkillSelector
    from .task_coordinator import TaskCoordinator
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
    from tools.cli.deployment_pipeline import DeploymentPipeline
    from tools.cli.docker_provisioner import DockerProvisioner
    from tools.cli.mode_manager import ModeManager
    from tools.cli.multi_orchestrator import MultiAgentOrchestrator
    from tools.cli.smart_selector import SmartModeSkillSelector
    from tools.cli.task_coordinator import TaskCoordinator
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
    preferred = workspace_root / "apps" / "mcp" / "dist" / "src" / "index.js"
    fallback = workspace_root / "apps" / "mcp" / "dist" / "index.js"
    if preferred.exists():
        server_path = preferred
    elif fallback.exists():
        server_path = fallback
    else:
        raise typer.BadParameter(
            "No se encontró apps/mcp/dist/src/index.js ni apps/mcp/dist/index.js. "
            "Ejecuta primero el build de @intcloudsysops/mcp."
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


@app.command("mode-list")
def mode_list() -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    manager = ModeManager(workspace_root=workspace_root)
    console.print(f"[bold green]Current mode:[/bold green] {manager.current_mode() or 'none'}")
    for mode in manager.list_modes():
        console.print(f"\n[bold]{mode.name}[/bold] - {mode.description}")
        console.print(f"permissions: {', '.join(mode.permissions)}")
        console.print(f"tools: {', '.join(tool.name for tool in mode.tools)}")


@app.command("mode-status")
def mode_status(mode: str = typer.Option(..., help="Modo a verificar")) -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    manager = ModeManager(workspace_root=workspace_root)
    cfg = manager.mode_config(mode)
    missing = manager.missing_tools(mode)
    console.print(f"[bold]{cfg.name}[/bold] - {cfg.description}")
    console.print(f"missing_tools: {len(missing)}")
    for tool in missing:
        console.print(f"- {tool.name} ({tool.verify_bin})")


@app.command("mode-switch")
def mode_switch(
    mode: str = typer.Option(..., help="Modo objetivo"),
    auto_install: bool = typer.Option(True, help="Instalar herramientas faltantes"),
    dry_run: bool = typer.Option(True, help="Simula instalación por seguridad"),
    output: str = typer.Option("text", help="Formato: text|json"),
) -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    manager = ModeManager(workspace_root=workspace_root)
    result = manager.switch_mode(mode=mode, auto_install=auto_install, dry_run=dry_run)
    if output == "json":
        console.print(ModeManager.to_json(result))
        return
    console.print(f"[bold green]Mode switched[/bold green]: {result.from_mode} -> {result.to_mode}")
    if len(result.missing_tools) > 0:
        console.print(f"missing: {', '.join(result.missing_tools)}")
    if len(result.installed_tools) > 0:
        console.print("install results:")
        for item in result.installed_tools:
            console.print(f"- {item.tool}: {item.status} ({item.detail})")
    console.print(f"active tools: {', '.join(result.active_tools)}")


@app.command("selector-run")
def selector_run(objective: str = typer.Option(..., help="Descripción de tarea")) -> None:
    selector = SmartModeSkillSelector()
    result = selector.select_best_configuration(objective)
    console.print("[bold green]Smart Selection[/bold green]")
    console.print(f"mode: {result.mode}")
    console.print(f"skills: {', '.join(result.skills)}")
    console.print(f"estimated_workers: {result.estimated_workers}")
    console.print(f"estimated_time_minutes: {result.estimated_time_minutes}")


@app.command("infra-provision")
def infra_provision(
    tool: str = typer.Option(..., help="Herramienta a provisionar en contenedor"),
    mode: str = typer.Option("developer", help="Modo de operación"),
    dry_run: bool = typer.Option(True, help="Build simulado por seguridad"),
) -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    provisioner = DockerProvisioner(workspace_root=workspace_root)
    result = provisioner.provision_tool(tool_name=tool, mode=mode, dry_run=dry_run)
    console.print(f"[bold green]Provision result[/bold green] {result.status}")
    console.print(f"tool: {result.tool}")
    console.print(f"image: {result.image_tag}")
    console.print(f"detail: {result.detail}")
    if result.access_command is not None:
        console.print(f"access: {result.access_command}")


@app.command("pipeline-run")
def pipeline_run(
    objective: str = typer.Option(..., help="Objetivo de despliegue"),
    mode: str = typer.Option("developer", help="Modo operativo"),
    approve_prod: bool = typer.Option(False, help="Simula aprobación humana de producción"),
    dry_run: bool = typer.Option(True, help="Ejecución segura"),
) -> None:
    pipeline = DeploymentPipeline()
    results = pipeline.run(objective=objective, mode=mode, approve_prod=approve_prod, dry_run=dry_run)
    console.print("[bold green]Deployment Pipeline[/bold green]")
    for item in results:
        console.print(f"- {item.stage}: {item.status} ({item.detail})")


@app.command("workers-run")
def workers_run(
    objective: str = typer.Option(..., help="Tarea compleja a paralelizar"),
    workers: int = typer.Option(3, help="Número de workers"),
    dry_run: bool = typer.Option(True, help="No ejecuta contenedores reales"),
) -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    provisioner = DockerProvisioner(workspace_root=workspace_root)
    coordinator = TaskCoordinator(provisioner)
    results = asyncio.run(
        coordinator.execute_complex_task(task=objective, workers_count=max(1, workers), dry_run=dry_run)
    )
    console.print("[bold green]Worker execution summary[/bold green]")
    for item in results:
        console.print(f"- {item.worker_id}: {item.status} | {item.subtask} | {item.output}")


@app.command("multi-run")
def multi_run(
    prompt: str = typer.Option(..., help="Prompt único a enviar a múltiples agentes."),
    providers: str = typer.Option("claude,opencode,cursor,copilot", help="Lista separada por comas"),
    output: str = typer.Option("markdown", help="markdown|json"),
    timeout_seconds: int = typer.Option(120, help="Timeout por proveedor"),
    save_artifacts: bool = typer.Option(True, help="Guardar reporte en tools/workspaces/reports"),
) -> None:
    workspace_root = Path(__file__).resolve().parents[2]
    parsed = [item.strip().lower() for item in providers.split(",") if item.strip() != ""]
    orchestrator = MultiAgentOrchestrator(workspace_root=workspace_root)
    console.print(f"[green]Running multi-agent prompt on: {', '.join(parsed)}[/green]")
    started = int(time.time())
    results = orchestrator.run_prompt(prompt=prompt, providers=parsed, timeout_seconds=timeout_seconds)
    rendered = (
        MultiAgentOrchestrator.to_json(results, prompt=prompt)
        if output == "json"
        else MultiAgentOrchestrator.to_markdown(results, prompt=prompt)
    )
    console.print(rendered)
    if save_artifacts:
        reports_dir = workspace_root / "tools" / "workspaces" / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        extension = "json" if output == "json" else "md"
        target = reports_dir / f"multi-run-{started}.{extension}"
        target.write_text(rendered, encoding="utf-8")
        console.print(f"[bold green]saved:[/bold green] {target}")


if __name__ == "__main__":
    app()
