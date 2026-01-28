/**
 * Role Management Tools
 * Tools for creating, editing, deleting, and reordering roles using Discord Bot API
 */

import { z } from 'zod';
import { PermissionFlagsBits, Role, Routes } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError, RoleNotFoundError } from '../utils/errors.js';
import { writeFileSync, appendFileSync } from 'fs';

const LOG_FILE = '/tmp/discord-mcp-debug.log';
function debugLog(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { appendFileSync(LOG_FILE, line); } catch {}
  console.error(msg);
}

// Convert SCREAMING_SNAKE_CASE to PascalCase for PermissionFlagsBits lookup
function snakeToPascal(str: string): string {
  return str.toLowerCase().split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PermissionSchema = z.enum([
  'CREATE_INSTANT_INVITE',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'ADMINISTRATOR',
  'MANAGE_CHANNELS',
  'MANAGE_GUILD',
  'ADD_REACTIONS',
  'VIEW_AUDIT_LOG',
  'PRIORITY_SPEAKER',
  'STREAM',
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'SEND_TTS_MESSAGES',
  'MANAGE_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'READ_MESSAGE_HISTORY',
  'MENTION_EVERYONE',
  'USE_EXTERNAL_EMOJIS',
  'VIEW_GUILD_INSIGHTS',
  'CONNECT',
  'SPEAK',
  'MUTE_MEMBERS',
  'DEAFEN_MEMBERS',
  'MOVE_MEMBERS',
  'USE_VAD',
  'CHANGE_NICKNAME',
  'MANAGE_NICKNAMES',
  'MANAGE_ROLES',
  'MANAGE_WEBHOOKS',
  'MANAGE_GUILD_EXPRESSIONS',
  'USE_APPLICATION_COMMANDS',
  'REQUEST_TO_SPEAK',
  'MANAGE_EVENTS',
  'MANAGE_THREADS',
  'CREATE_PUBLIC_THREADS',
  'CREATE_PRIVATE_THREADS',
  'USE_EXTERNAL_STICKERS',
  'SEND_MESSAGES_IN_THREADS',
  'USE_EMBEDDED_ACTIVITIES',
  'MODERATE_MEMBERS',
  'VIEW_CREATOR_MONETIZATION_ANALYTICS',
  'USE_SOUNDBOARD',
  'USE_EXTERNAL_SOUNDS',
  'SEND_VOICE_MESSAGES',
]);

const ColorSchema = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex code like #FF0000'),
  z.number().int().min(0).max(16777215),
]);

// ============================================================================
// CREATE ROLE
// ============================================================================

export const createRoleToolDefinition = {
  name: 'create_role',
  description:
    'Creates a new role in a Discord server with specified name, color, permissions, and settings.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      name: {
        type: 'string',
        description: 'Name of the role (1-100 characters)',
      },
      color: {
        type: ['string', 'number'],
        description:
          'Role color as hex string (#FF0000) or integer (0-16777215)',
      },
      hoist: {
        type: 'boolean',
        description: 'Whether to display role members separately in the sidebar',
      },
      mentionable: {
        type: 'boolean',
        description: 'Whether this role can be mentioned by anyone',
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of permission names to grant to this role',
      },
      position: {
        type: 'number',
        description: 'Position in the role hierarchy (higher = more powerful)',
      },
    },
    required: ['name'],
  },
};

