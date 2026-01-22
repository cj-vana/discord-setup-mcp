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
