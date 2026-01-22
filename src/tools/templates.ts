/**
 * Template Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for listing, previewing, and applying server templates.
 * These tools enable users to explore pre-built server configurations and
 * apply them to create new Discord servers with full automation.
 */

import { z } from 'zod';
import {
  listTemplates,
  getTemplatePreview,
  getRawTemplate,
  hasTemplate,
  getTemplateIds,
  type TemplateSummary,
  type TemplatePreview,
  type ServerTemplate,
  type TemplateRole,
  type TemplateCategory,
  type TemplateChannel,
  ChannelType,
  DiscordPermission,
} from '../templates/index.js';
import {
  TemplateTypeSchema,
  TemplateCustomizationSchema,
  type TemplateCustomization,
  type Permission,
} from '../utils/validation.js';
import { TemplateError, wrapError } from '../utils/errors.js';
import { createServerHandler } from './server.js';
import { createCategoryHandler, createChannelHandler } from './channels.js';
import { createRoleHandler } from './roles.js';
import {
  delay,
  STANDARD_ACTION_DELAY,
  LONG_ACTION_DELAY,
  SERVER_CREATION_DELAY,
} from '../automation/waiter.js';

// ============================================
// Tool Input Schemas
// ============================================

/**
 * Schema for list_templates tool - no input required
 */
export const ListTemplatesInputSchema = z.object({}).strict();

export type ListTemplatesInput = z.infer<typeof ListTemplatesInputSchema>;

/**
 * Schema for preview_template tool
 */
export const PreviewTemplateInputSchema = z.object({
  templateId: z
    .string()
    .min(1, 'Template ID is required')
    .describe('The ID of the template to preview (e.g., "gaming", "community", "business", "study_group")'),
  includeChannels: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include channel details in the preview'),
  includeRoles: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include role details in the preview'),
});

export type PreviewTemplateInput = z.infer<typeof PreviewTemplateInputSchema>;

/**
 * Schema for apply_template tool
 */