export const CreateRoleInputSchema = z.object({
  guildId: z.string().optional(),
  name: z.string().min(1).max(100),
  color: ColorSchema.optional(),
  hoist: z.boolean().default(false),
  mentionable: z.boolean().default(false),
  permissions: z.array(PermissionSchema).optional(),
  position: z.number().int().min(0).optional(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

export async function createRoleHandler(
  input: CreateRoleInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    console.error('[create_role] Starting handler...');

    // DEBUG: Add timeout to getDiscordClient
    const clientPromise = getDiscordClient();
    const clientTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('getDiscordClient timed out')), 5000)
    );
    const client = await Promise.race([clientPromise, clientTimeout]);
    console.error('[create_role] Got client');

    // DEBUG: Add timeout to resolveGuild
    const guildPromise = resolveGuild(client, input.guildId);
    const guildTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('resolveGuild timed out')), 5000)
    );
    const guild = await Promise.race([guildPromise, guildTimeout]);
    console.error('[create_role] Resolved guild:', guild.name);

    // Convert color to integer if hex string
    let colorInt: number | undefined;
    if (input.color !== undefined) {
      if (typeof input.color === 'string') {
        colorInt = parseInt(input.color.replace('#', ''), 16);
      } else {
        colorInt = input.color;
      }
    }
    console.error('[create_role] Color:', colorInt);

    // Convert permission names to bitfield
    let permissionsBitfield: bigint | undefined;
    if (input.permissions) {
      permissionsBitfield = BigInt(0);
      for (const perm of input.permissions) {
        // Convert SCREAMING_SNAKE_CASE to PascalCase for PermissionFlagsBits
        const pascalPerm = snakeToPascal(perm);
        if (pascalPerm in PermissionFlagsBits) {
          permissionsBitfield |=
            PermissionFlagsBits[pascalPerm as keyof typeof PermissionFlagsBits];
        }
      }
    }
    console.error('[create_role] Permissions:', permissionsBitfield?.toString());

    console.error('[create_role] About to call REST API directly...');

    // Build REST API payload
    const restPayload: any = { name: input.name };
    if (colorInt !== undefined) restPayload.color = colorInt;
    if (input.hoist !== undefined) restPayload.hoist = input.hoist;
    if (input.mentionable !== undefined) restPayload.mentionable = input.mentionable;
    if (permissionsBitfield !== undefined) restPayload.permissions = permissionsBitfield.toString();

    console.error('[create_role] REST payload:', JSON.stringify(restPayload));

    // Use raw fetch to check rate limit headers
    const config = await import('../client/config.js');
    const token = config.getConfig().discordToken;

    const response = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/roles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restPayload),
    });

    console.error('[create_role] Response status:', response.status);
    console.error('[create_role] Rate limit headers:', {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
      resetAfter: response.headers.get('x-ratelimit-reset-after'),
      bucket: response.headers.get('x-ratelimit-bucket'),
      global: response.headers.get('x-ratelimit-global'),
      retryAfter: response.headers.get('retry-after'),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[create_role] Error body:', errorBody);
      throw new Error(`Discord API error ${response.status}: ${errorBody}`);
    }

    const roleData = await response.json() as any;

    console.error('[create_role] Role created via REST:', roleData.id);

    return {
      success: true,
      data: {
        id: roleData.id,
        name: roleData.name,
        color: roleData.color,
        position: roleData.position,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        message: `Role "${roleData.name}" created successfully`,
      },
    };
  } catch (error) {
    console.error('[create_role] Error:', error);
    const mcpError = wrapDiscordError(error, 'create_role');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// EDIT ROLE
// ============================================================================

export const editRoleToolDefinition = {
  name: 'edit_role',
  description:
    'Edits an existing role in a Discord server. Can modify name, color, permissions, and other settings.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      roleId: {
        type: 'string',
        description: 'ID of the role to edit',
      },
      name: {
        type: 'string',
        description: 'New name for the role',
      },
      color: {
        type: ['string', 'number'],
        description: 'New color as hex string or integer',
      },
      hoist: {
        type: 'boolean',
        description: 'Whether to display role members separately',
      },
      mentionable: {
        type: 'boolean',
        description: 'Whether this role can be mentioned',
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of permission names (replaces existing permissions)',
      },
      position: {
        type: 'number',
        description: 'New position in the role hierarchy',
      },
    },
    required: ['roleId'],
  },
};

export const EditRoleInputSchema = z.object({
  guildId: z.string().optional(),
  roleId: z.string().min(1, 'Role ID is required'),
  name: z.string().min(1).max(100).optional(),
  color: ColorSchema.optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
  permissions: z.array(PermissionSchema).optional(),
  position: z.number().int().min(0).optional(),
});

export type EditRoleInput = z.infer<typeof EditRoleInputSchema>;

