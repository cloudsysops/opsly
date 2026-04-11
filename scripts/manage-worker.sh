#!/usr/bin/env bash
# Gestión del servicio systemd opsly-worker (orchestrator en Mac 2011).
# Uso: ./scripts/manage-worker.sh status
set -euo pipefail
SVC=opsly-worker.service
case "${1:-}" in
  start) sudo systemctl start "${SVC}" && echo "OK: started" ;;
  stop) sudo systemctl stop "${SVC}" && echo "OK: stopped" ;;
  restart) sudo systemctl restart "${SVC}" && echo "OK: restarted" ;;
  status) sudo systemctl status "${SVC}" --no-pager ;;
  logs) tail -f "${HOME}/opsly/logs/worker.log" ;;
  logs-error) tail -f "${HOME}/opsly/logs/worker-error.log" ;;
  journal) sudo journalctl -u "${SVC}" -f ;;
  enable) sudo systemctl enable "${SVC}" && echo "OK: enabled" ;;
  disable) sudo systemctl disable "${SVC}" && echo "OK: disabled" ;;
  *)
    echo "Uso: $0 {start|stop|restart|status|logs|logs-error|journal|enable|disable}" >&2
    exit 1
    ;;
esac
