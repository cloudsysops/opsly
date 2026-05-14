#!/usr/bin/env python3
"""
Self-Healing Agent - Auto-detect and repair infrastructure issues.

Detects:
  - Domain mismatches in tenant containers (WEBHOOK_URL, N8N_HOST, Traefik labels)
  - DNS resolution failures for expected domains
  - Container health issues (not running, unhealthy)
  - Traefik routing label mismatches

Repairs:
  - Rewrites docker-compose files with correct domain
  - Recreates containers via docker compose up -d
  - Reports DNS issues requiring manual Cloudflare config
"""

import json
import os
import re
import subprocess
import time
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class HealingIssue:
    issue_id: str
    component: str
    type: str
    severity: str
    description: str
    evidence: dict
    auto_repairable: bool


@dataclass
class HealingAction:
    action_id: str
    issue_id: str
    action: str
    status: str
    result: dict


DISORD_NOTIFY_COMMAND = "/opt/opsly/scripts/utils/notify-discord.sh"


class SelfHealingAgent:
    ESCAPE_SEQUENCE_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")

    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.expected_domain = self.config.get("expected_domain", "op-sly.com")
        self.tenants_path = self.config.get("tenants_path", "/opt/opsly/tenants")
        self.issues = []
        self.actions = []
        self.max_repairs = self.config.get("max_repairs_per_cycle", 3)
        self.cooldown_file = os.path.expanduser("~/.opsly/self_healing_cooldown.json")
        self.load_cooldown()

    def load_cooldown(self):
        if os.path.exists(self.cooldown_file):
            with open(self.cooldown_file) as f:
                self.cooldown = json.load(f)
        else:
            self.cooldown = {}

    def save_cooldown(self):
        os.makedirs(os.path.dirname(self.cooldown_file), exist_ok=True)
        with open(self.cooldown_file, "w") as f:
            json.dump(self.cooldown, f, indent=2)

    def _on_cooldown(self, component: str) -> bool:
        cooldown_min = self.config.get("repair_cooldown_minutes", 60)
        last = self.cooldown.get(component)
        if last:
            elapsed = (datetime.now() - datetime.fromisoformat(last)).total_seconds()
            if elapsed < cooldown_min * 60:
                return True
        return False

    def _mark_repaired(self, component: str):
        self.cooldown[component] = datetime.now().isoformat()
        self.save_cooldown()

    def _exec(self, cmd: list, timeout: int = 30) -> tuple[int, str]:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            out = self.ESCAPE_SEQUENCE_RE.sub("", r.stdout + r.stderr).strip()
            return r.returncode, out
        except subprocess.TimeoutExpired:
            return -1, f"Timeout ({timeout}s)"
        except FileNotFoundError:
            return -2, "Command not found"
        except Exception as e:
            return -3, str(e)

    def _log(self, msg: str, level: str = "info"):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] [{level.upper()}] {msg}")

    def _notify_discord(self, title: str, msg: str, severity: str = "warning"):
        if os.path.exists(DISORD_NOTIFY_COMMAND):
            subprocess.run(
                [DISORD_NOTIFY_COMMAND, title, msg, severity],
                capture_output=True,
                timeout=10,
            )

    # ------------------------------------------------------------------ #
    # DETECTION
    # ------------------------------------------------------------------ #

    def detect_domain_mismatch(self) -> list[HealingIssue]:
        issues = []
        compose_files = self._find_compose_files()
        for filepath in compose_files:
            slug = self._slug_from_path(filepath)
            if self._on_cooldown(f"domain_{slug}"):
                continue
            fields = {
                "expected_domain": self.expected_domain,
                "file": filepath,
            }
            with open(filepath) as f:
                content = f.read()
            issues_found = []
            for pattern, field_name in [
                (rf"WEBHOOK_URL:.*?//n8n-{re.escape(slug)}\.([^\s/]+)", "webhook_url"),
                (rf"N8N_HOST:\s*n8n-{re.escape(slug)}\.([^\s]+)", "n8n_host"),
                (rf"Host\(`n8n-{re.escape(slug)}\.([^`]+)`\)", "traefik_n8n"),
                (rf"Host\(`uptime-{re.escape(slug)}\.([^`]+)`\)", "traefik_uptime"),
            ]:
                m = re.search(pattern, content)
                if m:
                    found_domain = m.group(1).rstrip("/")
                    if found_domain != self.expected_domain:
                        fields[field_name] = found_domain
                        issues_found.append(field_name)
            if issues_found:
                issues.append(
                    HealingIssue(
                        issue_id=f"domain_{slug}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                        component=f"tenant_{slug}",
                        type="domain_mismatch",
                        severity="high",
                        description=f"{slug}: dominio incorrecto en {', '.join(issues_found)} "
                        f"(esperado: {self.expected_domain})",
                        evidence=fields,
                        auto_repairable=True,
                    )
                )
        return issues

    def detect_dns_resolution(self) -> list[HealingIssue]:
        issues = []
        for slug in self._active_slugs():
            for prefix in ["n8n", "uptime"]:
                hostname = f"{prefix}-{slug}.{self.expected_domain}"
                code, out = self._exec(
                    ["dig", "+short", hostname, "A", "@1.1.1.1"], timeout=5
                )
                if code != 0 or not out.strip():
                    issues.append(
                        HealingIssue(
                            issue_id=f"dns_{slug}_{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                            component=f"dns_{slug}",
                            type="dns_resolution",
                            severity="critical",
                            description=f"{hostname} no resuelve DNS",
                            evidence={"hostname": hostname, "output": out[:200]},
                            auto_repairable=False,
                        )
                    )
        return issues

    def detect_traefik_middleware(self) -> list[HealingIssue]:
        issues = []
        middleware_file = "/opt/opsly/infra/traefik/dynamic/middlewares.yml"
        if not os.path.exists(middleware_file):
            return issues
        with open(middleware_file) as f:
            content = f.read()
        if "stsForceHTTPS" in content:
            issues.append(
                HealingIssue(
                    issue_id=f"traefik_middleware_sts_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    component="traefik_middleware",
                    type="traefik_sts_field",
                    severity="high",
                    description="middlewares.yml usa stsForceHTTPS (Traefik v2) en vez de forceSTSHeader (Traefik v3)",
                    evidence={"file": middleware_file, "field": "stsForceHTTPS"},
                    auto_repairable=True,
                )
            )
        return issues

    def detect_wildcard_dns(self) -> list[HealingIssue]:
        issues = []
        wildcard_host = f"wildcard-check.{self.expected_domain}"
        code, out = self._exec(["host", wildcard_host], timeout=5)
        if code != 0:
            issues.append(
                HealingIssue(
                    issue_id=f"dns_wildcard_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    component="dns_wildcard",
                    type="dns_wildcard_missing",
                    severity="critical",
                    description=f"Wildcard DNS *.{self.expected_domain} no configurado",
                    evidence={"hostname": wildcard_host, "output": out[:200]},
                    auto_repairable=True,
                )
            )
        return issues

    def detect_container_health(self) -> list[HealingIssue]:
        issues = []
        for slug in self._active_slugs():
            for service, container in [
                ("n8n", f"n8n_{slug}"),
                ("uptime", f"uptime_{slug}"),
            ]:
                code, out = self._exec(
                    [
                        "docker",
                        "ps",
                        "--filter",
                        f"name={container}",
                        "--format",
                        "{{.Names}}",
                    ],
                    timeout=10,
                )
                if code != 0 or container not in out.strip():
                    issues.append(
                        HealingIssue(
                            issue_id=f"container_{slug}_{service}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                            component=f"container_{container}",
                            type="container_down",
                            severity="critical",
                            description=f"{container} no está corriendo",
                            evidence={"container": container, "status": out[:200]},
                            auto_repairable=True,
                        )
                    )
        return issues

    def run_all_checks(self) -> list[HealingIssue]:
        self.issues = []
        self._log("Ejecutando todos los checks de auto-reparación...")
        self.issues.extend(self.detect_domain_mismatch())
        self.issues.extend(self.detect_dns_resolution())
        self.issues.extend(self.detect_container_health())
        self.issues.extend(self.detect_traefik_middleware())
        self.issues.extend(self.detect_wildcard_dns())
        self._log(f"Detectados {len(self.issues)} problemas")
        for issue in self.issues:
            self._log(
                f"  [{issue.severity}] {issue.component}: {issue.description[:80]}",
                "warn" if issue.severity == "critical" else "info",
            )
        return self.issues

    # ------------------------------------------------------------------ #
    # REPAIR
    # ------------------------------------------------------------------ #

    def repair_domain_mismatch(self, issue: HealingIssue) -> HealingAction:
        slug = (
            issue.evidence.get("file", "").split(".")[-2]
            if "." in issue.evidence.get("file", "")
            else ""
        )
        if not slug:
            slug = re.sub(r"^tenant_", "", issue.component)
        filepath = issue.evidence.get(
            "file", f"{self.tenants_path}/docker-compose.{slug}.yml"
        )
        if not os.path.exists(filepath):
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="domain_fix",
                status="failed",
                result={"error": f"Compose file not found: {filepath}"},
            )
        with open(filepath) as f:
            content = f.read()
        old_domain = None
        for m in re.finditer(rf"https?://([^/\s:]+)", content):
            d = m.group(1)
            if d != self.expected_domain and d != "localhost":
                old_domain = d
                break
        if not old_domain:
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="domain_fix",
                status="skipped",
                result={"reason": f"No se encontró dominio incorrecto en {filepath}"},
            )
        self._log(
            f"Reparando {slug}: reemplazando {old_domain} -> {self.expected_domain}"
        )
        new_content = content.replace(old_domain, self.expected_domain)
        with open(filepath, "w") as f:
            f.write(new_content)
        self._log(f"  Compose file actualizado para {slug}")
        code, out = self._exec(
            ["docker", "compose", "-f", filepath, "up", "-d"], timeout=120
        )
        if code == 0:
            self._mark_repaired(f"domain_{slug}")
            self._notify_discord(
                f"🔧 Reparado: {slug}",
                f"Dominio corregido: {old_domain} → {self.expected_domain}",
                "success",
            )
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="domain_fix",
                status="success",
                result={"old_domain": old_domain, "new_domain": self.expected_domain},
            )
        else:
            self._notify_discord(
                f"⚠️ Error reparando {slug}",
                f"Fallo al recrear contenedores: {out[:300]}",
                "error",
            )
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="domain_fix",
                status="failed",
                result={"error": out[:500]},
            )

    def repair_container(self, issue: HealingIssue) -> HealingAction:
        container = issue.evidence.get("container", "")
        slug = container.replace("n8n_", "").replace("uptime_", "")
        filepath = f"{self.tenants_path}/docker-compose.{slug}.yml"
        if os.path.exists(filepath):
            code, out = self._exec(
                ["docker", "compose", "-f", filepath, "up", "-d"], timeout=120
            )
            if code == 0:
                self._mark_repaired(f"container_{container}")
                return HealingAction(
                    action_id=f"repair_{issue.issue_id}",
                    issue_id=issue.issue_id,
                    action="container_restart",
                    status="success",
                    result={"message": f"{container} recreado"},
                )
        else:
            code, out = self._exec(
                ["docker", "compose", "up", "-d"],
                timeout=120,
            )
        return HealingAction(
            action_id=f"repair_{issue.issue_id}",
            issue_id=issue.issue_id,
            action="container_restart",
            status="failed",
            result={"error": out[:500]},
        )

    def repair_dns(self, issue: HealingIssue) -> HealingAction:
        hostname = issue.evidence.get("hostname", "")
        return HealingAction(
            action_id=f"repair_{issue.issue_id}",
            issue_id=issue.issue_id,
            action="dns_report",
            status="manual",
            result={
                "message": f"DNS no reparable automáticamente. "
                f"Configurar wildcard *.{self.expected_domain} "
                f"→ 157.245.223.7 en Cloudflare",
                "hostname": hostname,
            },
        )

    def repair_traefik_middleware(self, issue: HealingIssue) -> HealingAction:
        middleware_file = "/opt/opsly/infra/traefik/dynamic/middlewares.yml"
        if not os.path.exists(middleware_file):
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="traefik_sts_fix",
                status="failed",
                result={"error": f"File not found: {middleware_file}"},
            )
        with open(middleware_file) as f:
            content = f.read()
        if "stsForceHTTPS" not in content:
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="traefik_sts_fix",
                status="skipped",
                result={"reason": "No se encontró stsForceHTTPS en middlewares.yml"},
            )
        new_content = content.replace("stsForceHTTPS", "forceSTSHeader")
        with open(middleware_file, "w") as f:
            f.write(new_content)
        code, out = self._exec(["docker", "restart", "traefik"], timeout=30)
        if code == 0:
            self._mark_repaired("traefik_middleware")
            self._notify_discord(
                "🔧 Traefik middleware reparado",
                "stsForceHTTPS → forceSTSHeader, Traefik reiniciado",
                "success",
            )
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="traefik_sts_fix",
                status="success",
                result={"file": middleware_file, "restart": "traefik"},
            )
        return HealingAction(
            action_id=f"repair_{issue.issue_id}",
            issue_id=issue.issue_id,
            action="traefik_sts_fix",
            status="failed",
            result={"error": out[:300]},
        )

    def repair_wildcard_dns(self, issue: HealingIssue) -> HealingAction:
        cf_token = os.environ.get("CF_DNS_API_TOKEN")
        if not cf_token:
            code, out = self._exec(
                ["doppler", "secrets", "get", "CF_DNS_API_TOKEN", "--plain"],
                timeout=10,
            )
            if code == 0 and out.strip():
                cf_token = out.strip()
            else:
                return HealingAction(
                    action_id=f"repair_{issue.issue_id}",
                    issue_id=issue.issue_id,
                    action="dns_wildcard_fix",
                    status="manual",
                    result={
                        "message": "No se encontró CF_DNS_API_TOKEN. "
                        "Configurar manualmente en Cloudflare: "
                        f"A *.{self.expected_domain} → 157.245.223.7 (proxied=false)"
                    },
                )
        zone_name = self.expected_domain
        code, out = self._exec(
            [
                "curl",
                "-s",
                "-H",
                f"Authorization: Bearer {cf_token}",
                "-H",
                "Content-Type: application/json",
                f"https://api.cloudflare.com/client/v4/zones?name={zone_name}",
            ],
            timeout=15,
        )
        import json as json_mod

        try:
            zones = json_mod.loads(out).get("result", [])
        except (json_mod.JSONDecodeError, KeyError):
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="dns_wildcard_fix",
                status="failed",
                result={"error": f"No se pudo obtener zone ID para {zone_name}"},
            )
        if not zones:
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="dns_wildcard_fix",
                status="failed",
                result={"error": f"Zone {zone_name} no encontrada en Cloudflare"},
            )
        zone_id = zones[0]["id"]
        code, out = self._exec(
            [
                "curl",
                "-s",
                "-X",
                "POST",
                f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
                "-H",
                f"Authorization: Bearer {cf_token}",
                "-H",
                "Content-Type: application/json",
                "-d",
                json_mod.dumps(
                    {
                        "type": "A",
                        "name": f"*.{self.expected_domain}",
                        "content": "157.245.223.7",
                        "ttl": 120,
                        "proxied": False,
                    }
                ),
            ],
            timeout=15,
        )
        try:
            result = json_mod.loads(out)
        except json_mod.JSONDecodeError:
            result = {"success": False, "errors": [out[:200]]}
        if result.get("success"):
            self._mark_repaired("dns_wildcard")
            self._notify_discord(
                "🔧 Wildcard DNS reparado",
                f"*.{self.expected_domain} → 157.245.223.7 (DNS-only)",
                "success",
            )
            return HealingAction(
                action_id=f"repair_{issue.issue_id}",
                issue_id=issue.issue_id,
                action="dns_wildcard_fix",
                status="success",
                result={"zone": zone_name, "record": f"*.{self.expected_domain}"},
            )
        return HealingAction(
            action_id=f"repair_{issue.issue_id}",
            issue_id=issue.issue_id,
            action="dns_wildcard_fix",
            status="failed",
            result={"error": str(result.get("errors", out[:200]))},
        )

    def repair_all(self) -> list[HealingAction]:
        self.actions = []
        repairs = 0
        for issue in self.issues:
            if repairs >= self.max_repairs:
                self._log(
                    f"Límite de reparaciones alcanzado ({self.max_repairs})", "warn"
                )
                break
            if not issue.auto_repairable:
                self._log(
                    f"  Saltando {issue.component}: no reparable automáticamente",
                    "warn",
                )
                self.actions.append(self.repair_dns(issue))
                continue
            if self._on_cooldown(issue.component):
                self._log(f"  Saltando {issue.component}: en cooldown", "info")
                continue
            self._log(f"Reparando {issue.issue_id}...")
            if issue.type == "domain_mismatch":
                action = self.repair_domain_mismatch(issue)
            elif issue.type == "container_down":
                action = self.repair_container(issue)
            elif issue.type == "traefik_sts_field":
                action = self.repair_traefik_middleware(issue)
            elif issue.type == "dns_wildcard_missing":
                action = self.repair_wildcard_dns(issue)
            else:
                action = HealingAction(
                    action_id=f"repair_{issue.issue_id}",
                    issue_id=issue.issue_id,
                    action="unknown",
                    status="skipped",
                    result={"reason": f"Tipo no soportado: {issue.type}"},
                )
            self.actions.append(action)
            self._log(f"  -> {action.status}: {action.action}")
            repairs += 1
        return self.actions

    def get_report(self) -> str:
        lines = ["=" * 60]
        lines.append("SELF-HEALING REPORT")
        lines.append("=" * 60)
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append(f"Expected domain: {self.expected_domain}")
        lines.append("")
        lines.append(f"Total issues detected: {len(self.issues)}")
        for issue in self.issues:
            lines.append(f"  [{issue.severity.upper()}] {issue.component}")
            lines.append(f"    {issue.description[:100]}")
        lines.append("")
        lines.append(f"Actions taken: {len(self.actions)}")
        for action in self.actions:
            lines.append(
                f"  [{action.status}] {action.action}: {json.dumps(action.result)[:100]}"
            )
        lines.append("")
        unhealthy = [i for i in self.issues if i.severity == "critical"]
        warning = [i for i in self.issues if i.severity == "high"]
        if unhealthy:
            lines.append(f"CRITICAL remaining: {len(unhealthy)}")
        if warning:
            lines.append(f"WARNINGS remaining: {len(warning)}")
        lines.append("=" * 60)
        return "\n".join(lines)

    # ------------------------------------------------------------------ #
    # HELPERS
    # ------------------------------------------------------------------ #

    def _find_compose_files(self) -> list[str]:
        pattern = os.path.join(self.tenants_path, "docker-compose.*.yml")
        import glob

        return sorted(glob.glob(pattern))

    def _active_slugs(self) -> list[str]:
        slugs = set()
        code, out = self._exec(["docker", "ps", "--format", "{{.Names}}"], timeout=10)
        if code == 0:
            for line in out.split("\n"):
                m = re.match(r"(?:n8n|uptime)_(.+)", line.strip())
                if m:
                    slugs.add(m.group(1))
        return sorted(slugs)

    def _slug_from_path(self, filepath: str) -> str:
        m = re.search(r"docker-compose\.(.+)\.yml", filepath)
        return m.group(1) if m else "unknown"


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Self-Healing Agent")
    parser.add_argument(
        "command", nargs="?", default="check", choices=["check", "repair", "report"]
    )
    parser.add_argument("--domain", default="op-sly.com", help="Expected domain")
    parser.add_argument(
        "--tenants-path", default="/opt/opsly/tenants", help="Tenants compose directory"
    )
    parser.add_argument(
        "--auto-repair", action="store_true", help="Auto-repair detected issues"
    )
    parser.add_argument(
        "--max-repairs", type=int, default=3, help="Max repairs per cycle"
    )
    parser.add_argument(
        "--notify", action="store_true", help="Send Discord notification"
    )
    args = parser.parse_args()

    config = {
        "expected_domain": args.domain,
        "tenants_path": args.tenants_path,
        "max_repairs_per_cycle": args.max_repairs,
    }
    agent = SelfHealingAgent(config)

    if args.command == "check":
        issues = agent.run_all_checks()
        if args.notify and issues:
            critical = sum(1 for i in issues if i.severity == "critical")
            high = sum(1 for i in issues if i.severity == "high")
            level = "error" if critical else "warning"
            agent._notify_discord(
                f"🔍 Self-Healing: {len(issues)} problemas",
                f"{critical} críticos, {high} altos",
                level,
            )
        print(agent.get_report())

    elif args.command == "repair":
        agent.run_all_checks()
        actions = agent.repair_all()
        print(agent.get_report())

    elif args.command == "report":
        print(agent.get_report())

    return (
        0 if not any(a.status == "failed" for a in getattr(agent, "actions", [])) else 1
    )


if __name__ == "__main__":
    exit(main())
