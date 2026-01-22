/**
 * Tools Index - Exports all MCP tools for the Discord Server Setup MCP
 */

// Template tools
export {
  // Handlers
  listTemplatesHandler,
  previewTemplateHandler,
  applyTemplateHandler,
  handleTemplateToolCall,
  // Tool definitions
  listTemplatesToolDefinition,
  previewTemplateToolDefinition,
  applyTemplateToolDefinition,
  templateToolDefinitions,
  templateToolHandlers,
  // Input schemas
  ListTemplatesInputSchema,
  PreviewTemplateInputSchema,
  ApplyTemplateInputSchema,
  // Types
  type ListTemplatesInput,
  type PreviewTemplateInput,
  type ApplyTemplateInput,
  type ListTemplatesResult,
  type PreviewTemplateResult,
  type ApplyTemplateResult,
  type TemplateToolError,
} from './templates.js';

// Settings tools
export {
  // Handlers
  openServerSettingsHandler,
  setVerificationLevelHandler,
  setContentFilterHandler,
  setDefaultNotificationsHandler,
  handleSettingsToolCall,
  // Tool definitions
  openServerSettingsToolDefinition,
  setVerificationLevelToolDefinition,
  setContentFilterToolDefinition,
  setDefaultNotificationsToolDefinition,
  settingsToolDefinitions,
  settingsToolHandlers,
  // Input schemas
  OpenServerSettingsInputSchema,
  SetVerificationLevelInputSchema,
  SetContentFilterInputSchema,
  SetDefaultNotificationsInputSchema,
  // Types
  type OpenServerSettingsInput,
  type SetVerificationLevelInput,
  type SetContentFilterInput,
  type SetDefaultNotificationsInput,
  type OpenServerSettingsResult,
  type SetVerificationLevelResult,
  type SetContentFilterResult,
  type SetDefaultNotificationsResult,
  type SettingsToolError,
} from './settings.js';

// Server tools
export {
  // Handlers
  checkDiscordStatusHandler,
  createServerHandler,
  focusDiscordHandler,
  handleServerToolCall,
  // Tool definitions
  checkDiscordStatusToolDefinition,
  createServerToolDefinition,
  focusDiscordToolDefinition,
  serverToolDefinitions,
  serverToolHandlers,
  // Input schemas
  CheckDiscordStatusInputSchema,
  CreateServerToolInputSchema,
  FocusDiscordInputSchema,
  // Types
  type CheckDiscordStatusInput,
  type CreateServerToolInput,
  type FocusDiscordInput,
  type CheckDiscordStatusResult,
  type CreateServerResult,
  type FocusDiscordResult,
  type ServerToolError,
} from './server.js';

// Role tools
export {
  // Handlers
  createRoleHandler,
  editRoleHandler,
  deleteRoleHandler,
  reorderRolesHandler,
  handleRoleToolCall,
  // Tool definitions
  createRoleToolDefinition,
  editRoleToolDefinition,
  deleteRoleToolDefinition,
  reorderRolesToolDefinition,
  roleToolDefinitions,
  roleToolHandlers,
  // Input schemas
  CreateRoleToolInputSchema,
  EditRoleInputSchema,
  DeleteRoleInputSchema,
  ReorderRolesInputSchema,
  // Types
  type CreateRoleToolInput,
  type EditRoleInput,
  type DeleteRoleInput,
  type ReorderRolesInput,
  type CreateRoleResult,
  type EditRoleResult,
  type DeleteRoleResult,
  type ReorderRolesResult,
  type RoleToolError,
} from './roles.js';

// Channel tools
export {
  // Handlers
  createCategoryHandler,
  createChannelHandler,
  deleteChannelHandler,
  editChannelHandler,
  handleChannelToolCall,
  // Tool definitions
  createCategoryToolDefinition,
  createChannelToolDefinition,
  deleteChannelToolDefinition,
  editChannelToolDefinition,
  channelToolDefinitions,
  channelToolHandlers,
  // Input schemas
  CreateCategoryToolInputSchema,
  CreateChannelToolInputSchema,
  DeleteChannelToolInputSchema,
  EditChannelToolInputSchema,
  // Types
  type CreateCategoryToolInput,
  type CreateChannelToolInput,
  type DeleteChannelToolInput,
  type EditChannelToolInput,
  type CreateCategoryResult,
  type CreateChannelResult,
  type DeleteChannelResult,
  type EditChannelResult,
  type ChannelToolError,
} from './channels.js';

// Template executor (from templates/executor.ts)
// Note: TemplateExecutor functionality is now consolidated in ../templates/executor.ts
// and exposed via apply_template_full tool in templates.ts
export {
  applyTemplateFullHandler,
  applyTemplateFullToolDefinition,
  ApplyTemplateFullInputSchema,
  type ApplyTemplateFullInput,
} from './templates.js';
