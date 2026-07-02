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
│   ├── roles.ts          # create_role, edit_role, delete_role, list_roles, reorder_roles
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
    ├── errors.ts         # Custom error classes
    ├── permissions.ts    # Shared permission-name -> bitfield resolution
    └── logger.ts         # Opt-in debug logging (DISCORD_MCP_DEBUG)
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

The API uses `SCREAMING_SNAKE_CASE` permission names (e.g., `VIEW_CHANNEL`), but
discord.js uses `PascalCase` keys on `PermissionFlagsBits` (e.g., `ViewChannel`).
Reconstructing case word-by-word mangles acronyms (`SEND_TTS_MESSAGES` →
`SendTtsMessages`, not the real `SendTTSMessages`), which silently dropped those
permissions. Instead, `src/utils/permissions.ts` normalizes both sides by
discarding case and separators entirely, which is acronym-proof:

```typescript
import { resolvePermissions, resolvePermissionsStrict } from '../utils/permissions.js';

// Strict: throws on unknown names — use in user-facing tools
const bitfield = resolvePermissionsStrict(['VIEW_CHANNEL', 'USE_VAD']);

// Lenient: returns { bitfield, unknown } — use in templates to warn-and-continue
const { bitfield, unknown } = resolvePermissions(perms);
```

All permission handling (roles, channel overwrites, templates) goes through this
one module — do not reintroduce a local `snakeToPascal`.

### Role REST operations (discord.js REST manager)

`create_role`/`edit_role`/reposition use discord.js's REST manager (`client.rest`)
with `Routes`, not raw `fetch`. This keeps rate-limit queueing and maps failures to
`DiscordAPIError` (which `wrapDiscordError` translates):

```typescript
import { Routes } from 'discord.js';

// create
const role = await client.rest.post(Routes.guildRoles(guild.id), { body });
// set position (bulk endpoint) — see setRolePosition() which retries once
await client.rest.patch(Routes.guildRoles(guild.id), { body: [{ id, position }] });
```

Discord's create-role endpoint ignores `position` (a new role always lands at
position 1), so placement is a create-then-reposition. Positions are inverted
(higher = more powerful, `@everyone` = 0) and clamped below the bot's highest role.

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

Logging lives in `src/utils/logger.ts`. Verbose `debug()` output is off by default
and gated behind the `DISCORD_MCP_DEBUG` env var (`1`/`true`); `info()`/`warn()`
always go to stderr (never stdout — that carries the JSON-RPC protocol):

```typescript
import { debug, info, warn } from '../utils/logger.js';

debug('create_role body', body); // only when DISCORD_MCP_DEBUG is set
warn('Unknown permission(s):', unknown.join(', '));
```

## Tool Implementation Pattern

Each tool module exports:

```typescript
// 1. Tool definition — name + description only. The advertised parameter schema
//    comes from the Zod shape's .describe() calls (see registration below);
//    there is intentionally no hand-written JSON inputSchema.
export const myToolToolDefinition = {
  name: 'my_tool',
  description: 'What the tool does',
};

// 2. Zod schema for validation AND client-facing docs (via .describe()).
export const MyToolInputSchema = z.object({
  guildId: z.string().optional().describe('Guild ID or name. Defaults to the selected guild.'),
  requiredField: z.string().min(1).describe('What this field is for'),
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
2. Define a Zod schema for input validation, using `.describe()` on each field
   (that text is what MCP clients see). The schema must be a plain `z.ZodObject`
   — no top-level `.refine()`/`.transform()`, since registration reads `.shape`.
   Do cross-field validation inside the handler instead.
3. Export a `{ name, description }` tool definition (no `inputSchema`).
4. Implement the async handler.
5. Register in `src/index.ts` via the `registerAsyncTool` / `registerSyncTool`
   helpers (they parse with the Zod schema and surface validation errors):

```typescript
import { myToolToolDefinition, myToolHandler, MyToolInputSchema } from './tools/myfile.js';

// In createServer():
registerAsyncTool(
  server,
  'my_tool',
  myToolToolDefinition,
  MyToolInputSchema,
  myToolHandler
);
```

## Testing

No automated tests exist. Manual testing:

```bash
npm run build
node dist/index.js
# Use Claude Desktop or Claude Code to test tools
```

Enable verbose tracing (to stderr):
```bash
DISCORD_MCP_DEBUG=1 node dist/index.js
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
3. **Gateway Intents**: Only the default (non-privileged) Guilds intent is used — no privileged intents required
4. **Role Hierarchy**: Bot can only manage roles below its highest role
5. **Rate Limits**: Discord has rate limits - template service includes throttling

## Version History

- **v2.1.0**: Role-hierarchy overhaul + audit fixes. `create_role` placement
  (top/above/below) and `list_roles`; `reorder_roles` `orderedRoleIds`;
  acronym-proof shared permission resolution (fixes silently-dropped `USE_VAD`/
  `SEND_TTS_MESSAGES`); `edit_channel` overwrites merge by target; template
  failure reporting + settings application; dropped privileged GuildMembers
  intent; REST via discord.js rate-limit queue; opt-in `DISCORD_MCP_DEBUG`
  logging; removed dead `validation.ts`/`rateLimit`/`inputSchema`. See CHANGELOG.md.
- **v2.0.0**: Complete rewrite from AppleScript to Discord Bot API
  - Cross-platform support (was macOS-only)
  - Bot token authentication (was local Discord app)
  - Added `list_guilds`, `select_guild` for multi-server support
  - Added permission overwrites for channels/categories
  - Fixed permission name conversion (SNAKE_CASE to PascalCase)
