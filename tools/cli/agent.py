from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Optional

from .client import MCPTool, OpslyMCPClient
from .providers import BaseProvider
from .providers.factory import create_provider


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
        provider: str = "anthropic",
        model: Optional[str] = None,
    ) -> None:
        self._mcp_client = mcp_client
        self._provider: BaseProvider = create_provider(provider, model)
        self._provider_id = provider.lower()
        self.conversation_history: list[dict[str, Any]] = []

    async def run(
        self,
        user_input: str,
        max_steps: int = 8,
        on_final_chunk: Callable[[list[str]], None] | None = None,
    ) -> list[AgentStep]:
        tools = self._get_mcp_tools()
        steps: list[AgentStep] = []
        self.conversation_history.append({"role": "user", "content": user_input})

        for _ in range(max_steps):
            response = self._provider.create_response(
                messages=self.conversation_history,
                tools=tools,
                system_prompt=self._get_system_prompt(),
            )
            steps.extend(self._extract_thought_steps(response))
            tool_uses = self._provider.parse_tool_calls(response)

            if len(tool_uses) == 0:
                final_text = await self._stream_final_answer(on_final_chunk)
                steps.append(AgentStep(thought="Respuesta final lista.", final_answer=final_text))
                self.conversation_history.append({"role": "assistant", "content": final_text})
                return steps

            self._append_assistant_tool_turn(tool_uses)
            for tool_block in tool_uses:
                tool_name = str(tool_block["name"])
                tool_input = dict(tool_block["input"])
                tool_result = self._mcp_client.call_tool(tool_name, tool_input)
                steps.append(
                    AgentStep(
                        thought=f"Ejecutando herramienta {tool_name}.",
                        tool_name=tool_name,
                        tool_input=tool_input,
                        tool_output=tool_result,
                    )
                )
                self._append_tool_result(str(tool_block["id"]), tool_result)

        steps.append(
            AgentStep(
                thought="Límite de pasos alcanzado.",
                final_answer="No pude completar la tarea dentro del límite de pasos. ¿Quieres que intente de nuevo con más contexto?",
            )
        )
        return steps

    async def _stream_final_answer(self, on_final_chunk: Callable[[list[str]], None] | None) -> str:
        full_text = ""
        async for chunk in self._provider.stream_response(
            messages=self.conversation_history,
            tools=[],
            system_prompt=(
                "Eres un agente de operaciones de infraestructura. "
                "Entrega respuesta final en español sin tool calls."
            ),
        ):
            full_text += chunk
            if on_final_chunk is not None:
                on_final_chunk([chunk])
        return full_text.strip()

    def _extract_thought_steps(self, response: Any) -> list[AgentStep]:
        thoughts: list[AgentStep] = []
        if hasattr(response, "content"):
            for block in response.content:
                if getattr(block, "type", None) == "text":
                    content = str(getattr(block, "text", "")).strip()
                    if content != "":
                        thoughts.append(AgentStep(thought=content))
            return thoughts

        if getattr(response, "choices", None):
            content = str(response.choices[0].message.content or "").strip()
            if content != "":
                thoughts.append(AgentStep(thought=content))
        return thoughts

    def _get_system_prompt(self) -> str:
        return (
            "Eres un agente de operaciones de infraestructura. "
            "Gestiona sistemas, contenedores y servicios. "
            "Responde de forma concisa y técnica en español."
        )

    def _get_mcp_tools(self) -> list[dict[str, Any]]:
        mcp_tools = self._mcp_client.list_tools()
        if self._provider_id == "openai":
            return [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description or f"MCP tool {tool.name}",
                        "parameters": tool.input_schema
                        if tool.input_schema
                        else {"type": "object", "properties": {}},
                    },
                }
                for tool in mcp_tools
            ]
        return [self._to_anthropic_tool(tool) for tool in mcp_tools]

    def _to_anthropic_tool(self, tool: MCPTool) -> dict[str, Any]:
        return {
            "name": tool.name,
            "description": tool.description or f"MCP tool {tool.name}",
            "input_schema": tool.input_schema if tool.input_schema else {"type": "object", "properties": {}},
        }

    def _append_assistant_tool_turn(self, tool_calls: list[dict[str, Any]]) -> None:
        if self._provider_id == "openai":
            self.conversation_history.append(
                {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": call["id"],
                            "type": "function",
                            "function": {
                                "name": call["name"],
                                "arguments": json.dumps(call["input"], ensure_ascii=False),
                            },
                        }
                        for call in tool_calls
                    ],
                }
            )
            return
        self.conversation_history.append(
            {
                "role": "assistant",
                "content": [
                    {"type": "tool_use", "id": call["id"], "name": call["name"], "input": call["input"]}
                    for call in tool_calls
                ],
            }
        )

    def _append_tool_result(self, tool_use_id: str, tool_result: dict[str, Any]) -> None:
        if self._provider_id == "openai":
            self.conversation_history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_use_id,
                    "content": json.dumps(tool_result, ensure_ascii=False),
                }
            )
            return
        self.conversation_history.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": json.dumps(tool_result, ensure_ascii=False),
                    }
                ],
            }
        )

    def get_model_name(self) -> str:
        return self._provider.get_model_name()
