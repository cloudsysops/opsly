#!/usr/bin/env python3
"""
N8n Trigger - Dispara workflows de n8n
"""
import os
import aiohttp
from typing import Optional

class N8nTrigger:
    """Dispara workflows de n8n"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv(
            "N8N_BASE_URL", 
            "http://localhost:5678"
        )
        self.api_key = os.getenv("N8N_API_KEY", "")
    
    async def _request(self, method: str, path: str, data: dict = None) -> dict:
        """Hace request a n8n"""
        url = f"{self.base_url}/rest{path}"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method, url, json=data, headers=headers
            ) as resp:
                if resp.status >= 400:
                    return {
                        "success": False,
                        "error": f"HTTP {resp.status}",
                        "detail": await resp.text()
                    }
                return {"success": True, "data": await resp.json()}
    
    def get_workflows(self) -> list:
        """Lista workflows disponibles"""
        result = asyncio.run(self._request("GET", "/workflows"))
        return result.get("data", []) if result.get("success") else []
    
    def trigger_workflow(self, workflow_id: str, payload: dict) -> dict:
        """Dispara un workflow por ID"""
        return asyncio.run(self._request(
            "POST", 
            f"/webhooks/{workflow_id}",
            payload
        ))
    
    def trigger_by_name(self, workflow_name: str, payload: dict) -> dict:
        """Dispara workflow por nombre"""
        workflows = self.get_workflows()
        
        for wf in workflows:
            if wf.get('name', '').lower() == workflow_name.lower():
                return self.trigger_workflow(wf.get('id'), payload)
        
        return {
            "success": False,
            "error": f"Workflow '{workflow_name}' not found"
        }
    
    def list_active(self) -> list:
        """Lista workflows activos"""
        workflows = self.get_workflows()
        return [wf for wf in workflows if wf.get('active', False)]
    
    def get_status(self, workflow_id: str) -> dict:
        """Obtiene estado de un workflow"""
        return asyncio.run(self._request("GET", f"/workflows/{workflow_id}"))

if __name__ == "__main__":
    trigger = N8nTrigger()
    
    # Listar workflows
    print("Active workflows:", trigger.list_active())