from __future__ import annotations

import json
from typing import Any, AsyncIterator

from openai import OpenAI

from . import BaseProvider


class OpenAIProvider(BaseProvider):
    def __init__(self, api_key: str, model: str = "gpt-4.1") -> None:
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def create_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> Any:
        openai_messages = [{"role": "system", "content": system_prompt}, *messages]
        return self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            tools=tools if tools else None,
            stream=False,
        )

    async def stream_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> AsyncIterator[str]:
        openai_messages = [{"role": "system", "content": system_prompt}, *messages]
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            tools=tools if tools else None,
            stream=True,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    def parse_tool_calls(self, response: Any) -> list[dict[str, Any]]:
        if not getattr(response, "choices", None):
            return []
        message = response.choices[0].message
        raw_calls = getattr(message, "tool_calls", None) or []
        calls: list[dict[str, Any]] = []
        for tool_call in raw_calls:
            args_raw = tool_call.function.arguments or "{}"
            try:
                args = json.loads(args_raw)
            except json.JSONDecodeError:
                args = {}
            calls.append({"id": tool_call.id, "name": tool_call.function.name, "input": args})
        return calls

    def get_model_name(self) -> str:
        return f"OpenAI/{self.model}"

