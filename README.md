# Discord Server Setup MCP

An MCP (Model Context Protocol) server for automating Discord server setup on macOS using AppleScript/JXA. This server exposes tools for creating servers, channels, categories, roles, and configuring server settings through AI assistants like Claude.

## Features

- **Server Management**: Create new Discord servers, check Discord status, and focus the Discord window
- **Channel Management**: Create, edit, and delete text, voice, announcement, stage, and forum channels
- **Category Management**: Create and organize channel categories
- **Role Management**: Create, edit, delete, and reorder server roles with full permission control
- **Server Settings**: Configure verification levels, content filters, and notification settings
- **Pre-built Templates**: 4 ready-to-use server templates for common use cases

## Pre-built Templates

| Template | Description | Roles | Categories | Channels |
|----------|-------------|-------|------------|----------|
| **Gaming** | Comprehensive gaming community with competitive, streaming, and events sections | 10 | 11 | 40+ |
| **Community** | General community server for discussions and social interaction | 6 | 6 | 20+ |
| **Business** | Professional workspace for teams and organizations | 6 | 6 | 18+ |
| **Study Group** | Academic collaboration space for study groups and classes | 5 | 5 | 15+ |

## Prerequisites

### System Requirements

- **macOS** (required for AppleScript automation)
- **Node.js** 18.0.0 or higher
- **Discord Desktop App** (not the web version)

### Permissions Setup

This MCP server uses AppleScript to automate the Discord desktop application. For this to work, you must grant Accessibility permissions to the application running the MCP server.

1. Open **System Preferences** (or **System Settings** on macOS Ventura+)
2. Navigate to **Privacy & Security** > **Accessibility**
3. Click the lock icon to make changes
4. Add and enable the application that will run this MCP server:
   - If using **Claude Desktop**: Add Claude Desktop
   - If using **Terminal**: Add Terminal.app
   - If using **VS Code**: Add Visual Studio Code
   - If using a custom client: Add that application

### Discord Setup