export const ApplyTemplateInputSchema = z.object({
  templateId: TemplateTypeSchema.describe(
    'The ID of the template to apply (gaming, community, business, study_group)'
  ),
  serverName: z
    .string()
    .min(2, 'Server name must be at least 2 characters')
    .max(100, 'Server name must be 100 characters or less')
    .describe('Name for the new Discord server'),
  customization: TemplateCustomizationSchema.optional().describe(
    'Optional customization options for the template'
  ),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;

// ============================================
// Tool Response Types
// ============================================

/**
 * Response from list_templates tool
 */
export interface ListTemplatesResult {
  success: true;
  templates: TemplateSummary[];
  count: number;
}

/**
 * Response from preview_template tool
 */
export interface PreviewTemplateResult {
  success: true;
  template: TemplatePreview;
}

/**
 * Response from apply_template tool
 */
export interface ApplyTemplateResult {
  success: true;
  message: string;
  serverName: string;
  templateId: string;
  appliedRoles: string[];
  appliedCategories: string[];
  appliedChannels: string[];
  totalChannels: number;
  customization?: TemplateCustomization;
  /** Detailed execution log */
  executionLog: string[];
  /** Any warnings or non-fatal errors during execution */
  warnings: string[];
}

/**
 * Error response for template tools
 */
export interface TemplateToolError {
  success: false;
  error: string;
  code: string;
  availableTemplates?: string[];
}

// ============================================
// Tool Implementations
// ============================================

/**
 * List all available server templates
 *
 * Returns a summary of each template including name, description,
 * and counts of roles, categories, and channels.
 */
export function listTemplatesHandler(
  _input: ListTemplatesInput
): ListTemplatesResult {
  const templates = listTemplates();

  return {
    success: true,
    templates,
    count: templates.length,
  };
}

/**
 * Preview a specific template with detailed information
 *
 * Returns the full template structure including all roles, categories,
 * and channels with their configurations.
 */
export function previewTemplateHandler(
  input: PreviewTemplateInput
): PreviewTemplateResult | TemplateToolError {
  const { templateId, includeChannels, includeRoles } = input;

  // Check if template exists
  if (!hasTemplate(templateId)) {
    return {
      success: false,
      error: `Template '${templateId}' not found`,
      code: 'TEMPLATE_NOT_FOUND',
      availableTemplates: getTemplateIds(),
    };
  }

  const preview = getTemplatePreview(templateId);
  if (!preview) {
    return {
      success: false,
      error: `Failed to generate preview for template '${templateId}'`,
      code: 'PREVIEW_GENERATION_FAILED',
    };
  }

  // Optionally filter out channels or roles based on input
  const filteredPreview: TemplatePreview = {
    ...preview,
    roles: includeRoles ? preview.roles : [],
    categories: includeChannels
      ? preview.categories
      : preview.categories.map((c) => ({ ...c, channels: [] })),
  };

  return {
    success: true,
    template: filteredPreview,
  };
}

/**
 * Delay constants for template application
 */
const TEMPLATE_ROLE_DELAY = 1500; // Delay between role creations
const TEMPLATE_CATEGORY_DELAY = 1000; // Delay between category creations
const TEMPLATE_CHANNEL_DELAY = 800; // Delay between channel creations
const TEMPLATE_POST_SERVER_DELAY = 3000; // Delay after server creation before starting roles

/**
 * Apply a template to create a new Discord server
 *
 * This function executes the full Discord automation sequence:
 * 1. Creates the server using createServerHandler
 * 2. Creates all roles from the template
 * 3. Creates all categories from the template
 * 4. Creates all channels within each category
 *
 * Each step includes proper delays for UI responsiveness.
 */
export async function applyTemplateHandler(
  input: ApplyTemplateInput
): Promise<ApplyTemplateResult | TemplateToolError> {
  const { templateId, serverName, customization } = input;
  const executionLog: string[] = [];
  const warnings: string[] = [];

  // Check if template exists
  if (!hasTemplate(templateId)) {
    return {
      success: false,
      error: `Template '${templateId}' not found`,
      code: 'TEMPLATE_NOT_FOUND',
      availableTemplates: getTemplateIds(),
    };
  }

  // Get the raw template for full details
  const rawTemplate = getRawTemplate(templateId) as ServerTemplate | undefined;
  if (!rawTemplate) {
    return {
      success: false,
      error: `Failed to load template '${templateId}'`,
      code: 'TEMPLATE_LOAD_ERROR',
    };
  }

  const preview = getTemplatePreview(templateId);
  if (!preview) {
    return {
      success: false,
      error: `Failed to generate preview for template '${templateId}'`,
      code: 'PREVIEW_GENERATION_FAILED',
    };
  }

  // Apply customization filters
  const skipRoles = new Set(customization?.skipRoles ?? []);
  const skipChannels = new Set(customization?.skipChannels ?? []);
  const roleColorOverrides = customization?.roleColorOverrides ?? {};

  // Track what was successfully applied
  const appliedRoles: string[] = [];
  const appliedCategories: string[] = [];
  const appliedChannels: string[] = [];

  try {
    // ===========================================
    // Step 1: Create the server
    // ===========================================
    executionLog.push(`Starting server creation: "${serverName}"`);

    const serverResult = await createServerHandler({
      name: serverName,
      templateChoice: 'custom', // Use custom so we can add our own structure
    });

    if (!serverResult.success) {
      return {
        success: false,
        error: `Failed to create server: ${'error' in serverResult ? serverResult.error : 'Unknown error'}`,
        code: 'SERVER_CREATION_FAILED',
      };
    }

    executionLog.push(`Server "${serverName}" created successfully`);

    // Wait for server to be fully ready
    await delay(TEMPLATE_POST_SERVER_DELAY);

    // ===========================================
    // Step 2: Create roles (in reverse order so hierarchy is correct)
    // ===========================================
    executionLog.push(`Starting role creation (${rawTemplate.roles.length} roles)`);

    // Filter out roles that should be skipped
    const rolesToCreate = rawTemplate.roles.filter((r) => !skipRoles.has(r.name));

    // Create roles in reverse order (lowest hierarchy first) so higher roles can be positioned correctly
    // Skip @everyone and other built-in roles that can't be created
    const creatableRoles = rolesToCreate.filter(
      (r) => r.name !== '@everyone' && r.name !== 'everyone'
    );

    for (let i = creatableRoles.length - 1; i >= 0; i--) {
      const role = creatableRoles[i];
      const roleColor = roleColorOverrides[role.name] ?? role.color;

      executionLog.push(`Creating role: "${role.name}"`);

      try {
        const roleResult = await createRoleHandler({
          serverName,
          role: {
            name: role.name,
            color: roleColor,
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: mapPermissions(role.permissions),
          },
        });

        if (roleResult.success) {
          appliedRoles.push(role.name);
          executionLog.push(`Role "${role.name}" created successfully`);
        } else {
          const roleError = 'error' in roleResult ? roleResult.error : 'Unknown error';
          warnings.push(`Failed to create role "${role.name}": ${roleError}`);
          executionLog.push(`Warning: Failed to create role "${role.name}"`);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        warnings.push(`Error creating role "${role.name}": ${errMsg}`);
        executionLog.push(`Warning: Error creating role "${role.name}"`);
      }

      // Delay between roles to let Discord UI settle
      await delay(TEMPLATE_ROLE_DELAY);
    }

    // Add any additional roles from customization
    if (customization?.additionalRoles) {
      for (const additionalRole of customization.additionalRoles) {
        executionLog.push(`Creating additional role: "${additionalRole.name}"`);

        try {
          const roleResult = await createRoleHandler({
            serverName,
            role: additionalRole,
          });

          if (roleResult.success) {
            appliedRoles.push(additionalRole.name);
            executionLog.push(`Additional role "${additionalRole.name}" created successfully`);
          } else {
            const roleError = 'error' in roleResult ? roleResult.error : 'Unknown error';
            warnings.push(`Failed to create additional role "${additionalRole.name}": ${roleError}`);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          warnings.push(`Error creating additional role "${additionalRole.name}": ${errMsg}`);
        }

        await delay(TEMPLATE_ROLE_DELAY);
      }
    }

    // ===========================================
    // Step 3: Create categories and channels
    // ===========================================
    executionLog.push(`Starting category and channel creation (${rawTemplate.categories.length} categories)`);

    for (const category of rawTemplate.categories) {
      // Create the category
      executionLog.push(`Creating category: "${category.name}"`);

      try {
        const categoryResult = await createCategoryHandler({
          name: category.name,
          serverName,
          permissionOverwrites: [],
        });

        if (categoryResult.success) {
          appliedCategories.push(category.name);
          executionLog.push(`Category "${category.name}" created successfully`);
        } else {
          const categoryError = 'error' in categoryResult ? categoryResult.error : 'Unknown error';
          warnings.push(`Failed to create category "${category.name}": ${categoryError}`);
          executionLog.push(`Warning: Failed to create category "${category.name}"`);
          // Continue to try creating channels even if category failed
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        warnings.push(`Error creating category "${category.name}": ${errMsg}`);
        executionLog.push(`Warning: Error creating category "${category.name}"`);
      }

      await delay(TEMPLATE_CATEGORY_DELAY);

      // Create channels within this category
      const channelsToCreate = category.channels.filter((ch) => !skipChannels.has(ch.name));

      for (const channel of channelsToCreate) {
        executionLog.push(`Creating channel: "${channel.name}" (${channel.type})`);

        try {
          const channelResult = await createChannelHandler({
            name: channel.name,
            type: mapChannelType(channel.type),
            categoryName: category.name,
            topic: channel.topic,
            slowmode: channel.slowmode ?? 0,
            nsfw: channel.nsfw ?? false,
            serverName,
          });

          if (channelResult.success) {
            appliedChannels.push(channel.name);
            executionLog.push(`Channel "${channel.name}" created successfully`);
          } else {
            warnings.push(`Failed to create channel "${channel.name}": ${channelResult.error}`);
            executionLog.push(`Warning: Failed to create channel "${channel.name}"`);
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          warnings.push(`Error creating channel "${channel.name}": ${errMsg}`);
          executionLog.push(`Warning: Error creating channel "${channel.name}"`);
        }

        await delay(TEMPLATE_CHANNEL_DELAY);
      }
    }

    // ===========================================
    // Step 4: Return success result
    // ===========================================
    executionLog.push('Template application completed');

    return {
      success: true,
      message: `Template '${preview.name}' successfully applied to server '${serverName}'`,
      serverName,
      templateId,
      appliedRoles,
      appliedCategories,
      appliedChannels,
      totalChannels: appliedChannels.length,
      customization,
      executionLog,
      warnings,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Template application failed');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
    };
  }
}

/**
 * Map template ChannelType enum to the channel handler's expected type
 */
function mapChannelType(
  templateType: ChannelType
): 'text' | 'voice' | 'announcement' | 'stage' | 'forum' {
  switch (templateType) {
    case ChannelType.Text:
      return 'text';
    case ChannelType.Voice:
      return 'voice';
    case ChannelType.Announcement:
      return 'announcement';
    case ChannelType.Stage:
      return 'stage';
    case ChannelType.Forum:
      return 'forum';
    default:
      return 'text';
  }
}

/**
 * Map DiscordPermission enum values to Permission type values
 * The validation schema uses slightly different naming conventions
 */
function mapDiscordPermission(permission: DiscordPermission): Permission | null {
  const mapping: Record<DiscordPermission, Permission | null> = {
    [DiscordPermission.Administrator]: 'ADMINISTRATOR',
    [DiscordPermission.ViewChannels]: 'VIEW_CHANNEL',
    [DiscordPermission.ManageChannels]: 'MANAGE_CHANNELS',
    [DiscordPermission.ManageRoles]: 'MANAGE_ROLES',
    [DiscordPermission.ManageEmojis]: 'MANAGE_EXPRESSIONS',
    [DiscordPermission.ViewAuditLog]: 'VIEW_AUDIT_LOG',
    [DiscordPermission.ManageWebhooks]: 'MANAGE_WEBHOOKS',
    [DiscordPermission.ManageServer]: 'MANAGE_SERVER',
    [DiscordPermission.CreateInvite]: 'CREATE_INVITE',
    [DiscordPermission.ChangeNickname]: 'CHANGE_NICKNAME',
    [DiscordPermission.ManageNicknames]: 'MANAGE_NICKNAMES',
    [DiscordPermission.KickMembers]: 'KICK_MEMBERS',
    [DiscordPermission.BanMembers]: 'BAN_MEMBERS',
    [DiscordPermission.TimeoutMembers]: 'TIMEOUT_MEMBERS',
    [DiscordPermission.SendMessages]: 'SEND_MESSAGES',
    [DiscordPermission.SendMessagesInThreads]: 'SEND_MESSAGES_IN_THREADS',
    [DiscordPermission.CreatePublicThreads]: 'CREATE_PUBLIC_THREADS',
    [DiscordPermission.CreatePrivateThreads]: 'CREATE_PRIVATE_THREADS',
    [DiscordPermission.EmbedLinks]: 'EMBED_LINKS',
    [DiscordPermission.AttachFiles]: 'ATTACH_FILES',
    [DiscordPermission.AddReactions]: 'ADD_REACTIONS',
    [DiscordPermission.UseExternalEmojis]: 'USE_EXTERNAL_EMOJI',
    [DiscordPermission.UseExternalStickers]: 'USE_EXTERNAL_STICKERS',
    [DiscordPermission.MentionEveryone]: 'MENTION_EVERYONE',
    [DiscordPermission.ManageMessages]: 'MANAGE_MESSAGES',
    [DiscordPermission.ManageThreads]: 'MANAGE_THREADS',
    [DiscordPermission.ReadMessageHistory]: 'READ_MESSAGE_HISTORY',
    [DiscordPermission.SendTTSMessages]: 'SEND_TTS_MESSAGES',
    [DiscordPermission.UseApplicationCommands]: 'USE_APPLICATION_COMMANDS',
    [DiscordPermission.Connect]: 'CONNECT',
    [DiscordPermission.Speak]: 'SPEAK',
    [DiscordPermission.Video]: 'VIDEO',
    [DiscordPermission.UseActivities]: 'USE_EMBEDDED_ACTIVITIES',
    [DiscordPermission.UseSoundboard]: 'USE_SOUNDBOARD',
    [DiscordPermission.UseExternalSounds]: 'USE_EXTERNAL_SOUNDS',
    [DiscordPermission.UseVoiceActivity]: 'USE_VOICE_ACTIVITY',
    [DiscordPermission.PrioritySpeaker]: 'PRIORITY_SPEAKER',
    [DiscordPermission.MuteMembers]: 'MUTE_MEMBERS',
    [DiscordPermission.DeafenMembers]: 'DEAFEN_MEMBERS',
    [DiscordPermission.MoveMembers]: 'MOVE_MEMBERS',
    [DiscordPermission.CreateEvents]: null, // Not in validation schema
    [DiscordPermission.ManageEvents]: null, // Not in validation schema
  };

  return mapping[permission] ?? null;
}

/**
 * Map an array of DiscordPermission to Permission array
 * Filters out any permissions that don't have a mapping
 */
function mapPermissions(permissions: DiscordPermission[]): Permission[] {
  return permissions
    .map(mapDiscordPermission)
    .filter((p): p is Permission => p !== null);
}

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP tool definition for list_templates
 */
export const listTemplatesToolDefinition = {
  name: 'list_templates',
  description:
    'List all available Discord server templates. Returns a summary of each template including name, description, and counts of roles, categories, and channels.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
};

/**
 * MCP tool definition for preview_template
 */
export const previewTemplateToolDefinition = {
  name: 'preview_template',
  description:
    'Preview a specific Discord server template with detailed information about its roles, categories, and channels. Use this to understand what a template contains before applying it.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      templateId: {
        type: 'string',
        description:
          'The ID of the template to preview. Available templates: gaming, community, business, study_group',
      },
      includeChannels: {
        type: 'boolean',
        description: 'Whether to include channel details in the preview',
        default: true,
      },
      includeRoles: {
        type: 'boolean',
        description: 'Whether to include role details in the preview',
        default: true,
      },
    },
    required: ['templateId'],
  },
};

/**
 * MCP tool definition for apply_template
 */
export const applyTemplateToolDefinition = {
  name: 'apply_template',
  description:
    'Apply a pre-built template to create a new Discord server with predefined roles, categories, and channels. Templates available: gaming (for gaming communities), community (for general communities), business (for professional workspaces), study_group (for academic collaboration).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      templateId: {
        type: 'string',
        enum: ['gaming', 'community', 'business', 'study_group'],
        description: 'The ID of the template to apply',
      },
      serverName: {
        type: 'string',
        description: 'Name for the new Discord server (2-100 characters)',
        minLength: 2,
        maxLength: 100,
      },
      customization: {
        type: 'object',
        description: 'Optional customization options',
        properties: {
          skipChannels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Channel names to skip when creating',
          },
          skipRoles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Role names to skip when creating',
          },
          roleColorOverrides: {
            type: 'object',
            description: 'Override colors for specific roles (role name -> hex color)',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    required: ['templateId', 'serverName'],
  },
};

/**
 * All template tool definitions for registration with MCP server
 */
export const templateToolDefinitions = [
  listTemplatesToolDefinition,
  previewTemplateToolDefinition,
  applyTemplateToolDefinition,
];

/**
 * Handler map for template tools
 */
export const templateToolHandlers = {
  list_templates: listTemplatesHandler,
  preview_template: previewTemplateHandler,
  apply_template: applyTemplateHandler,
} as const;

/**
 * Validate and handle a template tool call
 *
 * Note: apply_template is async and performs actual Discord automation.
 * list_templates and preview_template are synchronous.
 */
export async function handleTemplateToolCall(
  toolName: string,
  args: unknown
): Promise<ListTemplatesResult | PreviewTemplateResult | ApplyTemplateResult | TemplateToolError> {
  switch (toolName) {
    case 'list_templates': {
      const parsed = ListTemplatesInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        };
      }
      return listTemplatesHandler(parsed.data);
    }

    case 'preview_template': {
      const parsed = PreviewTemplateInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
          availableTemplates: getTemplateIds(),
        };
      }
      return previewTemplateHandler(parsed.data);
    }

    case 'apply_template': {
      const parsed = ApplyTemplateInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
          availableTemplates: getTemplateIds(),
        };
      }
      // apply_template is async - execute with await
      return await applyTemplateHandler(parsed.data);
    }

    default:
      return {
        success: false,
        error: `Unknown template tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      };
  }
}
