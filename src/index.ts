/**
 * Discord Server Setup MCP Server Entry Point
 *
 * This is the main entry point for the MCP server that provides tools
 * for automating Discord server setup via the Discord Bot API.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { closeDiscordClient } from './client/discord.js';

// Import guild tools
import {
  listGuildsToolDefinition,
  selectGuildToolDefinition,
  getGuildInfoToolDefinition,
  listGuildsHandler,
  selectGuildHandler,
  getGuildInfoHandler,
  ListGuildsInputSchema,
  SelectGuildInputSchema,
  GetGuildInfoInputSchema,
} from './tools/guild.js';

// Import channel tools
import {
  createCategoryToolDefinition,
  createChannelToolDefinition,
  editChannelToolDefinition,
  deleteChannelToolDefinition,
  createCategoryHandler,
  createChannelHandler,
  editChannelHandler,
  deleteChannelHandler,
  CreateCategoryInputSchema,
  CreateChannelInputSchema,
  EditChannelInputSchema,
  DeleteChannelInputSchema,
} from './tools/channels.js';

// Import role tools
import {
  createRoleToolDefinition,
  editRoleToolDefinition,
  deleteRoleToolDefinition,
  reorderRolesToolDefinition,
  createRoleHandler,
  editRoleHandler,
  deleteRoleHandler,
  reorderRolesHandler,
  CreateRoleInputSchema,
  EditRoleInputSchema,
  DeleteRoleInputSchema,
  ReorderRolesInputSchema,
} from './tools/roles.js';

// Import settings tools
import {
  updateServerSettingsToolDefinition,
  setVerificationLevelToolDefinition,
  setContentFilterToolDefinition,
  setDefaultNotificationsToolDefinition,
  updateServerSettingsHandler,
  setVerificationLevelHandler,
  setContentFilterHandler,
  setDefaultNotificationsHandler,
  UpdateServerSettingsInputSchema,
  SetVerificationLevelInputSchema,
  SetContentFilterInputSchema,
  SetDefaultNotificationsInputSchema,
} from './tools/settings.js';

// Import template tools
import {
  listTemplatesToolDefinition,
  previewTemplateToolDefinition,
  applyTemplateToolDefinition,
  listTemplatesHandler,
  previewTemplateHandler,
  applyTemplateHandler,
  ListTemplatesInputSchema,
  PreviewTemplateInputSchema,
  ApplyTemplateInputSchema,
} from './tools/templates.js';

// Server metadata
const SERVER_NAME = 'discord-setup-mcp';
const SERVER_VERSION = '2.0.0'; // Major version bump for discord.js rewrite

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

This server provides tools for automating Discord server setup using the Discord Bot API.
It can discover servers, create/manage channels, create/manage roles, configure settings, and apply templates.

Available tool categories:
- Guild: List servers, select active server, get server info
- Channels: Create/edit/delete channels and categories
- Roles: Create/edit/delete/reorder roles
- Settings: Configure server verification, content filter, notifications
- Templates: Apply pre-built server templates (gaming, community, business, study-group)

Prerequisites:
- Discord bot created at https://discord.com/developers/applications
- Bot token configured via DISCORD_BOT_TOKEN environment variable or ~/.discord-mcp/config.json
- Bot invited to Discord server(s) with appropriate permissions (Manage Server, Manage Roles, Manage Channels)

Setup Instructions:
1. Create a Discord application at https://discord.com/developers/applications
2. Add a bot user and copy the bot token
3. Set DISCORD_BOT_TOKEN environment variable or create ~/.discord-mcp/config.json with your token
4. Generate OAuth2 URL with bot scope and required permissions
5. Invite bot to your Discord server(s)

Workflow:
1. Use list_guilds to see available servers
2. Use select_guild to set the active server
3. Use other tools to manage channels, roles, etc.`,
    }
  );

  // Register guild tools
  registerAsyncTool(
    server,
    'list_guilds',
    listGuildsToolDefinition,
    ListGuildsInputSchema,
    listGuildsHandler
  );
  registerAsyncTool(
    server,
    'select_guild',
    selectGuildToolDefinition,
    SelectGuildInputSchema,
    selectGuildHandler
  );
  registerAsyncTool(
    server,
    'get_guild_info',
    getGuildInfoToolDefinition,
    GetGuildInfoInputSchema,
    getGuildInfoHandler
  );

  // Register channel tools
  registerAsyncTool(
    server,
    'create_category',
    createCategoryToolDefinition,
    CreateCategoryInputSchema,
    createCategoryHandler
  );
  registerAsyncTool(
    server,
    'create_channel',
    createChannelToolDefinition,
    CreateChannelInputSchema,
    createChannelHandler
  );
  registerAsyncTool(
    server,
    'edit_channel',
    editChannelToolDefinition,
    EditChannelInputSchema,
    editChannelHandler
  );
  registerAsyncTool(
    server,
    'delete_channel',
    deleteChannelToolDefinition,
    DeleteChannelInputSchema,
    deleteChannelHandler
  );

  // Register role tools
  registerAsyncTool(
    server,
    'create_role',
    createRoleToolDefinition,
    CreateRoleInputSchema,
    createRoleHandler
  );
  registerAsyncTool(
    server,
    'edit_role',
    editRoleToolDefinition,
    EditRoleInputSchema,
    editRoleHandler
  );
  registerAsyncTool(
    server,
    'delete_role',
    deleteRoleToolDefinition,
    DeleteRoleInputSchema,
    deleteRoleHandler
  );
  registerAsyncTool(
    server,
    'reorder_roles',
    reorderRolesToolDefinition,
    ReorderRolesInputSchema,
    reorderRolesHandler
  );

  // Register settings tools
  registerAsyncTool(
    server,
    'update_server_settings',
    updateServerSettingsToolDefinition,
    UpdateServerSettingsInputSchema,
    updateServerSettingsHandler
  );
  registerAsyncTool(
    server,
    'set_verification_level',
    setVerificationLevelToolDefinition,
    SetVerificationLevelInputSchema,
    setVerificationLevelHandler
  );
  registerAsyncTool(
    server,
    'set_content_filter',
    setContentFilterToolDefinition,
    SetContentFilterInputSchema,
    setContentFilterHandler
  );
  registerAsyncTool(
    server,
    'set_default_notifications',
    setDefaultNotificationsToolDefinition,
    SetDefaultNotificationsInputSchema,
    setDefaultNotificationsHandler
  );

  // Register template tools
  registerSyncTool(
    server,
    'list_templates',
    listTemplatesToolDefinition,
    ListTemplatesInputSchema,
    listTemplatesHandler
  );
  registerSyncTool(
    server,
    'preview_template',
    previewTemplateToolDefinition,
    PreviewTemplateInputSchema,
    previewTemplateHandler
  );
  registerAsyncTool(
    server,
    'apply_template',
    applyTemplateToolDefinition,
    ApplyTemplateInputSchema,
    applyTemplateHandler
  );

  return server;
}

/**
 * Helper function to register a synchronous tool (no async operations)
 */
