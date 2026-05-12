#!/usr/bin/env python3
"""
Agent Pool Manager - Administra el pool de agentes disponibles
"""
import asyncio
import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class AgentInfo:
    """Información de un agente"""
    agent_id: str
    name: str
    type: str  # "cursor", "claude", "opencode", "ollama", "copilot"
    endpoint: str  # URL o command
    status: str  # "available", "busy", "offline", "error"
    max_concurrent: int
    current_load: int
    capabilities: list[str]
    cost_per_1k_tokens: float
    avg_latency_ms: int


class AgentPoolManager:
    """Gestiona el pool de agentes disponibles"""
    
    def __init__(self):
        self.config_file = os.path.expanduser("~/.opsly/agent_pool.json")
        self.load_config()
        self._health_check_tasks = {}
    
    def load_config(self):
        """Carga configuración del pool"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.agents = {a['agent_id']: a for a in data.get('agents', [])}
                self.active_assignments = data.get('assignments', {})
        else:
            # Default agents
            self.active_assignments = {}
            self.agents = {
                "cursor-local": {
                    "agent_id": "cursor-local",
                    "name": "Cursor IDE",
                    "type": "cursor",
                    "endpoint": "http://localhost:5001",
                    "status": "available",
                    "max_concurrent": 2,
                    "current_load": 0,
                    "capabilities": ["code_generation", "code_review", "refactoring"],
                    "cost_per_1k_tokens": 0.0,
                    "avg_latency_ms": 500
                },
                "claude-local": {
                    "agent_id": "claude-local",
                    "name": "Claude CLI",
                    "type": "claude",
                    "endpoint": "http://localhost:5002",
                    "status": "available",
                    "max_concurrent": 3,
                    "current_load": 0,
                    "capabilities": ["reasoning", "analysis", "planning", "code_generation"],
                    "cost_per_1k_tokens": 0.0,
                    "avg_latency_ms": 800
                },
                "opencode-local": {
                    "agent_id": "opencode-local",
                    "name": "OpenCode",
                    "type": "opencode",
                    "endpoint": "http://localhost:5004",
                    "status": "available",
                    "max_concurrent": 2,
                    "current_load": 0,
                    "capabilities": ["code_generation", "refactoring"],
                    "cost_per_1k_tokens": 0.0,
                    "avg_latency_ms": 400
                },
                "ollama-qwen": {
                    "agent_id": "ollama-qwen",
                    "name": "Ollama qwen2.5:7b",
                    "type": "ollama",
                    "endpoint": "http://100.80.41.29:11434",
                    "status": "available",
                    "max_concurrent": 5,
                    "current_load": 0,
                    "capabilities": ["reasoning", "planning", "code_generation"],
                    "cost_per_1k_tokens": 0.0,
                    "avg_latency_ms": 2000
                },
                "ollama-codellama": {
                    "agent_id": "ollama-codellama",
                    "name": "Ollama codellama:7b",
                    "type": "ollama",
                    "endpoint": "http://100.80.41.29:11434",
                    "status": "available",
                    "max_concurrent": 5,
                    "current_load": 0,
                    "capabilities": ["code_generation", "code_review"],
                    "cost_per_1k_tokens": 0.0,
                    "avg_latency_ms": 1800
                }
            }
            self.save_config()
    
    def save_config(self):
        """Guarda configuración del pool"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump({
                'agents': list(self.agents.values()),
                'assignments': self.active_assignments,
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def get_agent(self, agent_id: str) -> Optional[dict]:
        """Obtiene información de un agente"""
        return self.agents.get(agent_id)
    
    def find_available_agent(self, capabilities: list[str], max_latency: Optional[int] = None) -> Optional[str]:
        """Encuentra un agente disponible que soporte las capacidades solicitadas"""
        candidates = []
        
        for agent_id, agent in self.agents.items():
            # Skip offline/error agents
            if agent['status'] not in ['available', 'busy']:
                continue
            
            # Check capacity
            if agent['current_load'] >= agent['max_concurrent']:
                continue
            
            # Check capabilities
            if not all(cap in agent['capabilities'] for cap in capabilities):
                continue
            
            # Check latency
            if max_latency and agent['avg_latency_ms'] > max_latency:
                continue
            
            candidates.append((agent_id, agent['current_load'], agent['avg_latency_ms']))
        
        if not candidates:
            return None
        
        # Sort by load first, then latency
        candidates.sort(key=lambda x: (x[1], x[2]))
        return candidates[0][0]
    
    def reserve_agent(self, agent_id: str, task_id: str) -> bool:
        """Reserva un agente para una tarea"""
        if agent_id not in self.agents:
            return False
        
        agent = self.agents[agent_id]
        if agent['current_load'] >= agent['max_concurrent']:
            return False
        
        agent['current_load'] += 1
        if agent['current_load'] > 0:
            agent['status'] = 'busy'
        
        self.active_assignments[task_id] = {
            'agent_id': agent_id,
            'started_at': datetime.now().isoformat()
        }
        
        self.save_config()
        return True
    
    def release_agent(self, agent_id: str, task_id: str, success: bool = True):
        """Libera un agente después de una tarea"""
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            agent['current_load'] = max(0, agent['current_load'] - 1)
            
            if agent['current_load'] == 0:
                agent['status'] = 'available'
        
        if task_id in self.active_assignments:
            self.active_assignments[task_id]['completed_at'] = datetime.now().isoformat()
            self.active_assignments[task_id]['success'] = success
        
        self.save_config()
    
    async def health_check(self, agent_id: str) -> dict:
        """Verifica la salud de un agente"""
        agent = self.agents.get(agent_id)
        if not agent:
            return {"status": "not_found"}
        
        endpoint = agent['endpoint']
        
        try:
            if agent['type'] == 'ollama':
                # Check Ollama API
                result = subprocess.run(
                    ['curl', '-sf', f'{endpoint}/api/tags', '--max-time', '5'],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    agent['status'] = 'available'
                    return {"status": "healthy", "latency_ms": 100}
                else:
                    agent['status'] = 'offline'
                    return {"status": "unhealthy", "error": "No response"}
            
            elif agent['type'] in ['cursor', 'claude', 'opencode']:
                # Check HTTP endpoint
                result = subprocess.run(
                    ['curl', '-sf', f'{endpoint}/health', '--max-time', '3'],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    agent['status'] = 'available'
                    return {"status": "healthy", "latency_ms": 50}
                else:
                    agent['status'] = 'offline'
                    return {"status": "unhealthy", "error": "No response"}
            
        except Exception as e:
            agent['status'] = 'error'
            return {"status": "error", "error": str(e)}
        
        self.save_config()
        return {"status": agent['status']}
    
    async def check_all_agents(self):
        """Verifica todos los agentes"""
        tasks = []
        for agent_id in self.agents:
            tasks.append(self.health_check(agent_id))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        summary = {"healthy": 0, "unhealthy": 0, "total": len(self.agents)}
        for result in results:
            if isinstance(result, dict):
                if result.get('status') == 'healthy':
                    summary['healthy'] += 1
                else:
                    summary['unhealthy'] += 1
        
        return summary
    
    def get_pool_status(self) -> dict:
        """Obtiene estado del pool"""
        total_load = sum(a['current_load'] for a in self.agents.values())
        max_load = sum(a['max_concurrent'] for a in self.agents.values())
        
        status_by_type = {}
        for agent in self.agents.values():
            t = agent['type']
            if t not in status_by_type:
                status_by_type[t] = {"available": 0, "busy": 0, "offline": 0}
            status_by_type[t][agent['status']] += 1
        
        return {
            "total_agents": len(self.agents),
            "total_load": total_load,
            "max_load": max_load,
            "utilization_percent": (total_load / max_load * 100) if max_load > 0 else 0,
            "by_type": status_by_type,
            "assignments": len(self.active_assignments)
        }
    
    def add_agent(self, agent_config: dict) -> bool:
        """Añade un nuevo agente al pool"""
        agent_id = agent_config.get('agent_id')
        if not agent_id or agent_id in self.agents:
            return False
        
        self.agents[agent_id] = {
            **agent_config,
            "current_load": 0,
            "status": "available"
        }
        self.save_config()
        return True
    
    def remove_agent(self, agent_id: str) -> bool:
        """Elimina un agente del pool"""
        if agent_id in self.agents:
            del self.agents[agent_id]
            self.save_config()
            return True
        return False
    
    def dashboard(self) -> str:
        """Genera dashboard del pool"""
        status = self.get_pool_status()
        
        lines = ["=" * 60]
        lines.append("AGENT POOL DASHBOARD")
        lines.append("=" * 60)
        
        lines.append(f"\n📊 Pool Status:")
        lines.append(f"   Total Agents: {status['total_agents']}")
        lines.append(f"   Load: {status['total_load']}/{status['max_load']} ({status['utilization_percent']:.1f}%)")
        lines.append(f"   Active Assignments: {status['assignments']}")
        
        lines.append(f"\n🤖 Agents:")
        for agent_id, agent in self.agents.items():
            load_bar = "█" * agent['current_load'] + "░" * (agent['max_concurrent'] - agent['current_load'])
            status_icon = {
                "available": "✅",
                "busy": "🔄",
                "offline": "❌",
                "error": "⚠️"
            }.get(agent['status'], "❓")
            
            lines.append(f"   {status_icon} {agent['name']} ({agent['type']})")
            lines.append(f"      Load: {load_bar} | Latency: {agent['avg_latency_ms']}ms")
        
        lines.append("\n" + "=" * 60)
        
        return "\n".join(lines)


if __name__ == "__main__":
    manager = AgentPoolManager()
    
    # Check all agents
    print("🔍 Checking all agents...")
    result = asyncio.run(manager.check_all_agents())
    print(f"Results: {result}")
    
    # Show dashboard
    print(manager.dashboard())
    
    # Test find available
    agent = manager.find_available_agent(["code_generation"])
    print(f"\n🎯 Best agent for code_generation: {agent}")