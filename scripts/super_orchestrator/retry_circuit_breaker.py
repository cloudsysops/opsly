#!/usr/bin/env python3
"""
Retry and Circuit Breaker Module
Handles job retries, circuit breaker pattern, and failure recovery
"""
import os
import sys
import time
import json
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    initial_delay_seconds: float = 1.0
    max_delay_seconds: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_seconds: float = 30.0
    half_open_max_calls: int = 3


@dataclass
class AttemptRecord:
    """Record of a single attempt"""
    attempt_number: int
    timestamp: str
    success: bool
    error: Optional[str] = None
    latency_ms: int = 0


class RetryManager:
    """Manages retry logic with exponential backoff"""
    
    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()
        self.history = {}  # task_id -> [AttemptRecord]
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff"""
        delay = self.config.initial_delay_seconds * (self.config.backoff_multiplier ** (attempt - 1))
        delay = min(delay, self.config.max_delay_seconds)
        
        if self.config.jitter:
            import random
            delay *= (0.5 + random.random())  # 50-150% of delay
        
        return delay
    
    def should_retry(self, task_id: str) -> bool:
        """Check if more retries are allowed"""
        if task_id not in self.history:
            return True
        
        attempts = self.history[task_id]
        return len(attempts) < self.config.max_attempts
    
    def record_attempt(self, task_id: str, success: bool, error: str = None, latency_ms: int = 0):
        """Record an attempt"""
        if task_id not in self.history:
            self.history[task_id] = []
        
        attempt_number = len(self.history[task_id]) + 1
        record = AttemptRecord(
            attempt_number=attempt_number,
            timestamp=datetime.now().isoformat(),
            success=success,
            error=error,
            latency_ms=latency_ms
        )
        
        self.history[task_id].append(record)
        
        # Keep only last 100 attempts per task
        if len(self.history[task_id]) > 100:
            self.history[task_id] = self.history[task_id][-100:]
    
    def get_next_delay(self, task_id: str) -> float:
        """Get delay before next retry"""
        if task_id not in self.history:
            return self.config.initial_delay_seconds
        
        attempts = self.history[task_id]
        return self.calculate_delay(len(attempts) + 1)
    
    def execute_with_retry(self, func: Callable, task_id: str) -> tuple:
        """Execute a function with retry logic"""
        last_error = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                start_time = time.time()
                result = func()
                latency_ms = int((time.time() - start_time) * 1000)
                
                self.record_attempt(task_id, True, latency_ms=latency_ms)
                return result, None
            
            except Exception as e:
                last_error = e
                self.record_attempt(task_id, False, str(e))
                
                if attempt < self.config.max_attempts:
                    delay = self.calculate_delay(attempt)
                    print(f"[RetryManager] Attempt {attempt} failed: {e}. Retrying in {delay:.1f}s...")
                    time.sleep(delay)
        
        return None, last_error
    
    def get_stats(self, task_id: str) -> dict:
        """Get retry statistics for a task"""
        if task_id not in self.history:
            return {'total_attempts': 0}
        
        attempts = self.history[task_id]
        successes = sum(1 for a in attempts if a.success)
        
        return {
            'total_attempts': len(attempts),
            'successes': successes,
            'failures': len(attempts) - successes,
            'success_rate': successes / len(attempts) if attempts else 0,
            'last_attempt': attempts[-1].timestamp if attempts else None
        }


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0
        
        self.state_file = os.path.expanduser(f"~/.opsly/circuit_breakers/{name}.json")
        self.load_state()
    
    def load_state(self):
        """Load circuit breaker state from file"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    self.state = CircuitState(data.get('state', 'closed'))
                    self.failure_count = data.get('failure_count', 0)
                    self.success_count = data.get('success_count', 0)
                    self.last_failure_time = data.get('last_failure_time')
            except:
                pass
    
    def save_state(self):
        """Save circuit breaker state to file"""
        os.makedirs(os.path.dirname(self.state_file), exist_ok=True)
        with open(self.state_file, 'w') as f:
            json.dump({
                'state': self.state.value,
                'failure_count': self.failure_count,
                'success_count': self.success_count,
                'last_failure_time': self.last_failure_time
            }, f)
    
    def can_execute(self) -> bool:
        """Check if execution is allowed"""
        if self.state == CircuitState.CLOSED:
            return True
        
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time:
                elapsed = time.time() - self.last_failure_time
                if elapsed >= self.config.timeout_seconds:
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                    self.save_state()
                    return True
            return False
        
        if self.state == CircuitState.HALF_OPEN:
            return self.half_open_calls < self.config.half_open_max_calls
        
        return False
    
    def record_success(self):
        """Record a successful execution"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            self.half_open_calls += 1
            
            if self.success_count >= self.config.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                print(f"[CircuitBreaker] {self.name} CLOSED (recovered)")
        else:
            self.failure_count = 0
            self.success_count = 0
        
        self.save_state()
    
    def record_failure(self):
        """Record a failed execution"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            print(f"[CircuitBreaker] {self.name} OPEN (half_open failed)")
        
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.config.failure_threshold:
                self.state = CircuitState.OPEN
                print(f"[CircuitBreaker] {self.name} OPEN (threshold reached: {self.failure_count})")
        
        self.save_state()
    
    def execute(self, func: Callable) -> tuple:
        """Execute function with circuit breaker protection"""
        if not self.can_execute():
            return None, Exception(f"Circuit breaker {self.name} is OPEN")
        
        try:
            result = func()
            self.record_success()
            return result, None
        
        except Exception as e:
            self.record_failure()
            return None, e
    
    def get_status(self) -> dict:
        """Get circuit breaker status"""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'can_execute': self.can_execute()
        }


