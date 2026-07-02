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
import { info } from '../utils/logger.js';
import type { ServerTemplate } from '../templates/types.js';

const TEMPLATE_IDS = 'gaming, community, business, study-group';

// ============================================================================
// LIST TEMPLATES
// ============================================================================

export const listTemplatesToolDefinition = {
  name: 'list_templates',
  description: 'Lists all available Discord server templates with their basic information.',
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to list templates';
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// PREVIEW TEMPLATE
// ============================================================================

export const previewTemplateToolDefinition = {
  name: 'preview_template',
  description:
    'Shows detailed information about a specific template including all roles, categories, and channels.',
};

export const PreviewTemplateInputSchema = z.object({
  templateId: z
    .string()
    .min(1, 'Template ID is required')
    .describe(`Template ID to preview (${TEMPLATE_IDS})`),
});

export type PreviewTemplateInput = z.infer<typeof PreviewTemplateInputSchema>;

export function previewTemplateHandler(
  input: PreviewTemplateInput
): { success: boolean; data?: unknown; error?: string } {
  try {
    if (!hasTemplate(input.templateId)) {
      throw new TemplateError(input.templateId, `Template '${input.templateId}' not found`);
    }

    const preview = getTemplatePreview(input.templateId);
    if (!preview) {
      throw new TemplateError(input.templateId, `Failed to load template '${input.templateId}'`);
    }

    return { success: true, data: preview };
  } catch (error) {
    if (error instanceof TemplateError) {
      return { success: false, error: JSON.stringify(error.toJSON()) };
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to preview template';
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// APPLY TEMPLATE
// ============================================================================

export const applyTemplateToolDefinition = {
  name: 'apply_template',
  description:
    'Applies a template to a Discord server, creating all roles, categories, and channels defined in the template. Reports per-item failures and skipped (already-existing) roles; success is false if any element failed to create.',
};

export const ApplyTemplateInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the currently selected guild.'),
  templateId: z.string().min(1, 'Template ID is required').describe(`Template ID to apply (${TEMPLATE_IDS})`),
  skipRoles: z.boolean().default(false).describe('Skip creating roles'),
  skipCategories: z.boolean().default(false).describe('Skip creating categories and channels'),
  validate: z.boolean().default(true).describe('Validate the guild before applying'),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;

export async function applyTemplateHandler(
  input: ApplyTemplateInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    if (!hasTemplate(input.templateId)) {
      throw new TemplateError(input.templateId, `Template '${input.templateId}' not found`);
    }

    const rawTemplate = getRawTemplate(input.templateId) as ServerTemplate;
    if (!rawTemplate) {
      throw new TemplateError(input.templateId, `Failed to load template '${input.templateId}'`);
    }

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
      if (validation.warnings.length > 0) {
        info('Template validation warnings:', validation.warnings.join('; '));
      }
    }

    info(`Applying template '${input.templateId}' to guild '${guild.name}'...`);

    const result = await applyTemplate(guild, rawTemplate, {
      skipRoles: input.skipRoles,
      skipCategories: input.skipCategories,
      throttleDelay: 500,
    });

    const hadFailures = result.failures.length > 0;
    const messageParts = [
      `Created ${result.rolesCreated} roles, ${result.categoriesCreated} categories, and ${result.channelsCreated} channels.`,
    ];
    if (result.rolesSkipped.length > 0) {
      messageParts.push(`Skipped ${result.rolesSkipped.length} existing role(s): ${result.rolesSkipped.join(', ')}.`);
    }
    if (result.settingsApplied.length > 0) {
      messageParts.push(`Applied settings: ${result.settingsApplied.join(', ')}.`);
    }
    if (result.settingsWarnings.length > 0) {
      messageParts.push(result.settingsWarnings.join(' '));
    }
    if (hadFailures) {
      messageParts.push(`${result.failures.length} element(s) failed.`);
    }

    return {
      success: !hadFailures,
      data: {
        templateId: input.templateId,
        guildId: guild.id,
        guildName: guild.name,
        rolesCreated: result.rolesCreated,
        categoriesCreated: result.categoriesCreated,
        channelsCreated: result.channelsCreated,
        rolesSkipped: result.rolesSkipped,
        settingsApplied: result.settingsApplied,
        settingsWarnings: result.settingsWarnings,
        failures: result.failures,
        message: `Template '${input.templateId}' applied to '${guild.name}'. ${messageParts.join(' ')}`,
      },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'apply_template');
    return { success: false, error: JSON.stringify(mcpError.toJSON()) };
  }
}
