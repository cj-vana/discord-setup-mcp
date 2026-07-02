/**
 * Channel Management Tools
 * Create, edit, and delete channels and categories.
 */

import { z } from 'zod';
import { ChannelType, OverwriteType } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError, ChannelNotFoundError } from '../utils/errors.js';
import { resolvePermissionsStrict } from '../utils/permissions.js';

// ============================================================================
// SHARED SCHEMAS / HELPERS
// ============================================================================

const ChannelTypeSchema = z.enum(['text', 'voice', 'announcement', 'stage', 'forum'], {
  errorMap: () => ({ message: 'Invalid channel type' }),
});

const PermissionOverwriteSchema = z.object({
  id: z.string().describe('Role ID or user ID this overwrite applies to'),
  type: z.enum(['role', 'member']).describe('Whether id refers to a role or a member'),
  allow: z.array(z.string()).optional().describe('Permission names to allow (SCREAMING_SNAKE_CASE)'),
  deny: z.array(z.string()).optional().describe('Permission names to deny (SCREAMING_SNAKE_CASE)'),
});

type PermissionOverwriteInput = z.infer<typeof PermissionOverwriteSchema>;

interface DiscordOverwrite {
  id: string;
  type: OverwriteType;
  allow: bigint;
  deny: bigint;
}

/** Convert a caller overwrite to discord.js form, rejecting unknown perms. */
function toDiscordOverwrite(overwrite: PermissionOverwriteInput): DiscordOverwrite {
  return {
    id: overwrite.id,
    type: overwrite.type === 'role' ? OverwriteType.Role : OverwriteType.Member,
    allow: resolvePermissionsStrict(overwrite.allow ?? []),
    deny: resolvePermissionsStrict(overwrite.deny ?? []),
  };
}

function buildOverwrites(overwrites: PermissionOverwriteInput[] | undefined): DiscordOverwrite[] | undefined {
  if (!overwrites) return undefined;
  return overwrites.map(toDiscordOverwrite);
}

// ============================================================================
// CREATE CATEGORY
// ============================================================================

export const createCategoryToolDefinition = {
  name: 'create_category',
  description:
    'Creates a new category in a Discord server. Categories organize channels into groups.',
};

export const CreateCategoryInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  name: z.string().min(1).max(100).describe('Name of the category (1-100 characters)'),
  position: z.number().int().min(0).optional().describe('Position of the category in the channel list'),
  permissionOverwrites: z
    .array(PermissionOverwriteSchema)
    .optional()
    .describe('Permission overwrites for roles/users. Use this to make the category private.'),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export async function createCategoryHandler(
  input: CreateCategoryInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const category = await guild.channels.create({
      name: input.name,
      type: ChannelType.GuildCategory,
      position: input.position,
      permissionOverwrites: buildOverwrites(input.permissionOverwrites),
    });

    return {
      success: true,
      data: {
        id: category.id,
        name: category.name,
        type: 'category',
        position: category.position,
        message: `Category "${category.name}" created successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'create_category');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// CREATE CHANNEL
// ============================================================================

export const createChannelToolDefinition = {
  name: 'create_channel',
  description:
    'Creates a new channel in a Discord server. Supports text, voice, announcement, stage, and forum channels.',
};

export const CreateChannelInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  name: z.string().min(1).max(100).describe('Name of the channel (1-100 characters)'),
  type: ChannelTypeSchema.default('text').describe('Channel type (default: text)'),
  categoryId: z.string().optional().describe('ID of the category to place this channel in'),
  topic: z.string().max(1024).optional().describe('Channel topic (text channels, max 1024 chars)'),
  nsfw: z.boolean().default(false).describe('Whether the channel is age-restricted'),
  slowmode: z.number().int().min(0).max(21600).optional().describe('Slowmode in seconds (0-21600)'),
  bitrate: z.number().int().min(8000).max(384000).optional().describe('Bitrate for voice channels (8000-384000)'),
  userLimit: z.number().int().min(0).max(99).optional().describe('User limit for voice channels (0-99, 0 = unlimited)'),
  position: z.number().int().min(0).optional().describe('Position in the channel list'),
  permissionOverwrites: z
    .array(PermissionOverwriteSchema)
    .optional()
    .describe('Permission overwrites for roles/users.'),
});

export type CreateChannelInput = z.infer<typeof CreateChannelInputSchema>;

export async function createChannelHandler(
  input: CreateChannelInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const channelTypeMap: Record<string, ChannelType> = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement,
      stage: ChannelType.GuildStageVoice,
      forum: ChannelType.GuildForum,
    };

    const channel = await guild.channels.create({
      name: input.name,
      type: channelTypeMap[input.type] as any,
      parent: input.categoryId,
      topic: input.topic,
      nsfw: input.nsfw,
      rateLimitPerUser: input.slowmode,
      bitrate: input.bitrate,
      userLimit: input.userLimit,
      position: input.position,
      permissionOverwrites: buildOverwrites(input.permissionOverwrites),
    });

    return {
      success: true,
      data: {
        id: channel.id,
        name: channel.name,
        type: input.type,
        categoryId: channel.parentId,
        position: channel.position,
        message: `Channel "${channel.name}" created successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'create_channel');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// EDIT CHANNEL
// ============================================================================

export const editChannelToolDefinition = {
  name: 'edit_channel',
  description:
    'Edits an existing channel. permissionOverwrites are MERGED by target by default (overwrites for the given roles/users are added or replaced; overwrites for other targets are left untouched) so you can grant one role access without exposing the channel. Set replaceAllOverwrites:true to replace the entire overwrite set instead.',
};

export const EditChannelInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  channelId: z.string().min(1, 'Channel ID is required').describe('ID of the channel to edit'),
  name: z.string().min(1).max(100).optional().describe('New name for the channel'),
  topic: z.string().max(1024).optional().describe('New topic (text channels only)'),
  nsfw: z.boolean().optional().describe('Whether the channel is age-restricted'),
  slowmode: z.number().int().min(0).max(21600).optional().describe('Slowmode in seconds (0-21600)'),
  bitrate: z.number().int().min(8000).max(384000).optional().describe('Bitrate for voice channels (8000-384000)'),
  userLimit: z.number().int().min(0).max(99).optional().describe('User limit for voice channels (0-99)'),
  position: z.number().int().min(0).optional().describe('Position in the channel list'),
  categoryId: z.string().nullable().optional().describe('Category ID to move this channel to (null to remove from category)'),
  permissionOverwrites: z
    .array(PermissionOverwriteSchema)
    .optional()
    .describe('Permission overwrites to apply. Merged by target unless replaceAllOverwrites is true.'),
  replaceAllOverwrites: z
    .boolean()
    .default(false)
    .describe('If true, replace the channel\'s entire overwrite set instead of merging by target.'),
});

