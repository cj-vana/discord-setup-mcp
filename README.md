# Discord Server Setup MCP

An MCP (Model Context Protocol) server for automating Discord server setup using the Discord Bot API. This server enables AI assistants like Claude to manage servers, channels, roles, permissions, and apply templates through a Discord bot.

## Features

- **Cross-Platform**: Works on Windows, Linux, and macOS
- **No Discord App Required**: Operates via Discord Bot API (headless)
- **Guild Management**: Discover, select, and manage multiple Discord servers
- **Channel Management**: Create, edit, and delete channels and categories with permission overwrites
- **Role Management**: Create, edit, delete, and reorder roles with full permission control
- **Permission Overwrites**: Make channels/categories private, grant specific role access
- **Server Settings**: Configure verification levels, content filters, and notification settings
- **Pre-built Templates**: Apply ready-to-use server templates for common use cases
- **Fast & Reliable**: Direct API calls with proper error handling

## Pre-built Templates

| Template | Description | Roles | Categories | Channels |
|----------|-------------|-------|------------|----------|
| **Gaming** | Comprehensive gaming community with competitive, streaming, and events sections | 10 | 11 | 40+ |
| **Community** | General community server for discussions and social interaction | 6 | 6 | 20+ |
| **Business** | Professional workspace for teams and organizations | 6 | 6 | 18+ |
| **Study Group** | Academic collaboration space for study groups and classes | 5 | 5 | 15+ |

## Prerequisites

### System Requirements

- **Node.js** 18.0.0 or higher
- **Discord Bot** with appropriate permissions

### Discord Bot Setup

1. Create an application at https://discord.com/developers/applications
2. Add a bot user and copy the bot token
3. Enable **ALL Privileged Gateway Intents** in bot settings (Bot → Privileged Gateway Intents):
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
4. Generate an OAuth2 invite URL:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot` and `applications.commands`
   - Select **Administrator** permission (required for full server management)
5. Invite the bot to your Discord server(s) using the generated URL

**Important**: The bot requires Administrator permission to manage all server settings, roles, channels, and permissions without restrictions.

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/cj-vana/discord-setup-mcp.git
cd discord-setup-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Set Bot Token

#### Option A: Environment Variable

**macOS/Linux (temporary - current session only):**
```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
```

**macOS/Linux (permanent - add to shell profile):**
```bash
# For zsh (default on macOS)
echo 'export DISCORD_BOT_TOKEN="your-bot-token-here"' >> ~/.zshrc
source ~/.zshrc

# For bash
echo 'export DISCORD_BOT_TOKEN="your-bot-token-here"' >> ~/.bashrc
source ~/.bashrc
```

**Windows Command Prompt (temporary):**
```cmd
set DISCORD_BOT_TOKEN=your-bot-token-here
```

**Windows PowerShell (temporary):**
```powershell
$env:DISCORD_BOT_TOKEN = "your-bot-token-here"
```

**Windows (permanent - System Environment Variables):**
1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to **Advanced** tab → **Environment Variables**
3. Under "User variables", click **New**
4. Variable name: `DISCORD_BOT_TOKEN`
5. Variable value: `your-bot-token-here`
6. Click OK and restart your terminal

#### Option B: Configuration File

Create `~/.discord-mcp/config.json`:

```bash
# Create the directory
mkdir -p ~/.discord-mcp

# Create the config file (replace with your actual token)
cat > ~/.discord-mcp/config.json << 'EOF'
{
  "discordToken": "your-bot-token-here",
  "defaultGuildId": "optional-default-server-id"
}
EOF

# Secure the file (recommended)
chmod 600 ~/.discord-mcp/config.json
```

On Windows, create `%USERPROFILE%\.discord-mcp\config.json` with the same JSON content.

### Claude Desktop Configuration (Recommended)

The easiest method is to set the token directly in your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "discord-setup": {
      "command": "node",
      "args": ["/path/to/discord-setup-mcp/dist/index.js"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-bot-token-here"
      }
    }
  }
}
```

