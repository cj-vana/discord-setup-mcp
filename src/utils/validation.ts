import { z } from 'zod';

// ============================================
// Common/Shared Schemas
// ============================================

/**
 * Discord color as a hex string (e.g., "#FF5733") or integer
 */
export const ColorSchema = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format. Use #RRGGBB'),
  z.number().int().min(0).max(16777215),
]);

/**
 * Discord permission flags
 */
export const PermissionSchema = z.enum([
  'VIEW_CHANNEL',
  'MANAGE_CHANNELS',
  'MANAGE_ROLES',
  'CREATE_EXPRESSIONS',
  'MANAGE_EXPRESSIONS',
  'VIEW_AUDIT_LOG',
  'VIEW_SERVER_INSIGHTS',
  'MANAGE_WEBHOOKS',
  'MANAGE_SERVER',
  'CREATE_INVITE',
  'CHANGE_NICKNAME',
  'MANAGE_NICKNAMES',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'TIMEOUT_MEMBERS',
  'SEND_MESSAGES',
  'SEND_MESSAGES_IN_THREADS',
  'CREATE_PUBLIC_THREADS',
  'CREATE_PRIVATE_THREADS',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'ADD_REACTIONS',
  'USE_EXTERNAL_EMOJI',
  'USE_EXTERNAL_STICKERS',
  'MENTION_EVERYONE',
  'MANAGE_MESSAGES',
  'MANAGE_THREADS',
  'READ_MESSAGE_HISTORY',
  'SEND_TTS_MESSAGES',
  'USE_APPLICATION_COMMANDS',
  'SEND_VOICE_MESSAGES',
  'CONNECT',
  'SPEAK',
  'VIDEO',
  'USE_SOUNDBOARD',
  'USE_EXTERNAL_SOUNDS',
  'USE_VOICE_ACTIVITY',
  'PRIORITY_SPEAKER',
  'MUTE_MEMBERS',
  'DEAFEN_MEMBERS',
  'MOVE_MEMBERS',
  'SET_VOICE_CHANNEL_STATUS',
  'REQUEST_TO_SPEAK',
  'USE_EMBEDDED_ACTIVITIES',
  'ADMINISTRATOR',
]);

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Channel types supported by Discord
 */
export const ChannelTypeSchema = z.enum([
  'text',
  'voice',
  'announcement',
  'stage',
  'forum',
]);

export type ChannelType = z.infer<typeof ChannelTypeSchema>;

/**
 * Verification levels for servers
 */
export const VerificationLevelSchema = z.enum([
  'none',
  'low',      // Must have verified email
  'medium',   // Must be registered for 5 minutes
  'high',     // Must be member for 10 minutes
  'highest',  // Must have verified phone
]);

export type VerificationLevel = z.infer<typeof VerificationLevelSchema>;

/**
 * Explicit content filter levels
 */
export const ExplicitContentFilterSchema = z.enum([
  'disabled',       // Don't scan any messages
  'members_without_roles', // Scan messages from members without roles
  'all_members',    // Scan all messages
]);

export type ExplicitContentFilter = z.infer<typeof ExplicitContentFilterSchema>;

/**
 * Default notification settings
 */
export const DefaultNotificationsSchema = z.enum([
  'all_messages',
  'only_mentions',
]);

export type DefaultNotifications = z.infer<typeof DefaultNotificationsSchema>;

/**
 * Template types available
 */
export const TemplateTypeSchema = z.enum([
  'gaming',
  'community',
  'business',
  'study_group',
]);

export type TemplateType = z.infer<typeof TemplateTypeSchema>;

// ============================================
// Role Schemas
// ============================================

/**
 * Permission override for a specific role or member
 */
export const PermissionOverrideSchema = z.object({
  allow: z.array(PermissionSchema).optional().default([]),
  deny: z.array(PermissionSchema).optional().default([]),
});

