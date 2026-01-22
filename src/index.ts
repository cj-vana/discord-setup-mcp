#!/usr/bin/env node
/**
 * Discord Server Setup MCP Server Entry Point
 *
 * This is the main entry point for the MCP server that provides tools
 * for automating Discord server setup via AppleScript on macOS.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Import tool definitions and handlers
import {
  // Template tools
  listTemplatesToolDefinition,
  previewTemplateToolDefinition,
  applyTemplateToolDefinition,
  applyTemplateFullToolDefinition,
  listTemplatesHandler,
  previewTemplateHandler,
  applyTemplateHandler,
  applyTemplateFullHandler,
  ListTemplatesInputSchema,
  PreviewTemplateInputSchema,
  ApplyTemplateInputSchema,
  ApplyTemplateFullInputSchema,
} from './tools/templates.js';

import {
  // Settings tools
  openServerSettingsToolDefinition,
  setVerificationLevelToolDefinition,
  setContentFilterToolDefinition,
  setDefaultNotificationsToolDefinition,
  openServerSettingsHandler,
  setVerificationLevelHandler,
  setContentFilterHandler,
  setDefaultNotificationsHandler,
  OpenServerSettingsInputSchema,
  SetVerificationLevelInputSchema,
  SetContentFilterInputSchema,
  SetDefaultNotificationsInputSchema,
} from './tools/settings.js';

import {
  // Server tools
  checkDiscordStatusToolDefinition,
  createServerToolDefinition,
  focusDiscordToolDefinition,
  checkDiscordStatusHandler,
  createServerHandler,
  focusDiscordHandler,
  CheckDiscordStatusInputSchema,
  CreateServerToolInputSchema,
  FocusDiscordInputSchema,
} from './tools/server.js';

import {
  // Role tools
  createRoleToolDefinition,
  editRoleToolDefinition,
  deleteRoleToolDefinition,
  reorderRolesToolDefinition,
  createRoleHandler,
  editRoleHandler,
  deleteRoleHandler,
  reorderRolesHandler,
  CreateRoleToolInputSchema,
  EditRoleInputSchema,
  DeleteRoleInputSchema,
  ReorderRolesInputSchema,
} from './tools/roles.js';

import {
  // Channel tools
  createCategoryToolDefinition,
  createChannelToolDefinition,
  deleteChannelToolDefinition,
  editChannelToolDefinition,
  createCategoryHandler,
  createChannelHandler,
  deleteChannelHandler,
  editChannelHandler,
  CreateCategoryToolInputSchema,
  CreateChannelToolInputSchema,
  DeleteChannelToolInputSchema,
  EditChannelToolInputSchema,
} from './tools/channels.js';

// Server metadata
const SERVER_NAME = 'discord-setup-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Create and configure the MCP server with all tools registered
 */
function createServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: `Discord Server Setup MCP Server

This server provides tools for automating Discord server setup on macOS using AppleScript/JXA.
It can create servers, channels, categories, roles, and configure server settings.

Available tool categories:
- Server: Check Discord status, create servers, focus Discord window
- Channels: Create/edit/delete channels and categories
- Roles: Create/edit/delete/reorder roles
- Settings: Configure verification level, content filter, notifications
- Templates: List, preview, and apply pre-built server templates (gaming, community, business, study group) with full automation support

Prerequisites:
- Discord desktop app must be installed on macOS
- System Preferences > Privacy & Security > Accessibility must include the app running this MCP server
- Discord should be logged in and visible`,
    }
  );

  // Register template tools
  registerTemplateTool(server, 'list_templates', listTemplatesToolDefinition, ListTemplatesInputSchema, listTemplatesHandler);
  registerTemplateTool(server, 'preview_template', previewTemplateToolDefinition, PreviewTemplateInputSchema, previewTemplateHandler);
  // apply_template is async and performs actual automation
  registerAsyncTool(server, 'apply_template', applyTemplateToolDefinition, ApplyTemplateInputSchema, applyTemplateHandler);
  // apply_template_full uses the TemplateExecutor with retry logic and progress tracking
  registerAsyncTool(server, 'apply_template_full', applyTemplateFullToolDefinition, ApplyTemplateFullInputSchema, applyTemplateFullHandler);

  // Register settings tools
  registerAsyncTool(server, 'open_server_settings', openServerSettingsToolDefinition, OpenServerSettingsInputSchema, openServerSettingsHandler);
  registerAsyncTool(server, 'set_verification_level', setVerificationLevelToolDefinition, SetVerificationLevelInputSchema, setVerificationLevelHandler);
  registerAsyncTool(server, 'set_content_filter', setContentFilterToolDefinition, SetContentFilterInputSchema, setContentFilterHandler);
  registerAsyncTool(server, 'set_default_notifications', setDefaultNotificationsToolDefinition, SetDefaultNotificationsInputSchema, setDefaultNotificationsHandler);

  // Register server tools
  registerAsyncTool(server, 'check_discord_status', checkDiscordStatusToolDefinition, CheckDiscordStatusInputSchema, checkDiscordStatusHandler);
  registerAsyncTool(server, 'create_server', createServerToolDefinition, CreateServerToolInputSchema, createServerHandler);
  registerAsyncTool(server, 'focus_discord', focusDiscordToolDefinition, FocusDiscordInputSchema, focusDiscordHandler);

  // Register role tools
  registerAsyncTool(server, 'create_role', createRoleToolDefinition, CreateRoleToolInputSchema, createRoleHandler);
  registerAsyncTool(server, 'edit_role', editRoleToolDefinition, EditRoleInputSchema, editRoleHandler);
  registerAsyncTool(server, 'delete_role', deleteRoleToolDefinition, DeleteRoleInputSchema, deleteRoleHandler);
  registerAsyncTool(server, 'reorder_roles', reorderRolesToolDefinition, ReorderRolesInputSchema, reorderRolesHandler);

  // Register channel tools
  registerAsyncTool(server, 'create_category', createCategoryToolDefinition, CreateCategoryToolInputSchema, createCategoryHandler);
  registerAsyncTool(server, 'create_channel', createChannelToolDefinition, CreateChannelToolInputSchema, createChannelHandler);
  registerAsyncTool(server, 'delete_channel', deleteChannelToolDefinition, DeleteChannelToolInputSchema, deleteChannelHandler);
  registerAsyncTool(server, 'edit_channel', editChannelToolDefinition, EditChannelToolInputSchema, editChannelHandler);

  return server;
}

/**
 * Helper to register an async tool with the MCP server
 */
function registerAsyncTool<T extends z.ZodTypeAny>(
  server: McpServer,
  name: string,
  definition: { name: string; description: string; inputSchema: object },
  inputSchema: T,
  handler: (input: z.infer<T>) => Promise<unknown>
): void {
  server.tool(
    name,
    definition.description,
    zodSchemaToShape(inputSchema),
    async (args) => {
      const result = await handler(args as z.infer<T>);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}

/**
 * Helper to register a synchronous template tool with the MCP server
 */
function registerTemplateTool<T extends z.ZodTypeAny>(
  server: McpServer,
  name: string,
  definition: { name: string; description: string; inputSchema: object },
  inputSchema: T,
  handler: (input: z.infer<T>) => unknown
): void {
  server.tool(
    name,
    definition.description,
    zodSchemaToShape(inputSchema),
    (args) => {
      const result = handler(args as z.infer<T>);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}

/**
 * Convert a Zod schema to a shape object for MCP tool registration
 * The MCP SDK expects a ZodRawShape (Record<string, ZodTypeAny>)
 */
function zodSchemaToShape<T extends z.ZodTypeAny>(schema: T): Record<string, z.ZodTypeAny> {
  // If it's a ZodObject, extract the shape
  if (schema instanceof z.ZodObject) {
    return schema.shape as Record<string, z.ZodTypeAny>;
  }
  // For other schemas, wrap in an object (shouldn't happen for our tools)
  return {};
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  // Connect and start the server
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with stdio transport
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
