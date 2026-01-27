/**
 * Channel Management Tools
 * Tools for creating, editing, and deleting channels and categories using Discord Bot API
 */

import { z } from 'zod';
import { ChannelType, GuildChannel, TextChannel, VoiceChannel, CategoryChannel } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError, ChannelNotFoundError } from '../utils/errors.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ChannelTypeSchema = z.enum(['text', 'voice', 'announcement', 'stage', 'forum'], {
  errorMap: () => ({ message: 'Invalid channel type' }),
});

const PermissionOverwriteSchema = z.object({
  id: z.string().describe('Role ID or user ID'),
  type: z.enum(['role', 'member']).describe('Whether this is a role or user override'),
  allow: z.array(z.string()).optional().describe('Permissions to allow'),
  deny: z.array(z.string()).optional().describe('Permissions to deny'),
});

// ============================================================================
// CREATE CATEGORY
// ============================================================================

export const createCategoryToolDefinition = {
  name: 'create_category',
  description:
    'Creates a new category in a Discord server. Categories organize channels into groups.',
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
        description: 'Name of the category (1-100 characters)',
      },
      position: {
        type: 'number',
        description: 'Position of the category in the channel list (optional)',
      },
    },
    required: ['name'],
  },
};

export const CreateCategoryInputSchema = z.object({
  guildId: z.string().optional(),
  name: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
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
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// CREATE CHANNEL
// ============================================================================

export const createChannelToolDefinition = {
  name: 'create_channel',
  description:
    'Creates a new channel in a Discord server. Supports text, voice, announcement, stage, and forum channels.',
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
        description: 'Name of the channel (1-100 characters)',
      },
      type: {
        type: 'string',
        enum: ['text', 'voice', 'announcement', 'stage', 'forum'],
        description: 'Type of channel to create (default: text)',
      },
      categoryId: {
        type: 'string',
        description: 'ID of the category to place this channel in (optional)',
      },
      topic: {
        type: 'string',
        description: 'Channel topic (text channels only, max 1024 characters)',
      },
      nsfw: {
        type: 'boolean',
        description: 'Whether the channel is age-restricted (default: false)',
      },
      slowmode: {
        type: 'number',
        description: 'Slowmode in seconds (text channels, 0-21600)',
      },
      bitrate: {
        type: 'number',
        description: 'Bitrate for voice channels (8000-384000)',
      },
      userLimit: {
        type: 'number',
        description: 'User limit for voice channels (0-99, 0 = unlimited)',
      },
      position: {
        type: 'number',
        description: 'Position in the channel list',
      },
    },
    required: ['name'],
  },
};

export const CreateChannelInputSchema = z.object({
  guildId: z.string().optional(),
  name: z.string().min(1).max(100),
  type: ChannelTypeSchema.default('text'),
  categoryId: z.string().optional(),
  topic: z.string().max(1024).optional(),
  nsfw: z.boolean().default(false),
  slowmode: z.number().int().min(0).max(21600).optional(),
  bitrate: z.number().int().min(8000).max(384000).optional(),
  userLimit: z.number().int().min(0).max(99).optional(),
  position: z.number().int().min(0).optional(),
});

export type CreateChannelInput = z.infer<typeof CreateChannelInputSchema>;

export async function createChannelHandler(
  input: CreateChannelInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Map our channel type to Discord.js ChannelType
    const channelTypeMap: Record<string, ChannelType> = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement,
      stage: ChannelType.GuildStageVoice,
      forum: ChannelType.GuildForum,
    };

    const discordChannelType = channelTypeMap[input.type];

    const channelOptions: any = {
      name: input.name,
      type: discordChannelType,
      parent: input.categoryId,
      topic: input.topic,
      nsfw: input.nsfw,
      rateLimitPerUser: input.slowmode,
      bitrate: input.bitrate,
      userLimit: input.userLimit,
      position: input.position,
    };

    const channel = await guild.channels.create(channelOptions);

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
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// EDIT CHANNEL
// ============================================================================

export const editChannelToolDefinition = {
  name: 'edit_channel',
  description:
    'Edits an existing channel in a Discord server. Can modify name, topic, permissions, and other settings.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      channelId: {
        type: 'string',
        description: 'ID of the channel to edit',
      },
      name: {
        type: 'string',
        description: 'New name for the channel',
      },
      topic: {
        type: 'string',
        description: 'New topic (text channels only)',
      },
      nsfw: {
        type: 'boolean',
        description: 'Whether the channel is age-restricted',
      },
      slowmode: {
        type: 'number',
        description: 'Slowmode in seconds (text channels, 0-21600)',
      },
      bitrate: {
        type: 'number',
        description: 'Bitrate for voice channels (8000-384000)',
      },
      userLimit: {
        type: 'number',
        description: 'User limit for voice channels (0-99)',
      },
      position: {
        type: 'number',
        description: 'Position in the channel list',
      },
      categoryId: {
        type: 'string',
        description: 'ID of the category to move this channel to (null to remove from category)',
      },
    },
    required: ['channelId'],
  },
};

export const EditChannelInputSchema = z.object({
  guildId: z.string().optional(),
  channelId: z.string().min(1, 'Channel ID is required'),
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(1024).optional(),
  nsfw: z.boolean().optional(),
  slowmode: z.number().int().min(0).max(21600).optional(),
  bitrate: z.number().int().min(8000).max(384000).optional(),
  userLimit: z.number().int().min(0).max(99).optional(),
  position: z.number().int().min(0).optional(),
  categoryId: z.string().nullable().optional(),
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

    // Build edit options (only include provided fields)
    const editOptions: any = {};
    if (input.name !== undefined) editOptions.name = input.name;
    if (input.topic !== undefined) editOptions.topic = input.topic;
    if (input.nsfw !== undefined) editOptions.nsfw = input.nsfw;
    if (input.slowmode !== undefined) editOptions.rateLimitPerUser = input.slowmode;
    if (input.bitrate !== undefined) editOptions.bitrate = input.bitrate;
    if (input.userLimit !== undefined) editOptions.userLimit = input.userLimit;
    if (input.position !== undefined) editOptions.position = input.position;
    if (input.categoryId !== undefined) editOptions.parent = input.categoryId;

    const updatedChannel = await channel.edit(editOptions);

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
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// DELETE CHANNEL
// ============================================================================

export const deleteChannelToolDefinition = {
  name: 'delete_channel',
  description:
    'Deletes a channel from a Discord server. This action cannot be undone.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      channelId: {
        type: 'string',
        description: 'ID of the channel to delete',
      },
    },
    required: ['channelId'],
  },
};

export const DeleteChannelInputSchema = z.object({
  guildId: z.string().optional(),
  channelId: z.string().min(1, 'Channel ID is required'),
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
      data: {
        message: `Channel "${channelName}" deleted successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'delete_channel');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
