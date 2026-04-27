from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator


class BaseProvider(ABC):
    """Interfaz común para providers de LLM."""

    @abstractmethod
    def create_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> Any:
        """Respuesta completa para detectar tool calls."""

    @abstractmethod
    async def stream_response(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        system_prompt: str,
    ) -> AsyncIterator[str]:
        """Stream de respuesta de texto."""

    @abstractmethod
    def parse_tool_calls(self, response: Any) -> list[dict[str, Any]]:
        """Extrae tool calls normalizados como {id,name,input}."""

    @abstractmethod
    def get_model_name(self) -> str:
        """Retorna el nombre del modelo en uso."""