export type PermissionOverride = z.infer<typeof PermissionOverrideSchema>;

/**
 * Schema for creating a new role
 */
export const CreateRoleInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be 100 characters or less'),
  color: ColorSchema.optional(),
  hoist: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to display role members separately'),
  mentionable: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the role can be mentioned'),
  permissions: z
    .array(PermissionSchema)
    .optional()
    .default([])
    .describe('Permissions granted to this role'),
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Position in the role hierarchy (higher = more priority)'),
});

export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

// ============================================
// Channel Schemas
// ============================================

/**
 * Channel-specific permission overwrites
 */
export const ChannelPermissionOverwriteSchema = z.object({
  roleOrMemberName: z
    .string()
    .min(1, 'Role or member name is required'),
  type: z.enum(['role', 'member']).default('role'),
  permissions: PermissionOverrideSchema,
});

export type ChannelPermissionOverwrite = z.infer<typeof ChannelPermissionOverwriteSchema>;

/**
 * Schema for creating a text channel
 */
export const CreateTextChannelInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less')
    .regex(/^[a-z0-9-_]+$/, 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores'),
  topic: z
    .string()
    .max(1024, 'Topic must be 1024 characters or less')
    .optional(),
  slowmode: z
    .number()
    .int()
    .min(0)
    .max(21600)
    .optional()
    .default(0)
    .describe('Slowmode in seconds (0-21600)'),
  nsfw: z
    .boolean()
    .optional()
    .default(false),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export type CreateTextChannelInput = z.infer<typeof CreateTextChannelInputSchema>;

/**
 * Schema for creating a voice channel
 */
export const CreateVoiceChannelInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less'),
  bitrate: z
    .number()
    .int()
    .min(8000)
    .max(384000)
    .optional()
    .default(64000)
    .describe('Bitrate in bits per second (8000-384000)'),
  userLimit: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .default(0)
    .describe('User limit (0 = unlimited, max 99)'),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
  region: z
    .string()
    .optional()
    .describe('Voice region override'),
});

export type CreateVoiceChannelInput = z.infer<typeof CreateVoiceChannelInputSchema>;

/**
 * Schema for creating an announcement channel
 */
export const CreateAnnouncementChannelInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less')
    .regex(/^[a-z0-9-_]+$/, 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores'),
  topic: z
    .string()
    .max(1024, 'Topic must be 1024 characters or less')
    .optional(),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export type CreateAnnouncementChannelInput = z.infer<typeof CreateAnnouncementChannelInputSchema>;

/**
 * Schema for creating a forum channel
 */
export const CreateForumChannelInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less')
    .regex(/^[a-z0-9-_]+$/, 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores'),
  topic: z
    .string()
    .max(1024, 'Topic must be 1024 characters or less')
    .optional()
    .describe('Forum guidelines shown when creating posts'),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
  defaultReactionEmoji: z
    .string()
    .optional()
    .describe('Default emoji for forum post reactions'),
  availableTags: z
    .array(z.object({
      name: z.string().min(1).max(20),
      emoji: z.string().optional(),
      moderated: z.boolean().optional().default(false),
    }))
    .optional()
    .default([])
    .describe('Available tags for forum posts'),
});

export type CreateForumChannelInput = z.infer<typeof CreateForumChannelInputSchema>;

/**
 * Schema for creating a stage channel
 */
export const CreateStageChannelInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less'),
  bitrate: z
    .number()
    .int()
    .min(8000)
    .max(384000)
    .optional()
    .default(64000),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export type CreateStageChannelInput = z.infer<typeof CreateStageChannelInputSchema>;

/**
 * Generic channel creation schema that accepts any channel type
 */
export const CreateChannelInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text') }).merge(CreateTextChannelInputSchema),
  z.object({ type: z.literal('voice') }).merge(CreateVoiceChannelInputSchema),
  z.object({ type: z.literal('announcement') }).merge(CreateAnnouncementChannelInputSchema),
  z.object({ type: z.literal('forum') }).merge(CreateForumChannelInputSchema),
  z.object({ type: z.literal('stage') }).merge(CreateStageChannelInputSchema),
]);

