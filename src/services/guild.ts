/**
 * Guild (Server) management service
 * Handles guild selection, resolution, and context management
 */

import { Client, Guild } from 'discord.js';
import { getConfig } from '../client/config.js';
import { GuildNotFoundError, GuildNotSelectedError } from '../utils/errors.js';

/**
 * Current guild context
 * Stores the currently selected guild ID for operations
 */
let currentGuildId: string | null = null;

/**
 * Sets the current guild context for subsequent operations
 *
 * @param guildId - The guild ID to set as current
 */
export function setCurrentGuild(guildId: string): void {
  currentGuildId = guildId;
}

/**
 * Gets the current guild context ID
 *
 * @returns The current guild ID or null if not set
 */
export function getCurrentGuildId(): string | null {
  return currentGuildId;
}

/**
 * Clears the current guild context
 */
export function clearCurrentGuild(): void {
  currentGuildId = null;
}

/**
 * Resolves a guild from an optional identifier with smart fallback logic.
 * Priority order:
 * 1. Explicit guildIdOrName parameter
 * 2. Current context guild (from setCurrentGuild)
 * 3. Default from config
 *
 * Supports lookup by:
 * - Guild ID (snowflake string)
 * - Guild name (case-insensitive)
 *
 * @param client - The Discord client instance
 * @param guildIdOrName - Optional guild ID or name
 * @returns Promise<Guild> - The resolved guild
 * @throws {GuildNotSelectedError} If no guild can be determined
 * @throws {GuildNotFoundError} If the specified guild is not found or bot lacks access
 */
export async function resolveGuild(
  client: Client,
  guildIdOrName?: string
): Promise<Guild> {
  const config = getConfig();

  // Determine target guild ID/name using priority order
  const targetId = guildIdOrName || currentGuildId || config.defaultGuildId;

  if (!targetId) {
    throw new GuildNotSelectedError(
      'No guild specified. Use list_guilds to see available servers, then select_guild to set the target, or specify guildId parameter in your tool call.'
    );
  }

  // Try lookup by ID first (most common and fastest)
  let guild = client.guilds.cache.get(targetId);

  // If not found by ID, try by name (case-insensitive)
  if (!guild) {
    guild = client.guilds.cache.find(
      (g) => g.name.toLowerCase() === targetId.toLowerCase()
    );
  }

  // If still not found, try fetching from API (in case cache is stale)
  if (!guild && /^\d{17,19}$/.test(targetId)) {
    // Looks like a snowflake ID
    try {
      guild = await client.guilds.fetch(targetId);
    } catch (error) {
      // Guild doesn't exist or bot doesn't have access
      throw new GuildNotFoundError(
        targetId,
        `Guild '${targetId}' not found. Bot may not have access to this server.`
      );
    }
  }

  if (!guild) {
    throw new GuildNotFoundError(
      targetId,
      `Guild '${targetId}' not found. Bot may not have been invited to this server. Use list_guilds to see available servers.`
    );
  }

  return guild;
}

/**
 * Lists all guilds the bot has access to
 *
 * @param client - The Discord client instance
 * @returns Array of guild information objects
 */
export function listGuilds(client: Client): Array<{
  id: string;
  name: string;
  memberCount: number;
  ownerId: string;
  description: string | null;
}> {
  return client.guilds.cache.map((guild) => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    description: guild.description,
  }));
}

/**
 * Gets detailed information about a guild
 *
 * @param guild - The guild to get information about
 * @returns Detailed guild information object
 */
export async function getGuildInfo(guild: Guild): Promise<{
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  ownerId: string;
  createdAt: Date;
  verificationLevel: number;
  explicitContentFilter: number;
  defaultMessageNotifications: number;
  features: string[];
  roles: Array<{
    id: string;
    name: string;
    color: number;
    position: number;
    permissions: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    type: number;
    parentId: string | null;
    position: number | undefined;
  }>;
}> {
  return {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt,
    verificationLevel: guild.verificationLevel,
    explicitContentFilter: guild.explicitContentFilter,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    features: guild.features,
    roles: guild.roles.cache.map((role) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
      permissions: role.permissions.bitfield.toString(),
    })),
    channels: guild.channels.cache.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId,
      position: 'position' in channel ? channel.position : undefined,
    })),
  };
}
