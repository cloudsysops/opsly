#!/usr/bin/env python3
"""
Super Orchestrator CLI - Interfaz de línea de comandos unificada
"""

import argparse
import json
import sys
import os

_script_file = os.path.abspath(__file__)
_scripts_dir = os.path.dirname(os.path.dirname(_script_file))

# Tailscale: sin importar super_orchestrator (evita aiohttp y deps pesadas).
if len(sys.argv) > 1 and sys.argv[1] == "tailscale":
    sys.path.insert(0, _scripts_dir)
    import opsly_tailscale_cli

    raise SystemExit(opsly_tailscale_cli.main(sys.argv[2:]))

# Add parent dir to path
sys.path.insert(0, _scripts_dir)

from super_orchestrator.provider_selector import ProviderSelector
from super_orchestrator.performance_tracker import PerformanceTracker
from super_orchestrator.agent_pool_manager import AgentPoolManager
from super_orchestrator.health_monitor import HealthMonitor
from super_orchestrator.auto_evolution import AutoEvolution
from super_orchestrator.budget_controller import BudgetController
from super_orchestrator.task_routing import TaskRouter, ParallelTaskExecutor


def cmd_provider(args):
    """Comandos de provider"""
    selector = ProviderSelector()

    if args.select:
        result = selector.select(args.prompt)
        print(json.dumps(result, indent=2))
    elif args.status:
        metrics = selector.get_metrics()
        print(json.dumps(metrics, indent=2))
    elif args.adjust:
        selector.adjust_provider_weight(args.provider, args.weight)
        print(f"Adjusted {args.provider} weight by {args.weight}")


def cmd_performance(args):
    """Comandos de performance"""
    tracker = PerformanceTracker()

    if args.record:
        tracker.record(
            args.provider,
            args.task,
            int(args.latency),
            args.success.lower() == "true",
            float(args.cost),
        )
        print(f"Recorded: {args.provider} | {args.task} | {args.latency}ms")
    elif args.stats:
        print(json.dumps(tracker.get_all_stats(), indent=2))
    elif args.dashboard:
        print(tracker.dashboard())


def cmd_pool(args):
    """Comandos de agent pool"""
    import asyncio

    manager = AgentPoolManager()

    if args.status:
        print(json.dumps(manager.get_pool_status(), indent=2))
    elif args.find:
        capabilities = args.capabilities.split(",") if args.capabilities else []
        agent = manager.find_available_agent(capabilities, args.max_latency)
        print(json.dumps({"agent_id": agent}, indent=2))
    elif args.health_check:
        result = asyncio.run(manager.check_all_agents())
        print(json.dumps(result, indent=2))
    elif args.dashboard:
        print(manager.dashboard())


def cmd_health(args):
    """Comandos de health"""
    monitor = HealthMonitor()

    if args.check:
        result = monitor.check_all()
        print(json.dumps(result, indent=2))
    elif args.report:
        print(monitor.generate_report())


def cmd_evolution(args):
    """Comandos de auto-evolución"""
    evol = AutoEvolution()

    if args.analyze:
        ideas = evol.analyze_and_generate_ideas()
        print(f"Generated {len(ideas)} new ideas")
    elif args.pending:
        pending = evol.get_pending_ideas()
        print(json.dumps(pending, indent=2))
    elif args.apply:
        result = evol.apply_idea(args.idea_id)
        print(json.dumps(result, indent=2))
    elif args.report:
        print(evol.get_evolution_report())


def cmd_budget(args):
    """Comandos de presupuesto"""
    controller = BudgetController()

    if args.set:
        controller.set_budget(
            args.tenant, float(args.amount), args.alert_threshold, args.hard_limit
        )
        print(f"Set budget for {args.tenant}: ${args.amount}/month")
    elif args.check:
        can, msg = controller.can_spend(args.tenant, float(args.estimate))
        print(f"Can spend: {can} - {msg}")
    elif args.record:
        controller.record_cost(
            args.tenant, float(args.cost), args.provider, args.task_type
        )
        print(f"Recorded cost: ${args.cost}")
    elif args.report:
        print(controller.generate_report())


def cmd_routing(args):
    """Comandos de routing"""
    router = TaskRouter()

    if args.route:
        from super_orchestrator.task_routing import TaskRequirements

        req = TaskRequirements(
            task_type=args.task_type,
            complexity=args.complexity,
            urgency=args.urgency,
            estimated_tokens=int(args.tokens),
        )
        provider = router.route(req)
        print(json.dumps({"provider": provider, "task": req.task_type}, indent=2))
    elif args.summary:
        print(json.dumps(router.get_route_summary(), indent=2))


def cmd_self_healing(args):
    """Comandos de auto-reparación"""
    from .self_healing import SelfHealingAgent
    import json

    config_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "config",
        "super-orchestrator-config.json",
    )
    config = {}
    if os.path.exists(config_path):
        with open(config_path) as f:
            cfg = json.load(f)
            config = cfg.get("components", {}).get("self_healing", {})

    agent = SelfHealingAgent(config)

    if args.check:
        issues = agent.run_all_checks()
        print(agent.get_report())
    elif args.repair:
        issues = agent.run_all_checks()
        actions = agent.repair_all()
        print(agent.get_report())
    elif args.report:
        print(agent.get_report())


