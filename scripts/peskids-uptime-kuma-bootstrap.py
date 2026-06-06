#!/usr/bin/env python3
"""Bootstrap Uptime Kuma for Peskids: admin user, HTTP monitors, public status page."""
from __future__ import annotations

import os
import sys

from uptime_kuma_api import MonitorType, UptimeKumaApi


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if not value:
        print(f"FAIL: missing env {name}", file=sys.stderr)
        sys.exit(1)
    return value


def main() -> None:
    base_url = env("UPTIME_KUMA_URL", "http://127.0.0.1:8003")
    username = env("UPTIME_KUMA_USERNAME", "peskids-ops")
    password = env("UPTIME_KUMA_PASSWORD")
    status_slug = env("UPTIME_STATUS_SLUG", "peskids")
    status_title = env("UPTIME_STATUS_TITLE", "Peskids — Estado de servicios")

    monitors = [
        ("Peskids landing", "https://peskids.op-sly.com/"),
        ("Peskids admin login", "https://peskids.op-sly.com/admin/login"),
        ("Opsly API health", "https://api.op-sly.com/api/health"),
        ("n8n Peskids", "https://n8n-peskids.op-sly.com/"),
    ]

    with UptimeKumaApi(base_url, timeout=60, wait_events=1.0) as api:
        if api.need_setup():
            print("SETUP: creating first Uptime Kuma admin user")
            api.setup(username, password)
            api.login(username, password)
        else:
            print("LOGIN: existing Uptime Kuma instance")
            api.login(username, password)

        existing_by_name = {m.get("name"): m for m in api.get_monitors()}
        monitor_ids: list[int] = []

        for name, url in monitors:
            current = existing_by_name.get(name)
            if current and current.get("id"):
                monitor_ids.append(int(current["id"]))
                print(f"SKIP monitor exists: {name}")
                continue
            result = api.add_monitor(
                type=MonitorType.HTTP,
                name=name,
                url=url,
                interval=60,
                maxretries=3,
                retryInterval=60,
            )
            monitor_id = int(result["monitorID"])
            monitor_ids.append(monitor_id)
            print(f"OK monitor: {name} (id={monitor_id})")

        pages = api.get_status_pages()
        slugs = {p.get("slug") for p in pages}
        if status_slug not in slugs:
            api.add_status_page(status_slug, status_title)
            print(f"OK status page created: /status/{status_slug}")

        api.save_status_page(
            slug=status_slug,
            title=status_title,
            description="Monitoreo público de servicios Peskids (Opsly tenant).",
            icon="/icon.svg",
            published=True,
            showTags=False,
            domainNameList=[],
            googleAnalyticsId=None,
            customCSS="",
            footerText="Powered by Opsly + Uptime Kuma",
            showPoweredBy=True,
            publicGroupList=[
                {
                    "name": "Peskids",
                    "weight": 1,
                    "monitorList": [{"id": monitor_id} for monitor_id in monitor_ids],
                }
            ],
        )
        print(f"OK status page published: /status/{status_slug}")
        print(f"DONE monitors={len(monitor_ids)}")


if __name__ == "__main__":
    main()
