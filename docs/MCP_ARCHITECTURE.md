# OPSLY - MCP + Autonomous Governance Architecture

## Overview
Opsly es un sistema autónomo en evolución que usa MCP (Model Context Protocol) para conectar agentes, validar código automáticamente y mantener governance sin intervención manual.

## Architecture

### 1. MCP Gateway + Agent Orchestration
- **mcp-gateway**: Punto central de conexión con GitHub API
- **agent-manager**: Orquesta validaciones y auto-fixes
- **mcp-rendering-server**: Renderiza resultados de validación

### 2. Governance Rules
- Centralizadas en `config/governance-rules.json`
- Define qué se auto-aprueba, qué requiere review, qué se auto-repara

### 3. Auto-Validation Pipeline
Todo PR pasa por:
1. **PR Governance Check** (mcp-gateway valida contra reglas)
2. **Status Checks** (8 checks obligatorios)
3. **Auto-Fix** (si es reparable)
4. **Re-validation** (confirma que pasó)

### 4. Auto-Merge Strategy
- Solo para docs y config seguro
- Requiere 1 aprobación para config
- Requiere 2 aprobaciones para código
- Todos los checks deben pasar

## Tools Disponibles

### validate-pr
```
Validar PR contra governance-rules.json
Input: pr_number, rules_config
Output: isValid, failedChecks, canAutoFix
```

### auto-fix-checks
```
Reparar checks conocidos automáticamente
Input: pr_number, issue_type
Output: fixApplied, changesCommitted
```

### check-dependencies
```
Validar que todas las dependencias estén disponibles
Input: workspace
Output: missing_modules, suggestions
```

## Implementation Status

- [x] Branch Protection Rules configuradas
- [x] Code Quality enabled
- [x] Dependabot enabled
- [ ] governance-rules.json
- [ ] Auto-fix workflows
- [ ] MCP tool: validate-pr
- [ ] MCP tool: auto-fix-checks

## Next Steps
1. Crear governance-rules.json
2. Crear GitHub Actions workflows
3. Implementar MCP tools
4. Arreglar PRs pendientes con auto-fix
5. Validar sistema autónomo
