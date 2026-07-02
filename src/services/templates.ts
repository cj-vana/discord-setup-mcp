/**
 * Template Application Service
 * Orchestrates the application of Discord server templates.
 */

import { Guild, ChannelType, PermissionFlagsBits, OverwriteType } from 'discord.js';
import type { ServerTemplate, ChannelPermissionOverride } from '../templates/types.js';
import { resolvePermissions } from '../utils/permissions.js';
import { debug, warn } from '../utils/logger.js';

/** Delay helper for rate limiting */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Discord only accepts these AFK timeout values (seconds). */
const ALLOWED_AFK_TIMEOUTS = [60, 300, 900, 1800, 3600];

function snapAfkTimeout(seconds: number): number {
  return ALLOWED_AFK_TIMEOUTS.reduce((best, v) =>
    Math.abs(v - seconds) < Math.abs(best - seconds) ? v : best
  );
}

/** Convert hex color to integer */
function hexToColorInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Map template channel type to discord.js ChannelType */
function mapChannelType(type: string): ChannelType {
  const typeMap: Record<string, ChannelType> = {
    text: ChannelType.GuildText,
    voice: ChannelType.GuildVoice,
    announcement: ChannelType.GuildAnnouncement,
    forum: ChannelType.GuildForum,
    stage: ChannelType.GuildStageVoice,
  };
  return typeMap[type] || ChannelType.GuildText;
}

/** Build permission overwrites array for discord.js from template overrides. */
function buildPermissionOverwrites(
  overrides: ChannelPermissionOverride[] | undefined,
  roleNameToId: Map<string, string>
): Array<{ id: string; type: OverwriteType; allow: bigint; deny: bigint }> {
  if (!overrides || overrides.length === 0) return [];

  const result: Array<{ id: string; type: OverwriteType; allow: bigint; deny: bigint }> = [];

  for (const override of overrides) {
    const roleId =
      roleNameToId.get(override.role.toLowerCase()) || roleNameToId.get(override.role);

    if (!roleId) {
      warn(`Role not found for permission override: ${override.role}`);
      continue;
    }

    const allow = resolvePermissions(override.allow);
    const deny = resolvePermissions(override.deny);
    if (allow.unknown.length || deny.unknown.length) {
      warn(
        `Unknown permission(s) in override for "${override.role}": ${[...allow.unknown, ...deny.unknown].join(', ')}`
      );
    }

    result.push({
      id: roleId,
      type: OverwriteType.Role,
      allow: allow.bitfield,
      deny: deny.bitfield,
    });
  }

  return result;
}

