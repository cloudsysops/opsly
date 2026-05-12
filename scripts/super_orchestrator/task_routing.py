#!/usr/bin/env python3
"""
Task Routing Engine - Enruta tareas a proveedores basado en características
"""
import json
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class TaskRequirements:
    """Requisitos de una tarea"""
    task_type: str
    complexity: str  # "simple", "medium", "complex"
    urgency: str  # "low", "medium", "high"
    estimated_tokens: int
    preferred_model: Optional[str] = None
    required_capabilities: list = None
    
    def __post_init__(self):
        if self.required_capabilities is None:
            self.required_capabilities = []


class TaskRouter:
    """Motor de enrutamiento de tareas"""
    
    def __init__(self):
        self.config_file = os.path.expanduser("~/.opsly/task_routing.json")
        self.load_config()
    
    def load_config(self):
        """Carga configuración de routing"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.routes = data.get('routes', {})
                self.defaults = data.get('defaults', {})
        else:
            self.routes = {}
            self.defaults = self._get_default_routes()
    
    def save_config(self):
        """Guarda configuración"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump({
                'routes': self.routes,
                'defaults': self.defaults,
                'last_updated': self._timestamp()
            }, f, indent=2)
    
    def _get_default_routes(self) -> dict:
        """Rutas por defecto optimizadas"""
        return {
            'code_generation': {
                'complexity': {
                    'simple': 'ollama-codellama',
                    'medium': 'ollama-codellama', 
                    'complex': 'cursor-local'
                },
                'urgency': {
                    'low': 'ollama-codellama',
                    'medium': 'ollama-codellama',
                    'high': 'cursor-local'
                }
            },
            'code_review': {
                'complexity': {
                    'simple': 'ollama-qwen',
                    'medium': 'ollama-codellama',
                    'complex': 'anthropic'
                },
                'urgency': {
                    'low': 'ollama-qwen',
                    'medium': 'ollama-codellama',
                    'high': 'claude-local'
                }
            },
            'reasoning': {
                'complexity': {
                    'simple': 'ollama-qwen',
                    'medium': 'ollama-qwen',
                    'complex': 'anthropic'
                },
                'urgency': {
                    'low': 'ollama-qwen',
                    'medium': 'ollama-qwen',
                    'high': 'anthropic'
                }
            },
            'planning': {
                'complexity': {
                    'simple': 'ollama-qwen',
                    'medium': 'ollama-qwen',
                    'complex': 'anthropic'
                },
                'urgency': {
                    'low': 'ollama-qwen',
                    'medium': 'anthropic',
                    'high': 'claude-local'
                }
            },
            'analysis': {
                'complexity': {
                    'simple': 'ollama-qwen',
                    'medium': 'anthropic',
                    'complex': 'claude-local'
                },
                'urgency': {
                    'low': 'ollama-qwen',
                    'medium': 'anthropic',
                    'high': 'claude-local'
                }
            }
        }
    
    def _timestamp(self) -> str:
        from datetime import datetime
        return datetime.now().isoformat()
    
    def route(self, requirements: TaskRequirements) -> str:
        """Determina el mejor proveedor para la tarea"""
        task_routes = self.routes.get(requirements.task_type, self.defaults.get(requirements.task_type, {}))
        
        if not task_routes:
            return self._default_fallback(requirements)
        
        # 1. Try complexity-based routing
        complexity_routes = task_routes.get('complexity', {})
        if complexity_routes and requirements.complexity in complexity_routes:
            provider = complexity_routes[requirements.complexity]
            
            # Check if we can handle the token estimate
            if self._can_handle_tokens(provider, requirements.estimated_tokens):
                return provider
        
        # 2. Fallback to urgency
        urgency_routes = task_routes.get('urgency', {})
        if urgency_routes and requirements.urgency in urgency_routes:
            return urgency_routes[requirements.urgency]
        
        # 3. Default fallback
        return self._default_fallback(requirements)
    
    def _can_handle_tokens(self, provider: str, tokens: int) -> bool:
        """Verifica si el provider puede manejar el número de tokens"""
        # Ollama models have context limits
        ollama_limits = {
            'ollama-qwen': 8192,
            'ollama-codellama': 8192,
            'ollama-llama2': 4096
        }
        
        limit = ollama_limits.get(provider, 128000)
        return tokens < limit
    
    def _default_fallback(self, requirements: TaskRequirements) -> str:
        """Proveedor por defecto basado en tipo de tarea"""
        fallback_map = {
            'code_generation': 'ollama-codellama',
            'code_review': 'ollama-qwen',
            'reasoning': 'ollama-qwen',
            'planning': 'ollama-qwen',
            'analysis': 'ollama-qwen',
            'documentation': 'ollama-qwen',
            'testing': 'ollama-codellama'
        }
        return fallback_map.get(requirements.task_type, 'ollama-qwen')
    
    def add_route(self, task_type: str, complexity: str, provider: str):
        """Añade una ruta específica"""
        if task_type not in self.routes:
            self.routes[task_type] = {'complexity': {}, 'urgency': {}}
        
        self.routes[task_type]['complexity'][complexity] = provider
        self.save_config()
    
    def get_route_summary(self) -> dict:
        """Resumen de rutas configuradas"""
        return {
            'task_types': list(self.routes.keys()),
            'total_routes': sum(
                len(r.get('complexity', {})) + len(r.get('urgency', {}))
                for r in self.routes.values()
            )
        }


