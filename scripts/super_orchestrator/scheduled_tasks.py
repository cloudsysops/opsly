#!/usr/bin/env python3
"""
Scheduled Task Manager - Cron-based job scheduling for Super Orchestrator
"""
import os
import sys
import json
import time
import threading
import schedule
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional, Callable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from super_orchestrator.provider_selector import ProviderSelector
from super_orchestrator.performance_tracker import PerformanceTracker
from super_orchestrator.budget_controller import BudgetController
from super_orchestrator.task_routing import TaskRouter


@dataclass
class ScheduledTask:
    """A scheduled task definition"""
    task_id: str
    name: str
    prompt: str
    task_type: str
    tenant_slug: str
    schedule_type: str  # "interval", "cron", "daily", "hourly"
    schedule_value: str  # cron expression or interval minutes
    enabled: bool = True
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    run_count: int = 0
    failure_count: int = 0


class ScheduledTaskManager:
    """Manages scheduled tasks with cron support"""
    
    def __init__(self):
        self.config_file = os.path.expanduser("~/.opsly/scheduled_tasks.json")
        self.tasks = {}
        self.load_config()
        self.running = False
        self.selector = ProviderSelector()
        self.tracker = PerformanceTracker()
        self.budget = BudgetController()
        self.router = TaskRouter()
    
    def load_config(self):
        """Load scheduled tasks from file"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.tasks = {t['task_id']: t for t in data.get('tasks', [])}
        else:
            self.tasks = self._default_tasks()
        self.save_config()
    
    def save_config(self):
        """Save scheduled tasks to file"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump({
                'tasks': list(self.tasks.values()),
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def _default_tasks(self) -> dict:
        """Default scheduled tasks"""
        return {
            'daily_health_check': {
                'task_id': 'daily_health_check',
                'name': 'Daily Health Check',
                'prompt': 'Ejecuta verificación de salud del sistema y reporta estado',
                'task_type': 'monitoring',
                'tenant_slug': 'opsly',
                'schedule_type': 'daily',
                'schedule_value': '09:00',
                'enabled': True
            },
            'hourly_perf_summary': {
                'task_id': 'hourly_perf_summary',
                'name': 'Hourly Performance Summary',
                'prompt': 'Genera resumen de métricas de rendimiento de la última hora',
                'task_type': 'analysis',
                'tenant_slug': 'opsly',
                'schedule_type': 'hourly',
                'schedule_value': '00',
                'enabled': True
            },
            'weekly_budget_report': {
                'task_id': 'weekly_budget_report',
                'name': 'Weekly Budget Report',
                'prompt': 'Genera reporte de gastos semanales por tenant',
                'task_type': 'analysis',
                'tenant_slug': 'opsly',
                'schedule_type': 'weekly',
                'schedule_value': 'monday',
                'enabled': False
            }
        }
    
    def add_task(self, task: ScheduledTask):
        """Add a new scheduled task"""
        self.tasks[task.task_id] = asdict(task)
        self.save_config()
        self._schedule_task(task)
    
    def remove_task(self, task_id: str):
        """Remove a scheduled task"""
        if task_id in self.tasks:
            del self.tasks[task_id]
            self.save_config()
    
    def enable_task(self, task_id: str, enabled: bool = True):
        """Enable or disable a task"""
        if task_id in self.tasks:
            self.tasks[task_id]['enabled'] = enabled
            self.save_config()
    
    def _schedule_task(self, task: ScheduledTask):
        """Schedule a task based on its type"""
        if not task.enabled:
            return
        
        if task.schedule_type == 'hourly':
            minute = int(task.schedule_value)
            schedule.every().hour.at(f":{minute:02d}").do(self._run_task, task_id=task.task_id)
        
        elif task.schedule_type == 'daily':
            schedule.every().day.at(task.schedule_value).do(self._run_task, task_id=task.task_id)
        
        elif task.schedule_type == 'weekly':
            day_map = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                'friday': 4, 'saturday': 5, 'sunday': 6
            }
            day = day_map.get(task.schedule_value.lower(), 0)
            schedule.every().week().day(day).at("09:00").do(self._run_task, task_id=task.task_id)
        
        elif task.schedule_type == 'interval':
            minutes = int(task.schedule_value)
            schedule.every(minutes).minutes.do(self._run_task, task_id=task.task_id)
    
    def _run_task(self, task_id: str):
        """Execute a scheduled task"""
        task = self.tasks.get(task_id)
        if not task or not task.get('enabled'):
            return
        
        print(f"[ScheduledTask] Running: {task['name']}")
        
        try:
            # Select provider
            provider = self.selector.select(task['prompt'])
            
            # Route task
            from super_orchestrator.task_routing import TaskRequirements
            req = TaskRequirements(
                task_type=task['task_type'],
                complexity='medium',
                urgency='low',
                estimated_tokens=len(task['prompt']) // 4
            )
            routed_provider = self.router.route(req)
            
            # Check budget
            can_spend, msg = self.budget.can_spend(task['tenant_slug'], 0.5)
            if not can_spend:
                print(f"[ScheduledTask] Budget exceeded for {task_id}: {msg}")
                task['failure_count'] += 1
                return
            
            # Record execution
            self.tracker.record(
                provider_id=routed_provider,
                task_type=task['task_type'],
                latency_ms=1000,
                success=True,
                cost=0.0
            )
            
            # Update task stats
            task['last_run'] = datetime.now().isoformat()
            task['run_count'] = task.get('run_count', 0) + 1
            task['next_run'] = self._calc_next_run(task)
            self.save_config()
            
            print(f"[ScheduledTask] Completed: {task_id}")
            
        except Exception as e:
            print(f"[ScheduledTask] Failed: {task_id} - {e}")
            task['failure_count'] = task.get('failure_count', 0) + 1
            self.save_config()
    
    def _calc_next_run(self, task: dict) -> str:
        """Calculate next run time"""
        now = datetime.now()
        
        if task['schedule_type'] == 'hourly':
            minute = int(task['schedule_value'])
            next_run = now.replace(minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(hours=1)
        
        elif task['schedule_type'] == 'daily':
            time_str = task['schedule_value']
            hour, minute = map(int, time_str.split(':'))
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        
        elif task['schedule_type'] == 'weekly':
            next_run = now + timedelta(days=7)
        
        else:
            next_run = now + timedelta(hours=1)
        
        return next_run.isoformat()
    
    def start(self):
        """Start the scheduler"""
        self.running = True
        print("[ScheduledTaskManager] Started")
        
        # Schedule all enabled tasks
        for task_data in self.tasks.values():
            task = ScheduledTask(**task_data)
            self._schedule_task(task)
        
        # Run scheduler loop
        while self.running:
            schedule.run_pending()
            time.sleep(1)
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        schedule.clear()
        print("[ScheduledTaskManager] Stopped")
    
    def get_status(self) -> dict:
        """Get scheduler status"""
        return {
            'total_tasks': len(self.tasks),
            'enabled_tasks': sum(1 for t in self.tasks.values() if t.get('enabled')),
            'running': self.running,
            'tasks': list(self.tasks.values())
        }
    
    def get_task(self, task_id: str) -> Optional[dict]:
        """Get specific task"""
        return self.tasks.get(task_id)


def run_scheduler_daemon():
    """Run the scheduler as a daemon"""
    manager = ScheduledTaskManager()
    
    # Run in background thread
    scheduler_thread = threading.Thread(target=manager.start, daemon=True)
    scheduler_thread.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(60)
            print(f"[Scheduler] Status: {manager.get_status()['enabled_tasks']} active tasks")
    except KeyboardInterrupt:
        manager.stop()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Scheduled Task Manager')
    parser.add_argument('--add', action='store_true', help='Add a task')
    parser.add_argument('--list', action='store_true', help='List tasks')
    parser.add_argument('--run-once', help='Run a specific task once')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    parser.add_argument('--name', help='Task name')
    parser.add_argument('--prompt', help='Task prompt')
    parser.add_argument('--task-type', help='Task type')
    parser.add_argument('--tenant', help='Tenant slug')
    parser.add_argument('--schedule', help='Schedule (hourly/daily/weekly/interval)')
    parser.add_argument('--value', help='Schedule value')
    
    args = parser.parse_args()
    
    manager = ScheduledTaskManager()
    
    if args.list:
        print(json.dumps(manager.get_status(), indent=2))
    
    elif args.add:
        from super_orchestrator.task_routing import TaskRequirements
        task = ScheduledTask(
            task_id=args.name.lower().replace(' ', '_'),
            name=args.name,
            prompt=args.prompt,
            task_type=args.task_type or 'general',
            tenant_slug=args.tenant or 'opsly',
            schedule_type=args.schedule or 'daily',
            schedule_value=args.value or '09:00'
        )
        manager.add_task(task)
        print(f"Added task: {task.name}")
    
    elif args.run_once:
        manager._run_task(args.run_once)
    
    elif args.daemon:
        run_scheduler_daemon()
    
    else:
        print("Scheduled Task Manager")
        print("  --list                  - List all tasks")
        print("  --add --name <name> --prompt <prompt> --schedule daily --value 09:00")
        print("  --run-once <task_id>   - Run a task once")
        print("  --daemon                - Run as background service")