1. **Install Discord Desktop App** from [discord.com](https://discord.com/download)
2. **Log in** to your Discord account
3. **Keep Discord visible** on screen during automation
4. Ensure Discord has a **visible window** (not minimized)

## Installation

### From npm (when published)

```bash
npm install -g discord-setup-mcp
```

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/discord-setup-mcp.git
cd discord-setup-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

Or if installed globally:

```json
{
  "mcpServers": {
    "discord-setup": {
      "command": "discord-setup-mcp"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, configure the server with:

- **Command**: `node`
- **Arguments**: `["/path/to/discord-setup-mcp/dist/index.js"]`
- **Transport**: `stdio`

## Available Tools

### Server Tools

| Tool | Description |
|------|-------------|
| `check_discord_status` | Check if Discord is running and focused |
| `create_server` | Create a new Discord server with optional template |
| `focus_discord` | Bring Discord to the foreground |

### Channel Tools

| Tool | Description |
|------|-------------|
| `create_category` | Create a new category to organize channels |
| `create_channel` | Create a text, voice, announcement, stage, or forum channel |
| `edit_channel` | Modify channel settings (name, topic, slowmode, etc.) |
| `delete_channel` | Delete a channel (requires confirmation) |

### Role Tools

| Tool | Description |
|------|-------------|
| `create_role` | Create a new role with custom color and permissions |
| `edit_role` | Modify an existing role's properties |
| `delete_role` | Delete a role (requires confirmation) |
| `reorder_roles` | Change the hierarchy order of roles |

### Settings Tools

| Tool | Description |
|------|-------------|
| `open_server_settings` | Open the server settings panel |
| `set_verification_level` | Set member verification requirements |
| `set_content_filter` | Configure explicit content scanning |
| `set_default_notifications` | Set default notification preferences |

### Template Tools

| Tool | Description |
|------|-------------|
| `list_templates` | List all available server templates |
| `preview_template` | Preview a template's roles and channels |
| `apply_template` | Apply a template to create a new server |

## Usage Examples

### Checking Discord Status

Before performing any operations, verify Discord is running:

```
User: Check if Discord is ready for automation

Claude: I'll check the Discord status for you.
[Uses check_discord_status tool]

Discord is running and focused with 1 window(s). Main window: "Discord"
```

### Creating a Server from a Template

```
User: Create a new Discord server for my gaming community called "Epic Gamers Hub"

Claude: I'll help you create a gaming community server.

First, let me preview the gaming template to show you what it includes...
[Uses preview_template tool with templateId: "gaming"]

The gaming template includes:
- 10 roles (Owner, Admin, Moderator, Event Host, Streamer, VIP, etc.)
- 11 categories (Welcome, General, Gaming Discussion, Competitive, Voice Channels, etc.)
- 40+ channels organized by purpose

Now I'll create the server...
[Uses apply_template tool with templateId: "gaming", serverName: "Epic Gamers Hub"]
```

### Creating Custom Channels

```
User: Add a voice channel called "Music Lounge" to my server

Claude: I'll create that voice channel for you.
[Uses create_channel tool with name: "Music Lounge", type: "voice"]

Voice channel 'Music Lounge' created successfully.
```

### Managing Roles

```
User: Create a "Content Creator" role with a purple color that appears separately in the member list

Claude: I'll create that role for you.
[Uses create_role tool]

Role configuration:
- Name: Content Creator
- Color: #9B59B6 (purple)
- Hoist: true (displays separately)
- Mentionable: true

Successfully created role 'Content Creator'.
```

### Configuring Server Settings

```
User: Set the verification level to medium and enable content scanning for all members

Claude: I'll configure those security settings.

First, opening server settings...
[Uses open_server_settings tool]

Setting verification level to medium (requires registered for 5+ minutes)...
[Uses set_verification_level tool with level: "medium"]

Enabling content scanning for all members...
[Uses set_content_filter tool with level: "all_members"]

Server security settings updated:
- Verification: Medium (registered 5+ minutes)
- Content filter: Scanning all members
```

## Tool Reference

### check_discord_status

Checks if Discord is running and ready for automation.

**Parameters**: None

**Returns**:
- `isRunning`: Whether Discord is running
- `isFrontmost`: Whether Discord is the active window
- `windowCount`: Number of Discord windows
- `mainWindowTitle`: Title of the main window

---

### create_server

Creates a new Discord server.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Server name (2-100 characters) |
| `templateChoice` | string | No | Discord template: `gaming`, `friends`, `club`, `study`, `artists`, `local`, or `custom` (default) |

---

### create_channel

Creates a new channel in the server.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Channel name (1-100 characters) |
| `type` | string | No | Channel type: `text` (default), `voice`, `announcement`, `stage`, `forum` |
| `categoryName` | string | No | Category to place the channel in |
| `topic` | string | No | Channel topic (max 1024 characters) |
| `slowmode` | number | No | Slowmode in seconds (0-21600) |
| `nsfw` | boolean | No | Age-restricted channel |
| `bitrate` | number | No | Voice channel bitrate (8000-384000) |
| `userLimit` | number | No | Voice channel user limit (0-99) |

---

### create_role

Creates a new role in the server.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `serverName` | string | Yes | Name of the server |
| `role.name` | string | Yes | Role name (1-100 characters) |
| `role.color` | string | No | Hex color code (e.g., `#FF0000`) |
| `role.hoist` | boolean | No | Display separately in member list |
| `role.mentionable` | boolean | No | Allow @mentioning this role |
| `role.permissions` | array | No | Array of permission names |

---

### set_verification_level

Sets the server verification level.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `level` | string | Yes | One of: `none`, `low`, `medium`, `high`, `highest` |

**Verification Levels**:
- `none`: No requirements
- `low`: Verified email required
- `medium`: Registered on Discord for 5+ minutes
- `high`: Member of server for 10+ minutes
- `highest`: Verified phone number required

---

### list_templates

Lists all available server templates.

**Parameters**: None

**Returns**: Array of templates with name, description, and counts

---

### preview_template

Shows detailed information about a template.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template ID: `gaming`, `community`, `business`, `study_group` |
| `includeChannels` | boolean | No | Include channel details (default: true) |
| `includeRoles` | boolean | No | Include role details (default: true) |

---

### apply_template

Applies a template to create a server structure.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template ID |
| `serverName` | string | Yes | Name for the new server |
| `customization.skipChannels` | array | No | Channel names to skip |
| `customization.skipRoles` | array | No | Role names to skip |
| `customization.roleColorOverrides` | object | No | Override role colors |

## Troubleshooting

### "Discord is not running" error

1. Launch the Discord desktop application
2. Make sure you're logged in
3. Wait for Discord to fully load before retrying

### "Could not find element" errors

1. Ensure Discord is visible on screen (not minimized)
2. Make sure the correct Discord view is open (server list visible)
3. Try clicking on the Discord window manually first
4. Wait a moment and retry the operation

### Accessibility permission issues

If operations fail silently:

1. Go to **System Preferences** > **Privacy & Security** > **Accessibility**
2. Remove and re-add your application
3. Restart the application
4. Try the operation again

### Automation is too fast/slow

The automation includes built-in delays for UI elements to load. If you experience issues:

1. Discord's responsiveness varies with system load
2. Complex operations may need more time
3. Close unnecessary applications to improve performance

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode (with file watching)
npm run dev

# Type checking
npm run typecheck
```

### Project Structure

```
discord-setup-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── automation/           # AppleScript automation layer
│   │   ├── discord.ts        # Discord-specific automation
│   │   ├── executor.ts       # AppleScript execution
│   │   └── waiter.ts         # Timing and delays
│   ├── tools/                # MCP tool implementations
│   │   ├── channels.ts       # Channel management tools
│   │   ├── roles.ts          # Role management tools
│   │   ├── server.ts         # Server management tools
│   │   ├── settings.ts       # Settings management tools
│   │   └── templates.ts      # Template tools
│   ├── templates/            # Pre-built server templates
│   │   ├── gaming.ts         # Gaming community template
│   │   ├── community.ts      # General community template
│   │   ├── business.ts       # Business/professional template
│   │   └── study-group.ts    # Study group template
│   └── utils/                # Utility functions
│       ├── errors.ts         # Error handling
│       └── validation.ts     # Input validation
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Known Limitations

1. **macOS Only**: AppleScript automation is only available on macOS
2. **Desktop App Required**: The web version of Discord cannot be automated
3. **Visual Automation**: Discord must be visible on screen during operations
4. **UI Changes**: Discord UI updates may temporarily break some automations
5. **Single Server**: Operations work on the currently active/selected server
6. **Rate Limits**: Rapid successive operations may fail; built-in delays help mitigate this

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/anthropics/model-context-protocol)
- Uses [Zod](https://github.com/colinhacks/zod) for runtime type validation
- Inspired by the need to streamline Discord server setup for communities
