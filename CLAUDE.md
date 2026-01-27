# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Discord Server Setup MCP is an MCP (Model Context Protocol) server that automates Discord server setup using the Discord Bot API. It exposes tools for AI assistants to create servers, channels, categories, roles, and configure server settings by controlling Discord through a bot.

## Build and Development Commands

```bash
npm install         # Install dependencies
npm run build       # Build with tsup (outputs to dist/)
npm run dev         # Build in watch mode for development
npm run start       # Run the compiled MCP server
npm run typecheck   # Run TypeScript type checking (tsc --noEmit)
```

## Architecture

### Core Components

- **MCP Server** (`src/index.ts`): Entry point that registers all tools with the MCP SDK and handles stdio transport
- **Client Management** (`src/client/`): Discord.js client singleton with lazy initialization and config loading
- **Guild Service** (`src/services/guild.ts`): Multi-server management and guild resolution
- **Tool Implementations** (`src/tools/`): MCP tool implementations organized by domain
- **Template System** (`src/templates/`): Pre-built server configuration templates
- **Template Service** (`src/services/templates.ts`): Orchestrates template application
- **Error Handling** (`src/utils/errors.ts`): Custom error classes mapped from Discord API codes
- **Validation** (`src/utils/validation.ts`): Zod schemas for input validation (legacy, being replaced)

### Directory Structure

```
src/
├── index.ts                  # MCP server entry point, tool registration
├── client/
│   ├── discord.ts            # Discord.js client singleton & lifecycle
│   └── config.ts             # Configuration loading (token, env vars)
├── services/
│   ├── guild.ts              # Guild selection & resolution
│   └── templates.ts          # Template application orchestration
├── tools/
│   ├── index.ts              # Re-exports all tools (not currently used)
│   ├── guild.ts              # list_guilds, select_guild, get_guild_info
│   ├── channels.ts           # create_category, create_channel, edit_channel, delete_channel
│   ├── roles.ts              # create_role, edit_role, delete_role, reorder_roles
│   ├── settings.ts           # Server settings tools
│   └── templates.ts          # list_templates, preview_template, apply_template
├── templates/
│   ├── types.ts              # Template type definitions
│   ├── index.ts              # Template registry
│   ├── gaming.ts             # Gaming community template
│   ├── community.ts          # General community template
│   ├── business.ts           # Professional workspace template
│   └── study-group.ts        # Academic collaboration template
└── utils/
    └── errors.ts             # Custom error classes (Discord API error mapping)
```

### Key Patterns

**Tool Registration Pattern**: Each tool module exports:
- Tool definition (name, description, inputSchema)
- Input schema (Zod schema)
- Handler function (async for API calls, sync for local operations)

```typescript
// Example from tools/guild.ts
export const listGuildsToolDefinition = { name, description, inputSchema };
export const ListGuildsInputSchema = z.object({ ... });
export async function listGuildsHandler(input: ListGuildsInput): Promise<Result> { ... }
```

**Discord Client Access**: All Discord operations go through `src/client/discord.ts`:
- `getDiscordClient()` - Get/initialize Discord client (lazy, singleton)
- `closeDiscordClient()` - Clean shutdown on MCP server exit
- Automatic reconnection handled by discord.js
- Client uses Guilds and GuildMembers intents only

**Guild Resolution**: Multi-server support via `src/services/guild.ts`:
- `setCurrentGuild(id)` - Store context
- `resolveGuild(client, idOrName?)` - Smart resolution with priority:
  1. Explicit parameter
  2. Current context
  3. Config default
- Supports lookup by ID or name

**Error Handling**: Discord API errors mapped to user-friendly types:
- `wrapDiscordError()` maps Discord API error codes to DiscordMCPError subclasses
- Each error includes: code, message, recoverable flag, suggestion
- Common errors: GuildNotFoundError, InsufficientPermissionsError, RateLimitError

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (ES2022 target, ESNext modules)
- **Build**: tsup (fast bundler)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Discord API**: discord.js v14
- **Validation**: Zod for runtime type validation

## Key Constraints

1. **Bot Token Required**: Must have valid Discord bot token configured
2. **Bot Permissions**: Requires Manage Server, Manage Roles, Manage Channels permissions
3. **Server Members Intent**: Bot must have privileged SERVER MEMBERS INTENT enabled
4. **Rate Limits**: Discord API has rate limits - template service includes throttling
5. **Role Hierarchy**: Bot can only manage roles below its highest role

## Error Handling

Custom error classes in `src/utils/errors.ts`:
- `BotNotReadyError` - Bot not connected to Discord
- `ConfigurationError` - Missing or invalid bot token
- `GuildNotFoundError` - Guild not found or bot lacks access
- `GuildNotSelectedError` - No guild specified for operation
- `InsufficientPermissionsError` - Bot lacks required permissions
- `RateLimitError` - Discord API rate limit hit
- `ChannelNotFoundError` - Channel not found
- `RoleNotFoundError` - Role not found
- `ValidationError` - Input validation failed
- `TemplateError` - Template not found or invalid

