# Discord Bot Setup Guide

This guide walks you through creating a Discord bot and configuring it for use with the Discord MCP Server.

## Prerequisites

- A Discord account
- Access to create applications at https://discord.com/developers/applications

## Step 1: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Enter a name for your application (e.g., "Server Setup Bot")
4. Click "Create"

## Step 2: Create Bot User

1. In your application, navigate to the "Bot" section in the left sidebar
2. Click "Add Bot" (if not already added)
3. Confirm by clicking "Yes, do it!"

## Step 3: Configure Bot Settings

### Enable Required Intents

1. Still in the "Bot" section, scroll down to "Privileged Gateway Intents"
2. Enable the following intents:
   - **SERVER MEMBERS INTENT** (required for role management)
   - **GUILDS** intent (should be enabled by default)

### Copy Bot Token

1. In the "Bot" section, find the "Token" field
2. Click "Reset Token" if you need a new one
3. Click "Copy" to copy your bot token
4. **Save this token securely** - you'll need it to configure the MCP server

## Step 4: Configure Bot Permissions

1. Navigate to the "OAuth2" section in the left sidebar
2. Click on "URL Generator"
3. Under "Scopes", select:
   - `bot`
4. Under "Bot Permissions", select:
   - Manage Server
   - Manage Roles
   - Manage Channels
   - View Channels
   - Create Instant Invite (optional, for invite generation)

The permissions integer should be at least: `268435488`

5. Copy the generated URL at the bottom

## Step 5: Invite Bot to Your Server

1. Open the URL you copied in Step 4 in your web browser
2. Select the Discord server you want to add the bot to
3. Click "Authorize"
4. Complete the CAPTCHA if prompted

Your bot should now appear in your server's member list!

## Step 6: Configure MCP Server

You have two options to configure the bot token:

### Option A: Environment Variable (Recommended)

Set the `DISCORD_BOT_TOKEN` environment variable:

**macOS/Linux (bash/zsh):**
```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
```

**Windows (PowerShell):**
```powershell
$env:DISCORD_BOT_TOKEN="your-bot-token-here"
```

### Option B: Configuration File

Create a configuration file at `~/.discord-mcp/config.json`:

```json
{
  "discordToken": "your-bot-token-here",
  "defaultGuildId": "optional-default-server-id"
}
```

**On macOS/Linux:**
```bash
mkdir -p ~/.discord-mcp
cat > ~/.discord-mcp/config.json << EOF
{
  "discordToken": "YOUR_BOT_TOKEN_HERE",
  "defaultGuildId": "OPTIONAL_GUILD_ID"
}
EOF
chmod 600 ~/.discord-mcp/config.json
```

## Step 7: Configure Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:

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

Replace `/path/to/discord-setup-mcp` with the actual path to your cloned repository.

## Step 8: Test the Setup

1. Restart Claude Desktop
2. In Claude, try these commands:
   ```
   Can you list the Discord servers the bot has access to?
   ```

   This should trigger the `list_guilds` tool and show your server(s).

3. Select a guild:
   ```
   Select the server named "My Server"
   ```

4. Try creating a test channel:
   ```
   Create a text channel called "test-channel"
   ```

If everything works, you're all set!

## Troubleshooting

### Bot Not Connecting

- **Check your token:** Make sure you copied the token correctly
- **Check permissions:** Verify the bot has the required intents enabled
- **Check environment:** Restart Claude Desktop after changing the config

### Bot Can't Create Channels/Roles

- **Check bot permissions:** In Discord, go to Server Settings > Roles
- Make sure your bot's role is above the roles it needs to manage
- Verify the bot has "Manage Channels", "Manage Roles", and "Manage Server" permissions

### Guild Not Found

- **Verify bot is in the server:** Check the member list in Discord
- **Try using guild ID instead of name:** Guild IDs are more reliable
- To get a guild ID: Right-click the server icon > Copy Server ID (requires Developer Mode enabled in Discord settings)

## Security Best Practices

1. **Never share your bot token publicly** - it's like a password
2. **Use environment variables in production** - don't commit tokens to git
3. **Regenerate tokens if compromised** - immediately reset the token in Discord Developer Portal
4. **Use restrictive file permissions** - `chmod 600 ~/.discord-mcp/config.json`
5. **Limit bot permissions** - only grant permissions the bot actually needs

## Next Steps

- Read the [README.md](../README.md) for more information
- Check [CLAUDE.md](../CLAUDE.md) for development details
- Explore the available MCP tools in Claude

## Getting Guild IDs

To use a guild by ID (more reliable than names):

1. Enable Developer Mode in Discord:
   - User Settings > App Settings > Advanced > Developer Mode
2. Right-click on a server icon
3. Click "Copy Server ID"
4. Use this ID with MCP tools or set it as `defaultGuildId` in config