export type CreateChannelInput = z.infer<typeof CreateChannelInputSchema>;

// ============================================
// Category Schemas
// ============================================

/**
 * Schema for creating a category
 */
export const CreateCategoryInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be 100 characters or less'),
  permissionOverwrites: z
    .array(ChannelPermissionOverwriteSchema)
    .optional()
    .default([]),
  position: z
    .number()
    .int()
    .min(0)
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

// ============================================
// Server Schemas
// ============================================

/**
 * Schema for creating a new server
 */
export const CreateServerInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Server name must be at least 2 characters')
    .max(100, 'Server name must be 100 characters or less'),
  icon: z
    .string()
    .optional()
    .describe('Path to icon image file'),
  verificationLevel: VerificationLevelSchema.optional().default('none'),
  defaultNotifications: DefaultNotificationsSchema.optional().default('only_mentions'),
  explicitContentFilter: ExplicitContentFilterSchema.optional().default('disabled'),
  afkChannelName: z
    .string()
    .optional()
    .describe('Name of the AFK voice channel'),
  afkTimeout: z
    .number()
    .int()
    .min(60)
    .max(3600)
    .optional()
    .default(300)
    .describe('AFK timeout in seconds (60-3600)'),
  systemChannelName: z
    .string()
    .optional()
    .describe('Name of the system messages channel'),
  rulesChannelName: z
    .string()
    .optional()
    .describe('Name of the rules/guidelines channel'),
});

export type CreateServerInput = z.infer<typeof CreateServerInputSchema>;

/**
 * Schema for updating server settings
 */
export const UpdateServerSettingsInputSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .optional(),
  icon: z
    .string()
    .optional()
    .describe('Path to icon image file'),
  banner: z
    .string()
    .optional()
    .describe('Path to banner image file (requires boost level 2)'),
  splash: z
    .string()
    .optional()
    .describe('Path to invite splash image (requires boost level 1)'),
  description: z
    .string()
    .max(120)
    .optional()
    .describe('Server description (Community servers only)'),
  verificationLevel: VerificationLevelSchema.optional(),
  defaultNotifications: DefaultNotificationsSchema.optional(),
  explicitContentFilter: ExplicitContentFilterSchema.optional(),
  afkChannelName: z
    .string()
    .optional()
    .describe('Name of the AFK voice channel'),
  afkTimeout: z
    .number()
    .int()
    .min(60)
    .max(3600)
    .optional()
    .describe('AFK timeout in seconds'),
  systemChannelName: z
    .string()
    .optional()
    .describe('Name of the system messages channel'),
  rulesChannelName: z
    .string()
    .optional()
    .describe('Name of the rules channel'),
  preferredLocale: z
    .string()
    .optional()
    .describe('Preferred server locale (e.g., en-US)'),
  premiumProgressBar: z
    .boolean()
    .optional()
    .describe('Show boost progress bar'),
});

export type UpdateServerSettingsInput = z.infer<typeof UpdateServerSettingsInputSchema>;

// ============================================
// Template Schemas
// ============================================

/**
 * Customization options when applying a template
 */
export const TemplateCustomizationSchema = z.object({
  serverName: z
    .string()
    .min(2)
    .max(100)
    .optional()
    .describe('Override the default server name'),
  createServer: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to create a new server or apply to existing'),
  skipChannels: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Channel names to skip when creating'),
  skipRoles: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Role names to skip when creating'),
  additionalChannels: z
    .array(CreateChannelInputSchema)
    .optional()
    .default([])
    .describe('Additional channels to create beyond the template'),
  additionalRoles: z
    .array(CreateRoleInputSchema)
    .optional()
    .default([])
    .describe('Additional roles to create beyond the template'),
  roleColorOverrides: z
    .record(z.string(), ColorSchema)
    .optional()
    .default({})
    .describe('Override colors for specific roles'),
});