Replace `/path/to/discord-setup-mcp` with the actual path where you cloned the repository.

### Claude Code Configuration

```bash
# Add the MCP server
claude mcp add discord-setup-mcp node /path/to/discord-setup-mcp/dist/index.js

# Set the token (if not using config file or system env var)
claude mcp add discord-setup-mcp node /path/to/discord-setup-mcp/dist/index.js -e DISCORD_BOT_TOKEN=your-bot-token-here
```

Set the token in your environment or use the config file method.

## Usage

### Basic Workflow

1. **List servers** the bot has access to
2. **Select a server** to work with
3. **Create channels, roles, or apply templates**

### Example Commands

```
List Discord servers
Select the server named "My Server"
Create a text channel called "general-chat"
Create a role called "Moderator" with MANAGE_MESSAGES permission
Make the "admin-chat" category private, only visible to the Admin role
Apply the gaming template to this server
```

## Tool Reference

### Guild Management

#### `list_guilds`
List all servers the bot can access.

#### `select_guild`
Set the active server for subsequent operations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guildId` | string | Yes | Guild ID or name to select |

#### `get_guild_info`
Get detailed server information including channels, roles, and settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guildId` | string | No | Guild ID or name (uses current if not specified) |

### Channel Management

#### `create_category`
Create a channel category with optional permission overwrites.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Category name (1-100 characters) |
| `guildId` | string | No | Guild ID or name |
| `position` | number | No | Position in channel list |
| `permissionOverwrites` | array | No | Permission overwrites for roles/users |

#### `create_channel`
Create a channel (text, voice, announcement, stage, forum).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Channel name (1-100 characters) |
| `type` | string | No | Channel type: `text`, `voice`, `announcement`, `stage`, `forum` (default: `text`) |
| `guildId` | string | No | Guild ID or name |
| `categoryId` | string | No | Parent category ID |
| `topic` | string | No | Channel topic (text channels, max 1024 chars) |
| `nsfw` | boolean | No | Age-restricted channel (default: false) |
| `slowmode` | number | No | Slowmode in seconds (0-21600) |
| `bitrate` | number | No | Voice channel bitrate (8000-384000) |
| `userLimit` | number | No | Voice channel user limit (0-99, 0=unlimited) |
| `position` | number | No | Position in channel list |
| `permissionOverwrites` | array | No | Permission overwrites for roles/users |

#### `edit_channel`
Modify an existing channel's settings and permissions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Yes | Channel ID to edit |
| `guildId` | string | No | Guild ID or name |
| `name` | string | No | New channel name |
| `topic` | string | No | New channel topic |
| `nsfw` | boolean | No | Age-restricted setting |
| `slowmode` | number | No | Slowmode in seconds |
| `bitrate` | number | No | Voice channel bitrate |
| `userLimit` | number | No | Voice channel user limit |
| `position` | number | No | New position |
| `categoryId` | string | No | Move to category (null to remove) |
| `permissionOverwrites` | array | No | Replace permission overwrites |

#### `delete_channel`
Delete a channel (cannot be undone).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Yes | Channel ID to delete |
| `guildId` | string | No | Guild ID or name |

### Role Management

#### `create_role`
Create a role with permissions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Role name (1-100 characters) |
| `guildId` | string | No | Guild ID or name |
| `color` | string/number | No | Hex color (`#FF0000`) or integer |
| `hoist` | boolean | No | Display separately in member list |
| `mentionable` | boolean | No | Allow anyone to mention this role |
| `permissions` | array | No | Array of permission names |
| `position` | number | No | Position in role hierarchy |

#### `edit_role`
Modify an existing role.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID to edit |
| `guildId` | string | No | Guild ID or name |
| `name` | string | No | New role name |
| `color` | string/number | No | New color |
| `hoist` | boolean | No | Display separately setting |
| `mentionable` | boolean | No | Mentionable setting |
| `permissions` | array | No | Replace all permissions |
| `position` | number | No | New position in hierarchy |

