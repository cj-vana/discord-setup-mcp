/**
 * Server Settings Tools
 * Tools for configuring Discord server settings using Discord Bot API
 */

import { z } from 'zod';
import { GuildVerificationLevel, GuildExplicitContentFilter, GuildDefaultMessageNotifications } from 'discord.js';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { wrapDiscordError } from '../utils/errors.js';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const VerificationLevelSchema = z.enum(['none', 'low', 'medium', 'high', 'very_high'], {
  errorMap: () => ({ message: 'Invalid verification level' }),
});

const ExplicitContentFilterSchema = z.enum(['disabled', 'members_without_roles', 'all_members'], {
  errorMap: () => ({ message: 'Invalid content filter level' }),
});

const DefaultNotificationsSchema = z.enum(['all_messages', 'only_mentions'], {
  errorMap: () => ({ message: 'Invalid notification setting' }),
});

// ============================================================================
// UPDATE SERVER SETTINGS
// ============================================================================

export const updateServerSettingsToolDefinition = {
  name: 'update_server_settings',
  description:
    'Updates multiple server settings at once. Can modify name, description, verification level, content filter, and default notifications.',
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
        description: 'New server name (2-100 characters)',
      },
      description: {
        type: 'string',
        description: 'New server description (max 120 characters)',
      },
      verificationLevel: {
        type: 'string',
        enum: ['none', 'low', 'medium', 'high', 'very_high'],
        description: 'Verification level for new members',
      },
      explicitContentFilter: {
        type: 'string',
        enum: ['disabled', 'members_without_roles', 'all_members'],
        description: 'Explicit content filter setting',
      },
      defaultMessageNotifications: {
        type: 'string',
        enum: ['all_messages', 'only_mentions'],
        description: 'Default notification setting for new members',
      },
    },
  },
};

export const UpdateServerSettingsInputSchema = z.object({
  guildId: z.string().optional(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(120).optional(),
  verificationLevel: VerificationLevelSchema.optional(),
  explicitContentFilter: ExplicitContentFilterSchema.optional(),
  defaultMessageNotifications: DefaultNotificationsSchema.optional(),
});

export type UpdateServerSettingsInput = z.infer<typeof UpdateServerSettingsInputSchema>;

export async function updateServerSettingsHandler(
  input: UpdateServerSettingsInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Build edit options
    const editOptions: any = {};

    if (input.name !== undefined) {
      editOptions.name = input.name;
    }

    if (input.description !== undefined) {
      editOptions.description = input.description;
    }

    if (input.verificationLevel !== undefined) {
      const verificationLevelMap = {
        none: GuildVerificationLevel.None,
        low: GuildVerificationLevel.Low,
        medium: GuildVerificationLevel.Medium,
        high: GuildVerificationLevel.High,
        very_high: GuildVerificationLevel.VeryHigh,
      };
      editOptions.verificationLevel = verificationLevelMap[input.verificationLevel];
    }

    if (input.explicitContentFilter !== undefined) {
      const contentFilterMap = {
        disabled: GuildExplicitContentFilter.Disabled,
        members_without_roles: GuildExplicitContentFilter.MembersWithoutRoles,
        all_members: GuildExplicitContentFilter.AllMembers,
      };
      editOptions.explicitContentFilter = contentFilterMap[input.explicitContentFilter];
    }

    if (input.defaultMessageNotifications !== undefined) {
      const notificationsMap = {
        all_messages: GuildDefaultMessageNotifications.AllMessages,
        only_mentions: GuildDefaultMessageNotifications.OnlyMentions,
      };
      editOptions.defaultMessageNotifications = notificationsMap[input.defaultMessageNotifications];
    }

    const updatedGuild = await guild.edit(editOptions);

    return {
      success: true,
      data: {
        id: updatedGuild.id,
        name: updatedGuild.name,
        description: updatedGuild.description,
        verificationLevel: updatedGuild.verificationLevel,
        explicitContentFilter: updatedGuild.explicitContentFilter,
        defaultMessageNotifications: updatedGuild.defaultMessageNotifications,
        message: `Server "${updatedGuild.name}" settings updated successfully`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'update_server_settings');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// SET VERIFICATION LEVEL
// ============================================================================

export const setVerificationLevelToolDefinition = {
  name: 'set_verification_level',
  description:
    'Sets the verification level required for new members to interact with the server.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      level: {
        type: 'string',
        enum: ['none', 'low', 'medium', 'high', 'very_high'],
        description:
          'Verification level: none (unrestricted), low (verified email), medium (registered for 5+ min), high (member for 10+ min), very_high (verified phone)',
      },
    },
    required: ['level'],
  },
};

