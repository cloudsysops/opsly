import catalog from '../../../config/n8n-workflows/catalog.json';

export interface N8nWorkflowCatalogItem {
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
}

export interface N8nWorkflowCatalog {
  version: string;
  items: N8nWorkflowCatalogItem[];
}

export function getN8nWorkflowCatalog(): N8nWorkflowCatalog {
  return catalog as N8nWorkflowCatalog;
}