#### `delete_role`
Delete a role (cannot be undone).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roleId` | string | Yes | Role ID to delete |
| `guildId` | string | No | Guild ID or name |

#### `reorder_roles`
Reorder roles in the hierarchy.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rolePositions` | array | Yes | Array of `{roleId, position}` objects |
| `guildId` | string | No | Guild ID or name |

### Server Settings

#### `update_server_settings`
Update multiple server settings at once.

#### `set_verification_level`
Set member verification level (0-4).

#### `set_content_filter`
Set explicit content filter level.

#### `set_default_notifications`
Set default notification setting for new members.

### Templates

#### `list_templates`
List available pre-built templates.

#### `preview_template`
View template details before applying.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template ID to preview |

#### `apply_template`
Apply a template to a server.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template ID to apply |
| `guildId` | string | No | Guild ID or name |

## Permission Overwrites

Permission overwrites allow you to customize access to channels and categories. Use them to:
- Make channels private (deny `@everyone` VIEW_CHANNEL)
- Grant specific roles access
- Restrict certain actions for specific users/roles

### Permission Overwrite Format

```json
{
  "id": "role-or-user-id",
  "type": "role",
  "allow": ["VIEW_CHANNEL", "SEND_MESSAGES"],
  "deny": ["MANAGE_MESSAGES"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Role ID or User ID |
| `type` | string | `role` or `member` |
| `allow` | array | Permissions to explicitly allow |
| `deny` | array | Permissions to explicitly deny |

### Example: Make a Category Private

```json
{
  "channelId": "category-id",
  "permissionOverwrites": [
    {
      "id": "everyone-role-id",
      "type": "role",
      "deny": ["VIEW_CHANNEL"]
    },
    {
      "id": "admin-role-id",
      "type": "role",
      "allow": ["VIEW_CHANNEL", "SEND_MESSAGES", "MANAGE_MESSAGES"]
    }
  ]
}
```

## Available Permissions

Use these permission names in role permissions and permission overwrites:

### General Permissions
| Permission | Description |
|------------|-------------|
| `ADMINISTRATOR` | Full server access (bypasses all permissions) |
| `VIEW_CHANNEL` | View channels and read messages |
| `MANAGE_CHANNELS` | Create, edit, delete channels |
| `MANAGE_ROLES` | Create, edit, delete roles below bot's role |
| `MANAGE_GUILD` | Change server settings |
| `VIEW_AUDIT_LOG` | View server audit log |
| `VIEW_GUILD_INSIGHTS` | View server insights |
| `MANAGE_WEBHOOKS` | Create, edit, delete webhooks |
| `MANAGE_GUILD_EXPRESSIONS` | Manage emojis and stickers |
| `CREATE_INSTANT_INVITE` | Create invite links |
| `CHANGE_NICKNAME` | Change own nickname |
| `MANAGE_NICKNAMES` | Change other members' nicknames |
| `KICK_MEMBERS` | Kick members from server |
| `BAN_MEMBERS` | Ban members from server |
| `MODERATE_MEMBERS` | Timeout members |
| `MANAGE_EVENTS` | Create and manage events |

### Text Channel Permissions
| Permission | Description |
|------------|-------------|
| `SEND_MESSAGES` | Send messages in text channels |
| `SEND_TTS_MESSAGES` | Send text-to-speech messages |
| `MANAGE_MESSAGES` | Delete messages, pin messages |
| `EMBED_LINKS` | Embed links in messages |
| `ATTACH_FILES` | Upload files |
| `READ_MESSAGE_HISTORY` | Read past messages |
| `MENTION_EVERYONE` | Use @everyone and @here |
| `USE_EXTERNAL_EMOJIS` | Use emojis from other servers |
| `USE_EXTERNAL_STICKERS` | Use stickers from other servers |
| `ADD_REACTIONS` | Add reactions to messages |
| `MANAGE_THREADS` | Manage and delete threads |
| `CREATE_PUBLIC_THREADS` | Create public threads |
| `CREATE_PRIVATE_THREADS` | Create private threads |
| `SEND_MESSAGES_IN_THREADS` | Send messages in threads |
| `USE_APPLICATION_COMMANDS` | Use slash commands |

### Voice Channel Permissions
| Permission | Description |
|------------|-------------|
| `CONNECT` | Connect to voice channels |
| `SPEAK` | Speak in voice channels |
| `STREAM` | Screen share and video |
| `USE_VAD` | Use voice activity detection |
| `PRIORITY_SPEAKER` | Be heard over others |
| `MUTE_MEMBERS` | Mute other members |
| `DEAFEN_MEMBERS` | Deafen other members |
| `MOVE_MEMBERS` | Move members between channels |
| `REQUEST_TO_SPEAK` | Request to speak in stage channels |
| `USE_EMBEDDED_ACTIVITIES` | Use activities |
| `USE_SOUNDBOARD` | Use soundboard |
| `USE_EXTERNAL_SOUNDS` | Use external sounds |
| `SEND_VOICE_MESSAGES` | Send voice messages |

## Examples

### Create a Complete Team Server Structure

```
1. Select my Discord server
2. Create these roles with permissions:
   - "Admin" with ADMINISTRATOR
   - "Moderator" with MANAGE_MESSAGES, KICK_MEMBERS, MUTE_MEMBERS
   - "Member" with VIEW_CHANNEL, SEND_MESSAGES, CONNECT, SPEAK

