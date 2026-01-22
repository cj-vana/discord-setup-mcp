# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Discord Server Setup MCP is an MCP (Model Context Protocol) server that automates Discord server setup on macOS using AppleScript/JXA automation. It exposes tools for AI assistants to create servers, channels, categories, roles, and configure server settings by controlling the Discord desktop application.

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
- **Automation Layer** (`src/automation/`): AppleScript/JXA execution engine for controlling Discord
- **Tools** (`src/tools/`): MCP tool implementations organized by domain
- **Templates** (`src/templates/`): Pre-built server configuration templates
- **Utils** (`src/utils/`): Validation schemas (Zod) and error handling

### Directory Structure

```
src/
├── index.ts              # MCP server entry point, tool registration
├── automation/
│   ├── executor.ts       # AppleScript execution with timeout/error handling
│   ├── discord.ts        # Discord-specific automation (click, type, navigate)
│   └── waiter.ts         # Timing and delay utilities
├── tools/
│   ├── index.ts          # Re-exports all tools
│   ├── server.ts         # check_discord_status, create_server, focus_discord
│   ├── channels.ts       # create_category, create_channel, edit/delete_channel
│   ├── roles.ts          # create_role, edit_role, delete_role, reorder_roles
│   ├── settings.ts       # Server settings (verification, content filter, etc.)
│   └── templates.ts      # list_templates, preview_template, apply_template
├── templates/
│   ├── types.ts          # Template type definitions
│   ├── index.ts          # Template registry
│   ├── gaming.ts         # Gaming community template
│   ├── community.ts      # General community template
│   ├── business.ts       # Professional workspace template
│   └── study-group.ts    # Academic collaboration template
└── utils/
    ├── errors.ts         # Custom error classes (DiscordNotRunning, etc.)
    └── validation.ts     # Zod schemas for all inputs
```

### Key Patterns

**Tool Registration Pattern**: Each tool module exports:
- Tool definition (name, description, inputSchema)
- Input schema (Zod schema)
- Handler function (async for automation, sync for templates)

```typescript
// Example from tools/server.ts
export const checkDiscordStatusToolDefinition = { name, description, inputSchema };
export const CheckDiscordStatusInputSchema = z.object({ ... });
export async function checkDiscordStatusHandler(input: CheckDiscordStatusInput): Promise<Result> { ... }
```

**AppleScript Execution**: All Discord automation goes through `src/automation/executor.ts`:
- `executeAppleScript(script, options)` - Run AppleScript code
- `executeJXA(script, options)` - Run JavaScript for Automation
- Built-in timeout handling (default 30s)
- Error parsing and custom error types

**Validation**: All inputs validated with Zod schemas in `src/utils/validation.ts`:
- Comprehensive schemas for roles, channels, categories, servers
- Validation helpers: `validateInput()`, `safeValidateInput()`, `formatValidationError()`

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (ES2022 target, ESNext modules)
- **Build**: tsup (fast bundler)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod for runtime type validation
- **Automation**: macOS AppleScript/JXA via osascript

## Key Constraints

1. **macOS Only**: AppleScript automation requires macOS
2. **Desktop App Required**: Only works with Discord desktop app (not web)
3. **Visual Automation**: Discord must be visible on screen during operations
4. **Accessibility Permissions**: The running app needs Accessibility access in System Preferences
5. **Single Server Context**: Operations work on the currently active/selected server

## Error Handling

Custom error classes in `src/utils/errors.ts`:
- `DiscordNotRunningError` - Discord app not running
- `AccessibilityDeniedError` - Missing Accessibility permissions
- `UIElementNotFoundError` - Cannot find expected UI element
- `TimeoutError` - Operation timed out
- `DiscordStateError` - Discord in unexpected state

## Testing

No automated tests currently exist. Manual testing requires:
1. Discord desktop app installed and logged in
2. Accessibility permissions granted
3. Discord visible on screen

## MCP Configuration

The server uses stdio transport. Configure in Claude Desktop at:
`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "discord-setup": {
      "command": "node",
      "args": ["/path/to/discord-setup-mcp/dist/index.js"]
    }
  }
}
```
