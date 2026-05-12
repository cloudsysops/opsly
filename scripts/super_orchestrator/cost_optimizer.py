#!/usr/bin/env python3
"""
Cost Optimizer - Optimiza costos de ejecución
"""
import json
import os
from datetime import datetime, timedelta
from .performance_tracker import PerformanceTracker

class CostOptimizer:
    """Optimiza costos del sistema"""
    
    def __init__(self):
        self.budget_file = os.path.expanduser("~/.opsly/cost_budget.json")
        self.load_budget()
        self.performance = PerformanceTracker()
        
        # Costos por provider (por 1K tokens)
        self.cost_per_1k = {
            "anthropic-sonnet": 18.0,
            "deepseek-v4": 2.0,
            "openai-gpt4o": 20.0,
            "ollama-qwen": 0.0,
            "ollama-codellama": 0.0,
            "ollama-llama": 0.0,
            "ollama-nemotron": 0.0
        }
        
    def load_budget(self):
        """Carga presupuesto"""
        if os.path.exists(self.budget_file):
            with open(self.budget_file, 'r') as f:
                data = json.load(f)
                self.daily_budget = data.get('daily_budget', 100)
                self.spent_today = data.get('spent_today', 0)
                self.last_reset = data.get('last_reset', None)
        else:
            self.daily_budget = 100
            self.spent_today = 0
            self.last_reset = None
        
        # Resetear si es nuevo día
        if self.last_reset:
            last_date = datetime.fromisoformat(self.last_reset).date()
            if last_date != datetime.now().date():
                self.spent_today = 0
                self.last_reset = datetime.now().isoformat()
                self.save_budget()
    
    def save_budget(self):
        """Guarda presupuesto"""
        os.makedirs(os.path.dirname(self.budget_file), exist_ok=True)
        with open(self.budget_file, 'w') as f:
            json.dump({
                'daily_budget': self.daily_budget,
                'spent_today': self.spent_today,
                'last_reset': self.last_reset or datetime.now().isoformat()
            }, f, indent=2)
    
    def estimate_cost(self, provider_id: str, input_tokens: int, output_tokens: int) -> float:
        """Estima costo de una operación"""
        cost = self.cost_per_1k.get(provider_id, 0)
        return (input_tokens + output_tokens) / 1000 * cost
    
    def can_afford(self, provider_id: str, input_tokens: int = 1000, output_tokens: int = 500) -> bool:
        """Verifica si puede costear la operación"""
        cost = self.estimate_cost(provider_id, input_tokens, output_tokens)
        return (self.spent_today + cost) <= self.daily_budget
    
    def record_spend(self, provider_id: str, input_tokens: int, output_tokens: int):
        """Registra gasto"""
        cost = self.estimate_cost(provider_id, input_tokens, output_tokens)
        self.spent_today += cost
        self.save_budget()
    
    def get_report(self) -> dict:
        """Reporte de costos"""
        stats = self.performance.get_all_stats()
        
        # Calcular costos por proveedor
        costs = {}
        for provider_id, data in stats.get('providers', {}).items():
            total_cost = data.get('total_cost', 0)
            costs[provider_id] = total_cost
        
        # Calcular total
        total_spent = sum(costs.values())
        
        return {
            "daily_budget": self.daily_budget,
            "spent_today": self.spent_today,
            "remaining": self.daily_budget - self.spent_today,
            "utilization_percent": (self.spent_today / self.daily_budget * 100) if self.daily_budget > 0 else 0,
            "by_provider": costs,
            "total_cost": total_spent
        }
    
    def optimize(self) -> dict:
        """Sugiere optimizaciones de costo"""
        report = self.get_report()
        suggestions = []
        
        # Si está cerca del presupuesto
        if report['utilization_percent'] > 80:
            suggestions.append({
                "type": "budget_alert",
                "message": f"Usando {report['utilization_percent']:.1f}% del presupuesto",
                "action": "Reducir uso de APIs de pago"
            })
        
        # Si hay providers de pago con alternatives gratuitas
        stats = self.performance.get_all_stats()
        providers = stats.get('providers', {})
        
        for provider_id, data in providers.items():
            if self.cost_per_1k.get(provider_id, 0) > 0:
                # Hay alternativa gratuita?
                free_alternatives = ['ollama-qwen', 'ollama-codellama', 'ollama-llama']
                if any(a in providers for a in free_alternatives):
                    # Calcular cuánto se ahorraría si 50% fuera a gratuito
                    current_cost = data.get('total_cost', 0)
                    potential_savings = current_cost * 0.5
                    suggestions.append({
                        "type": "switch_to_free",
                        "provider": provider_id,
                        "current_cost": current_cost,
                        "potential_savings": potential_savings,
                        "action": f"Mover 50% del tráfico a Ollama"
                    })
        
        return {
            "report": report,
            "suggestions": suggestions
        }

if __name__ == "__main__":
    optimizer = CostOptimizer()
    print(json.dumps(optimizer.get_report(), indent=2))