export const SetVerificationLevelInputSchema = z.object({
  guildId: z.string().optional(),
  level: VerificationLevelSchema,
});

export type SetVerificationLevelInput = z.infer<typeof SetVerificationLevelInputSchema>;

export async function setVerificationLevelHandler(
  input: SetVerificationLevelInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const verificationLevelMap = {
      none: GuildVerificationLevel.None,
      low: GuildVerificationLevel.Low,
      medium: GuildVerificationLevel.Medium,
      high: GuildVerificationLevel.High,
      very_high: GuildVerificationLevel.VeryHigh,
    };

    const updatedGuild = await guild.edit({
      verificationLevel: verificationLevelMap[input.level],
    });

    return {
      success: true,
      data: {
        level: input.level,
        message: `Verification level set to "${input.level}"`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'set_verification_level');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// SET CONTENT FILTER
// ============================================================================

export const setContentFilterToolDefinition = {
  name: 'set_content_filter',
  description:
    'Sets the explicit content filter level for the server.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      level: {
        type: 'string',
        enum: ['disabled', 'members_without_roles', 'all_members'],
        description:
          'Content filter level: disabled (no scanning), members_without_roles (scan messages from members without roles), all_members (scan all messages)',
      },
    },
    required: ['level'],
  },
};

export const SetContentFilterInputSchema = z.object({
  guildId: z.string().optional(),
  level: ExplicitContentFilterSchema,
});

export type SetContentFilterInput = z.infer<typeof SetContentFilterInputSchema>;

export async function setContentFilterHandler(
  input: SetContentFilterInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const contentFilterMap = {
      disabled: GuildExplicitContentFilter.Disabled,
      members_without_roles: GuildExplicitContentFilter.MembersWithoutRoles,
      all_members: GuildExplicitContentFilter.AllMembers,
    };

    const updatedGuild = await guild.edit({
      explicitContentFilter: contentFilterMap[input.level],
    });

    return {
      success: true,
      data: {
        level: input.level,
        message: `Content filter set to "${input.level}"`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'set_content_filter');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// SET DEFAULT NOTIFICATIONS
// ============================================================================

export const setDefaultNotificationsToolDefinition = {
  name: 'set_default_notifications',
  description:
    'Sets the default notification setting for new members joining the server.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      setting: {
        type: 'string',
        enum: ['all_messages', 'only_mentions'],
        description:
          'Notification setting: all_messages (notify for all messages), only_mentions (notify only when mentioned)',
      },
    },
    required: ['setting'],
  },
};

export const SetDefaultNotificationsInputSchema = z.object({
  guildId: z.string().optional(),
  setting: DefaultNotificationsSchema,
});

export type SetDefaultNotificationsInput = z.infer<typeof SetDefaultNotificationsInputSchema>;

export async function setDefaultNotificationsHandler(
  input: SetDefaultNotificationsInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    const notificationsMap = {
      all_messages: GuildDefaultMessageNotifications.AllMessages,
      only_mentions: GuildDefaultMessageNotifications.OnlyMentions,
    };

    const updatedGuild = await guild.edit({
      defaultMessageNotifications: notificationsMap[input.setting],
    });

    return {
      success: true,
      data: {
        setting: input.setting,
        message: `Default notifications set to "${input.setting}"`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'set_default_notifications');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
