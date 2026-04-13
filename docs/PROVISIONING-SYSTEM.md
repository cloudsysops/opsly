# Provisioning Multi-Nodo (Cloudsysops)

Sistema base para provisionar nodos nuevos y agregarlos al cluster operativo de `intcloudsysops`.

## Archivos

- `scripts/provision-detect-os.sh`
- `scripts/provision-new-node.sh`
- `scripts/manage-cluster-nodes.sh`
- `infra/nodes-registry.json`

## Flujo recomendado

1. Detectar compatibilidad del host actual:

```bash
./scripts/provision-detect-os.sh
./scripts/provision-detect-os.sh --json
```

2. Ver estado del cluster:

```bash
./scripts/manage-cluster-nodes.sh list
```

3. Provisionar nodo nuevo (primero en simulación):

```bash
./scripts/provision-new-node.sh \
  --name opsly-worker-02 \
  --host 100.70.20.10 \
  --user opslyquantum \
  --role worker \
  --dry-run
```

4. Ejecutar provisioning real:

```bash
./scripts/provision-new-node.sh \
  --name opsly-worker-02 \
  --host 100.70.20.10 \
  --user opslyquantum \
  --role worker
```

## Gestión manual de nodos

Agregar:

```bash
./scripts/manage-cluster-nodes.sh add \
  --name localrank-worker \
  --host 100.88.10.20 \
  --user opslyquantum \
  --role worker
```

Consultar:

```bash
./scripts/manage-cluster-nodes.sh get --name localrank-worker
```

Remover:

```bash
./scripts/manage-cluster-nodes.sh remove --name localrank-worker
```

## Notas de seguridad

- No guarda secretos en el registry.
- Requiere SSH por Tailscale para hosts remotos.
- `provision-new-node.sh` valida modo `--dry-run` para cambios seguros.
- Mantener `infra/nodes-registry.json` versionado en git como fuente de verdad operativa.
