#!/usr/bin/env python3
"""
Budget Controller - Controla el presupuesto y costos por tenant
"""
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class TenantBudget:
    """Presupuesto de un tenant"""
    tenant_slug: str
    monthly_budget_usd: float
    spent_this_month: float = 0.0
    alert_threshold_percent: float = 80.0
    hard_limit_percent: float = 100.0
    last_reset: str = None
    
    def __post_init__(self):
        if self.last_reset is None:
            self.last_reset = datetime.now().isoformat()
    
    @property
    def remaining(self) -> float:
        return max(0, self.monthly_budget_usd - self.spent_this_month)
    
    @property
    def usage_percent(self) -> float:
        if self.monthly_budget_usd == 0:
            return 0
        return (self.spent_this_month / self.monthly_budget_usd) * 100
    
    @property
    def should_alert(self) -> bool:
        return self.usage_percent >= self.alert_threshold_percent
    
    @property
    def is_exhausted(self) -> bool:
        return self.usage_percent >= self.hard_limit_percent


class BudgetController:
    """Controla presupuestos y costos por tenant"""
    
    def __init__(self):
        self.config_file = os.path.expanduser("~/.opsly/tenant_budgets.json")
        self.cost_log_file = os.path.expanduser("~/.opsly/cost_log.json")
        self.load_config()
    
    def load_config(self):
        """Carga configuración de presupuestos"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.budgets = {b['tenant_slug']: b for b in data.get('budgets', [])}
        else:
            self.budgets = self._default_budgets()
        
        if os.path.exists(self.cost_log_file):
            with open(self.cost_log_file, 'r') as f:
                self.cost_log = json.load(f).get('costs', [])
        else:
            self.cost_log = []
    
    def save_config(self):
        """Guarda configuración"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump({
                'budgets': list(self.budgets.values()),
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
        
        with open(self.cost_log_file, 'w') as f:
            json.dump({
                'costs': self.cost_log[-1000:],  # Keep last 1000
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def _default_budgets(self) -> dict:
        """Presupuestos por defecto"""
        return {
            'opsly': {
                'tenant_slug': 'opsly',
                'monthly_budget_usd': 100.0,
                'spent_this_month': 0.0,
                'alert_threshold_percent': 80.0,
                'hard_limit_percent': 100.0,
                'last_reset': datetime.now().isoformat()
            },
            'smiletripcare': {
                'tenant_slug': 'smiletripcare',
                'monthly_budget_usd': 50.0,
                'spent_this_month': 0.0,
                'alert_threshold_percent': 80.0,
                'hard_limit_percent': 100.0,
                'last_reset': datetime.now().isoformat()
            }
        }
    
    def get_budget(self, tenant_slug: str) -> Optional[TenantBudget]:
        """Obtiene presupuesto de un tenant"""
        data = self.budgets.get(tenant_slug)
        if data:
            return TenantBudget(**data)
        return None
    
    def set_budget(self, tenant_slug: str, monthly_budget_usd: float, 
                   alert_threshold: float = 80.0, hard_limit: float = 100.0):
        """Establece presupuesto para un tenant"""
        self.budgets[tenant_slug] = {
            'tenant_slug': tenant_slug,
            'monthly_budget_usd': monthly_budget_usd,
            'spent_this_month': self.budgets.get(tenant_slug, {}).get('spent_this_month', 0.0),
            'alert_threshold_percent': alert_threshold,
            'hard_limit_percent': hard_limit,
            'last_reset': datetime.now().isoformat()
        }
        self.save_config()
    
    def record_cost(self, tenant_slug: str, cost_usd: float, 
                    provider: str, task_type: str, request_id: str = None):
        """Registra un costo"""
        # Update spent amount
        if tenant_slug in self.budgets:
            self.budgets[tenant_slug]['spent_this_month'] += cost_usd
        
        # Add to cost log
        self.cost_log.append({
            'timestamp': datetime.now().isoformat(),
            'tenant_slug': tenant_slug,
            'cost_usd': cost_usd,
            'provider': provider,
            'task_type': task_type,
            'request_id': request_id
        })
        
        self.save_config()
    
    def can_spend(self, tenant_slug: str, estimated_cost: float) -> tuple[bool, str]:
        """Verifica si puede gastar"""
        budget = self.get_budget(tenant_slug)
        
        if not budget:
            return True, "No budget limit"
        
        if budget.is_exhausted:
            return False, f"Budget exhausted: ${budget.remaining:.2f} remaining"
        
        projected = budget.spent_this_month + estimated_cost
        if projected > budget.monthly_budget_usd:
            return False, f"Would exceed budget: ${budget.remaining:.2f} remaining"
        
        if budget.should_alert:
            return True, f"⚠️ Budget alert: {budget.usage_percent:.1f}% used"
        
        return True, "OK"
    
    def get_tenant_costs(self, tenant_slug: str, days: int = 30) -> dict:
        """Obtiene costos de un tenant en los últimos N días"""
        cutoff = datetime.now() - timedelta(days=days)
        
        costs = [
            c for c in self.cost_log 
            if c['tenant_slug'] == tenant_slug and 
            datetime.fromisoformat(c['timestamp']) > cutoff
        ]
        
        total = sum(c['cost_usd'] for c in costs)
        by_provider = {}
        by_task = {}
        
        for c in costs:
            by_provider[c['provider']] = by_provider.get(c['provider'], 0) + c['cost_usd']
            by_task[c['task_type']] = by_task.get(c['task_type'], 0) + c['cost_usd']
        
        return {
            'tenant_slug': tenant_slug,
            'period_days': days,
            'total_cost': total,
            'transaction_count': len(costs),
            'by_provider': by_provider,
            'by_task': by_task
        }
    
    def get_all_tenants_summary(self) -> list:
        """Resumen de todos los tenants"""
        summary = []
        for slug, data in self.budgets.items():
            budget = TenantBudget(**data)
            summary.append({
                'tenant': slug,
                'budget': budget.monthly_budget_usd,
                'spent': budget.spent_this_month,
                'remaining': budget.remaining,
                'usage_percent': budget.usage_percent,
                'status': '🔴 exhausted' if budget.is_exhausted else 
                         '🟡 alert' if budget.should_alert else '🟢 ok'
            })
        return summary
    
    def reset_monthly_spending(self, tenant_slug: str = None):
        """Resetea el gasto mensual"""
        if tenant_slug:
            if tenant_slug in self.budgets:
                self.budgets[tenant_slug]['spent_this_month'] = 0.0
                self.budgets[tenant_slug]['last_reset'] = datetime.now().isoformat()
        else:
            # Reset all
            for slug in self.budgets:
                self.budgets[slug]['spent_this_month'] = 0.0
                self.budgets[slug]['last_reset'] = datetime.now().isoformat()
        
        self.save_config()
    
    def generate_report(self) -> str:
        """Genera reporte de costos"""
        lines = ["=" * 60]
        lines.append("BUDGET CONTROLLER REPORT")
        lines.append("=" * 60)
        lines.append(f"Generated: {datetime.now().isoformat()}\n")
        
        # Tenant summaries
        lines.append("📊 TENANT BUDGETS:")
        for s in self.get_all_tenants_summary():
            lines.append(f"  {s['tenant']}: ${s['spent']:.2f}/${s['budget']:.2f} ({s['usage_percent']:.1f}%) {s['status']}")
        
        # Last costs
        lines.append("\n💰 RECENT COSTS:")
        for cost in self.cost_log[-10:]:
            lines.append(f"  {cost['timestamp'][:19]} | {cost['tenant_slug']} | {cost['provider']} | ${cost['cost_usd']:.4f}")
        
        lines.append("\n" + "=" * 60)
        return "\n".join(lines)


if __name__ == "__main__":
    controller = BudgetController()
    
    # Test can_spend
    can, msg = controller.can_spend('opsly', 5.0)
    print(f"Can spend $5 on opsly: {can} - {msg}")
    
    # Test record
    controller.record_cost('opsly', 0.5, 'ollama-qwen', 'code_generation')
    
    # Show report
    print(controller.generate_report())