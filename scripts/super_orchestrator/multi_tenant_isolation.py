#!/usr/bin/env python3
"""
Multi-tenant Isolation Module
Ensures data and resource separation between tenants
"""
import os
import sys
import json
import hashlib
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional, Dict, List
from enum import Enum

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TenantRole(Enum):
    """Tenant role types"""
    OWNER = "owner"
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class ResourceType(Enum):
    """Resource types that can be isolated"""
    JOB = "job"
    METRICS = "metrics"
    FILES = "files"
    AGENTS = "agents"
    API_KEYS = "api_keys"
    SCHEDULED_TASKS = "scheduled_tasks"


@dataclass
class Tenant:
    """Tenant configuration"""
    slug: str
    name: str
    plan: str  # startup, business, enterprise
    role: str = "owner"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict = field(default_factory=dict)
    limits: Dict = field(default_factory=dict)


@dataclass
class IsolationPolicy:
    """Policy for resource isolation"""
    resource_type: ResourceType
    enforce_strict: bool = True
    max_per_tenant: Optional[int] = None
    rate_limit_per_minute: Optional[int] = None


class MultiTenantIsolation:
    """Manages multi-tenant isolation"""
    
    def __init__(self):
        self.config_file = os.path.expanduser("~/.opsly/tenants.json")
        self.policies_file = os.path.expanduser("~/.opsly/isolation_policies.json")
        self.load_config()
    
    def load_config(self):
        """Load tenant configuration"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.tenants = {t['slug']: Tenant(**t) for t in data.get('tenants', [])}
        else:
            self.tenants = self._default_tenants()
        
        if os.path.exists(self.policies_file):
            with open(self.policies_file, 'r') as f:
                data = json.load(f)
                self.policies = {ResourceType(p['resource_type']): p for p in data.get('policies', [])}
        else:
            self.policies = self._default_policies()
        
        self.save_config()
    
    def save_config(self):
        """Save configuration"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        
        with open(self.config_file, 'w') as f:
            json.dump({
                'tenants': [vars(t) for t in self.tenants.values()],
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
        
        with open(self.policies_file, 'w') as f:
            json.dump({
                'policies': [{'resource_type': k.value, **v} for k, v in self.policies.items()],
                'last_updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def _default_tenants(self) -> Dict[str, Tenant]:
        """Default tenants"""
        return {
            'opsly': Tenant(
                slug='opsly',
                name='Opsly Platform',
                plan='enterprise',
                limits={'max_jobs_per_hour': 1000, 'max_agents': 50}
            ),
            'smiletripcare': Tenant(
                slug='smiletripcare',
                name='SmileTripCare',
                plan='business',
                limits={'max_jobs_per_hour': 100, 'max_agents': 10}
            )
        }
    
    def _default_policies(self) -> Dict[ResourceType, dict]:
        """Default isolation policies"""
        return {
            ResourceType.JOB: {'resource_type': ResourceType.JOB, 'enforce_strict': True, 'max_per_tenant': None, 'rate_limit_per_minute': 60},
            ResourceType.METRICS: {'resource_type': ResourceType.METRICS, 'enforce_strict': True, 'max_per_tenant': None, 'rate_limit_per_minute': 120},
            ResourceType.AGENTS: {'resource_type': ResourceType.AGENTS, 'enforce_strict': True, 'max_per_tenant': 20, 'rate_limit_per_minute': 30},
            ResourceType.API_KEYS: {'resource_type': ResourceType.API_KEYS, 'enforce_strict': True, 'max_per_tenant': 10, 'rate_limit_per_minute': None},
            ResourceType.SCHEDULED_TASKS: {'resource_type': ResourceType.SCHEDULED_TASKS, 'enforce_strict': True, 'max_per_tenant': 20, 'rate_limit_per_minute': 10},
        }
    
    def get_tenant(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        return self.tenants.get(slug)
    
    def add_tenant(self, tenant: Tenant):
        """Add a new tenant"""
        self.tenants[tenant.slug] = tenant
        self.save_config()
    
    def remove_tenant(self, slug: str):
        """Remove a tenant"""
        if slug in self.tenants:
            del self.tenants[slug]
            self.save_config()
    
    def isolation_key(self, tenant_slug: str, resource_type: ResourceType, resource_id: str = None) -> str:
        """Generate isolation key for a resource"""
        data = f"{tenant_slug}:{resource_type.value}:{resource_id or ''}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def check_access(self, tenant_slug: str, resource_type: ResourceType, action: str = 'read') -> tuple:
        """Check if tenant has access to resource"""
        tenant = self.get_tenant(tenant_slug)
        
        if not tenant:
            return False, f"Unknown tenant: {tenant_slug}"
        
        policy = self.policies.get(resource_type)
        if not policy:
            return True, "No policy defined"
        
        # Check plan-based limits
        plan_limits = tenant.limits
        max_jobs = plan_limits.get('max_jobs_per_hour')
        
        if resource_type == ResourceType.JOB and max_jobs:
            # Would need to track actual usage
            # For now, allow
            pass
        
        return True, "OK"
    
    def get_tenant_namespace(self, tenant_slug: str) -> str:
        """Get namespace prefix for tenant resources"""
        return f"opsly:{tenant_slug}"
    
    def filter_by_tenant(self, items: List[dict], tenant_slug: str, resource_key: str = 'tenant_slug') -> List[dict]:
        """Filter items by tenant"""
        return [item for item in items if item.get(resource_key) == tenant_slug]
    
    def get_all_tenants(self) -> List[dict]:
        """Get all tenants"""
        return [vars(t) for t in self.tenants.values()]
    
    def get_quota_info(self, tenant_slug: str) -> dict:
        """Get quota information for tenant"""
        tenant = self.get_tenant(tenant_slug)
        
        if not tenant:
            return {'error': 'Tenant not found'}
        
        return {
            'tenant': tenant_slug,
            'plan': tenant.plan,
            'limits': tenant.limits,
            'role': tenant.role,
            'created_at': tenant.created_at
        }


class TenantResourceTracker:
    """Tracks resource usage per tenant"""
    
    def __init__(self, isolation: MultiTenantIsolation):
        self.isolation = isolation
        self.usage_file = os.path.expanduser("~/.opsly/tenant_usage.json")
        self.load_usage()
    
    def load_usage(self):
        """Load usage data"""
        if os.path.exists(self.usage_file):
            with open(self.usage_file, 'r') as f:
                self.usage = json.load(f)
        else:
            self.usage = {}
        self.save_usage()
    
    def save_usage(self):
        """Save usage data"""
        os.makedirs(os.path.dirname(self.usage_file), exist_ok=True)
        with open(self.usage_file, 'w') as f:
            json.dump(self.usage, f, indent=2)
    
    def record_usage(self, tenant_slug: str, resource_type: ResourceType, amount: int = 1):
        """Record resource usage"""
        if tenant_slug not in self.usage:
            self.usage[tenant_slug] = {}
        
        key = resource_type.value
        if key not in self.usage[tenant_slug]:
            self.usage[tenant_slug][key] = 0
        
        self.usage[tenant_slug][key] += amount
        self.save_usage()
    
    def get_usage(self, tenant_slug: str) -> dict:
        """Get usage for tenant"""
        return self.usage.get(tenant_slug, {})
    
    def check_limit(self, tenant_slug: str, resource_type: ResourceType) -> tuple:
        """Check if tenant has hit limit"""
        tenant = self.isolation.get_tenant(tenant_slug)
        if not tenant:
            return True, "Tenant not found"
        
        policy = self.isolation.policies.get(resource_type)
        if not policy or not policy.get('max_per_tenant'):
            return True, "No limit"
        
        current = self.usage.get(tenant_slug, {}).get(resource_type.value, 0)
        max_allowed = policy['max_per_tenant']
        
        if current >= max_allowed:
            return False, f"Limit reached: {current}/{max_allowed}"
        
        return True, f"Available: {max_allowed - current}/{max_allowed}"


if __name__ == "__main__":
    # Test multi-tenant isolation
    print("🧪 Testing MultiTenantIsolation...")
    isolation = MultiTenantIsolation()
    
    # List tenants
    print(f"  Tenants: {[t.slug for t in isolation.tenants.values()]}")
    
    # Check access
    can, msg = isolation.check_access('opsly', ResourceType.JOB)
    print(f"  opsly -> JOB: {can} - {msg}")
    
    # Get namespace
    ns = isolation.get_tenant_namespace('smiletripcare')
    print(f"  smiletripcare namespace: {ns}")
    
    # Isolation key
    key = isolation.isolation_key('opsly', ResourceType.JOB, 'job-001')
    print(f"  Isolation key: {key}")
    
    # Quota info
    quota = isolation.get_quota_info('opsly')
    print(f"  opsly quota: {quota}")
    
    # Test resource tracker
    print("\n🧪 Testing TenantResourceTracker...")
    tracker = TenantResourceTracker(isolation)
    
    tracker.record_usage('opsly', ResourceType.JOB, 5)
    tracker.record_usage('opsly', ResourceType.JOB, 3)
    
    usage = tracker.get_usage('opsly')
    print(f"  opsly usage: {usage}")
    
    can, msg = tracker.check_limit('opsly', ResourceType.JOB)
    print(f"  opsly limit check: {can} - {msg}")