def main():
    parser = argparse.ArgumentParser(
        description="Super Orchestrator v2 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Provider
    p_provider = subparsers.add_parser("provider", help="Provider selection")
    p_provider.add_argument("--select", action="store_true", help="Select provider")
    p_provider.add_argument("--prompt", help="Prompt for selection")
    p_provider.add_argument("--status", action="store_true", help="Show all providers")
    p_provider.add_argument(
        "--adjust", action="store_true", help="Adjust provider weight"
    )
    p_provider.add_argument("--provider", help="Provider ID")
    p_provider.add_argument("--weight", type=float, help="Weight adjustment")

    # Performance
    p_perf = subparsers.add_parser("performance", help="Performance tracking")
    p_perf.add_argument("--record", action="store_true", help="Record performance")
    p_perf.add_argument("--provider", help="Provider ID")
    p_perf.add_argument("--task", help="Task type")
    p_perf.add_argument("--latency", help="Latency in ms")
    p_perf.add_argument("--success", help="Success (true/false)")
    p_perf.add_argument("--cost", help="Cost in USD")
    p_perf.add_argument("--stats", action="store_true", help="Show stats")
    p_perf.add_argument("--dashboard", action="store_true", help="Show dashboard")

    # Pool
    p_pool = subparsers.add_parser("pool", help="Agent pool management")
    p_pool.add_argument("--status", action="store_true", help="Pool status")
    p_pool.add_argument("--find", action="store_true", help="Find available agent")
    p_pool.add_argument("--capabilities", help="Comma-separated capabilities")
    p_pool.add_argument("--max-latency", type=int, help="Max latency in ms")
    p_pool.add_argument("--health-check", action="store_true", help="Health check all")
    p_pool.add_argument("--dashboard", action="store_true", help="Show dashboard")

    # Health
    p_health = subparsers.add_parser("health", help="Health monitoring")
    p_health.add_argument("--check", action="store_true", help="Check all services")
    p_health.add_argument("--report", action="store_true", help="Generate report")

    # Evolution
    p_evol = subparsers.add_parser("evolution", help="Auto evolution")
    p_evol.add_argument(
        "--analyze", action="store_true", help="Analyze and generate ideas"
    )
    p_evol.add_argument("--pending", action="store_true", help="Show pending ideas")
    p_evol.add_argument("--apply", action="store_true", help="Apply an idea")
    p_evol.add_argument("--idea-id", help="Idea ID to apply")
    p_evol.add_argument("--report", action="store_true", help="Generate report")

    # Budget
    p_budget = subparsers.add_parser("budget", help="Budget control")
    p_budget.add_argument("--set", action="store_true", help="Set budget")
    p_budget.add_argument("--tenant", help="Tenant slug")
    p_budget.add_argument("--amount", help="Monthly budget amount")
    p_budget.add_argument("--alert-threshold", type=float, default=80.0)
    p_budget.add_argument("--hard-limit", type=float, default=100.0)
    p_budget.add_argument("--check", action="store_true", help="Check if can spend")
    p_budget.add_argument("--estimate", help="Estimated cost")
    p_budget.add_argument("--record", action="store_true", help="Record a cost")
    p_budget.add_argument("--cost", help="Cost amount")
    p_budget.add_argument("--provider", help="Provider")
    p_budget.add_argument("--task-type", help="Task type")
    p_budget.add_argument("--report", action="store_true", help="Generate report")

    # Self-Healing
    p_sh = subparsers.add_parser("self-healing", help="Self-healing agent")
    p_sh.add_argument("--check", action="store_true", help="Check for issues")
    p_sh.add_argument("--repair", action="store_true", help="Detect and repair")
    p_sh.add_argument("--report", action="store_true", help="Show report")

    # Routing
    p_route = subparsers.add_parser("routing", help="Task routing")
    p_route.add_argument("--route", action="store_true", help="Route a task")
    p_route.add_argument("--task-type", help="Task type")
    p_route.add_argument("--complexity", help="Complexity (simple/medium/complex)")
    p_route.add_argument("--urgency", help="Urgency (low/medium/high)")
    p_route.add_argument("--tokens", help="Estimated tokens")
    p_route.add_argument("--summary", action="store_true", help="Route summary")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Route to appropriate handler
    if args.command == "provider":
        cmd_provider(args)
    elif args.command == "performance":
        cmd_performance(args)
    elif args.command == "pool":
        cmd_pool(args)
    elif args.command == "health":
        cmd_health(args)
    elif args.command == "evolution":
        cmd_evolution(args)
    elif args.command == "budget":
        cmd_budget(args)
    elif args.command == "self-healing":
        cmd_self_healing(args)
    elif args.command == "routing":
        cmd_routing(args)


if __name__ == "__main__":
    main()
