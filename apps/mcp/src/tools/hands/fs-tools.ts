import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { enforceModePermissions } from '../../modes/enforcer.js';
import type { ToolDefinition, ToolResponse } from '../../types/index.js';
import type { ToolContext } from '../../types/tools.types.js';
import { sanitizePath } from '../../utils/path-sanitizer.util.js';

const fsReadFileInputSchema = z.object({
  path: z.string().min(1),
});

const fsWriteFileInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

type FsReadFileInput = z.infer<typeof fsReadFileInputSchema>;
type FsWriteFileInput = z.infer<typeof fsWriteFileInputSchema>;

function getTenantWorkspaceRoot(context?: ToolContext): string {
  const workspaceRoot = path.resolve(context?.workspaceRoot ?? process.env.WORKSPACE_ROOT ?? './tools/workspaces');
  const tenantId = context?.tenantId ?? 'tenant_001';
  return path.resolve(workspaceRoot, tenantId);
}

const fsReadFileTool: ToolDefinition<FsReadFileInput, ToolResponse<string>> = {
  name: 'fs_read_file',
  description: 'Read a UTF-8 file from the current tenant sandbox.',
  inputSchema: fsReadFileInputSchema,
  handler: async (input, context): Promise<ToolResponse<string>> => {
    try {
      enforceModePermissions('fs_read_file', context?.mode ?? 'developer');
      const tenantRoot = getTenantWorkspaceRoot(context);
      const absolutePath = sanitizePath(input.path, tenantRoot);
      const data = await fs.readFile(absolutePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
};

const fsWriteFileTool: ToolDefinition<FsWriteFileInput, ToolResponse<void>> = {
  name: 'fs_write_file',
  description: 'Write a UTF-8 file inside the current tenant sandbox.',
  inputSchema: fsWriteFileInputSchema,
  handler: async (input, context): Promise<ToolResponse<void>> => {
    try {
      enforceModePermissions('fs_write_file', context?.mode ?? 'developer');
      const tenantRoot = getTenantWorkspaceRoot(context);
      const absolutePath = sanitizePath(input.path, tenantRoot);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, input.content, 'utf8');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
};

export const fsTools = [fsReadFileTool, fsWriteFileTool];
