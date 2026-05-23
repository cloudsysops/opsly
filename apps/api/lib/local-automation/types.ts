export type LocalAutomationPermission =
  | 'app.discover'
  | 'app.launch'
  | 'binary.inspect'
  | 'binary.install'
  | 'docker.inspect'
  | 'docker.run'
  | 'terminal.execute'
  | 'workspace.read'
  | 'workspace.write'
  | 'runtime.registry.read'
  | 'runtime.history.read';

export type LocalAutomationTool = {
  type: string;
  app_name?: string;
  brew_formula?: string;
  brew_cask?: string;
  binaries?: string[];
  permissions?: LocalAutomationPermission[];
  required?: boolean;
};

export type LocalAutomationToolsConfig = {
  version: number;
  updated_at: string;
  workspace_root: string;
  approved_installers: string[];
  tools: Record<string, LocalAutomationTool>;
};

export type LocalAutomationPolicy = {
  version: number;
  updated_at: string;
  workspace_root: string;
  default_effect: 'deny' | 'allow';
  approval_required: LocalAutomationPermission[];
  agents: Record<string, { permissions: LocalAutomationPermission[] }>;
  install_allowlist: {
    brew_formula: string[];
    brew_cask: string[];
    npm_global: string[];
    pnpm_global: string[];
    docker_images: string[];
  };
  forbidden_paths: string[];
  forbidden_commands: string[];
};

export type BinaryStatus = {
  name: string;
  path: string | null;
  installed: boolean;
  version: string | null;
  version_error?: string;
};

export type AppStatus = {
  id: string;
  app_name: string;
  path: string | null;
  installed: boolean;
  running: boolean;
  brew_cask?: string;
};

export type ToolStatus = {
  id: string;
  type: string;
  required: boolean;
  installed: boolean;
  missing: string[];
  binaries: BinaryStatus[];
  app?: AppStatus;
  install: {
    provider: 'brew' | 'none';
    package: string | null;
    allowed: boolean;
    approval_required: boolean;
  };
};

export type AutomationAuditEvent = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  permission: LocalAutomationPermission;
  target: string;
  allowed: boolean;
  approved: boolean;
  status: 'planned' | 'allowed' | 'denied' | 'failed' | 'completed';
  message?: string;
};
