#!/usr/bin/env python3
"""
Provider Selector - Selecciona el mejor proveedor para cada tarea
"""
import json
import os
import asyncio
from datetime import datetime
from typing import Optional
import aiohttp
from dataclasses import dataclass, field

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config/provider-registry.json")

@dataclass
class ProviderMetrics:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_latency_ms: int = 0
    last_used: Optional[datetime] = None
    
    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests
    
    @property
    def avg_latency_ms(self) -> float:
        if self.total_requests == 0:
            return 0
        return self.total_latency_ms / self.total_requests

class ProviderSelector:
    """Selecciona el mejor proveedor basado en múltiples factores"""
    
    def __init__(self, config_path: str = CONFIG_PATH):
        with open(config_path, 'r') as f:
            data = json.load(f)
            self.providers = {p['id']: p for p in data['providers']}
            self.task_mapping = data['task_type_mapping']
        
        self.metrics: dict[str, ProviderMetrics] = {}
        self.cache: dict[str, tuple[str, datetime]] = {}
        self.cache_ttl = 3600
        
    def _get_task_type(self, prompt: str) -> str:
        """Infiere el tipo de tarea desde el prompt"""
        prompt_lower = prompt.lower()
        
        if any(k in prompt_lower for k in ['review', 'revisar', 'audit', 'analizar código']):
            return 'code_review'
        if any(k in prompt_lower for k in ['genera', 'create', 'implement', 'build', 'escribir código']):
            return 'code_generation'
        if any(k in prompt_lower for k in ['why', 'por qué', 'reason', 'explica']):
            return 'reasoning'
        if any(k in prompt_lower for k in ['plan', 'planning', 'diseña', 'estrategia']):
            return 'planning'
        if any(k in prompt_lower for k in ['check', 'health', 'status', 'monitor']):
            return 'monitoring'
        if any(k in prompt_lower for k in ['simple', 'quick', 'fast', 'rápido']):
            return 'fast_task'
        if any(k in prompt_lower for k in ['analyze', 'analiza', 'analisis', 'report']):
            return 'analysis'
            
        return 'general'
    
    def _calculate_score(self, provider_id: str, task_type: str) -> float:
        """Calcula score para un proveedor (0-1, mayor es mejor)"""
        provider = self.providers.get(provider_id)
        if not provider or provider.get('status') != 'active':
            return 0.0
            
        metrics = self.metrics.get(provider_id, ProviderMetrics())
        
        # Factores de selección
        success_weight = 0.35
        latency_weight = 0.25
        cost_weight = 0.20
        capability_weight = 0.20
        
        # Success rate
        success_score = metrics.success_rate if metrics.total_requests > 0 else 0.95
        
        # Latency (invertido - menor es mejor)
        latency = provider.get('latency_ms_avg', 2000)
        if latency < 500:
            latency_score = 1.0
        elif latency < 1000:
            latency_score = 0.8
        elif latency < 2000:
            latency_score = 0.6
        elif latency < 3000:
            latency_score = 0.4
        else:
            latency_score = 0.2
            
        # Costo (invertido - menor es mejor)
        cost = provider.get('cost_per_1k_input', 0) + provider.get('cost_per_1k_output', 0)
        if cost == 0:
            cost_score = 1.0
        elif cost < 1:
            cost_score = 0.8
        elif cost < 5:
            cost_score = 0.5
        else:
            cost_score = 0.2
            
        # Capability match
        capabilities = provider.get('capabilities', [])
        task_capabilities = self.task_mapping.get(task_type, ['general'])
        capability_score = 1.0 if any(cap in capabilities for cap in task_capabilities) else 0.3
        
        return (
            success_score * success_weight +
            latency_score * latency_weight +
            cost_score * cost_weight +
            capability_score * capability_weight
        )
    
    def select(self, prompt: str, force_provider: Optional[str] = None) -> str:
        """Selecciona el mejor proveedor para el prompt dado"""
        if force_provider and force_provider in self.providers:
            return force_provider
            
        # Verificar cache
        cache_key = f"{self._get_task_type(prompt)}"
        if cache_key in self.cache:
            cached_provider, cached_time = self.cache[cache_key]
            if (datetime.now() - cached_time).total_seconds() < self.cache_ttl:
                return cached_provider
        
        task_type = self._get_task_type(prompt)
        candidate_ids = self.task_mapping.get(task_type, ['ollama-qwen'])
        
        # Calcular scores
        best_provider = None
        best_score = -1
        
        for provider_id in candidate_ids:
            score = self._calculate_score(provider_id, task_type)
            if score > best_score:
                best_score = score
                best_provider = provider_id
        
        if best_provider:
            self.cache[cache_key] = (best_provider, datetime.now())
            
        return best_provider or 'ollama-qwen'
    
    async def execute(self, provider_id: str, prompt: str) -> dict:
        """Ejecuta prompt en proveedor seleccionado"""
        provider = self.providers.get(provider_id)
        if not provider:
            return {"error": f"Provider {provider_id} not found"}
        
        # Inicializar métricas si no existen
        if provider_id not in self.metrics:
            self.metrics[provider_id] = ProviderMetrics()
        
        metrics = self.metrics[provider_id]
        start_time = datetime.now()
        
        try:
            result = await self._call_provider(provider, prompt)
            metrics.successful_requests += 1
            metrics.last_used = datetime.now()
            
            return {
                "success": True,
                "provider": provider_id,
                "result": result,
                "latency_ms": int((datetime.now() - start_time).total_seconds() * 1000)
            }
        except Exception as e:
            metrics.failed_requests += 1
            return {
                "success": False,
                "provider": provider_id,
                "error": str(e)
            }
        finally:
            metrics.total_requests += 1
            metrics.total_latency_ms += int((datetime.now() - start_time).total_seconds() * 1000)
    
    async def _call_provider(self, provider: dict, prompt: str) -> str:
        """Llama al proveedor correspondiente"""
        ptype = provider.get('type')
        
        if ptype == 'local':
            return await self._call_ollama(provider, prompt)
        elif ptype == 'api':
            return await self._call_api(provider, prompt)
        else:
            return await self._call_local_agent(provider, prompt)
    
    async def _call_ollama(self, provider: dict, prompt: str) -> str:
        """Llama a Ollama local"""
        endpoint = provider.get('endpoint')
        model = provider.get('model')
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{endpoint}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                data = await resp.json()
                return data.get('response', '')
    
    async def _call_api(self, provider: dict, prompt: str) -> str:
        """Llama a API externa (Anthropic, DeepSeek, etc)"""
        endpoint = provider.get('endpoint')
        model = provider.get('model')
        
        headers = {"Content-Type": "application/json"}
        api_key = os.getenv(provider.get('api_key_env', '').replace('_API_KEY', '').upper())
        
        if provider_id := provider.get('id', ''):
            if 'anthropic' in provider_id:
                headers["x-api-key"] = api_key
                headers["anthropic-version"] = "2023-06-01"
                payload = {
                    "model": model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}]
                }
            else:
                headers["Authorization"] = f"Bearer {api_key}"
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1024
                }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{endpoint}/chat/completions",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                data = await resp.json()
                if 'anthropic' in provider.get('id', ''):
                    return data.get('content', [{}])[0].get('text', '')
                return data.get('choices', [{}])[0].get('message', {}).get('content', '')
    
    async def _call_local_agent(self, provider: dict, prompt: str) -> str:
        """Llama a agente local (Cursor, OpenCode, etc)"""
        endpoint = provider.get('endpoint')
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{endpoint}/execute",
                json={"prompt": prompt},
                timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                data = await resp.json()
                return data.get('result', '')
    
    def get_metrics(self, provider_id: Optional[str] = None) -> dict:
        """Obtiene métricas de proveedor(s)"""
        if provider_id:
            return {
                provider_id: {
                    "total_requests": self.metrics[provider_id].total_requests,
                    "success_rate": self.metrics[provider_id].success_rate,
                    "avg_latency_ms": self.metrics[provider_id].avg_latency_ms,
                    "last_used": self.metrics[provider_id].last_used
                }
            } if provider_id in self.metrics else {}
        
        return {
            pid: {
                "total_requests": m.total_requests,
                "success_rate": m.success_rate,
                "avg_latency_ms": m.avg_latency_ms,
                "last_used": m.last_used
            }
            for pid, m in self.metrics.items()
        }

if __name__ == "__main__":
    selector = ProviderSelector()
    
    # Ejemplo de uso
    prompt = "Revisa el código del PR #123 y haz commit si está bien"
    provider = selector.select(prompt)
    print(f"Proveedor seleccionado: {provider}")
    
    # Mostrar métricas
    print(f"Métricas: {selector.get_metrics()}")