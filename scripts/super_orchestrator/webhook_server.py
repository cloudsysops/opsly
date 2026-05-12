#!/usr/bin/env python3
"""
Webhook Trigger Server - HTTP endpoints to execute Super Orchestrator jobs
"""
import os
import sys
import json
import asyncio
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from datetime import datetime
import ssl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from super_orchestrator.provider_selector import ProviderSelector
from super_orchestrator.performance_tracker import PerformanceTracker
from super_orchestrator.budget_controller import BudgetController
from super_orchestrator.task_routing import TaskRouter, TaskRequirements
from super_orchestrator.agent_pool_manager import AgentPoolManager
from super_orchestrator.health_monitor import HealthMonitor
from super_orchestrator.auto_evolution import AutoEvolution


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP handler for webhook triggers"""
    
    # Shared state
    jobs = {}
    selector = ProviderSelector()
    tracker = PerformanceTracker()
    budget = BudgetController()
    router = TaskRouter()
    pool_manager = AgentPoolManager()
    health_monitor = HealthMonitor()
    evol = AutoEvolution()
    
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()
    
    def _read_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            return self.rfile.read(content_length).decode('utf-8')
        return None
    
    def _send_json(self, data, status=200):
        self._set_headers(status)
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self._set_headers(204)
    
    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        
        if path == '/health':
            self._send_json({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'service': 'super-orchestrator-webhook'
            })
        
        elif path == '/jobs':
            # List all jobs
            self._send_json({
                'jobs': list(self.jobs.values()),
                'total': len(self.jobs)
            })
        
        elif path == '/jobs/' + parsed.path.split('/jobs/')[-1]:
            # Get specific job
            job_id = parsed.path.split('/')[-1]
            job = self.jobs.get(job_id)
            if job:
                self._send_json(job)
            else:
                self._send_json({'error': 'Job not found'}, 404)
        
        elif path == '/metrics':
            # Get performance metrics
            stats = self.tracker.get_all_stats()
            pool_status = self.pool_manager.get_pool_status()
            budget_summary = self.budget.get_all_tenants_summary()
            
            self._send_json({
                'performance': stats,
                'agent_pool': pool_status,
                'budgets': budget_summary,
                'timestamp': datetime.now().isoformat()
            })
        
        elif path == '/providers':
            # Get provider status
            metrics = self.selector.get_metrics()
            self._send_json(metrics)
        
        elif path == '/routing':
            # Get routing summary
            summary = self.router.get_route_summary()
            self._send_json(summary)
        
        elif path == '/health-check':
            # Get system health
            health = self.health_monitor.check_all()
            self._send_json(health)
        
        elif path == '/evolution':
            # Get evolution ideas
            pending = self.evol.get_pending_ideas()
            self._send_json({'pending_ideas': pending})
        
        elif path == '/dashboard':
            # Get full dashboard
            perf_stats = self.tracker.get_all_stats()
            pool_status = self.pool_manager.get_pool_status()
            health = self.health_monitor.check_all()
            budget_summary = self.budget.get_all_tenants_summary()
            
            self._send_json({
                'performance': perf_stats,
                'agent_pool': pool_status,
                'health': health,
                'budgets': budget_summary,
                'timestamp': datetime.now().isoformat()
            })
        
        else:
            self._send_json({'error': 'Not found'}, 404)
    
    def do_POST(self):
        """Handle POST requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        body = self._read_body()
        data = json.loads(body) if body else {}
        
        if path == '/jobs':
            # Create new job
            job_id = str(uuid.uuid4())[:8]
            
            # Extract job data
            prompt = data.get('prompt')
            task_type = data.get('task_type', 'general')
            tenant_slug = data.get('tenant_slug', 'opsly')
            initiated_by = data.get('initiated_by', 'system')
            context = data.get('context', {})
            capabilities = data.get('capabilities', [])
            
            if not prompt:
                self._send_json({'error': 'prompt is required'}, 400)
                return
            
            # Check budget
            can_spend, budget_msg = self.budget.can_spend(tenant_slug, 1.0)
            if not can_spend:
                self._send_json({'error': f'Budget exceeded: {budget_msg}'}, 402)
                return
            
            # Select provider
            provider = self.selector.select(prompt)
            
            # Route task
            req = TaskRequirements(
                task_type=task_type,
                complexity=context.get('complexity', 'medium'),
                urgency=context.get('urgency', 'medium'),
                estimated_tokens=len(prompt) // 4
            )
            routed_provider = self.router.route(req)
            
            # Find agent
            agent = self.pool_manager.find_available_agent(capabilities)
            
            # Create job
            job = {
                'job_id': job_id,
                'prompt': prompt,
                'task_type': task_type,
                'tenant_slug': tenant_slug,
                'initiated_by': initiated_by,
                'provider_selected': provider,
                'provider_routed': routed_provider,
                'agent_assigned': agent,
                'status': 'queued',
                'created_at': datetime.now().isoformat(),
                'context': context
            }
            
            self.jobs[job_id] = job
            
            # Simulate async execution
            threading.Thread(
                target=self._execute_job,
                args=(job_id,),
                daemon=True
            ).start()
            
            self._send_json({
                'job_id': job_id,
                'status': 'queued',
                'provider': provider,
                'routed_to': routed_provider,
                'agent': agent,
                'budget_check': budget_msg
            }, 202)
        
        elif path == '/jobs/cancel':
            # Cancel a job
            job_id = data.get('job_id')
            if job_id in self.jobs:
                self.jobs[job_id]['status'] = 'cancelled'
                self.jobs[job_id]['cancelled_at'] = datetime.now().isoformat()
                self._send_json({'job_id': job_id, 'status': 'cancelled'})
            else:
                self._send_json({'error': 'Job not found'}, 404)
        
        elif path == '/budget/set':
            # Set budget for tenant
            tenant = data.get('tenant_slug')
            amount = data.get('monthly_budget_usd')
            if tenant and amount:
                self.budget.set_budget(tenant, float(amount))
                self._send_json({'status': 'ok', 'tenant': tenant, 'budget': amount})
            else:
                self._send_json({'error': 'tenant_slug and monthly_budget_usd required'}, 400)
        
        elif path == '/evolution/analyze':
            # Trigger evolution analysis
            ideas = self.evol.analyze_and_generate_ideas()
            self._send_json({'generated': len(ideas), 'ideas': ideas})
        
        elif path == '/evolution/apply':
            # Apply an evolution idea
            idea_id = data.get('idea_id')
            if idea_id:
                result = self.evol.apply_idea(idea_id)
                self._send_json(result)
            else:
                self._send_json({'error': 'idea_id required'}, 400)
        
        else:
            self._send_json({'error': 'Not found'}, 404)
    
    def _execute_job(self, job_id):
        """Execute a job asynchronously"""
        import time
        
        job = self.jobs.get(job_id)
        if not job:
            return
        
        try:
            # Update status to running
            job['status'] = 'running'
            job['started_at'] = datetime.now().isoformat()
            
            # Simulate execution
            time.sleep(1)  # In real impl, call actual provider
            
            # Record performance
            self.tracker.record(
                provider_id=job['provider_routed'],
                task_type=job['task_type'],
                latency_ms=1500,
                success=True,
                cost=0.0
            )
            
            # Record cost
            self.budget.record_cost(
                tenant_slug=job['tenant_slug'],
                cost_usd=0.01,
                provider=job['provider_routed'],
                task_type=job['task_type'],
                request_id=job_id
            )
            
            # Update job status
            job['status'] = 'completed'
            job['completed_at'] = datetime.now().isoformat()
            job['result'] = {'output': f'Executed: {job["prompt"][:50]}...'}
            
        except Exception as e:
            job['status'] = 'failed'
            job['completed_at'] = datetime.now().isoformat()
            job['error'] = str(e)
    
    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {args[0]}")