export interface ApplyTemplateResult {
  rolesCreated: number;
  categoriesCreated: number;
  channelsCreated: number;
  rolesSkipped: string[];
  settingsApplied: string[];
  /** Non-fatal issues applying guild-level settings; do NOT flip overall success. */
  settingsWarnings: string[];
  failures: Array<{ type: 'role' | 'category' | 'channel'; name: string; error: string }>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Apply a complete template to a Discord guild.
 * Roles are created sequentially (creation order defines the hierarchy — each
 * new role is inserted just above @everyone, pushing earlier ones up, so the
 * highest-ranked role is created first). Every per-item failure is collected
 * and returned rather than silently swallowed.
 */
export async function applyTemplate(
  guild: Guild,
  template: ServerTemplate,
  options?: { skipRoles?: boolean; skipCategories?: boolean; throttleDelay?: number }
): Promise<ApplyTemplateResult> {
  const throttleDelay = options?.throttleDelay ?? 500;
  const result: ApplyTemplateResult = {
    rolesCreated: 0,
    categoriesCreated: 0,
    channelsCreated: 0,
    rolesSkipped: [],
    settingsApplied: [],
    settingsWarnings: [],
    failures: [],
  };

  // Step 1: Create roles sequentially (highest first so hierarchy is correct).
  if (!options?.skipRoles && template.roles) {
    const existingRoleNames = new Set(
      guild.roles.cache.map((r) => r.name.toLowerCase())
    );
    const sortedRoles = [...template.roles].sort((a, b) => b.position - a.position);

    for (const roleConfig of sortedRoles) {
      // Skip names that already exist — matches the validation warning and
      // avoids creating duplicate roles.
      if (existingRoleNames.has(roleConfig.name.toLowerCase())) {
        result.rolesSkipped.push(roleConfig.name);
        continue;
      }

      const perms = resolvePermissions(roleConfig.permissions);
      if (perms.unknown.length) {
        warn(`Unknown permission(s) for role "${roleConfig.name}": ${perms.unknown.join(', ')}`);
      }

      try {
        await guild.roles.create({
          name: roleConfig.name,
          color: hexToColorInt(roleConfig.color),
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          permissions: perms.bitfield,
        });
        result.rolesCreated++;
        existingRoleNames.add(roleConfig.name.toLowerCase());
        debug(`Created role: ${roleConfig.name}`);
      } catch (error) {
        result.failures.push({ type: 'role', name: roleConfig.name, error: errorMessage(error) });
        warn(`Failed to create role ${roleConfig.name}: ${errorMessage(error)}`);
      }

      await delay(throttleDelay);
    }
  }

  // Build role name -> ID map (includes pre-existing roles) for overwrites.
  const roleNameToId = new Map<string, string>();
  guild.roles.cache.forEach((role) => {
    roleNameToId.set(role.name.toLowerCase(), role.id);
  });

  // Step 2: Create categories and channels.
  if (!options?.skipCategories && template.categories) {
    for (const categoryConfig of template.categories) {
      try {
        const categoryOverwrites = buildPermissionOverwrites(
          categoryConfig.permissionOverrides,
          roleNameToId
        );

        const category = await guild.channels.create({
          name: categoryConfig.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: categoryOverwrites,
        });
        result.categoriesCreated++;
        debug(`Created category: ${categoryConfig.name}`);

        await delay(throttleDelay);

        if (categoryConfig.channels && categoryConfig.channels.length > 0) {
          // Channels within a category are created in parallel.
          const channelResults = await Promise.all(
            categoryConfig.channels.map(async (channelConfig) => {
              try {
                const channelOverwrites = buildPermissionOverwrites(
                  channelConfig.permissionOverrides,
                  roleNameToId
                );

                const channelOptions: Record<string, unknown> = {
                  name: channelConfig.name,
                  type: mapChannelType(channelConfig.type),
                  parent: category.id,
                  permissionOverwrites:
                    channelOverwrites.length > 0 ? channelOverwrites : undefined,
                };
                if (channelConfig.topic) channelOptions.topic = channelConfig.topic;
                if (channelConfig.nsfw !== undefined) channelOptions.nsfw = channelConfig.nsfw;
                if (channelConfig.slowmode !== undefined) channelOptions.rateLimitPerUser = channelConfig.slowmode;
                if ('bitrate' in channelConfig && channelConfig.bitrate !== undefined) channelOptions.bitrate = channelConfig.bitrate;
                if ('userLimit' in channelConfig && channelConfig.userLimit !== undefined) channelOptions.userLimit = channelConfig.userLimit;

                await guild.channels.create(channelOptions as any);
                debug(`Created channel: ${channelConfig.name}`);
                return true;
              } catch (error) {
                result.failures.push({ type: 'channel', name: channelConfig.name, error: errorMessage(error) });
                warn(`Failed to create channel ${channelConfig.name}: ${errorMessage(error)}`);
                return false;
              }
            })
          );
          result.channelsCreated += channelResults.filter(Boolean).length;
          await delay(throttleDelay);
        }
      } catch (error) {
        result.failures.push({ type: 'category', name: categoryConfig.name, error: errorMessage(error) });
        warn(`Failed to create category ${categoryConfig.name}: ${errorMessage(error)}`);
      }
    }
  }

  // Step 3: Apply guild-level settings (system/AFK channel + timeout) now that
  // the referenced channels exist. Previously declared in templates but never applied.
  await applyGuildSettings(guild, template, result);

  return result;
}

async function applyGuildSettings(
  guild: Guild,
  template: ServerTemplate,
  result: ApplyTemplateResult
): Promise<void> {
  const channelByName = new Map<string, string>();
  guild.channels.cache.forEach((ch) => channelByName.set(ch.name.toLowerCase(), ch.id));

  const guildEdit: Record<string, unknown> = {};
  const applied: string[] = [];

  if (template.systemChannel) {
    const id = channelByName.get(template.systemChannel.toLowerCase());
    if (id) {
      guildEdit.systemChannel = id;
      applied.push('systemChannel');
    }
  }
  if (template.afkChannel) {
    const id = channelByName.get(template.afkChannel.toLowerCase());
    if (id) {
      guildEdit.afkChannel = id;
      applied.push('afkChannel');
    }
  }
  if (template.afkTimeout !== undefined) {
    guildEdit.afkTimeout = snapAfkTimeout(template.afkTimeout);
    applied.push('afkTimeout');
  }

  if (Object.keys(guildEdit).length === 0) return;

  // Guild-level settings need MANAGE_GUILD (Manage Server), which is separate
  // from the ManageChannels/ManageRoles the template validation requires. If the
  // bot lacks it, skip rather than failing — the roles/channels were still created.
  if (guild.members.me && !guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
    result.settingsWarnings.push(
      `Skipped server settings (${applied.join(', ')}): bot lacks the Manage Server permission.`
    );
    return;
  }

  try {
    await guild.edit(guildEdit as any);
    result.settingsApplied.push(...applied);
    debug(`Applied guild settings: ${applied.join(', ')}`);
  } catch (error) {
    // Non-fatal: the server structure was still created successfully.
    result.settingsWarnings.push(`Failed to apply server settings (${applied.join(', ')}): ${errorMessage(error)}`);
    warn(`Failed to apply guild settings: ${errorMessage(error)}`);
  }
}

/**
 * Validate that a guild is suitable for template application.
 */
export function validateGuildForTemplate(
  guild: Guild,
  template: ServerTemplate
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  const existingChannelCount = guild.channels.cache.size;
  if (existingChannelCount > 10) {
    warnings.push(
      `Guild has ${existingChannelCount} existing channels. Template will add more (500 max).`
    );
  }

  const existingRoleCount = guild.roles.cache.size;
  if (existingRoleCount > 200) {
    warnings.push(
      `Guild has ${existingRoleCount} existing roles. Template will add more (250 max).`
    );
  }

  if (template.roles) {
    const existingRoleNames = guild.roles.cache.map((r) => r.name.toLowerCase());
    const conflictingRoles = template.roles
      .filter((r) => existingRoleNames.includes(r.name.toLowerCase()))
      .map((r) => r.name);
    if (conflictingRoles.length > 0) {
      warnings.push(
        `These role names already exist and will be skipped: ${conflictingRoles.join(', ')}`
      );
    }
  }

  if (template.categories) {
    const existingCategoryNames = guild.channels.cache
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .map((ch) => ch.name.toLowerCase());
    const conflictingCategories = template.categories
      .filter((c) => existingCategoryNames.includes(c.name.toLowerCase()))
      .map((c) => c.name);
    if (conflictingCategories.length > 0) {
      warnings.push(
        `These category names already exist and may cause duplicates: ${conflictingCategories.join(', ')}`
      );
    }
  }

  const botMember = guild.members.me;
  if (!botMember) {
    errors.push('Bot is not a member of this guild');
  } else {
    const requiredPermissions = [
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
    ];
    for (const perm of requiredPermissions) {
      if (!botMember.permissions.has(perm)) {
        errors.push(
          `Bot lacks required permission: ${Object.entries(PermissionFlagsBits).find(([_, v]) => v === perm)?.[0]}`
        );
      }
    }
  }

  return { valid: errors.length === 0, warnings, errors };
}
