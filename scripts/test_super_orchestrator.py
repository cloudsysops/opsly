#!/usr/bin/env python3
"""
Test script to add a Super Orchestrator job to the queue
"""
import os
import sys
import json

# Add to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'orchestrator', 'src'))

# We'll test by directly calling the Python integration instead
# since running the full orchestrator requires many dependencies

import asyncio
sys.path.insert(0, os.path.dirname(__file__))

from super_orchestrator.provider_selector import ProviderSelector
from super_orchestrator.performance_tracker import PerformanceTracker

def test_provider_selection():
    """Test provider selection"""
    print("🧪 Testing provider selection...")
    selector = ProviderSelector()
    
    test_cases = [
        "Genera código para una función que sume números",
        "Revisa el código y sugiere mejoras",
        "Analiza el rendimiento del sistema",
        "Planifica la arquitectura del proyecto"
    ]
    
    for prompt in test_cases:
        provider = selector.select(prompt)
        print(f"  Prompt: {prompt[:40]}...")
        print(f"  → Provider: {provider}")
        print()

def test_performance_tracking():
    """Test performance tracking"""
    print("🧪 Testing performance tracking...")
    tracker = PerformanceTracker()
    
    # Record some test data
    test_providers = ['ollama-qwen', 'ollama-codellama', 'cursor-local']
    test_tasks = ['code_generation', 'code_review', 'reasoning']
    
    for i in range(5):
        tracker.record(
            provider_id=test_providers[i % len(test_providers)],
            task_type=test_tasks[i % len(test_tasks)],
            latency_ms=1000 + (i * 200),
            success=i % 4 != 0,  # 75% success rate
            cost=0.0
        )
    
    print("  Recorded 5 test metrics")
    print(f"  Stats: {tracker.get_all_stats()}")
    print()

def test_agent_pool():
    """Test agent pool"""
    print("🧪 Testing agent pool...")
    from super_orchestrator.agent_pool_manager import AgentPoolManager
    
    manager = AgentPoolManager()
    
    # Find available agent for different capabilities
    test_capabilities = [
        ['code_generation'],
        ['reasoning'],
        ['code_generation', 'code_review']
    ]
    
    for caps in test_capabilities:
        agent = manager.find_available_agent(caps)
        print(f"  Capabilities {caps} → Agent: {agent}")
    
    print(f"  Pool status: {manager.get_pool_status()}")
    print()

def test_routing():
    """Test task routing"""
    print("🧪 Testing task routing...")
    from super_orchestrator.task_routing import TaskRouter, TaskRequirements
    
    router = TaskRouter()
    
    test_cases = [
        TaskRequirements('code_generation', 'simple', 'low', 500),
        TaskRequirements('code_generation', 'complex', 'high', 5000),
        TaskRequirements('analysis', 'medium', 'medium', 2000),
        TaskRequirements('planning', 'complex', 'high', 3000),
    ]
    
    for req in test_cases:
        provider = router.route(req)
        print(f"  {req.task_type} (complexity={req.complexity}, urgency={req.urgency}) → {provider}")
    
    print()

def test_budget():
    """Test budget controller"""
    print("🧪 Testing budget controller...")
    from super_orchestrator.budget_controller import BudgetController
    
    controller = BudgetController()
    
    # Check budget
    can, msg = controller.can_spend('opsly', 10.0)
    print(f"  Can spend $10 on opsly: {can} - {msg}")
    
    # Record a cost
    controller.record_cost('opsly', 2.50, 'ollama-qwen', 'code_generation', 'test-request-001')
    print("  Recorded cost: $2.50")
    
    # Check again
    can, msg = controller.can_spend('opsly', 10.0)
    print(f"  Can spend $10 on opsly: {can} - {msg}")
    
    print()

def main():
    print("=" * 60)
    print("SUPER ORCHESTRATOR v2 - INTEGRATION TESTS")
    print("=" * 60)
    print()
    
    try:
        test_provider_selection()
        test_performance_tracking()
        test_agent_pool()
        test_routing()
        test_budget()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()