export type EditChannelInput = z.infer<typeof EditChannelInputSchema>;

export async function editChannelHandler(
  input: EditChannelInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const channel = guild.channels.cache.get(input.channelId);
    if (!channel) {
      throw new ChannelNotFoundError(input.channelId);
    }

    const editOptions: Record<string, unknown> = {};
    if (input.name !== undefined) editOptions.name = input.name;
    if (input.topic !== undefined) editOptions.topic = input.topic;
    if (input.nsfw !== undefined) editOptions.nsfw = input.nsfw;
    if (input.slowmode !== undefined) editOptions.rateLimitPerUser = input.slowmode;
    if (input.bitrate !== undefined) editOptions.bitrate = input.bitrate;
    if (input.userLimit !== undefined) editOptions.userLimit = input.userLimit;
    if (input.position !== undefined) editOptions.position = input.position;
    if (input.categoryId !== undefined) editOptions.parent = input.categoryId;

    if (input.permissionOverwrites !== undefined) {
      const provided = input.permissionOverwrites.map(toDiscordOverwrite);

      if (input.replaceAllOverwrites) {
        editOptions.permissionOverwrites = provided;
      } else {
        // Merge by target: keep existing overwrites for targets not named here,
        // replace/add overwrites for the targets that are named. This prevents
        // silently wiping (e.g.) an @everyone deny and exposing the channel.
        const merged = new Map<string, DiscordOverwrite>();
        if ('permissionOverwrites' in channel) {
          for (const existing of channel.permissionOverwrites.cache.values()) {
            merged.set(existing.id, {
              id: existing.id,
              type: existing.type,
              allow: existing.allow.bitfield,
              deny: existing.deny.bitfield,
            });
          }
        }
        for (const ow of provided) merged.set(ow.id, ow);
        editOptions.permissionOverwrites = [...merged.values()];
      }
    }

    const updatedChannel = await channel.edit(editOptions as any);

    return {
      success: true,
      data: {
        id: updatedChannel.id,
        name: updatedChannel.name,
        type: updatedChannel.type,
        message: `Channel "${updatedChannel.name}" updated successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'edit_channel');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}

// ============================================================================
// DELETE CHANNEL
// ============================================================================

export const deleteChannelToolDefinition = {
  name: 'delete_channel',
  description: 'Deletes a channel from a Discord server. This action cannot be undone.',
};

export const DeleteChannelInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  channelId: z.string().min(1, 'Channel ID is required').describe('ID of the channel to delete'),
});

export type DeleteChannelInput = z.infer<typeof DeleteChannelInputSchema>;

export async function deleteChannelHandler(
  input: DeleteChannelInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const channel = guild.channels.cache.get(input.channelId);
    if (!channel) {
      throw new ChannelNotFoundError(input.channelId);
    }

    const channelName = channel.name;
    await channel.delete();

    return {
      success: true,
      data: { message: `Channel "${channelName}" deleted successfully` },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'delete_channel');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}
