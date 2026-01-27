# Discord Server Setup MCP

An MCP (Model Context Protocol) server for automating Discord server setup using the Discord Bot API. This server enables AI assistants like Claude to create servers, channels, roles, configure settings, and apply templates through a Discord bot.

## ✨ Features

- **Cross-Platform**: Works on Windows, Linux, and macOS (no platform restrictions)
- **No Discord App Required**: Operates via Discord Bot API (headless)
- **Guild Management**: Discover, select, and manage multiple Discord servers
- **Channel Management**: Create, edit, and delete channels and categories
- **Role Management**: Create, edit, delete, and reorder roles with full permission control
- **Server Settings**: Configure verification levels, content filters, and notification settings
- **Pre-built Templates**: Apply ready-to-use server templates for common use cases
- **Fast & Reliable**: Direct API calls (100x faster than UI automation)

## 📋 Pre-built Templates

| Template | Description | Roles | Categories | Channels |
|----------|-------------|-------|------------|----------|
| **Gaming** | Comprehensive gaming community with competitive, streaming, and events sections | 10 | 11 | 40+ |
| **Community** | General community server for discussions and social interaction | 6 | 6 | 20+ |
| **Business** | Professional workspace for teams and organizations | 6 | 6 | 18+ |
| **Study Group** | Academic collaboration space for study groups and classes | 5 | 5 | 15+ |

## 🔧 Prerequisites

### System Requirements

- **Node.js** 18.0.0 or higher
- **Discord Bot** with appropriate permissions

### Discord Bot Setup

You need to create a Discord bot to use this MCP server. Follow our [Bot Setup Guide](docs/BOT_SETUP.md) for detailed instructions.

**Quick Summary:**

1. Create an application at https://discord.com/developers/applications
2. Add a bot user and copy the bot token
3. Enable "SERVER MEMBERS INTENT" in bot settings
4. Generate an OAuth2 invite URL with required permissions:
   - Manage Server
   - Manage Roles
   - Manage Channels
   - View Channels
5. Invite the bot to your Discord server(s)

## 📦 Installation

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

## ⚙️ Configuration

### Set Bot Token

You have two options to configure your Discord bot token:

#### Option A: Environment Variable (Recommended)

```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
```

#### Option B: Configuration File

Create `~/.discord-mcp/config.json`:

```json
{
  "discordToken": "your-bot-token-here",
  "defaultGuildId": "optional-default-server-id"
}
```

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

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

## 🚀 Usage

### Basic Workflow

1. **List servers** the bot has access to:
   ```
   List Discord servers
   ```

2. **Select a server** to work with:
   ```
   Select the server named "My Server"
   ```

3. **Create channels, roles, or apply templates**:
   ```
   Create a text channel called "general-chat"
   Create a role called "Moderator" with MANAGE_MESSAGES permission
   Apply the gaming template to this server
   ```

### Available Tools

#### Guild Management
- `list_guilds` - List all servers the bot can access
- `select_guild` - Set the active server for operations
- `get_guild_info` - Get detailed server information

#### Channel Management
- `create_category` - Create a channel category
- `create_channel` - Create a channel (text, voice, announcement, stage, forum)
- `edit_channel` - Modify channel settings
- `delete_channel` - Delete a channel

#### Role Management
- `create_role` - Create a role with permissions
- `edit_role` - Modify role settings
- `delete_role` - Delete a role
- `reorder_roles` - Reorder role hierarchy

#### Server Settings
- `update_server_settings` - Update multiple server settings
- `set_verification_level` - Set member verification level
- `set_content_filter` - Set explicit content filter
- `set_default_notifications` - Set default notification setting

#### Templates
- `list_templates` - List available templates
- `preview_template` - View template details
- `apply_template` - Apply a template to a server

## 📖 Examples

### Create a Complete Server Setup

```
Apply the gaming template to my server
```

### Manage Channels

```
Create a voice channel called "General Voice" in the "Voice Channels" category
Edit the "announcements" channel to set the topic to "Server updates and news"
Delete the "old-channel" channel
```

### Manage Roles

```
Create a role called "VIP" with color #FFD700 that is hoisted and mentionable
Edit the "Moderator" role to add KICK_MEMBERS permission
Reorder roles to put "Admin" above "Moderator"
```

### Configure Server Settings

```
Set the verification level to high
Set the content filter to scan all members
Set default notifications to only mentions
```

## 🔒 Security

- **Never share your bot token** - it's like a password
- **Use environment variables** in production - don't commit tokens to git
- **Regenerate tokens if compromised** - reset immediately in Discord Developer Portal
- **Use restrictive file permissions** - `chmod 600 ~/.discord-mcp/config.json`
- **Limit bot permissions** - only grant what's actually needed

## 🐛 Troubleshooting

### Bot Not Connecting

- Verify your bot token is correct
- Check that required intents are enabled (SERVER MEMBERS INTENT)
- Ensure the bot user is created in Discord Developer Portal

### Bot Can't Create Channels/Roles

- Check bot has required permissions in Discord server settings
- Verify bot's role is positioned above roles it needs to manage
- Ensure bot has "Manage Channels", "Manage Roles", and "Manage Server" permissions

### Guild Not Found

- Confirm bot is in the server (check member list)
- Try using guild ID instead of name (more reliable)
- Enable Developer Mode in Discord to copy guild IDs

## 🏗️ Architecture

This MCP server uses the discord.js library to interact with the Discord Bot API:

- **Client Management**: Singleton Discord client with automatic reconnection
- **Guild Context**: Multi-server support with smart guild resolution
- **Error Handling**: Comprehensive error mapping from Discord API codes
- **Rate Limiting**: Built-in throttling to respect Discord rate limits
- **Template System**: Orchestrated role and channel creation

## 📚 Documentation

- [Bot Setup Guide](docs/BOT_SETUP.md) - Detailed instructions for creating a Discord bot
- [CLAUDE.md](CLAUDE.md) - Development guide and architecture documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [discord.js](https://discord.js.org/)
- Powered by [Model Context Protocol](https://modelcontextprotocol.io/)
- Created for use with [Claude](https://www.anthropic.com/claude)
