"""Deterministic command vocabulary for the Twitch agent — no LLM calls.

Same shape as apps/ai-dj/src/router.py: a single Router.resolve(prompt) that
matches the raw prompt_content string against a small fixed grammar and calls
into TwitchClient. Unknown input raises ActionError listing SUPPORTED.
"""
from __future__ import annotations

import shlex

SUPPORTED = [
    "channel.title <text...>",
    "channel.category <game name...>",
    "stream.status",
    "stream.key",
    "clip.create",
    "token.refresh",
    "status.all",
]


class ActionError(Exception):
    pass


class Router:
    def __init__(self, client):
        self.client = client

    def resolve(self, prompt: str) -> str:
        prompt = (prompt or "").strip()
        if not prompt:
            raise ActionError(f"empty prompt_content. Supported: {SUPPORTED}")

        try:
            parts = shlex.split(prompt)
        except ValueError as exc:
            raise ActionError(f"could not parse prompt_content: {exc}") from exc
        if not parts:
            raise ActionError(f"empty prompt_content. Supported: {SUPPORTED}")

        cmd, args = parts[0], parts[1:]

        if cmd == "channel.title":
            if not args:
                raise ActionError("channel.title requires text")
            title = " ".join(args)
            self.client.set_title(title)
            return f"channel title set: {title}"

        if cmd == "channel.category":
            if not args:
                raise ActionError("channel.category requires a game name")
            name = " ".join(args)
            matches = self.client.search_category(name)
            if not matches:
                raise ActionError(f"no Twitch category found matching '{name}'")
            best = matches[0]
            self.client.set_category(best["id"])
            return f"channel category set: {best['name']} (id {best['id']})"

        if cmd == "stream.status":
            data = self.client.get_stream_status()
            if not data:
                return "stream is offline"
            return (f"LIVE: title='{data.get('title')}' game='{data.get('game_name')}' "
                    f"viewers={data.get('viewer_count')} started_at={data.get('started_at')}")

        if cmd == "stream.key":
            key = self.client.get_stream_key()
            if not key:
                raise ActionError("could not retrieve stream key")
            return "stream key retrieved (not echoed for safety; write it directly where needed)"

        if cmd == "clip.create":
            status = self.client.get_stream_status()
            if not status:
                raise ActionError("cannot create a clip while offline")
            clip = self.client.create_clip()
            if not clip:
                raise ActionError("clip creation failed")
            return f"clip created: id={clip.get('id')} edit_url={clip.get('edit_url')}"

        if cmd == "token.refresh":
            self.client.ensure_fresh_token(margin_seconds=999999)  # force refresh
            return "token refreshed"

        if cmd == "status.all":
            channel = self.client.get_channel()
            stream = self.client.get_stream_status()
            live = bool(stream)
            return (f"channel='{channel.get('broadcaster_name')}' title='{channel.get('title')}' "
                    f"game='{channel.get('game_name')}' live={live} "
                    f"viewers={stream.get('viewer_count', 0) if live else 0}")

        raise ActionError(f"unknown action '{cmd}'. Supported: {SUPPORTED}")
