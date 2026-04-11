#!/usr/bin/env bash
# Metadata startup para VM GCP failover (Ubuntu). No incluye secretos.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git jq htop tmux rsync
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y docker.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
fi
install -d -m 0755 /opt/opsly
if ! id -u opsly >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G docker opsly || true
fi
chown -R opsly:opsly /opt/opsly
{
  date -Iseconds
  echo "opsly gcp standby: base packages ok"
} >>/var/log/opsly-gcp-startup.log
