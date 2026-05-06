#!/usr/bin/env python3
"""
Performance Tracker - Rastrea rendimiento de proveedores y agentes
"""
import asyncio
import json
import os
import time
from datetime import datetime, timedelta
from collections import defaultdict
from dataclasses import dataclass, asdict

class PerformanceTracker:
    """Rastrea métricas de rendimiento del sistema"""
    
    def __init__(self):
        self.metrics_file = os.path.expanduser("~/.opsly/performance_metrics.json")
        self.load_metrics()
        
    def load_metrics(self):
        """Carga métricas desde archivo"""
        if os.path.exists(self.metrics_file):
            with open(self.metrics_file, 'r') as f:
                data = json.load(f)
                self.provider_metrics = data.get('providers', {})
                self.task_metrics = data.get('tasks', {})
        else:
            self.provider_metrics = {}
            self.task_metrics = {}
    
    def save_metrics(self):
        """Guarda métricas a archivo"""
        os.makedirs(os.path.dirname(self.metrics_file), exist_ok=True)
        with open(self.metrics_file, 'w') as f:
            json.dump({
                'providers': self.provider_metrics,
                'tasks': self.task_metrics,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def record(self, provider_id: str, task_type: str, latency_ms: int, success: bool, cost: float = 0):
        """Registra una ejecución"""
        # Provider metrics
        if provider_id not in self.provider_metrics:
            self.provider_metrics[provider_id] = {
                'total_requests': 0,
                'successful': 0,
                'failed': 0,
                'total_latency_ms': 0,
                'total_cost': 0,
                'last_24h': []
            }
        
        pm = self.provider_metrics[provider_id]
        pm['total_requests'] += 1
        if success:
            pm['successful'] += 1
        else:
            pm['failed'] += 1
        pm['total_latency_ms'] += latency_ms
        pm['total_cost'] += cost
        
        # Last 24h (keep last 100)
        pm['last_24h'].append({
            'timestamp': datetime.now().isoformat(),
            'latency_ms': latency_ms,
            'success': success,
            'cost': cost
        })
        pm['last_24h'] = pm['last_24h'][-100:]
        
        # Task metrics
        if task_type not in self.task_metrics:
            self.task_metrics[task_type] = {}
        
        if provider_id not in self.task_metrics[task_type]:
            self.task_metrics[task_type][provider_id] = {'count': 0, 'success': 0}
        
        tm = self.task_metrics[task_type][provider_id]
        tm['count'] += 1
        if success:
            tm['success'] += 1
        
        self.save_metrics()
    
    def get_provider_stats(self, provider_id: str) -> dict:
        """Obtiene estadísticas de un proveedor"""
        pm = self.provider_metrics.get(provider_id, {})
        total = pm.get('total_requests', 0)
        
        if total == 0:
            return {"status": "no_data"}
        
        # Calcular métricas 24h
        last_24h = pm.get('last_24h', [])
        now = datetime.now()
        recent = [
            e for e in last_24h
            if (now - datetime.fromisoformat(e['timestamp'])).total_seconds() < 86400
        ]
        
        return {
            "provider": provider_id,
            "total_requests": total,
            "success_rate": pm.get('successful', 0) / total,
            "avg_latency_ms": pm.get('total_latency_ms', 0) / total,
            "total_cost": pm.get('total_cost', 0),
            "last_24h": {
                "requests": len(recent),
                "success_rate": sum(1 for e in recent if e['success']) / len(recent) if recent else 0,
                "avg_latency_ms": sum(e['latency_ms'] for e in recent) / len(recent) if recent else 0
            }
        }
    
    def get_task_stats(self, task_type: str) -> dict:
        """Obtiene estadísticas por tipo de tarea"""
        tm = self.task_metrics.get(task_type, {})
        
        results = []
        for provider_id, stats in tm.items():
            rate = stats['success'] / stats['count'] if stats['count'] > 0 else 0
            results.append({
                "provider": provider_id,
                "count": stats['count'],
                "success_rate": rate
            })
        
        # Ordenar por success rate descendente
        results.sort(key=lambda x: x['success_rate'], reverse=True)
        
        return {
            "task_type": task_type,
            "best_provider": results[0]['provider'] if results else None,
            "providers": results
        }
    
    def get_best_for_task(self, task_type: str) -> str:
        """Retorna mejor proveedor para una tarea"""
        stats = self.get_task_stats(task_type)
        providers = stats.get('providers', [])
        
        if not providers:
            return 'ollama-qwen'  # Default
        
        return providers[0]['provider']
    
    def get_all_stats(self) -> dict:
        """Obtiene todas las estadísticas"""
        return {
            "providers": {
                pid: self.get_provider_stats(pid)
                for pid in self.provider_metrics.keys()
            },
            "tasks": {
                task: self.get_task_stats(task)
                for task in self.task_metrics.keys()
            }
        }
    
    def dashboard(self) -> str:
        """Genera dashboard en texto"""
        stats = self.get_all_stats()
        
        lines = ["=" * 60]
        lines.append("SUPER ORCHESTRATOR - PERFORMANCE DASHBOARD")
        lines.append("=" * 60)
        
        # Providers
        lines.append("\n📊 PROVIDERS:")
        for provider, data in stats.get('providers', {}).items():
            if data.get('status') == 'no_data':
                continue
            lines.append(f"  {provider}:")
            lines.append(f"    - Requests: {data.get('total_requests', 0)}")
            lines.append(f"    - Success Rate: {data.get('success_rate', 0)*100:.1f}%")
            lines.append(f"    - Avg Latency: {data.get('avg_latency_ms', 0):.0f}ms")
            lines.append(f"    - Cost: ${data.get('total_cost', 0):.4f}")
        
        # Tasks
        lines.append("\n🎯 BEST PROVIDERS BY TASK:")
        for task, data in stats.get('tasks', {}).items():
            best = data.get('best_provider')
            lines.append(f"  {task}: {best}")
        
        lines.append("\n" + "=" * 60)
        
        return "\n".join(lines)

if __name__ == "__main__":
    tracker = PerformanceTracker()
    print(tracker.dashboard())