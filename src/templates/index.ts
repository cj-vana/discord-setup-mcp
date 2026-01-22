/**
 * Template Registry - Unified interface for all Discord server templates
 *
 * This module exports all available templates with a consistent interface
 * and provides utility functions for listing, previewing, and retrieving templates.
 */

import { gamingTemplate } from './gaming.js';
import { communityTemplate } from './community.js';
import { businessTemplate } from './business.js';
import { studyGroupTemplate } from './study-group.js';

/**
 * Unified template interface that normalizes the different template structures
 */
export interface UnifiedTemplate {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Description of the template's purpose */
  description: string;
  /** Target use case or audience */
  useCase?: string;
  /** Icon for the template (emoji or identifier) */
  icon?: string;
  /** Number of roles in the template */
  roleCount: number;
  /** Number of categories in the template */
  categoryCount: number;
  /** Number of channels in the template */
  channelCount: number;
  /** List of role names */
  roleNames: string[];
  /** List of category names */
  categoryNames: string[];
  /** The raw template data for applying */
  rawTemplate: unknown;
}

/**
 * Template summary for listing
 */
export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  roleCount: number;
  categoryCount: number;
  channelCount: number;
}

/**
 * Detailed template preview
 */
export interface TemplatePreview extends TemplateSummary {
  useCase?: string;
  icon?: string;
  roles: Array<{
    name: string;
    color: string;
    hoist: boolean;
    mentionable: boolean;
  }>;
  categories: Array<{
    name: string;
    channels: Array<{
      name: string;
      type: string;
      topic?: string;
    }>;
  }>;
}

/**
 * Normalize the gaming template to unified format
 */
function normalizeGamingTemplate(): UnifiedTemplate {
  const channelCount = gamingTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    id: gamingTemplate.id,
    name: gamingTemplate.name,
    description: gamingTemplate.description,
    useCase: gamingTemplate.useCase,
    roleCount: gamingTemplate.roles.length,
    categoryCount: gamingTemplate.categories.length,
    channelCount,
    roleNames: gamingTemplate.roles.map((r) => r.name),
    categoryNames: gamingTemplate.categories.map((c) => c.name),
    rawTemplate: gamingTemplate,
  };
}

/**
 * Normalize the community template to unified format
 */
function normalizeCommunityTemplate(): UnifiedTemplate {
  const channelCount = communityTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    id: communityTemplate.id,
    name: communityTemplate.name,
    description: communityTemplate.description,
    roleCount: communityTemplate.roles.length,
    categoryCount: communityTemplate.categories.length,
    channelCount,
    roleNames: communityTemplate.roles.map((r) => r.name),
    categoryNames: communityTemplate.categories.map((c) => c.name),
    rawTemplate: communityTemplate,
  };
}

/**
 * Normalize the business template to unified format
 */
function normalizeBusinessTemplate(): UnifiedTemplate {
  const channelCount = businessTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    id: businessTemplate.id,
    name: businessTemplate.name,
    description: businessTemplate.description,
    icon: businessTemplate.icon,
    roleCount: businessTemplate.roles.length,
    categoryCount: businessTemplate.categories.length,
    channelCount,
    roleNames: businessTemplate.roles.map((r) => r.name),
    categoryNames: businessTemplate.categories.map((c) => c.name),
    rawTemplate: businessTemplate,
  };
}

/**
 * Normalize the study group template to unified format
 */
function normalizeStudyGroupTemplate(): UnifiedTemplate {
  const channelCount = studyGroupTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    id: studyGroupTemplate.id,
    name: studyGroupTemplate.name,
    description: studyGroupTemplate.description,
    roleCount: studyGroupTemplate.roles.length,
    categoryCount: studyGroupTemplate.categories.length,
    channelCount,
    roleNames: studyGroupTemplate.roles.map((r) => r.name),
    categoryNames: studyGroupTemplate.categories.map((c) => c.name),
    rawTemplate: studyGroupTemplate,
  };
}

/**
 * Registry of all available templates
 */
const templateRegistry: Map<string, UnifiedTemplate> = new Map([
  ['gaming', normalizeGamingTemplate()],
  ['community', normalizeCommunityTemplate()],
  ['business', normalizeBusinessTemplate()],
  ['study_group', normalizeStudyGroupTemplate()],
]);

/**
 * Get all available template IDs
 */
export function getTemplateIds(): string[] {
  return Array.from(templateRegistry.keys());
}

/**
 * Get a template by ID
 */
export function getTemplate(id: string): UnifiedTemplate | undefined {
  return templateRegistry.get(id);
}

/**
 * Check if a template exists
 */
export function hasTemplate(id: string): boolean {
  return templateRegistry.has(id);
}

/**
 * List all templates with basic info
 */
export function listTemplates(): TemplateSummary[] {
  return Array.from(templateRegistry.values()).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    roleCount: template.roleCount,
    categoryCount: template.categoryCount,
    channelCount: template.channelCount,
  }));
}

/**
 * Get a detailed preview of a template
 */
export function getTemplatePreview(id: string): TemplatePreview | undefined {
  const template = templateRegistry.get(id);
  if (!template) {
    return undefined;
  }

  // Extract roles and categories from raw template
  const rawTemplate = template.rawTemplate as {
    roles: Array<{
      name: string;
      color: string;
      hoist: boolean;
      mentionable: boolean;
    }>;
    categories: Array<{
      name: string;
      channels: Array<{
        name: string;
        type: string;
        topic?: string;
      }>;
    }>;
  };

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    useCase: template.useCase,
    icon: template.icon,
    roleCount: template.roleCount,
    categoryCount: template.categoryCount,
    channelCount: template.channelCount,
    roles: rawTemplate.roles.map((r) => ({
      name: r.name,
      color: typeof r.color === 'string' ? r.color : '#000000',
      hoist: r.hoist,
      mentionable: r.mentionable,
    })),
    categories: rawTemplate.categories.map((c) => ({
      name: c.name,
      channels: c.channels.map((ch) => ({
        name: ch.name,
        type: ch.type,
        topic: ch.topic,
      })),
    })),
  };
}

/**
 * Get the raw template data for applying
 */
export function getRawTemplate(id: string): unknown | undefined {
  const template = templateRegistry.get(id);
  return template?.rawTemplate;
}

// Re-export individual templates for direct access
export { gamingTemplate } from './gaming.js';
export { communityTemplate } from './community.js';
export { businessTemplate } from './business.js';
export { studyGroupTemplate } from './study-group.js';

// Re-export types from types.ts
export * from './types.js';
