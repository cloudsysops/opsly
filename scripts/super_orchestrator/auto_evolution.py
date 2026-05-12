#!/usr/bin/env python3
"""
Auto Evolution - Auto-mejora del sistema basada en métricas
"""
import json
import os
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional

from .performance_tracker import PerformanceTracker
from .provider_selector import ProviderSelector


@dataclass
class EvolutionIdea:
    """Idea de mejora generada"""
    idea_id: str
    type: str  # "routing", "model", "threshold", "pipeline"
    description: str
    evidence: dict
    impact: str  # "low", "medium", "high"
    confidence: float


class AutoEvolution:
    """Sistema de auto-evolución basado en análisis de métricas"""
    
    def __init__(self):
        self.tracker = PerformanceTracker()
        self.selector = ProviderSelector()
        self.ideas_file = os.path.expanduser("~/.opsly/evolution_ideas.json")
        self.load_ideas()
    
    def load_ideas(self):
        """Carga ideas guardadas"""
        if os.path.exists(self.ideas_file):
            with open(self.ideas_file, 'r') as f:
                data = json.load(f)
                self.ideas = data.get('ideas', [])
                self.applied = data.get('applied', [])
        else:
            self.ideas = []
            self.applied = []
    
    def save_ideas(self):
        """Guarda ideas a archivo"""
        os.makedirs(os.path.dirname(self.ideas_file), exist_ok=True)
        with open(self.ideas_file, 'w') as f:
            json.dump({
                'ideas': self.ideas,
                'applied': self.applied,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def analyze_and_generate_ideas(self) -> list[EvolutionIdea]:
        """Analiza métricas y genera ideas de mejora"""
        new_ideas = []
        stats = self.tracker.get_all_stats()
        
        # 1. Analizar proveedores con baja tasa de éxito
        for provider, data in stats.get('providers', {}).items():
            if data.get('status') == 'no_data':
                continue
            
            success_rate = data.get('success_rate', 0)
            avg_latency = data.get('avg_latency_ms', 0)
            
            # Si tasa de éxito < 80%, sugerir cambio de modelo
            if success_rate < 0.8:
                idea = EvolutionIdea(
                    idea_id=f"idea_{provider}_low_success_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type="model",
                    description=f"Provider {provider} tiene tasa de éxito baja ({success_rate*100:.1f}%). Considerar cambiar a modelo alternativo.",
                    evidence={
                        "provider": provider,
                        "success_rate": success_rate,
                        "total_requests": data.get('total_requests', 0)
                    },
                    impact="high" if success_rate < 0.5 else "medium",
                    confidence=1 - success_rate
                )
                new_ideas.append(idea)
            
            # Si latencia > 5000ms, sugerir optimización
            if avg_latency > 5000:
                idea = EvolutionIdea(
                    idea_id=f"idea_{provider}_high_latency_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type="threshold",
                    description=f"Provider {provider} tiene latencia alta ({avg_latency:.0f}ms). Ajustar threshold de timeout.",
                    evidence={
                        "provider": provider,
                        "avg_latency_ms": avg_latency
                    },
                    impact="medium",
                    confidence=min(avg_latency / 10000, 1.0)
                )
                new_ideas.append(idea)
        
        # 2. Analizar tareas sin datos suficientes
        task_coverage = stats.get('tasks', {})
        for task_type, data in task_coverage.items():
            providers = data.get('providers', [])
            if len(providers) < 2:
                idea = EvolutionIdea(
                    idea_id=f"idea_{task_type}_low_coverage_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type="routing",
                    description=f"Tarea {task_type} tiene solo {len(providers)} proveedor(es). Considerar añadir más opciones de routing.",
                    evidence={
                        "task_type": task_type,
                        "providers_count": len(providers)
                    },
                    impact="low",
                    confidence=0.5
                )
                new_ideas.append(idea)
        
        # 3. Detectar patrones de fallo
        for task_type, data in task_coverage.items():
            providers = data.get('providers', [])
            worst = providers[-1] if providers else None
            if worst and worst.get('success_rate', 0) < 0.5:
                idea = EvolutionIdea(
                    idea_id=f"idea_{task_type}_avoid_provider_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    type="routing",
                    description=f"Para tarea {task_type}, evitar {worst['provider']} (success rate: {worst['success_rate']*100:.1f}%)",
                    evidence={
                        "task_type": task_type,
                        "provider_to_avoid": worst['provider'],
                        "success_rate": worst['success_rate']
                    },
                    impact="medium",
                    confidence=worst.get('success_rate', 0)
                )
                new_ideas.append(idea)
        
        # Guardar nuevas ideas
        self.ideas.extend(new_ideas)
        self.save_ideas()
        
        return new_ideas
    
    def get_pending_ideas(self, limit: int = 10) -> list[dict]:
        """Obtiene ideas pendientes de aplicar"""
        applied_ids = set(self.applied)
        pending = [idea for idea in self.ideas if idea.idea_id not in applied_ids]
        return [
            {
                "idea_id": i.idea_id,
                "type": i.type,
                "description": i.description,
                "impact": i.impact,
                "confidence": i.confidence,
                "evidence": i.evidence
            }
            for i in pending[:limit]
        ]
    
    def apply_idea(self, idea_id: str) -> dict:
        """Aplica una idea de mejora"""
        idea = next((i for i in self.ideas if i.idea_id == idea_id), None)
        
        if not idea:
            return {"success": False, "error": "Idea no encontrada"}
        
        # Ejecutar acción según tipo de idea
        if idea.type == "model":
            # Actualizar weights en provider_selector
            self.selector.adjust_provider_weight(idea.evidence['provider'], 0.1)
            result = {"action": "reduced_weight", "provider": idea.evidence['provider']}
        
        elif idea.type == "threshold":
            # Actualizar timeout threshold
            provider = idea.evidence.get('provider')
            if provider:
                self.selector.adjust_timeout(provider, int(idea.evidence.get('avg_latency_ms', 5000) * 1.5))
            result = {"action": "adjusted_timeout", "provider": provider}
        
        elif idea.type == "routing":
            # Marcar proveedor como no preferido para tarea
            task = idea.evidence.get('task_type')
            provider = idea.evidence.get('provider_to_avoid')
            if task and provider:
                self.selector.set_task_preference(task, provider, 0)
            result = {"action": "updated_routing", "task": task, "avoid": provider}
        
        else:
            return {"success": False, "error": f"Tipo de idea no soportado: {idea.type}"}
        
        # Registrar aplicación
        self.applied.append(idea_id)
        self.save_ideas()
        
        return {
            "success": True,
            "idea_id": idea_id,
            "action": result
        }
    
    def get_evolution_report(self) -> str:
        """Genera reporte de evolución"""
        pending = self.get_pending_ideas()
        stats = self.tracker.get_all_stats()
        
        lines = ["=" * 60]
        lines.append("AUTO EVOLUTION REPORT")
        lines.append("=" * 60)
        lines.append(f"Generated: {datetime.now().isoformat()}")
        
        lines.append(f"\n📈 Total Ideas: {len(self.ideas)}")
        lines.append(f"✅ Applied: {len(self.applied)}")
        lines.append(f"⏳ Pending: {len(pending)}")
        
        if pending:
            lines.append("\n🔮 PENDING IDEAS:")
            for i, idea in enumerate(pending[:5], 1):
                lines.append(f"  {i}. [{idea['impact'].upper()}] {idea['type']}")
                lines.append(f"     {idea['description'][:80]}")
        
        lines.append("\n📊 SYSTEM HEALTH:")
        for provider, data in stats.get('providers', {}).items():
            if data.get('status') == 'no_data':
                continue
            lines.append(f"  {provider}: {data.get('success_rate', 0)*100:.1f}% success, {data.get('avg_latency_ms', 0):.0f}ms")
        
        lines.append("\n" + "=" * 60)
        
        return "\n".join(lines)


if __name__ == "__main__":
    evol = AutoEvolution()
    
    # Analizar y generar ideas
    print("🔍 Analyzing system...")
    ideas = evol.analyze_and_generate_ideas()
    print(f"Generated {len(ideas)} new ideas")
    
    # Mostrar reporte
    print(evol.get_evolution_report())