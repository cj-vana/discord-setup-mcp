/**
 * Role Management Tools
 * Tools for creating, editing, deleting, and reordering roles using Discord Bot API
 */

import { z } from 'zod';
import { PermissionFlagsBits, Role } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError, RoleNotFoundError } from '../utils/errors.js';

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
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Convert color to integer if hex string
    let colorInt: number | undefined;
    if (input.color !== undefined) {
      if (typeof input.color === 'string') {
        colorInt = parseInt(input.color.replace('#', ''), 16);
      } else {
        colorInt = input.color;
      }
    }

    // Convert permission names to bitfield
    let permissionsBitfield: bigint | undefined;
    if (input.permissions) {
      permissionsBitfield = BigInt(0);
      for (const perm of input.permissions) {
        if (perm in PermissionFlagsBits) {
          permissionsBitfield |=
            PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        }
      }
    }

    const role = await guild.roles.create({
      name: input.name,
      color: colorInt,
      hoist: input.hoist,
      mentionable: input.mentionable,
      permissions: permissionsBitfield,
      position: input.position,
    });

    return {
      success: true,
      data: {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        hoist: role.hoist,
        mentionable: role.mentionable,
        message: `Role "${role.name}" created successfully`,
      },
    };
  } catch (error) {
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
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const role = guild.roles.cache.get(input.roleId);
    if (!role) {
      throw new RoleNotFoundError(input.roleId);
    }

    // Build edit options
    const editOptions: any = {};
    if (input.name !== undefined) editOptions.name = input.name;
    if (input.hoist !== undefined) editOptions.hoist = input.hoist;
    if (input.mentionable !== undefined)
      editOptions.mentionable = input.mentionable;
    if (input.position !== undefined) editOptions.position = input.position;

    // Convert color
    if (input.color !== undefined) {
      if (typeof input.color === 'string') {
        editOptions.color = parseInt(input.color.replace('#', ''), 16);
      } else {
        editOptions.color = input.color;
      }
    }

    // Convert permissions
    if (input.permissions !== undefined) {
      let permissionsBitfield = BigInt(0);
      for (const perm of input.permissions) {
        if (perm in PermissionFlagsBits) {
          permissionsBitfield |=
            PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        }
      }
      editOptions.permissions = permissionsBitfield;
    }

    const updatedRole = await role.edit(editOptions);

    return {
      success: true,
      data: {
        id: updatedRole.id,
        name: updatedRole.name,
        color: updatedRole.color,
        position: updatedRole.position,
        message: `Role "${updatedRole.name}" updated successfully`,
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
