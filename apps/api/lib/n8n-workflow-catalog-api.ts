import catalog from '../../../config/n8n-workflows/catalog.json';

/** Límite zod para `catalog_item_id` en rutas portal (alineado a IDs del catálogo JSON). */
export const N8N_CATALOG_ITEM_ID_MAX_LEN = 128;

export type N8nCatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  plan_min: string;
  version: string;
  source_files: string[];
  required_env: string[];
  webhooks: string[];
  default_active: boolean;
  installed_by_default: boolean;
};

type CatalogDoc = {
  version: string;
  items: N8nCatalogItem[];
};

export function getN8nWorkflowCatalogDoc(): CatalogDoc {
  return catalog as CatalogDoc;
}

export function findN8nCatalogItemById(catalogItemId: string): N8nCatalogItem | null {
  const doc = getN8nWorkflowCatalogDoc();
  return doc.items.find((i) => i.id === catalogItemId) ?? null;
}
