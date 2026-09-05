#!/usr/bin/env bash
# Shared guard for destructive Peskids data maintenance.

peskids_runtime_environment() {
  local explicit="${PESKIDS_ENVIRONMENT:-}"
  local config="${DOPPLER_CONFIG:-}"
  explicit="$(printf '%s' "$explicit" | tr '[:upper:]' '[:lower:]')"
  config="$(printf '%s' "$config" | tr '[:upper:]' '[:lower:]')"
  if [[ "$explicit" == "production" || "$explicit" == "staging" || "$explicit" == "development" ]]; then
    printf '%s\n' "$explicit"
  elif [[ "$config" == "prd" || "$config" == "prod" || "$config" == "production" ]]; then
    printf '%s\n' production
  elif [[ "$config" == "stg" || "$config" == "staging" || "$config" == "qa" ]]; then
    printf '%s\n' staging
  else
    printf '%s\n' development
  fi
}

peskids_refuse_production_data_mutation() {
  local operation="${1:-data mutation}"
  local environment
  environment="$(peskids_runtime_environment)"
  if [[ "$environment" == "production" ]]; then
    echo "Refusing ${operation}: Peskids production data mutation is disabled by policy." >&2
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  peskids_refuse_production_data_mutation "${1:-data mutation}"
fi