export type TemplateCustomization = z.infer<typeof TemplateCustomizationSchema>;

/**
 * Schema for applying a pre-built template
 */
export const ApplyTemplateInputSchema = z.object({
  templateType: TemplateTypeSchema,
  customization: TemplateCustomizationSchema.optional().default({}),
});

export type ApplyTemplateInput = z.infer<typeof ApplyTemplateInputSchema>;

// ============================================
// Bulk Operation Schemas
// ============================================

/**
 * Schema for bulk channel creation
 */
export const BulkCreateChannelsInputSchema = z.object({
  channels: z
    .array(CreateChannelInputSchema)
    .min(1, 'At least one channel is required')
    .max(50, 'Maximum 50 channels can be created at once'),
});

export type BulkCreateChannelsInput = z.infer<typeof BulkCreateChannelsInputSchema>;

/**
 * Schema for bulk role creation
 */
export const BulkCreateRolesInputSchema = z.object({
  roles: z
    .array(CreateRoleInputSchema)
    .min(1, 'At least one role is required')
    .max(25, 'Maximum 25 roles can be created at once'),
});

export type BulkCreateRolesInput = z.infer<typeof BulkCreateRolesInputSchema>;

/**
 * Schema for bulk category creation
 */
export const BulkCreateCategoriesInputSchema = z.object({
  categories: z
    .array(CreateCategoryInputSchema)
    .min(1, 'At least one category is required')
    .max(20, 'Maximum 20 categories can be created at once'),
});

export type BulkCreateCategoriesInput = z.infer<typeof BulkCreateCategoriesInputSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Validate input against a schema and return parsed result or throw
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): T {
  return schema.parse(input);
}

/**
 * Safely validate input and return result with error handling
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors into a user-friendly message
 */
export function formatValidationError(error: z.ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
      return `${path}${err.message}`;
    })
    .join('\n');
}

/**
 * Convert hex color string to integer
 */
export function hexToColorInt(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
}

/**
 * Convert color integer to hex string
 */
export function colorIntToHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
}

// ============================================
// Export all schemas for MCP tool definitions
// ============================================

export const schemas = {
  // Common
  Color: ColorSchema,
  Permission: PermissionSchema,
  ChannelType: ChannelTypeSchema,
  VerificationLevel: VerificationLevelSchema,
  ExplicitContentFilter: ExplicitContentFilterSchema,
  DefaultNotifications: DefaultNotificationsSchema,
  TemplateType: TemplateTypeSchema,

  // Roles
  PermissionOverride: PermissionOverrideSchema,
  CreateRole: CreateRoleInputSchema,

  // Channels
  ChannelPermissionOverwrite: ChannelPermissionOverwriteSchema,
  CreateTextChannel: CreateTextChannelInputSchema,
  CreateVoiceChannel: CreateVoiceChannelInputSchema,
  CreateAnnouncementChannel: CreateAnnouncementChannelInputSchema,
  CreateForumChannel: CreateForumChannelInputSchema,
  CreateStageChannel: CreateStageChannelInputSchema,
  CreateChannel: CreateChannelInputSchema,

  // Categories
  CreateCategory: CreateCategoryInputSchema,

  // Server
  CreateServer: CreateServerInputSchema,
  UpdateServerSettings: UpdateServerSettingsInputSchema,

  // Templates
  TemplateCustomization: TemplateCustomizationSchema,
  ApplyTemplate: ApplyTemplateInputSchema,

  // Bulk operations
  BulkCreateChannels: BulkCreateChannelsInputSchema,
  BulkCreateRoles: BulkCreateRolesInputSchema,
  BulkCreateCategories: BulkCreateCategoriesInputSchema,
} as const;
