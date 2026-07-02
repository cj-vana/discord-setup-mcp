/**
 * Role Management Tools
 * Create, edit, delete, list, and reorder roles.
 *
 * Discord role hierarchy is counted the opposite way people usually read a
 * list: `position` is an integer where HIGHER = more powerful / higher in the
 * list, `@everyone` is always position 0 at the very bottom, and a newly
 * created role defaults to position 1 (just above @everyone — i.e. the bottom).
 * That inversion is why "important" roles kept landing at the bottom. These
 * tools let callers express placement semantically (top/bottom/above/below, or
 * a top-first ordered list) and compute the raw Discord positions internally,
 * clamped below the bot's own highest role and above @everyone.
 */

import { z } from 'zod';
import { Guild, Routes } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError, RoleNotFoundError, ValidationError } from '../utils/errors.js';
import { resolvePermissionsStrict } from '../utils/permissions.js';
import { debug } from '../utils/logger.js';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const PERMISSIONS_DESCRIPTION =
  'Array of Discord permission names in SCREAMING_SNAKE_CASE (e.g. VIEW_CHANNEL, ' +
  'SEND_MESSAGES, MANAGE_ROLES, KICK_MEMBERS, ADMINISTRATOR, USE_VAD, ' +
  'SEND_TTS_MESSAGES). Unknown names are rejected rather than silently ignored.';

const ColorSchema = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex code like #FF0000'),
  z.number().int().min(0).max(16777215),
]);

function colorToInt(color: string | number | undefined): number | undefined {
  if (color === undefined) return undefined;
  return typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
}

/**
 * Highest role position this bot is allowed to assign. A managed role must sit
 * strictly below the bot's own highest role, so the ceiling is (botHighest - 1).
 */
function getManageableCeiling(guild: Guild): number {
  const botHighest =
    guild.members.me?.roles.highest.position ?? guild.roles.highest.position;
  return Math.max(1, botHighest - 1);
}

/**
 * Sets a single role's position via the bulk role-positions endpoint and
 * returns the resulting position. Retries once: a reposition issued immediately
 * after creating a role can transiently fail before Discord has propagated the
 * new role.
 */
async function setRolePosition(
  client: Awaited<ReturnType<typeof getDiscordClient>>,
  guildId: string,
  roleId: string,
  position: number
): Promise<number> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const updated = (await client.rest.patch(Routes.guildRoles(guildId), {
        body: [{ id: roleId, position }],
      })) as Array<{ id: string; position: number }>;
      return updated.find((r) => r.id === roleId)?.position ?? position;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

// ============================================================================
// CREATE ROLE
// ============================================================================

export const createRoleToolDefinition = {
  name: 'create_role',
  description:
    'Creates a role. IMPORTANT: Discord positions are inverted — higher number = higher/more powerful, @everyone = 0 at the bottom, and a new role defaults to the BOTTOM. To make an important role rank high, pass placement:"top" (or "above"/"below" a reference role). Do not rely on raw position numbers unless you know Discord\'s inverted scheme.',
};

export const CreateRoleInputSchema = z.object({
  guildId: z
    .string()
    .optional()
    .describe('Guild ID or name. Defaults to the currently selected guild.'),
  name: z.string().min(1).max(100).describe('Name of the role (1-100 characters)'),
  color: ColorSchema.optional().describe('Role color as hex string (#FF0000) or integer (0-16777215)'),
  hoist: z
    .boolean()
    .default(false)
    .describe('Display members with this role separately in the sidebar'),
  mentionable: z.boolean().default(false).describe('Allow anyone to @mention this role'),
  permissions: z.array(z.string()).optional().describe(PERMISSIONS_DESCRIPTION),
  placement: z
    .enum(['top', 'bottom', 'above', 'below'])
    .optional()
    .describe(
      'Where to rank the role. "top" = highest the bot can assign (just under the bot), ' +
        '"bottom" = just above @everyone (Discord default), "above"/"below" = relative to ' +
        'referenceRoleId. Prefer this over raw position.'
    ),
  referenceRoleId: z
    .string()
    .optional()
    .describe('Role ID to place the new role above/below (required when placement is "above" or "below").'),
  position: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Raw Discord position (higher = more powerful). Overrides placement. Prefer placement instead.'),
});

export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

