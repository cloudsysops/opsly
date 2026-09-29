#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes "${MAC_SSH_HOST:-opsly-quantum}" '~/bin/opsly-obs-status.sh'