3. Create these categories, all private to @everyone but visible to Member role:
   - "General" with channels: welcome, rules, announcements
   - "Discussion" with channels: general-chat, off-topic, help
   - "Voice" with voice channels: General Voice, Gaming, AFK

4. Make the "Admin" category only visible to Admin role
```

### Set Up Private Channels

```
Make the "staff-chat" channel private:
- Deny VIEW_CHANNEL to @everyone
- Allow VIEW_CHANNEL, SEND_MESSAGES, MANAGE_MESSAGES to Moderator role
- Allow VIEW_CHANNEL, SEND_MESSAGES, ADMINISTRATOR to Admin role
```

### Configure Role Hierarchy

```
Reorder roles so Admin is highest, then Moderator, then Member, then @everyone
```

## Troubleshooting

### Bot Not Connecting
- Verify bot token is correct
- Check that **ALL Privileged Gateway Intents** are enabled in Discord Developer Portal
- Ensure the bot user is created (not just the application)

### Can't Manage Roles/Channels
- Ensure bot has **Administrator** permission
- Bot's role must be higher than roles it manages (drag bot role up in server settings)
- Verify the bot was invited with correct OAuth2 scopes (`bot` and `applications.commands`)

### Permission Errors
- Grant the bot **Administrator** permission for unrestricted access
- Bot can only manage roles below its highest role in the hierarchy
- Drag the bot's role higher in Server Settings → Roles

### Guild Not Found
- Confirm bot is in the server
- Try using guild ID instead of name
- Enable Discord Developer Mode to copy IDs (User Settings → Advanced)

### Debug Logging
Debug logs are written to `/tmp/discord-mcp-debug.log` for troubleshooting permission and API issues.

## Security

- **Never share your bot token** - treat it like a password
- **Use environment variables** - don't commit tokens to version control
- **Regenerate tokens if compromised** - reset in Discord Developer Portal
- **Limit server access** - only add the bot to servers you trust
- **Restrict file permissions** - `chmod 600 ~/.discord-mcp/config.json`

## Architecture

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Discord API**: discord.js v14
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod

See [CLAUDE.md](CLAUDE.md) for development documentation.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [discord.js](https://discord.js.org/)
- Powered by [Model Context Protocol](https://modelcontextprotocol.io/)
- Created for use with [Claude](https://www.anthropic.com/claude)