class ParallelTaskExecutor:
    """Ejecutor de tareas en paralelo"""
    
    def __init__(self, max_parallel: int = 5):
        self.max_parallel = max_parallel
        self.active_tasks = {}
        self.completed_tasks = {}
        self.failed_tasks = {}
    
    async def execute_batch(self, tasks: list[dict], executor_func) -> dict:
        """Ejecuta múltiples tareas en paralelo"""
        import asyncio
        
        results = []
        pending = tasks.copy()
        
        while pending or len(self.active_tasks) > 0:
            # Start new tasks if we have capacity
            while pending and len(self.active_tasks) < self.max_parallel:
                task = pending.pop(0)
                task_id = task.get('id', f'task_{len(self.completed_tasks) + len(self.active_tasks)}')
                
                self.active_tasks[task_id] = {
                    'task': task,
                    'started_at': self._timestamp()
                }
                
                # Start async execution
                asyncio.create_task(self._execute_single(task_id, task, executor_func))
            
            # Wait a bit before checking again
            await asyncio.sleep(0.1)
        
        return {
            'completed': len(self.completed_tasks),
            'failed': len(self.failed_tasks),
            'results': list(self.completed_tasks.values())
        }
    
    async def _execute_single(self, task_id: str, task: dict, executor_func):
        """Ejecuta una tarea individual"""
        try:
            result = await executor_func(task)
            self.completed_tasks[task_id] = {
                'task': task,
                'result': result,
                'completed_at': self._timestamp()
            }
        except Exception as e:
            self.failed_tasks[task_id] = {
                'task': task,
                'error': str(e),
                'failed_at': self._timestamp()
            }
        finally:
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]
    
    def _timestamp(self) -> str:
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_status(self) -> dict:
        """Estado actual del ejecutor"""
        return {
            'active': len(self.active_tasks),
            'completed': len(self.completed_tasks),
            'failed': len(self.failed_tasks),
            'max_parallel': self.max_parallel
        }


if __name__ == "__main__":
    router = TaskRouter()
    
    # Test routing
    req = TaskRequirements(
        task_type='code_generation',
        complexity='complex',
        urgency='high',
        estimated_tokens=2000
    )
    
    provider = router.route(req)
    print(f"📍 Route for {req.task_type} (complexity={req.complexity}, urgency={req.urgency}): {provider}")
    
    # Show summary
    print(f"\n📊 Route Summary: {router.get_route_summary()}")