# CLAUDE.md

Development guide for Claude Code when working with this repository.

## Project Overview

Discord Server Setup MCP is an MCP (Model Context Protocol) server that automates Discord server setup using the Discord Bot API. It exposes tools for AI assistants to manage servers, channels, categories, roles, permissions, and server settings through a Discord bot.

## Quick Reference

```bash
npm install         # Install dependencies
npm run build       # Build with tsup (outputs to dist/)
npm run dev         # Build in watch mode
npm run start       # Run the compiled MCP server
npm run typecheck   # TypeScript type checking
```

## Architecture

### Directory Structure

```
src/
├── index.ts              # MCP server entry point, tool registration
├── client/
│   ├── discord.ts        # Discord.js client singleton & lifecycle
│   └── config.ts         # Configuration loading (token, env vars)
├── services/
│   ├── guild.ts          # Guild selection & resolution
│   └── templates.ts      # Template application orchestration
├── tools/
│   ├── guild.ts          # list_guilds, select_guild, get_guild_info
│   ├── channels.ts       # create_category, create_channel, edit_channel, delete_channel
│   ├── roles.ts          # create_role, edit_role, delete_role, reorder_roles
│   ├── settings.ts       # Server settings tools
│   └── templates.ts      # list_templates, preview_template, apply_template
├── templates/
│   ├── types.ts          # Template type definitions
│   ├── index.ts          # Template registry
│   ├── gaming.ts         # Gaming community template
│   ├── community.ts      # General community template
│   ├── business.ts       # Professional workspace template
│   └── study-group.ts    # Academic collaboration template
└── utils/
    └── errors.ts         # Custom error classes
```

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| MCP Server | `src/index.ts` | Entry point, tool registration, stdio transport |
| Discord Client | `src/client/discord.ts` | Singleton client, lazy init, auto-reconnect |
| Config | `src/client/config.ts` | Token loading from env/file |
| Guild Service | `src/services/guild.ts` | Multi-server context management |
| Template Service | `src/services/templates.ts` | Template application with rate limiting |
| Error Handling | `src/utils/errors.ts` | Discord API error mapping |

## Key Implementation Details

### Permission Name Conversion

**Important**: The API uses `SCREAMING_SNAKE_CASE` permission names (e.g., `VIEW_CHANNEL`), but discord.js uses `PascalCase` internally (e.g., `ViewChannel`).

The `snakeToPascal()` helper function converts between formats:

```typescript
// In both channels.ts and roles.ts
function snakeToPascal(str: string): string {
  return str.toLowerCase().split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

// Usage when looking up permissions
const pascalPerm = snakeToPascal('VIEW_CHANNEL'); // 'ViewChannel'
if (pascalPerm in PermissionFlagsBits) {
  permissionsBitfield |= PermissionFlagsBits[pascalPerm];
}
```

### Role Editing (Direct REST API)

The `edit_role` handler uses direct REST API calls instead of discord.js's `role.edit()` for reliability:

```typescript
const response = await fetch(
  `https://discord.com/api/v10/guilds/${guild.id}/roles/${roleId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Role Name',
      permissions: permissionsBitfield.toString(), // Must be string!
      color: 0xFF0000,
    }),
  }
);
```

### Permission Overwrites

Channel permission overwrites follow this structure:

```typescript
interface PermissionOverwrite {
  id: string;           // Role ID or User ID
  type: 'role' | 'member';
  allow?: string[];     // Permission names to allow
  deny?: string[];      // Permission names to deny
}

// Converted to Discord format:
{
  id: 'role-id',
  type: OverwriteType.Role,  // 0 for role, 1 for member
  allow: '1024',             // Bitfield as string
  deny: '0',
}
```

### Debug Logging

Debug logs are written to `/tmp/discord-mcp-debug.log`:

```typescript
const LOG_FILE = '/tmp/discord-mcp-debug.log';
function debugLog(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { appendFileSync(LOG_FILE, line); } catch {}
  console.error(msg);
}
```

## Tool Implementation Pattern

Each tool module exports:

```typescript
// 1. Tool definition (JSON Schema for MCP)
export const myToolToolDefinition = {
  name: 'my_tool',
  description: 'What the tool does',
  inputSchema: {
    type: 'object',
    properties: { /* ... */ },
    required: ['requiredField'],
  },
};

