#!/usr/bin/env python3
"""
Prompt Controller - Parser y ejecutor de prompts
"""
import asyncio
import json
import os
import re
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

from .provider_selector import ProviderSelector

@dataclass
class ParsedPrompt:
    """Prompt parseado con intención y parámetros"""
    original: str
    intent: str
    task_type: str
    parameters: dict
    should_commit: bool
    should_notify: bool
    should_trigger_n8n: bool

class PromptController:
    """Controla el flujo de prompts del usuario"""
    
    def __init__(self):
        self.selector = ProviderSelector()
        self.history: list[dict] = []
        
    def parse(self, prompt: str) -> ParsedPrompt:
        """Parsea el prompt y extrae intención y parámetros"""
        prompt_lower = prompt.lower()
        
        # Detectar intención
        intents = {
            'code_review': ['review', 'revisar', 'audit', 'analizar código', 'revis'],
            'code_generation': ['genera', 'create', 'implement', 'build', 'escribir', 'genera código'],
            'analysis': ['analiza', 'analisis', 'analyze', 'report', 'reporte'],
            'planning': ['plan', 'planning', 'diseña', 'diseñar', 'estrategia'],
            'monitoring': ['check', 'monitor', 'health', 'status', 'verificar'],
            'testing': ['test', 'prueba', 'testing', 'validar'],
            'deployment': ['deploy', 'desplegar', 'release', 'publicar'],
            'documentation': ['doc', 'documenta', 'readme', 'documentación']
        }
        
        intent = 'general'
        for intent_name, keywords in intents.items():
            if any(k in prompt_lower for k in keywords):
                intent = intent_name
                break
        
        # Extraer parámetros
        params = {}
        
        # PR number
        pr_match = re.search(r'PR[#\s]*(\d+)', prompt, re.IGNORECASE)
        if pr_match:
            params['pr_number'] = pr_match.group(1)
            
        # Issue number
        issue_match = re.search(r'Issue[#\s]*(\d+)', prompt, re.IGNORECASE)
        if issue_match:
            params['issue_number'] = issue_match.group(1)
            
        # Tenant slug
        tenant_match = re.search(r'tenant[:\s]+(\w+)', prompt, re.IGNORECASE)
        if tenant_match:
            params['tenant_slug'] = tenant_match.group(1)
        
        # Detectar acciones
        should_commit = any(k in prompt_lower for k in ['commit', 'haz commit', 'make commit', 'guarda'])
        should_notify = any(k in prompt_lower for k in ['notify', 'notifica', 'alerta', 'discord'])
        should_trigger_n8n = any(k in prompt_lower for k in ['workflow', 'n8n', 'trigger', 'automatiza'])
        
        # Mapear intent a task_type
        task_type_map = {
            'code_review': 'code_review',
            'code_generation': 'code_generation',
            'analysis': 'analysis',
            'planning': 'planning',
            'monitoring': 'monitoring',
            'testing': 'general',
            'deployment': 'general',
            'documentation': 'general'
        }
        
        return ParsedPrompt(
            original=prompt,
            intent=intent,
            task_type=task_type_map.get(intent, 'general'),
            parameters=params,
            should_commit=should_commit,
            should_notify=should_notify,
            should_trigger_n8n=should_trigger_n8n
        )
    
    async def execute(self, prompt: str, context: Optional[dict] = None) -> dict:
        """Ejecuta un prompt parseado"""
        parsed = self.parse(prompt)
        
        # Seleccionar proveedor
        provider_id = self.selector.select(prompt)
        
        # Ejecutar
        result = await self.selector.execute(provider_id, prompt)
        
        # Guardar en historial
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "prompt": prompt,
            "parsed": {
                "intent": parsed.intent,
                "task_type": parsed.task_type,
                "parameters": parsed.parameters
            },
            "provider": provider_id,
            "result": result
        })
        
        response = {
            "success": result.get("success", False),
            "provider": provider_id,
            "intent": parsed.intent,
            "latency_ms": result.get("latency_ms", 0)
        }
        
        if result.get("success"):
            response["output"] = result.get("result", "")
            
            # Auto-commit si se solicitó
            if parsed.should_commit and result.get("result"):
                from .git_automation import GitAutomation
                git_auto = GitAutomation()
                commit_result = git_auto.auto_commit(
                    f"[Auto] {parsed.intent}: {prompt[:50]}",
                    context.get("branch") if context else None
                )
                response["commit"] = commit_result
            
            # Notificar si se solicitó
            if parsed.should_notify:
                response["notification"] = "queued"
                
            # Trigger n8n si se solicitó
            if parsed.should_trigger_n8n:
                from .n8n_trigger import N8nTrigger
                n8n = N8nTrigger()
                n8n_result = n8n.trigger_workflow(
                    f"prompt_{parsed.intent}",
                    {"prompt": prompt, "result": result.get("result")}
                )
                response["n8n"] = n8n_result
        else:
            response["error"] = result.get("error", "Unknown error")
            
        return response
    
    def get_history(self, limit: int = 10) -> list:
        """Obtiene historial de prompts"""
        return self.history[-limit:]
    
    def get_stats(self) -> dict:
        """Obtiene estadísticas de uso"""
        if not self.history:
            return {"total": 0}
        
        providers_used = {}
        intents_count = {}
        
        for entry in self.history:
            provider = entry.get("provider", "unknown")
            providers_used[provider] = providers_used.get(provider, 0) + 1
            
            intent = entry.get("parsed", {}).get("intent", "unknown")
            intents_count[intent] = intents_count.get(intent, 0) + 1
        
        return {
            "total": len(self.history),
            "by_provider": providers_used,
            "by_intent": intents_count
        }

if __name__ == "__main__":
    controller = PromptController()
    
    # Test
    result = asyncio.run(controller.execute(
        "Revisa el PR #456 y haz commit si está bien"
    ))
    print(json.dumps(result, indent=2))