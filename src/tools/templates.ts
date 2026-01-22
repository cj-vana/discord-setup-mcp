/**
 * Template Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for listing, previewing, and applying server templates.
 * These tools enable users to explore pre-built server configurations and
 * apply them to create new Discord servers.
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
} from '../templates/index.js';
import {
  TemplateTypeSchema,
  TemplateCustomizationSchema,
  type TemplateCustomization,
} from '../utils/validation.js';
import { TemplateError } from '../utils/errors.js';

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
  appliedChannels: number;
  customization?: TemplateCustomization;
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
 * Apply a template to create a new Discord server
 *
 * This prepares the template data for server creation. The actual
 * server creation is handled by the AppleScript automation layer.
 */
export function applyTemplateHandler(
  input: ApplyTemplateInput
): ApplyTemplateResult | TemplateToolError {
  const { templateId, serverName, customization } = input;

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
    throw new TemplateError(
      templateId,
      `Failed to load template '${templateId}'`
    );
  }

  // Apply customization filters
  const skipRoles = new Set(customization?.skipRoles ?? []);
  const skipChannels = new Set(customization?.skipChannels ?? []);

  // Calculate what will be applied
  const appliedRoles = preview.roles
    .filter((r) => !skipRoles.has(r.name))
    .map((r) => r.name);

  const appliedCategories = preview.categories.map((c) => c.name);

  const appliedChannels = preview.categories.reduce((total, category) => {
    const filteredChannels = category.channels.filter(
      (ch) => !skipChannels.has(ch.name)
    );
    return total + filteredChannels.length;
  }, 0);

  // Add any additional roles from customization
  if (customization?.additionalRoles) {
    appliedRoles.push(...customization.additionalRoles.map((r) => r.name));
  }

  return {
    success: true,
    message: `Template '${preview.name}' is ready to be applied to server '${serverName}'`,
    serverName,
    templateId,
    appliedRoles,
    appliedCategories,
    appliedChannels,
    customization,
  };
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
 */
export function handleTemplateToolCall(
  toolName: string,
  args: unknown
): ListTemplatesResult | PreviewTemplateResult | ApplyTemplateResult | TemplateToolError {
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
      return applyTemplateHandler(parsed.data);
    }

    default:
      return {
        success: false,
        error: `Unknown template tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      };
  }
}
