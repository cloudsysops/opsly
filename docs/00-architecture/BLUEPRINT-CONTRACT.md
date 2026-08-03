---
status: proposed_contract
owner: platform
last_review: 2026-08-02
---

# Blueprint Contract

## Propósito

Un blueprint compone módulos y políticas para una vertical. No contiene datos
de clientes ni secretos y no duplica el código de un tenant.

## Forma lógica

```yaml
schema_version: BlueprintDefinitionV1
id: <blueprint-id>
version: 0.1.0
metadata: {}
modules: []
capabilities: {}
roles: []
pipelines: []
forms: []
provider_types: []
service_categories: []
workflows: []
dashboards: []
policies: {}
feature_flags: {}
integrations: []
health_checks: []
smoke_tests: []
```

## Loader

El loader común valida identidad, versiones, referencias, dependencias y
ausencia de secretos. Validadores verticales pueden imponer invariantes
adicionales; por ejemplo, Academy puede requerir su adapter CRM, pero eso no
debe convertirse en una regla global.

## Layout objetivo

```text
blueprints/<id>/
  blueprint.yaml
  modules.yaml
  capabilities.yaml
  roles.yaml
  pipelines.yaml
  forms.yaml
  workflows/
  dashboards/
  policies.yaml
  smoke/
```

Los archivos exactos se definirán en el PR del loader y se adaptarán a las
representaciones Academy existentes. No se crea todavía `medical-tourism`.

## Tenant override

Un tenant declara solo diferencias:

```text
tenants/<slug>/
  tenant.yaml
  branding.yaml
  feature-flags.yaml
  integrations.yaml
  modules.yaml
  roles.yaml
  secrets.schema.yaml
```

Un override no puede cambiar silenciosamente límites, aislamiento, políticas de
seguridad ni aprobación humana.
