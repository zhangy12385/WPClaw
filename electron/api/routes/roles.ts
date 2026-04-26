import type { IncomingMessage, ServerResponse } from 'http';
import { copyFile, mkdir, readdir, readFile, access } from 'node:fs/promises';
import { constants } from 'fs';
import { join } from 'node:path';
import type { HostApiContext } from '../context';
import { parseJsonBody, sendJson } from '../route-utils';
import { expandPath, getResourcesDir } from '../../utils/paths';
import { listAgentsSnapshot } from '../../utils/agent-config';
import { logger } from '../../utils/logger';

const ROLE_RESOURCE_DIR = join(getResourcesDir(), 'agent_role');
const ROLE_FILES = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md'];

interface RoleInfo {
  id: string;
  name: string;
  description: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readRoleDescription(roleDir: string): Promise<string> {
  const soulPath = join(roleDir, 'SOUL.md');
  try {
    const content = await readFile(soulPath, 'utf-8');
    // Extract first line or first paragraph as description
    const lines = content.split('\n').filter((line) => line.trim() && !line.startsWith('#'));
    return lines[0]?.trim() || '';
  } catch {
    return '';
  }
}

async function readRoleName(roleDir: string): Promise<string> {
  const identityPath = join(roleDir, 'IDENTITY.md');
  try {
    const content = await readFile(identityPath, 'utf-8');
    // Extract role name from IDENTITY.md (e.g., "# 人类学家" or first heading)
    const match = content.match(/^#\s*(.+)/m);
    if (match) return match[1].trim();
    // Fallback: first line
    const firstLine = content.split('\n')[0]?.replace(/^#+\s*/, '').trim();
    return firstLine || '';
  } catch {
    return '';
  }
}

export async function listRoles(): Promise<RoleInfo[]> {
  const roles: RoleInfo[] = [];

  try {
    const entries = await readdir(ROLE_RESOURCE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const roleDir = join(ROLE_RESOURCE_DIR, entry.name);
      // Check if this role has the required files
      const hasRequiredFiles = await Promise.all(
        ROLE_FILES.map((file) => fileExists(join(roleDir, file))),
      );
      if (!hasRequiredFiles.every(Boolean)) continue;

      const name = await readRoleName(roleDir);
      const description = await readRoleDescription(roleDir);
      roles.push({
        id: entry.name,
        name,
        description,
      });
    }
  } catch (error) {
    console.error('[roles] Failed to list roles:', error);
  }

  return roles;
}

export async function applyRoleToAgent(
  roleId: string,
  agentId: string,
  addressAs: string,
  addressToMe: string,
): Promise<void> {
  const roleDir = join(ROLE_RESOURCE_DIR, roleId);

  logger.info(`[roles] Applying role "${roleId}" to agent "${agentId}"`);

  // Get agent workspace path using listAgentsSnapshot
  const snapshot = await listAgentsSnapshot();
  const agent = snapshot.agents.find((a) => a.id === agentId);

  if (!agent) {
    throw new Error(`Agent "${agentId}" not found`);
  }

  // Expand the workspace path (handles ~ in paths)
  const workspacePath = expandPath(agent.workspace);
  logger.info(`[roles] Agent workspace path: ${workspacePath}`);

  // Ensure workspace directory exists
  await mkdir(workspacePath, { recursive: true });

  // Copy role files to workspace
  for (const file of ROLE_FILES) {
    const source = join(roleDir, file);
    const target = join(workspacePath, file);
    logger.info(`[roles] Copying ${file}: ${source} -> ${target}`);
    await copyFile(source, target);
  }

  // Also create a USER.md file with the addressAs and addressToMe values
  const userMdContent = `# USER.md - About Your Human

- **称呼:** ${addressToMe}
- **姓名:** ${addressAs}
- **Timezone:** Asia/Shanghai (GMT+8)

## Context

（随着对话积累，逐步补充）
`;
  await import('node:fs/promises').then(async (fsP) => {
    await fsP.writeFile(join(workspacePath, 'USER.md'), userMdContent, 'utf-8');
  });

  logger.info(`[roles] Role "${roleId}" applied successfully to agent "${agentId}"`);
}

export async function handleRoleRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  ctx: HostApiContext,
): Promise<boolean> {
  // GET /api/roles - List all available roles
  if (url.pathname === '/api/roles' && req.method === 'GET') {
    try {
      const roles = await listRoles();
      sendJson(res, 200, { success: true, roles });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  // POST /api/roles/apply - Apply a role to an agent
  if (url.pathname === '/api/roles/apply' && req.method === 'POST') {
    try {
      const body = await parseJsonBody<{ roleId: string; agentId: string; addressAs: string; addressToMe: string }>(req);
      if (!body.roleId || !body.agentId) {
        sendJson(res, 400, { success: false, error: 'roleId and agentId are required' });
        return true;
      }
      await applyRoleToAgent(body.roleId, body.agentId, body.addressAs || '', body.addressToMe || '');

      // Trigger gateway reload so OpenClaw picks up the new workspace files
      if (ctx.gatewayManager.getStatus().state !== 'stopped') {
        ctx.gatewayManager.debouncedReload();
      }

      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { success: false, error: String(error) });
    }
    return true;
  }

  return false;
}
