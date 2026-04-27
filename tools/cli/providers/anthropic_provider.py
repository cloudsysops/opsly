from __future__ import annotations

from typing import Any, AsyncIterator

import anthropic

from . import BaseProvider


class AnthropicProvider(BaseProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514") -> None:
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def create_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> Any:
        return self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools if tools else None,
        )

    async def stream_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> AsyncIterator[str]:
        with self.client.messages.stream(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools if tools else None,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def parse_tool_calls(self, response: Any) -> list[dict[str, Any]]:
        if not hasattr(response, "content"):
            return []
        calls: list[dict[str, Any]] = []
        for block in response.content:
            if getattr(block, "type", None) == "tool_use":
                calls.append({"id": block.id, "name": block.name, "input": dict(block.input)})
        return calls

    def get_model_name(self) -> str:
        return f"Anthropic/{self.model}"

