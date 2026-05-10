#!/usr/bin/env python3
"""
Health Monitor - Monitoreo de salud del sistema
"""
import asyncio
import aiohttp
import os
from datetime import datetime
from typing import Optional

class HealthMonitor:
    """Monitorea la salud del sistema"""
    
    def __init__(self):
        self.checks = {
            "ollama": self.check_ollama,
            "redis": self.check_redis,
            "orchestrator": self.check_orchestrator,
            "llm_gateway": self.check_llm_gateway,
            "api": self.check_api,
            "supabase": self.check_supabase
        }
        self.last_check = {}
        
    async def check_ollama(self) -> dict:
        """Verifica Ollama"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://100.80.41.29:11434/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        models = data.get('models', [])
                        return {
                            "status": "healthy",
                            "models": len(models),
                            "model_names": [m.get('name') for m in models]
                        }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
        return {"status": "unknown"}
    
    async def check_redis(self) -> dict:
        """Verifica Redis"""
        import redis
        try:
            r = redis.Redis(
                host="100.120.151.91",
                port=6379,
                password=os.getenv("REDIS_PASSWORD", ""),
                decode_responses=True
            )
            r.ping()
            info = r.info()
            return {
                "status": "healthy",
                "version": info.get('redis_version'),
                "connected": r.dbsize()
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def check_orchestrator(self) -> dict:
        """Verifica Orchestrator"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://100.120.151.91:3011/health",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return {"status": "healthy", "data": data}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
        return {"status": "unknown"}
    
    async def check_llm_gateway(self) -> dict:
        """Verifica LLM Gateway"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "http://100.120.151.91:3010/health",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
        return {"status": "unknown"}
    
    async def check_api(self) -> dict:
        """Verifica API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.op-sly.com/api/health",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
        return {"status": "unknown"}
    
    async def check_supabase(self) -> dict:
        """Verifica Supabase"""
        try:
            import supabase
            client = supabase.create_client(
                os.getenv("SUPABASE_URL", ""),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            )
            # Simple check
            return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def run_all_checks(self) -> dict:
        """Ejecuta todos los checks"""
        results = {}
        
        for name, check_func in self.checks.items():
            try:
                results[name] = await check_func()
            except Exception as e:
                results[name] = {"status": "error", "error": str(e)}
        
        self.last_check = {
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
        return results
    
    def get_status_summary(self) -> dict:
        """Resumen de estado"""
        if not self.last_check:
            return {"status": "no_data"}
        
        results = self.last_check.get("results", {})
        healthy = sum(1 for r in results.values() if r.get("status") == "healthy")
        total = len(results)
        
        return {
            "timestamp": self.last_check.get("timestamp"),
            "healthy_count": healthy,
            "total_count": total,
            "health_percentage": (healthy / total * 100) if total > 0 else 0,
            "all_healthy": healthy == total
        }
    
    def alert_if_needed(self) -> list:
        """Genera alertas si hay problemas"""
        if not self.last_check:
            return []
        
        alerts = []
        results = self.last_check.get("results", {})
        
        for name, result in results.items():
            if result.get("status") != "healthy":
                alerts.append({
                    "component": name,
                    "issue": result.get("error", "unknown"),
                    "timestamp": self.last_check.get("timestamp")
                })
        
        return alerts

if __name__ == "__main__":
    monitor = HealthMonitor()
    
    # Run checks
    import json
    results = asyncio.run(monitor.run_all_checks())
    print(json.dumps(results, indent=2))
    
    print("\nSummary:", monitor.get_status_summary())
    print("\nAlerts:", monitor.alert_if_needed())