/** Resolves the desired absolute position for a create/placement request. */
function resolvePlacementPosition(
  guild: Guild,
  input: Pick<CreateRoleInput, 'placement' | 'referenceRoleId' | 'position'>
): { position: number; requested: number } | null {
  if (input.position === undefined && input.placement === undefined) {
    return null; // leave at Discord's default (bottom)
  }

  const ceiling = getManageableCeiling(guild);
  let requested: number;

  if (input.position !== undefined) {
    requested = input.position;
  } else {
    switch (input.placement) {
      case 'top':
        requested = ceiling;
        break;
      case 'bottom':
        requested = 1;
        break;
      case 'above':
      case 'below': {
        if (!input.referenceRoleId) {
          throw new ValidationError(
            `placement "${input.placement}" requires referenceRoleId.`
          );
        }
        const ref = guild.roles.cache.get(input.referenceRoleId);
        if (!ref) throw new RoleNotFoundError(input.referenceRoleId);
        requested = input.placement === 'above' ? ref.position + 1 : ref.position - 1;
        break;
      }
      default:
        return null;
    }
  }

  const position = Math.min(Math.max(requested, 1), ceiling);
  return { position, requested };
}

export async function createRoleHandler(
  input: CreateRoleInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const body: Record<string, unknown> = { name: input.name };
    const colorInt = colorToInt(input.color);
    if (colorInt !== undefined) body.color = colorInt;
    if (input.hoist !== undefined) body.hoist = input.hoist;
    if (input.mentionable !== undefined) body.mentionable = input.mentionable;
    if (input.permissions) {
      body.permissions = resolvePermissionsStrict(input.permissions).toString();
    }

    // Resolve (and validate) placement BEFORE creating the role, so invalid
    // placement input fails fast without leaving an orphaned role behind.
    const placement = resolvePlacementPosition(guild, input);

    debug('create_role body', body);

    // Discord's create-role endpoint ignores/derives position (a new role always
    // lands at position 1), so create first, then reposition if requested.
    const created = (await client.rest.post(Routes.guildRoles(guild.id), {
      body,
    })) as { id: string; name: string; color: number; hoist: boolean; mentionable: boolean; position: number };

    let finalPosition = created.position;
    let placementNote: string | undefined;

    if (placement) {
      // The role already exists at this point; a failed reposition should not
      // orphan it or report total failure. Surface a warning and let the caller
      // reorder_roles instead.
      try {
        finalPosition = await setRolePosition(client, guild.id, created.id, placement.position);
        if (placement.position !== placement.requested) {
          placementNote = `Requested position ${placement.requested} was clamped to ${placement.position} (the bot can only rank roles below its own highest role).`;
        }
      } catch (posError) {
        const wrapped = wrapDiscordError(posError, 'create_role.position');
        finalPosition = created.position;
        placementNote = `Role created at position ${created.position}, but placement failed: ${wrapped.message}. Use reorder_roles to rank it.`;
      }
    }

    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        color: created.color,
        position: finalPosition,
        hoist: created.hoist,
        mentionable: created.mentionable,
        note: placementNote,
        message: `Role "${created.name}" created successfully at position ${finalPosition}.`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'create_role');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// EDIT ROLE
// ============================================================================

export const editRoleToolDefinition = {
  name: 'edit_role',
  description:
    'Edits a role\'s name, color, permissions, hoist, mentionable, or position. Note: permissions REPLACE the role\'s existing permission set. Position uses Discord\'s inverted scale (higher = more powerful); to reorder relative to other roles, reorder_roles is usually clearer.',
};

export const EditRoleInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  roleId: z.string().min(1, 'Role ID is required').describe('ID of the role to edit'),
  name: z.string().min(1).max(100).optional().describe('New name for the role'),
  color: ColorSchema.optional().describe('New color as hex string or integer'),
  hoist: z.boolean().optional().describe('Display members with this role separately'),
  mentionable: z.boolean().optional().describe('Allow anyone to @mention this role'),
  permissions: z
    .array(z.string())
    .optional()
    .describe(`${PERMISSIONS_DESCRIPTION} Replaces the role's existing permissions.`),
  position: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('New raw Discord position (higher = more powerful).'),
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

    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.hoist !== undefined) body.hoist = input.hoist;
    if (input.mentionable !== undefined) body.mentionable = input.mentionable;
    const colorInt = colorToInt(input.color);
    if (colorInt !== undefined) body.color = colorInt;
    if (input.permissions !== undefined) {
      body.permissions = resolvePermissionsStrict(input.permissions).toString();
    }

    debug('edit_role body', body);

    const updated = (await client.rest.patch(Routes.guildRole(guild.id, input.roleId), {
      body,
    })) as { id: string; name: string; color: number; position: number; permissions: string };

    // Position lives on a different endpoint (bulk role positions). Surface any
    // failure instead of silently reporting success.
    let finalPosition = updated.position;
    let positionWarning: string | undefined;
    if (input.position !== undefined) {
      try {
        const ceiling = getManageableCeiling(guild);
        const target = Math.min(Math.max(input.position, 1), ceiling);
        finalPosition = await setRolePosition(client, guild.id, input.roleId, target);
        if (target !== input.position) {
          positionWarning = `Requested position ${input.position} was clamped to ${target} (bot hierarchy limit).`;
        }
      } catch (posError) {
        const wrapped = wrapDiscordError(posError, 'edit_role.position');
        positionWarning = `Name/permissions updated, but position change failed: ${wrapped.message}`;
      }
    }

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        color: updated.color,
        position: finalPosition,
        permissions: updated.permissions,
        warning: positionWarning,
        message: `Role "${updated.name}" updated successfully.`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'edit_role');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// DELETE ROLE