export async function editRoleHandler(
  input: EditRoleInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    debugLog('[edit_role] Input received:', JSON.stringify(input));

    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Verify role exists
    const role = guild.roles.cache.get(input.roleId);
    if (!role) {
      throw new RoleNotFoundError(input.roleId);
    }

    // Build REST API payload
    const restPayload: any = {};
    if (input.name !== undefined) restPayload.name = input.name;
    if (input.hoist !== undefined) restPayload.hoist = input.hoist;
    if (input.mentionable !== undefined) restPayload.mentionable = input.mentionable;

    // Convert color
    if (input.color !== undefined) {
      if (typeof input.color === 'string') {
        restPayload.color = parseInt(input.color.replace('#', ''), 16);
      } else {
        restPayload.color = input.color;
      }
    }

    // Convert permissions to bitfield string (Discord API requires string format)
    if (input.permissions !== undefined) {
      debugLog('[edit_role] Processing permissions array:', JSON.stringify(input.permissions));
      let permissionsBitfield = BigInt(0);
      for (const perm of input.permissions) {
        // Convert SCREAMING_SNAKE_CASE to PascalCase for PermissionFlagsBits
        const pascalPerm = snakeToPascal(perm);
        const exists = pascalPerm in PermissionFlagsBits;
        debugLog(`[edit_role] Perm "${perm}" -> "${pascalPerm}" exists: ${exists}`);
        if (exists) {
          const flagValue = PermissionFlagsBits[pascalPerm as keyof typeof PermissionFlagsBits];
          debugLog(`[edit_role] Flag value for ${pascalPerm}: ${flagValue.toString()}`);
          permissionsBitfield |= flagValue;
        }
      }
      debugLog('[edit_role] Final permissions bitfield:', permissionsBitfield.toString());
      restPayload.permissions = permissionsBitfield.toString();
    } else {
      debugLog('[edit_role] No permissions in input');
    }

    // Use direct REST API call (more reliable than discord.js role.edit())
    const config = await import('../client/config.js');
    const token = config.getConfig().discordToken;

    debugLog('[edit_role] REST payload:', JSON.stringify(restPayload));

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guild.id}/roles/${input.roleId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restPayload),
      }
    );

    debugLog('[edit_role] Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      debugLog('[edit_role] Error body:', errorBody);
      throw new Error(`Discord API error ${response.status}: ${errorBody}`);
    }

    const roleData = await response.json() as any;
    debugLog('[edit_role] Response data:', JSON.stringify(roleData));

    // Handle position separately if provided (requires different API endpoint)
    if (input.position !== undefined) {
      const positionResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guild.id}/roles`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{ id: input.roleId, position: input.position }]),
        }
      );

      if (!positionResponse.ok) {
        debugLog('[edit_role] Position update failed, but role was updated');
      }
    }

    return {
      success: true,
      data: {
        id: roleData.id,
        name: roleData.name,
        color: roleData.color,
        position: roleData.position,
        permissions: roleData.permissions,
        message: `Role "${roleData.name}" updated successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'edit_role');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// DELETE ROLE
// ============================================================================

export const deleteRoleToolDefinition = {
  name: 'delete_role',
  description:
    'Deletes a role from a Discord server. This action cannot be undone.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      roleId: {
        type: 'string',
        description: 'ID of the role to delete',
      },
    },
    required: ['roleId'],
  },
};

export const DeleteRoleInputSchema = z.object({
  guildId: z.string().optional(),
  roleId: z.string().min(1, 'Role ID is required'),
});

export type DeleteRoleInput = z.infer<typeof DeleteRoleInputSchema>;

export async function deleteRoleHandler(
  input: DeleteRoleInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const role = guild.roles.cache.get(input.roleId);
    if (!role) {
      throw new RoleNotFoundError(input.roleId);
    }

    const roleName = role.name;
    await role.delete();

    return {
      success: true,
      data: {
        message: `Role "${roleName}" deleted successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'delete_role');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// REORDER ROLES
// ============================================================================

export const reorderRolesToolDefinition = {
  name: 'reorder_roles',
  description:
    'Reorders roles in the role hierarchy. Provide an array of role IDs in desired order (highest to lowest).',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      rolePositions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            roleId: { type: 'string' },
            position: { type: 'number' },
          },
          required: ['roleId', 'position'],
        },
        description:
          'Array of objects with roleId and position (higher = more powerful)',
      },
    },
    required: ['rolePositions'],
  },
};

export const ReorderRolesInputSchema = z.object({
  guildId: z.string().optional(),
  rolePositions: z.array(
    z.object({
      roleId: z.string(),
      position: z.number().int().min(0),
    })
  ),
});

export type ReorderRolesInput = z.infer<typeof ReorderRolesInputSchema>;

export async function reorderRolesHandler(
  input: ReorderRolesInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Verify all roles exist
    for (const { roleId } of input.rolePositions) {
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        throw new RoleNotFoundError(roleId);
      }
    }

    // Set positions
    await guild.roles.setPositions(
      input.rolePositions.map((rp) => ({
        role: rp.roleId,
        position: rp.position,
      }))
    );

    return {
      success: true,
      data: {
        message: `Reordered ${input.rolePositions.length} roles successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'reorder_roles');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
