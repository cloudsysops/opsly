#!/bin/bash
# Feedback local - opsly-admin
echo "=== OPSLY ADMIN FEEDBACK ==="

# Workers
WORKERS=$(docker ps --filter "name=opsly" --format "{{.Names}}" | wc -l | xargs)
echo "Workers: $WORKERS"

# Jobs Redis
JOBS=$(docker exec opsly-redis-local redis-cli LLEN bull:openclaw:completed 2>/dev/null || echo 0)
echo "Jobs completed: $JOBS"

# System
echo "Memory: $(free -h | awk 'NR==2 {print $3"/"$2}')"
echo "Disk: $(df -h ~ | awk 'NR==2 {print $5}')"
echo "Uptime: $(uptime | cut -d',' -f1)"