def start_server(port=8080, ssl_enabled=False, cert_file=None, key_file=None):
    """Start the webhook server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebhookHandler)
    
    if ssl_enabled and cert_file and key_file:
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_file, key_file)
        httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
        protocol = 'HTTPS'
    else:
        protocol = 'HTTP'
    
    print(f"🚀 Super Orchestrator Webhook Server")
    print(f"   {protocol}://localhost:{port}")
    print(f"   Endpoints:")
    print(f"   - GET  /health          - Health check")
    print(f"   - GET  /metrics         - Performance metrics")
    print(f"   - GET  /dashboard       - Full dashboard")
    print(f"   - GET  /providers       - Provider status")
    print(f"   - POST /jobs            - Create job")
    print(f"   - POST /budget/set      - Set budget")
    print(f"   - POST /evolution/analyze - Run evolution")
    
    httpd.serve_forever()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Super Orchestrator Webhook Server')
    parser.add_argument('--port', type=int, default=8080, help='Port to listen on')
    parser.add_argument('--ssl', action='store_true', help='Enable SSL')
    parser.add_argument('--cert', help='SSL certificate file')
    parser.add_argument('--key', help='SSL key file')
    
    args = parser.parse_args()
    
    start_server(
        port=args.port,
        ssl_enabled=args.ssl,
        cert_file=args.cert,
        key_file=args.key
    )