// 2. Zod schema for validation
export const MyToolInputSchema = z.object({
  guildId: z.string().optional(),
  requiredField: z.string().min(1),
});

export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// 3. Handler function
export async function myToolHandler(
  input: MyToolInput
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Perform operation
    const result = await guild.someOperation();

    return {
      success: true,
      data: { /* response data */ },
    };
  } catch (error) {
    const mcpError = wrapDiscordError(error, 'my_tool');
    return {
      success: false,
      error: JSON.stringify(mcpError.toJSON()),
    };
  }
}
```

## Guild Resolution

All guild operations use `resolveGuild()` with this priority:

1. Explicit `guildId` parameter
2. Currently selected guild (via `select_guild`)
3. Default guild from config

```typescript
const guild = await resolveGuild(client, input.guildId);
```

## Error Classes

| Error | When |
|-------|------|
| `BotNotReadyError` | Bot not connected |
| `ConfigurationError` | Missing/invalid token |
| `GuildNotFoundError` | Guild not found or no access |
| `GuildNotSelectedError` | No guild specified |
| `InsufficientPermissionsError` | Bot lacks permissions |
| `RateLimitError` | Discord rate limit hit |
| `ChannelNotFoundError` | Channel not found |
| `RoleNotFoundError` | Role not found |
| `ValidationError` | Input validation failed |
| `TemplateError` | Template not found |

## Configuration

Priority order:
1. `DISCORD_BOT_TOKEN` environment variable
2. `~/.discord-mcp/config.json` file

```typescript
interface Config {
  discordToken: string;       // Required
  defaultGuildId?: string;    // Optional default server
  rateLimit?: {
    maxRetries: number;       // Default: 3
    retryDelay: number;       // Default: 1000ms
  };
}
```

## Template System

Templates define complete server structures:

```typescript
interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  roles: TemplateRole[];
  categories: TemplateCategory[];
}

interface TemplateRole {
  name: string;
  color?: number;
  permissions?: string[];
  hoist?: boolean;
  mentionable?: boolean;
}

interface TemplateCategory {
  name: string;
  channels: TemplateChannel[];
}
```

Application strategy:
1. **Roles**: Sequential (hierarchy must be maintained)
2. **Categories**: Sequential
3. **Channels within category**: Parallel
4. **Throttling**: 500ms between batches

## Adding New Tools

1. Create or edit file in `src/tools/`
2. Define Zod schema for input validation
3. Create tool definition with JSON Schema
4. Implement async handler function
5. Register in `src/index.ts`:

```typescript
import { myToolToolDefinition, myToolHandler, MyToolInputSchema } from './tools/myfile.js';

// In createServer():
server.tool(
  myToolToolDefinition.name,
  myToolToolDefinition.description,
  myToolToolDefinition.inputSchema,
  async (params) => {
    const input = MyToolInputSchema.parse(params);
    return myToolHandler(input);
  }
);
```

## Testing

No automated tests exist. Manual testing:

```bash
npm run build
node dist/index.js
# Use Claude Desktop or Claude Code to test tools
```

Debug with log file:
```bash
tail -f /tmp/discord-mcp-debug.log
```

## Dependencies

**Production:**
- `discord.js` - Discord Bot API client
- `@modelcontextprotocol/sdk` - MCP SDK
- `zod` - Runtime type validation

**Development:**
- `typescript` - Compiler
- `tsup` - Bundler
- `@types/node` - Type definitions

## Key Constraints

1. **Bot Token Required**: Must have valid Discord bot token
2. **Bot Permissions**: Needs Manage Server, Manage Roles, Manage Channels
3. **Server Members Intent**: Must be enabled in Discord Developer Portal
4. **Role Hierarchy**: Bot can only manage roles below its highest role
5. **Rate Limits**: Discord has rate limits - template service includes throttling

## Version History

- **v2.0.0**: Complete rewrite from AppleScript to Discord Bot API
  - Cross-platform support (was macOS-only)
  - Bot token authentication (was local Discord app)
  - Added `list_guilds`, `select_guild` for multi-server support
  - Added permission overwrites for channels/categories
  - Fixed permission name conversion (SNAKE_CASE to PascalCase)
