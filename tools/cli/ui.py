from __future__ import annotations

import json
import sys
import time
from contextlib import contextmanager
from typing import Iterator

from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax

from .agent import AgentStep

console = Console()


@contextmanager
def thinking_spinner(message: str = "AGENT THINKING...") -> Iterator[None]:
    with console.status(f"[bold green]{message}[/bold green]", spinner="dots"):
        yield


def print_matrix_header() -> None:
    banner = """
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗             ║
║   ██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝             ║
║   ██║  ██║██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝              ║
║   ██║  ██║██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝               ║
║   ██████╔╝██║  ██║╚██████╔╝██╔╝ ██╗   ██║                ║
║   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝                ║
║                                                           ║
║   [ SYSTEM AGENT v1.0 ] - Matrix Mode Activated          ║
╚═══════════════════════════════════════════════════════════╝
"""
    console.print(banner, style="bold green")


def print_banner() -> None:
    print_matrix_header()
    console.print("[bold green][⚡] Opsly Hacker Agent Initialized. Connected to MCP.[/bold green]")
    console.print("[bold green][⚡] Type 'exit' or 'quit' to close.[/bold green]")


def print_provider_info(provider_name: str, model: str) -> None:
    console.print(
        f"[dim white]Provider:[/dim white] [bold yellow]{provider_name}[/bold yellow] | "
        f"[dim white]Model:[/dim white] [bold yellow]{model}[/bold yellow]"
    )


def print_streaming_text(
    text_stream: list[str],
    delay: float = 0.005,
    color: str = "bold green",
) -> None:
    for chunk in text_stream:
        for char in chunk:
            console.print(char, end="", style=color)
            sys.stdout.flush()
            time.sleep(delay)


def print_hacker_response(step: AgentStep) -> None:
    if step.tool_name is not None:
        payload = json.dumps(step.tool_input or {}, indent=2, ensure_ascii=False)
        console.print(
            Panel(
                Syntax(payload, "json", theme="monokai", line_numbers=False),
                title=f"[bold green]⚙ TOOL CALL: {step.tool_name}[/bold green]",
                border_style="green4",
                style="green on black",
            )
        )
        if step.tool_output is not None:
            output = json.dumps(step.tool_output, indent=2, ensure_ascii=False)
            console.print(
                Panel(
                    Syntax(output, "json", theme="monokai", line_numbers=False),
                    title="[bold green]TOOL RESULT[/bold green]",
                    border_style="green4",
                    style="green on black",
                )
            )
        return

    if step.final_answer is not None:
        console.print()
        console.print(
            Panel(
                step.final_answer,
                title="[black on bright_green]🤖 AGENT RESPONSE[/black on bright_green]",
                border_style="bright_green",
                style="bold green",
            )
        )
        return

    console.print(
        Panel(
            step.thought,
            title="[dim]SYSTEM THOUGHT[/dim]",
            border_style="grey23",
            style="dim",
        )
    )


def print_error(message: str) -> None:
    console.print(f"[bold red on black]ERROR: {message}[/bold red on black]")
