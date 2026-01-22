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
