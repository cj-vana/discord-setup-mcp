/**
 * Template Tools
 * Tools for listing, previewing, and applying Discord server templates
 */

import { z } from 'zod';
import { getDiscordClient } from '../client/discord.js';
import { resolveGuild } from '../services/guild.js';
import { applyTemplate, validateGuildForTemplate } from '../services/templates.js';
import {
  listTemplates,
  getTemplatePreview,
  getRawTemplate,
  hasTemplate,
} from '../templates/index.js';
import { wrapDiscordError, TemplateError } from '../utils/errors.js';
import type { ServerTemplate } from '../templates/types.js';

// ============================================================================
// LIST TEMPLATES
// ============================================================================

export const listTemplatesToolDefinition = {
  name: 'list_templates',
  description:
    'Lists all available Discord server templates with their basic information.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const ListTemplatesInputSchema = z.object({});

export type ListTemplatesInput = z.infer<typeof ListTemplatesInputSchema>;

export function listTemplatesHandler(
  _input: ListTemplatesInput
): { success: boolean; data?: unknown; error?: string } {
  try {
    const templates = listTemplates();

    return {
      success: true,
      data: {
        templates,
        count: templates.length,
        message: `Found ${templates.length} available template(s)`,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to list templates';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// PREVIEW TEMPLATE
// ============================================================================

export const previewTemplateToolDefinition = {
  name: 'preview_template',
  description:
    'Shows detailed information about a specific template including all roles, categories, and channels.',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description:
          'Template ID (gaming, community, business, study_group)',
      },
    },
    required: ['templateId'],
  },
};

export const PreviewTemplateInputSchema = z.object({
  templateId: z
    .string()
    .min(1, 'Template ID is required')
    .describe('Template ID to preview'),
});

export type PreviewTemplateInput = z.infer<typeof PreviewTemplateInputSchema>;

export function previewTemplateHandler(
  input: PreviewTemplateInput
): { success: boolean; data?: unknown; error?: string } {
  try {
    if (!hasTemplate(input.templateId)) {
      throw new TemplateError(
        input.templateId,
        `Template '${input.templateId}' not found`
      );
    }

    const preview = getTemplatePreview(input.templateId);

    if (!preview) {
      throw new TemplateError(
        input.templateId,
        `Failed to load template '${input.templateId}'`
      );
    }

    return {
      success: true,
      data: preview,
    };
  } catch (error) {
    if (error instanceof TemplateError) {
      return {
        success: false,
        error: JSON.stringify(error.toJSON()),
      };
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to preview template';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// APPLY TEMPLATE
// ============================================================================

export const applyTemplateToolDefinition = {
  name: 'apply_template',
  description:
    'Applies a template to a Discord server, creating all roles, categories, and channels defined in the template. This is a comprehensive operation that will add many elements to the server.',
  inputSchema: {
    type: 'object',
    properties: {
      guildId: {
        type: 'string',
        description:
          'Guild ID or name. If not provided, uses the currently selected guild.',
      },
      templateId: {
        type: 'string',
        description:
          'Template ID to apply (gaming, community, business, study_group)',
      },
      skipRoles: {
        type: 'boolean',
        description: 'Skip creating roles (default: false)',
      },
      skipCategories: {
        type: 'boolean',
        description: 'Skip creating categories and channels (default: false)',
      },
      validate: {
        type: 'boolean',
        description: 'Validate guild before applying (default: true)',
      },
    },
    required: ['templateId'],
  },
};

export const ApplyTemplateInputSchema = z.object({
  guildId: z.string().optional(),
  templateId: z.string().min(1, 'Template ID is required'),
  skipRoles: z.boolean().default(false),
  skipCategories: z.boolean().default(false),
  validate: z.boolean().default(true),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;

export async function applyTemplateHandler(
  input: ApplyTemplateInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Check if template exists
    if (!hasTemplate(input.templateId)) {
      throw new TemplateError(
        input.templateId,
        `Template '${input.templateId}' not found`
      );
    }

    // Get raw template
    const rawTemplate = getRawTemplate(input.templateId) as ServerTemplate;
    if (!rawTemplate) {
      throw new TemplateError(
        input.templateId,
        `Failed to load template '${input.templateId}'`
      );
    }

    // Validate guild if requested
    if (input.validate) {
      const validation = validateGuildForTemplate(guild, rawTemplate);

      if (!validation.valid) {
        return {
          success: false,
          error: JSON.stringify({
            code: 'VALIDATION_FAILED',
            errors: validation.errors,
            warnings: validation.warnings,
            message: 'Guild validation failed. Fix errors before applying template.',
          }),
        };
      }

      // If there are warnings, include them in the response
      if (validation.warnings.length > 0) {
        console.error('Validation warnings:', validation.warnings);
      }
    }

    // Apply template
    console.error(`Applying template '${input.templateId}' to guild '${guild.name}'...`);

    const result = await applyTemplate(guild, rawTemplate, {
      skipRoles: input.skipRoles,
      skipCategories: input.skipCategories,
      throttleDelay: 500,
    });

    console.error('Template application complete!');

    return {
      success: true,
      data: {
        templateId: input.templateId,
        guildId: guild.id,
        guildName: guild.name,
        rolesCreated: result.rolesCreated,
        categoriesCreated: result.categoriesCreated,
        channelsCreated: result.channelsCreated,
        message: `Template '${input.templateId}' applied successfully to '${guild.name}'. Created ${result.rolesCreated} roles, ${result.categoriesCreated} categories, and ${result.channelsCreated} channels.`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'apply_template');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
