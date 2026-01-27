/**
 * Template Application Service
 * Orchestrates the application of Discord server templates using discord.js API
 */

import { Guild, ChannelType, PermissionFlagsBits } from 'discord.js';
import type { ServerTemplate, TemplateRole, TemplateCategory, TemplateChannel } from '../templates/types.js';

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert template permission strings to discord.js permission bitfield
 */
function convertPermissions(permissions: string[]): bigint {
  let bitfield = BigInt(0);

  for (const perm of permissions) {
    // Map template permission names to PermissionFlagsBits
    const permKey = perm as keyof typeof PermissionFlagsBits;
    if (permKey in PermissionFlagsBits) {
      bitfield |= PermissionFlagsBits[permKey];
    }
  }

  return bitfield;
}

/**
 * Convert hex color to integer
 */
function hexToColorInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Map template channel type to discord.js ChannelType
 */
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

/**
 * Apply a complete template to a Discord guild
 * Uses a hybrid execution strategy:
 * - Roles: Sequential (hierarchy matters)
 * - Categories: Parallel (independent)
 * - Channels: Parallel within categories
 *
 * @param guild - The Discord guild to apply the template to
 * @param template - The template to apply
 * @param options - Optional configuration for template application
 */
export async function applyTemplate(
  guild: Guild,
  template: ServerTemplate,
  options?: {
    skipRoles?: boolean;
    skipCategories?: boolean;
    throttleDelay?: number;
  }
): Promise<{
  rolesCreated: number;
  categoriesCreated: number;
  channelsCreated: number;
}> {
  const throttleDelay = options?.throttleDelay || 500;
  let rolesCreated = 0;
  let categoriesCreated = 0;
  let channelsCreated = 0;

  // Step 1: Create roles sequentially (hierarchy matters)
  if (!options?.skipRoles && template.roles) {
    console.error(`Creating ${template.roles.length} roles...`);

    // Sort roles by position (highest first) to maintain hierarchy
    const sortedRoles = [...template.roles].sort((a, b) => b.position - a.position);

    for (const roleConfig of sortedRoles) {
      try {
        await guild.roles.create({
          name: roleConfig.name,
          color: hexToColorInt(roleConfig.color),
          hoist: roleConfig.hoist,
          mentionable: roleConfig.mentionable,
          permissions: convertPermissions(roleConfig.permissions),
          position: roleConfig.position,
        });
        rolesCreated++;
        console.error(`  ✓ Created role: ${roleConfig.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to create role ${roleConfig.name}:`, error);
      }

      // Throttle to avoid rate limits
      await delay(throttleDelay);
    }
  }

  // Step 2: Create categories and channels
  if (!options?.skipCategories && template.categories) {
    console.error(`Creating ${template.categories.length} categories...`);

    for (const categoryConfig of template.categories) {
      try {
        // Create category
        const category = await guild.channels.create({
          name: categoryConfig.name,
          type: ChannelType.GuildCategory,
        });
        categoriesCreated++;
        console.error(`  ✓ Created category: ${categoryConfig.name}`);

        await delay(throttleDelay);

        // Create channels in this category (can be done in parallel)
        if (categoryConfig.channels && categoryConfig.channels.length > 0) {
          console.error(`    Creating ${categoryConfig.channels.length} channels in ${categoryConfig.name}...`);

          const channelPromises = categoryConfig.channels.map(async (channelConfig) => {
            try {
              const channelOptions: any = {
                name: channelConfig.name,
                type: mapChannelType(channelConfig.type),
                parent: category.id,
              };

              // Add type-specific options
              if (channelConfig.topic) {
                channelOptions.topic = channelConfig.topic;
              }

              if (channelConfig.nsfw !== undefined) {
                channelOptions.nsfw = channelConfig.nsfw;
              }

              if (channelConfig.slowmode !== undefined) {
                channelOptions.rateLimitPerUser = channelConfig.slowmode;
              }

              if ('bitrate' in channelConfig && channelConfig.bitrate !== undefined) {
                channelOptions.bitrate = channelConfig.bitrate;
              }

              if ('userLimit' in channelConfig && channelConfig.userLimit !== undefined) {
                channelOptions.userLimit = channelConfig.userLimit;
              }

              await guild.channels.create(channelOptions);
              channelsCreated++;
              console.error(`      ✓ Created channel: ${channelConfig.name}`);
            } catch (error) {
              console.error(`      ✗ Failed to create channel ${channelConfig.name}:`, error);
            }
          });

          // Wait for all channels in this category to be created
          await Promise.all(channelPromises);
          await delay(throttleDelay);
        }
      } catch (error) {
        console.error(`  ✗ Failed to create category ${categoryConfig.name}:`, error);
      }
    }
  }

  return {
    rolesCreated,
    categoriesCreated,
    channelsCreated,
  };
}

/**
 * Validate that a guild is suitable for template application
 * Checks for existing channels/roles that might conflict
 */
export function validateGuildForTemplate(
  guild: Guild,
  template: ServerTemplate
): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if guild has many existing channels
  const existingChannelCount = guild.channels.cache.size;
  if (existingChannelCount > 10) {
    warnings.push(
      `Guild has ${existingChannelCount} existing channels. Template will add more channels, which may exceed Discord limits (500 max).`
    );
  }

  // Check if guild has many existing roles
  const existingRoleCount = guild.roles.cache.size;
  if (existingRoleCount > 200) {
    warnings.push(
      `Guild has ${existingRoleCount} existing roles. Template will add more roles, which may exceed Discord limits (250 max).`
    );
  }

  // Check for role name conflicts
  if (template.roles) {
    const existingRoleNames = guild.roles.cache.map((r) => r.name.toLowerCase());
    const conflictingRoles = template.roles
      .filter((r) => existingRoleNames.includes(r.name.toLowerCase()))
      .map((r) => r.name);

    if (conflictingRoles.length > 0) {
      warnings.push(
        `The following role names already exist and will be skipped: ${conflictingRoles.join(', ')}`
      );
    }
  }

  // Check for category name conflicts
  if (template.categories) {
    const existingCategoryNames = guild.channels.cache
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .map((ch) => ch.name.toLowerCase());

    const conflictingCategories = template.categories
      .filter((c) => existingCategoryNames.includes(c.name.toLowerCase()))
      .map((c) => c.name);

    if (conflictingCategories.length > 0) {
      warnings.push(
        `The following category names already exist and may cause conflicts: ${conflictingCategories.join(', ')}`
      );
    }
  }

  // Check bot permissions
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

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