// ============================================================================

export const deleteRoleToolDefinition = {
  name: 'delete_role',
  description: 'Deletes a role from a Discord server. This action cannot be undone.',
};

export const DeleteRoleInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  roleId: z.string().min(1, 'Role ID is required').describe('ID of the role to delete'),
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
      data: { message: `Role "${roleName}" deleted successfully` },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'delete_role');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// LIST ROLES
// ============================================================================

export const listRolesToolDefinition = {
  name: 'list_roles',
  description:
    'Lists roles sorted highest-to-lowest in the hierarchy (as they appear in Discord\'s UI), with each role\'s position and whether the bot can manage it. Call this before reordering or placing roles so you can reason about the current hierarchy.',
};

export const ListRolesInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
});

export type ListRolesInput = z.infer<typeof ListRolesInputSchema>;

export async function listRolesHandler(
  input: ListRolesInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const botHighest = guild.members.me?.roles.highest.position ?? 0;

    const roles = [...guild.roles.cache.values()]
      .sort((a, b) => b.position - a.position)
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        color: role.hexColor,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed, // true = integration/bot-managed, cannot be reordered
        isEveryone: role.id === guild.id,
        botCanManage: role.position < botHighest && !role.managed && role.id !== guild.id,
      }));

    return {
      success: true,
      data: {
        roles,
        totalCount: roles.length,
        botHighestRolePosition: botHighest,
        hierarchyNote:
          'Sorted highest-to-lowest. Higher position = more powerful; @everyone is position 0. ' +
          'The bot can only create/move/assign roles below botHighestRolePosition.',
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'list_roles');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// REORDER ROLES
// ============================================================================

export const reorderRolesToolDefinition = {
  name: 'reorder_roles',
  description:
    'Reorders roles in the hierarchy. Preferred: pass orderedRoleIds as an array of role IDs from MOST important (top) to least important (bottom) — the server computes the raw Discord positions for you. Advanced: pass rolePositions with explicit numeric positions (higher = more powerful). Provide exactly one of the two.',
};

export const ReorderRolesInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  orderedRoleIds: z
    .array(z.string())
    .min(1)
    .optional()
    .describe('Role IDs ordered from most important (index 0 = top) to least important. Positions are computed automatically. Provide this OR rolePositions, not both.'),
  rolePositions: z
    .array(
      z.object({
        roleId: z.string(),
        position: z.number().int().min(1),
      })
    )
    .min(1)
    .optional()
    .describe('Advanced: explicit [{roleId, position}] with raw Discord positions (higher = more powerful). Provide this OR orderedRoleIds, not both.'),
});

export type ReorderRolesInput = z.infer<typeof ReorderRolesInputSchema>;

export async function reorderRolesHandler(
  input: ReorderRolesInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    if (Boolean(input.orderedRoleIds) === Boolean(input.rolePositions)) {
      throw new ValidationError('Provide exactly one of orderedRoleIds or rolePositions.');
    }

    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    let positions: Array<{ role: string; position: number }>;
    let clampedNote: string | undefined;

    if (input.orderedRoleIds) {
      for (const roleId of input.orderedRoleIds) {
        if (!guild.roles.cache.get(roleId)) throw new RoleNotFoundError(roleId);
      }
      // Lay the listed roles out as a descending block from the top of the
      // manageable range: index 0 gets the highest position, and so on.
      const ceiling = getManageableCeiling(guild);
      positions = input.orderedRoleIds.map((roleId, i) => ({
        role: roleId,
        position: Math.max(1, ceiling - i),
      }));
      if (input.orderedRoleIds.length > ceiling) {
        clampedNote = `More roles (${input.orderedRoleIds.length}) than manageable positions (${ceiling}); the lowest-ranked entries may share the floor position.`;
      }
    } else {
      for (const { roleId } of input.rolePositions!) {
        if (!guild.roles.cache.get(roleId)) throw new RoleNotFoundError(roleId);
      }
      positions = input.rolePositions!.map((rp) => ({ role: rp.roleId, position: rp.position }));
    }

    await guild.roles.setPositions(positions);

    return {
      success: true,
      data: {
        message: `Reordered ${positions.length} role(s) successfully.`,
        note: clampedNote,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'reorder_roles');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}
