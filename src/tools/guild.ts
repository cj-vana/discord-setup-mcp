/**
 * Guild (Server) management tools
 * Tools for discovering, selecting, and inspecting Discord servers
 */

import { z } from 'zod';
import { getDiscordClient } from '../client/discord.js';
import {
  listGuilds,
  getGuildInfo,
  setCurrentGuild,
  resolveGuild,
  getCurrentGuildId,
} from '../services/guild.js';
import { wrapDiscordError } from '../utils/errors.js';

// ============================================================================
// LIST GUILDS
// ============================================================================

export const listGuildsToolDefinition = {
  name: 'list_guilds',
  description:
    'Lists all Discord servers (guilds) that the bot has access to. Use this to discover available servers before performing operations.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const ListGuildsInputSchema = z.object({});

export type ListGuildsInput = z.infer<typeof ListGuildsInputSchema>;

export async function listGuildsHandler(
  _input: ListGuildsInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guilds = listGuilds(client);

    const currentGuildId = getCurrentGuildId();

    return {
      success: true,
      data: {
        guilds,
        currentGuildId,
        totalCount: guilds.length,
        message: guilds.length === 0
          ? 'Bot is not in any Discord servers. Invite the bot to a server first.'
          : `Found ${guilds.length} server(s). Use select_guild to set the active server, or specify guildId in tool calls.`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'list_guilds');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// SELECT GUILD
// ============================================================================

export const selectGuildToolDefinition = {
  name: 'select_guild',
  description:
    'Sets the active Discord server (guild) for subsequent operations. All tools will use this server unless a different guildId is explicitly specified.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description: 'Guild ID or name to select as the active server',
      },
    },
    required: ['guildId'],
  },
};

export const SelectGuildInputSchema = z.object({
  guildId: z
    .string()
    .min(1, 'Guild ID or name is required')
    .describe('Guild ID or name to select'),
});

export type SelectGuildInput = z.infer<typeof SelectGuildInputSchema>;

export async function selectGuildHandler(
  input: SelectGuildInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();

    // Resolve the guild to verify it exists
    const guild = await resolveGuild(client, input.guildId);

    // Set as current guild
    setCurrentGuild(guild.id);

    return {
      success: true,
      data: {
        guildId: guild.id,
        guildName: guild.name,
        message: `Selected server: ${guild.name} (${guild.id}). This server will be used for subsequent operations.`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'select_guild');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}

// ============================================================================
// GET GUILD INFO
// ============================================================================

export const getGuildInfoToolDefinition = {
  name: 'get_guild_info',
  description:
    'Gets detailed information about a Discord server (guild), including channels, roles, and settings. If no guildId is specified, uses the currently selected guild.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
    },
  },
};

export const GetGuildInfoInputSchema = z.object({
  guildId: z
    .string()
    .optional()
    .describe('Guild ID or name (optional, uses current guild if not specified)'),
});

export type GetGuildInfoInput = z.infer<typeof GetGuildInfoInputSchema>;

export async function getGuildInfoHandler(
  input: GetGuildInfoInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);
    const info = await getGuildInfo(guild);

    return {
      success: true,
      data: info,
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'get_guild_info');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
