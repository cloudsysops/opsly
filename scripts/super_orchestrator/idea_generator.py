#!/usr/bin/env python3
"""
Idea Generator - Genera ideas de mejora automáticamente
"""
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict
from .performance_tracker import PerformanceTracker

class IdeaGenerator:
    """Genera ideas de mejora para el sistema"""
    
    def __init__(self):
        self.ideas_file = os.path.expanduser("~/.opsly/ideas.json")
        self.load_ideas()
        self.performance = PerformanceTracker()
        
    def load_ideas(self):
        """Carga ideas guardadas"""
        if os.path.exists(self.ideas_file):
            with open(self.ideas_file, 'r') as f:
                data = json.load(f)
                self.ideas = data.get('ideas', [])
        else:
            self.ideas = []
    
    def save_ideas(self):
        """Guarda ideas"""
        os.makedirs(os.path.dirname(self.ideas_file), exist_ok=True)
        with open(self.ideas_file, 'w') as f:
            json.dump({
                'ideas': self.ideas,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def generate_ideas(self) -> List[Dict]:
        """Genera nuevas ideas basadas en métricas"""
        ideas = []
        stats = self.performance.get_all_stats()
        
        # Analizar proveedores
        providers = stats.get('providers', {})
        for provider_id, data in providers.items():
            success_rate = data.get('success_rate', 1.0)
            avg_latency = data.get('avg_latency_ms', 0)
            
            # Idea: Bajar de proveedor con bajo success rate
            if success_rate < 0.9:
                ideas.append({
                    "id": f"idea-{len(self.ideas) + 1}",
                    "type": "provider_change",
                    "title": f"Cambiar {provider_id} por fallback",
                    "reason": f"Tasa de éxito solo {success_rate*100:.1f}%",
                    "impact": "high",
                    "effort": "low",
                    "provider": provider_id,
                    "suggested_action": "usar fallback_chain"
                })
            
            # Idea: Optimizar latency
            if avg_latency > 3000:
                ideas.append({
                    "id": f"idea-{len(self.ideas) + 1}",
                    "type": "performance",
                    "title": f"Optimizar {provider_id} - latency alta",
                    "reason": f"Latencia promedio {avg_latency}ms",
                    "impact": "medium",
                    "effort": "medium",
                    "provider": provider_id
                })
        
        # Analizar tasks
        tasks = stats.get('tasks', {})
        for task_type, task_data in tasks.items():
            providers = task_data.get('providers', [])
            if providers:
                best = providers[0]
                if best.get('success_rate', 0) < 0.95:
                    ideas.append({
                        "id": f"idea-{len(self.ideas) + 1}",
                        "type": "task_optimization",
                        "title": f"Mejorar {task_type} - bajo success",
                        "reason": f"Success rate {best.get('success_rate', 0)*100:.1f}%",
                        "impact": "high",
                        "effort": "medium",
                        "task": task_type,
                        "current_provider": best.get('provider')
                    })
        
        # Ideas generales basadas en patrones
        # Idea: Agregar más proveedores si hay muchos requests
        total_requests = sum(p.get('total_requests', 0) for p in providers.values())
        if total_requests > 100:
            ideas.append({
                "id": f"idea-{len(self.ideas) + 1}",
                "type": "scaling",
                "title": "Escalar capacidad de procesamiento",
                "reason": f"{total_requests} requests tot",
                "impact": "high",
                "effort": "medium",
                "suggested_action": "agregar_workers"
            })
        
        # Agregar a lista y guardar
        self.ideas.extend(ideas)
        self.save_ideas()
        
        return ideas
    
    def list_ideas(self, status: str = None) -> List[Dict]:
        """Lista ideas, opcionalmente filtradas por status"""
        if status:
            return [i for i in self.ideas if i.get('status') == status]
        return self.ideas
    
    def apply_idea(self, idea_id: str) -> dict:
        """Aplica una idea"""
        for idea in self.ideas:
            if idea.get('id') == idea_id:
                idea['status'] = 'applied'
                idea['applied_at'] = datetime.now().isoformat()
                self.save_ideas()
                
                # Aquí se ejecutaría la acción sugerida
                return {
                    "success": True,
                    "idea": idea,
                    "action": f"Aplicada: {idea.get('suggested_action', 'manual')}"
                }
        
        return {"success": False, "error": "Idea not found"}
    
    def discard_idea(self, idea_id: str, reason: str) -> dict:
        """Descarta una idea"""
        for idea in self.ideas:
            if idea.get('id') == idea_id:
                idea['status'] = 'discarded'
                idea['discarded_at'] = datetime.now().isoformat()
                idea['discard_reason'] = reason
                self.save_ideas()
                return {"success": True}
        
        return {"success": False, "error": "Idea not found"}
    
    def get_prioritized(self) -> List[Dict]:
        """Obtiene ideas priorizadas por impacto"""
        prioritized = sorted(
            self.ideas,
            key=lambda x: (
                {'high': 3, 'medium': 2, 'low': 1}.get(x.get('impact', 'low'), 1),
                {'high': 3, 'medium': 2, 'low': 1}.get(x.get('effort', 'high'), 1)
            ),
            reverse=True
        )
        return [i for i in prioritized if i.get('status') != 'applied' and i.get('status') != 'discarded']

if __name__ == "__main__":
    generator = IdeaGenerator()
    
    # Generar ideas
    new_ideas = generator.generate_ideas()
    print(f"Generadas {len(new_ideas)} ideas")
    
    # Mostrar priorizadas
    print("\nIdeas priorizadas:")
    for idea in generator.get_prioritized()[:5]:
        print(f"  - {idea.get('title')} (impact: {idea.get('impact')})")