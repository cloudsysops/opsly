FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
LABEL orchestrator.meta='{"tool_name": "nmap", "mode": "security", "note": "Generated template - adjust packages as needed."}'
CMD ["/bin/sh"]
