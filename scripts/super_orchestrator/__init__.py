#!/usr/bin/env python3
"""
Super Orchestrator v2 - Sistema de Orquestación Multi-Agente Auto-Evolutivo

Este módulo proporciona capacidades de orquestación avanzada:
- Prompt Controller: Parsea y ejecuta prompts del usuario
- Provider Selector: Selecciona el mejor proveedor para cada tarea
- Performance Tracker: Rastrea métricas de rendimiento
- Idea Generator: Genera ideas de mejora automáticamente
- Cost Optimizer: Optimiza costos de ejecución
- Auto Evolution: Ciclo de auto-mejora continua

Uso:
    from super_orchestrator import PromptController, ProviderSelector, PerformanceTracker
    
    controller = PromptController()
    result = await controller.execute("Revisa el PR #123")
"""

__version__ = "2.0.0"
__author__ = "Opsly Team"

from .prompt_controller import PromptController
from .provider_selector import ProviderSelector
from .performance_tracker import PerformanceTracker
from .idea_generator import IdeaGenerator
from .cost_optimizer import CostOptimizer
from .auto_evolution import AutoEvolution
from .git_automation import GitAutomation
from .n8n_trigger import N8nTrigger
from .health_monitor import HealthMonitor
from .agent_pool_manager import AgentPoolManager

__all__ = [
    "PromptController",
    "ProviderSelector", 
    "PerformanceTracker",
    "IdeaGenerator",
    "CostOptimizer",
    "AutoEvolution",
    "GitAutomation",
    "N8nTrigger",
    "HealthMonitor",
    "AgentPoolManager",
]