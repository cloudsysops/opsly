from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Callable

from anthropic import Anthropic
from anthropic.types import Message

from .client import MCPTool, OpslyMCPClient


@dataclass(frozen=True)
class AgentStep:
    thought: str
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    tool_output: dict[str, Any] | None = None
    final_answer: str | None = None


class OpslyReActAgent:
    def __init__(
        self,
        mcp_client: OpslyMCPClient,
        model: str | None = None,
        agent_mode: str = "executor",
    ) -> None:
        self._mcp_client = mcp_client
        self._anthropic = Anthropic()
        self._model = model or os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        self._agent_mode = agent_mode

    def run(
        self,
        user_prompt: str,
        max_steps: int = 8,
        on_final_chunk: Callable[[str], None] | None = None,
    ) -> list[AgentStep]:
        tools = self._mcp_client.list_tools()
        anthropic_tools = [self._to_anthropic_tool(tool) for tool in tools]
        steps: list[AgentStep] = []

        messages: list[dict[str, Any]] = [
            {
                "role": "user",
                "content": user_prompt,
            }
        ]

        for _ in range(max_steps):
            response = self._anthropic.messages.create(
                model=self._model,
                max_tokens=1000,
                system=self._system_prompt(),
                tools=anthropic_tools,
                messages=messages,
            )

            steps.extend(self._extract_thought_steps(response))
            tool_uses = [block for block in response.content if block.type == "tool_use"]

            messages.append(
                {
                    "role": "assistant",
                    "content": self._message_content_to_dict(response),
                }
            )

            if len(tool_uses) == 0:
                final_text = self._stream_final_answer(messages, anthropic_tools, on_final_chunk)
                steps.append(AgentStep(thought="Respuesta final lista.", final_answer=final_text))
                return steps

            for tool_block in tool_uses:
                tool_name = tool_block.name
                tool_input = dict(tool_block.input)
                tool_result = self._mcp_client.call_tool(tool_name, tool_input)
                steps.append(
                    AgentStep(
                        thought=f"Ejecutando herramienta {tool_name}.",
                        tool_name=tool_name,
                        tool_input=tool_input,
                        tool_output=tool_result,
                    )
                )

                messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_block.id,
                                "content": json.dumps(tool_result, ensure_ascii=False),
                            }
                        ],
                    }
                )

        steps.append(
            AgentStep(
                thought="Límite de pasos alcanzado.",
                final_answer="No pude completar la tarea dentro del límite de pasos. ¿Quieres que intente de nuevo con más contexto?",
            )
        )
        return steps

    def _stream_final_answer(
        self,
        messages: list[dict[str, Any]],
        anthropic_tools: list[dict[str, Any]],
        on_final_chunk: Callable[[str], None] | None,
    ) -> str:
        full_text = ""
        with self._anthropic.messages.stream(
            model=self._model,
            max_tokens=1000,
            system=(
                self._system_prompt()
                + " Return the final answer in Spanish. "
                + "Do not call tools now; just provide the final response."
            ),
            tools=anthropic_tools,
            messages=messages,
        ) as stream:
            for chunk in stream.text_stream:
                full_text += chunk
                if on_final_chunk is not None:
                    on_final_chunk(chunk)
            stream.until_done()

        return full_text.strip()

    def _to_anthropic_tool(self, tool: MCPTool) -> dict[str, Any]:
        return {
            "name": tool.name,
            "description": tool.description or f"MCP tool {tool.name}",
            "input_schema": tool.input_schema if tool.input_schema else {"type": "object", "properties": {}},
        }

    def _system_prompt(self) -> str:
        base = (
            "You are Opsly Hacker Agent. Think concisely. "
            "When you need system data, use MCP tools. "
            "Always provide a final answer in Spanish."
        )
        by_mode = {
            "planner": "Prioritize architecture decisions and implementation plans.",
            "executor": "Prioritize concrete execution and practical steps.",
            "verifier": "Prioritize tests, validation and regression risks.",
            "ops": "Prioritize production safety, observability and incident handling.",
        }
        return f"{base} {by_mode.get(self._agent_mode, by_mode['executor'])}"

    def _collect_text(self, message: Message) -> str:
        parts: list[str] = []
        for block in message.content:
            if block.type == "text":
                parts.append(block.text)
        return "\n".join(part for part in parts if part.strip() != "").strip()

    def _extract_thought_steps(self, message: Message) -> list[AgentStep]:
        thoughts: list[AgentStep] = []
        for block in message.content:
            if block.type == "text":
                content = block.text.strip()
                if content != "":
                    thoughts.append(AgentStep(thought=content))
        return thoughts

    def _message_content_to_dict(self, message: Message) -> list[dict[str, Any]]:
        content: list[dict[str, Any]] = []
        for block in message.content:
            if block.type == "text":
                content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                content.append(
                    {
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": dict(block.input),
                    }
                )
        return content
