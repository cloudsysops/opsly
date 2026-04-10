import { AwsCloudProvider } from "./aws-provider.js";
import type { CloudProvider, CloudProviderId } from "./interface.js";

const cache = new Map<CloudProviderId, CloudProvider>();

/**
 * Resuelve el adaptador de proveedor. Añadir aquí Azure/GCP sin tocar rutas ni billing core.
 */
export function getCloudProvider(id: CloudProviderId): CloudProvider {
  const hit = cache.get(id);
  if (hit) {
    return hit;
  }
  let created: CloudProvider;
  switch (id) {
    case "aws":
      created = new AwsCloudProvider();
      break;
    case "azure":
    case "gcp":
      throw new Error(`Proveedor ${id}: implementación pendiente`);
    default: {
      const _never: never = id;
      throw new Error(`Proveedor desconocido: ${_never}`);
    }
  }
  cache.set(id, created);
  return created;
}

export function isCloudProviderId(value: string): value is CloudProviderId {
  return value === "aws" || value === "azure" || value === "gcp";
}
