from __future__ import annotations

import os
from typing import Optional

from . import BaseProvider


def create_provider(provider: str = "anthropic", model: Optional[str] = None) -> BaseProvider:
    normalized = provider.strip().lower()

    if normalized == "anthropic":
        from .anthropic_provider import AnthropicProvider

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY no está definida")
        return AnthropicProvider(api_key=api_key, model=model or "claude-sonnet-4-20250514")

    if normalized == "openai":
        from .openai_provider import OpenAIProvider

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY no está definida")
        return OpenAIProvider(api_key=api_key, model=model or "gpt-4.1")

    raise ValueError(f"Provider no soportado: {provider}")

