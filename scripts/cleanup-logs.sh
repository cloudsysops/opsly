#!/bin/bash
# Cleanup local - opsly-admin
MAX_LOG_AGE=7

find logs -name '*.log' -mtime +$MAX_LOG_AGE -delete 2>/dev/null
find logs -name '*.log.gz' -mtime +$MAX_LOG_AGE -delete 2>/dev/null
docker system prune -f 2>/dev/null
echo "Cleanup $(date)"