All errors map Discord API codes to user-friendly messages with actionable suggestions.

## Configuration

The server uses environment variables or config file for bot token:
1. `DISCORD_BOT_TOKEN` environment variable (highest priority)
2. `~/.discord-mcp/config.json` file

Config schema (Zod):
```typescript
{
  discordToken: string (required)
  defaultGuildId?: string
  rateLimit?: {
    maxRetries: number (default 3)
    retryDelay: number (default 1000ms)
  }
}
```

## MCP Configuration

The server uses stdio transport. Configure in Claude Desktop at:
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "discord-setup": {
      "command": "node",
      "args": ["/path/to/discord-setup-mcp/dist/index.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-bot-token-here",
        "DISCORD_DEFAULT_GUILD_ID": "optional-default-guild-id"
      }
    }
  }
}
```

## Tool Implementation Guidelines

### Creating New Tools

1. **Add tool to appropriate file** in `src/tools/`
2. **Define Zod schema** for input validation
3. **Export tool definition** (name, description, inputSchema)
4. **Implement handler function** (async for Discord API calls)
5. **Register tool in** `src/index.ts`

### Error Handling Pattern

```typescript
export async function myToolHandler(input: MyInput): Promise<Result> {
  try {
    const client = await getDiscordClient();
    const guild = await resolveGuild(client, input.guildId);

    // Perform Discord API operation
    const result = await guild.someOperation();

    return {
      success: true,
      data: { ... },
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

### Guild Resolution Pattern

All tools that operate on a guild should:
1. Accept optional `guildId` parameter
2. Use `resolveGuild()` with smart fallback
3. Support both guild ID and name lookup

```typescript
const guild = await resolveGuild(client, input.guildId);
// Uses: input.guildId → current context → config default
```

## Template System

Templates define complete server structures with roles, categories, and channels.

### Template Structure

```typescript
interface ServerTemplate {
  id: string
  name: string
  description: string
  roles: TemplateRole[]
  categories: TemplateCategory[]
}
```

### Template Application Strategy

The `applyTemplate()` function uses hybrid execution:
1. **Roles**: Sequential (hierarchy must be maintained)
2. **Categories**: Sequential (one at a time)
3. **Channels within category**: Parallel (independent)
4. **Throttling**: 500ms delay between batches to avoid rate limits

### Adding New Templates

1. Create template file in `src/templates/`
2. Define roles with permissions and hierarchy
3. Define categories with nested channels
4. Export template constant
5. Register in `src/templates/index.ts`

## Testing

No automated tests currently exist. Manual testing requires:
1. Discord bot created and configured
2. Bot invited to test server with full permissions
3. Bot token set in environment or config
4. MCP server built and running

**Test workflow:**
```bash
npm run build
node dist/index.js
# Use Claude Desktop or other MCP client to test tools
```

## Common Development Tasks

### Adding a New Tool

1. Create or edit file in `src/tools/`
2. Define Zod schema for input
3. Create tool definition object
4. Implement async handler function
5. Import and register in `src/index.ts`
6. Build and test

### Modifying Error Handling

1. Edit `src/utils/errors.ts`
2. Add new error class extending `DiscordMCPError`
3. Update `wrapDiscordError()` to map Discord API codes
4. Add error code to `ErrorCodes` constant

### Adding a Guild Operation

1. Add service function in `src/services/guild.ts` if needed
2. Create tool in `src/tools/guild.ts`
3. Use `resolveGuild()` for guild resolution
4. Handle errors with `wrapDiscordError()`

## Dependencies

**Production:**
- `discord.js` - Discord Bot API client
- `@modelcontextprotocol/sdk` - MCP SDK
- `zod` - Runtime type validation

**Development:**
- `typescript` - TypeScript compiler
- `tsup` - Fast bundler
- `@types/node` - Node.js type definitions

## Deployment

The MCP server is distributed as compiled JavaScript in `dist/`.

**Build for production:**
```bash
npm run build
```

**Run in production:**
```bash
node dist/index.js
```

The server requires `DISCORD_BOT_TOKEN` to be set via environment variable or config file.

## Migration Notes

This is version 2.0.0, a complete rewrite from AppleScript-based UI automation to Discord Bot API.

### Breaking Changes from 1.x

1. **Platform**: Now cross-platform (was macOS-only)
2. **Authentication**: Requires bot token (was local Discord app)
3. **New tools**: `list_guilds`, `select_guild` required for multi-server workflow
4. **Removed tools**: `check_discord_status`, `focus_discord`, `create_server` (bot API doesn't support server creation in same way)

### Preserved Patterns

- Tool registration pattern unchanged
- Input/output JSON format unchanged
- Error message structure similar
- Template data structure unchanged