class JobFailureHandler:
    """Handles job failures with retry and circuit breaker"""
    
    def __init__(self):
        self.retry_manager = RetryManager()
        self.circuit_breakers = {}
    
    def get_circuit_breaker(self, provider: str) -> CircuitBreaker:
        """Get or create circuit breaker for a provider"""
        if provider not in self.circuit_breakers:
            self.circuit_breakers[provider] = CircuitBreaker(provider)
        return self.circuit_breakers[provider]
    
    def execute_job(self, job_id: str, provider: str, execute_func: Callable) -> tuple:
        """Execute a job with retry and circuit breaker"""
        # Check circuit breaker
        cb = self.get_circuit_breaker(provider)
        
        if not cb.can_execute():
            return None, Exception(f"Circuit breaker open for provider: {provider}")
        
        # Execute with retry
        result, error = self.retry_manager.execute_with_retry(
            lambda: cb.execute(execute_func)[0] or execute_func(),
            job_id
        )
        
        # Record result
        if error:
            cb.record_failure()
        else:
            cb.record_success()
        
        return result, error
    
    def get_all_status(self) -> dict:
        """Get status of all components"""
        return {
            'circuit_breakers': {
                name: cb.get_status() 
                for name, cb in self.circuit_breakers.items()
            },
            'retry_stats': {
                'total_tracked_jobs': len(self.retry_manager.history)
            }
        }


if __name__ == "__main__":
    # Test retry manager
    print("🧪 Testing RetryManager...")
    retry_mgr = RetryManager()
    
    class CallCounter:
        def __init__(self):
            self.count = 0
        
        def __call__(self):
            self.count += 1
            if self.count < 3:
                raise Exception("Simulated failure")
            return "Success!"
    
    counter = CallCounter()
    result, error = retry_mgr.execute_with_retry(counter, "test-task-001")
    print(f"  Result: {result}, Error: {error}")
    print(f"  Stats: {retry_mgr.get_stats('test-task-001')}")
    
    # Test circuit breaker
    print("\n🧪 Testing CircuitBreaker...")
    cb = CircuitBreaker("test-provider")
    
    for i in range(10):
        success, _ = cb.execute(lambda: "success" if i < 5 else Exception("fail"))
        print(f"  Attempt {i+1}: {cb.state.value}, can_execute: {cb.can_execute()}")
        if cb.state == CircuitState.OPEN:
            break
    
    print(f"\n  Final status: {cb.get_status()}")
    
    # Test failure handler
    print("\n🧪 Testing JobFailureHandler...")
    handler = JobFailureHandler()
    print(f"  Status: {handler.get_all_status()}")