function registerSyncTool<T extends z.ZodObject<any>>(
  server: McpServer,
  name: string,
  definition: { name: string; description: string; inputSchema: unknown },
  schema: T,
  handler: (input: z.infer<T>) => {
    success: boolean;
    data?: unknown;
    error?: string;
  }
): void {
  server.tool(
    definition.name,
    definition.description,
    schema.shape,
    (params: unknown) => {
      try {
        // Validate input
        const parseResult = schema.safeParse(params);
        if (!parseResult.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Validation error: ${parseResult.error.message}`,
                }),
              },
            ],
          };
        }

        // Execute handler
        const result = handler(parseResult.data);

        // Return result
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        // Catch unexpected errors
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: errorMessage,
              }),
            },
          ],
        };
      }
    }
  );
}

/**
 * Helper function to register an async tool that performs Discord operations
 */
function registerAsyncTool<T extends z.ZodObject<any>>(
  server: McpServer,
  name: string,
  definition: { name: string; description: string; inputSchema: unknown },
  schema: T,
  handler: (input: z.infer<T>) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>
): void {
  server.tool(
    definition.name,
    definition.description,
    schema.shape,
    async (params: unknown) => {
      try {
        // Validate input
        const parseResult = schema.safeParse(params);
        if (!parseResult.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Validation error: ${parseResult.error.message}`,
                }),
              },
            ],
          };
        }

        // Execute handler
        const result = await handler(parseResult.data);

        // Return result
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        // Catch unexpected errors
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: errorMessage,
              }),
            },
          ],
        };
      }
    }
  );
}

/**
 * Main entry point
 */
async function main() {
  // Create server
  const server = createServer();
  const transport = new StdioServerTransport();

  console.error('Discord Server Setup MCP Server starting...');

  // Connect server to transport
  await server.connect(transport);

  console.error(
    'Discord Server Setup MCP Server running on stdio. Bot will connect on first tool call.'
  );

  // Graceful shutdown handling
  const shutdown = async () => {
    console.error('Shutting down Discord MCP Server...');
    try {
      await closeDiscordClient();
      console.error('Discord client closed successfully');
    } catch (error) {
      console.error('Error closing Discord client:', error);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run the server
main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
