from __future__ import annotations

import json
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


def print_banner() -> None:
    ascii_art = r"""
  ____  ____  ____  _  __   __    _    ____ _____ _   _ _____
 / __ \|  _ \/ ___|| | \ \ / /   / \  / ___| ____| \ | |_   _|
| |  | | |_) \___ \| |  \ V /   / _ \| |  _|  _| |  \| | | |
| |__| |  __/ ___) | |___| |   / ___ \ |_| | |___| |\  | | |
 \____/|_|   |____/|_____|_|  /_/   \_\____|_____|_| \_| |_|
"""
    console.print(f"[bold green]{ascii_art}[/bold green]")
    console.print("[bold green][⚡] Opsly Hacker Agent Initialized. Connected to MCP.[/bold green]")
    console.print("[bold green][⚡] Type 'exit' or 'quit' to close.[/bold green]")


def print_streaming_text(text_stream: str) -> None:
    console.print(f"[bold green]{text_stream}[/bold green]", end="")


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
        if step.final_answer.strip() == "":
            return
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
