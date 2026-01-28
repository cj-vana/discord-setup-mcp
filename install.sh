#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Discord Setup MCP Installer${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Check for required commands
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    fi
}

echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command git
check_command node
check_command npm

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ is required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Set install directory
INSTALL_DIR="${DISCORD_MCP_DIR:-$HOME/.discord-setup-mcp}"

echo
echo -e "${YELLOW}Installing to: ${INSTALL_DIR}${NC}"

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Updating existing installation...${NC}"
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone https://github.com/cj-vana/discord-setup-mcp.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Build the project
echo
echo -e "${YELLOW}Building project...${NC}"
npm run build

echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "Installed to: ${BLUE}${INSTALL_DIR}${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo
echo "1. Set your Discord bot token:"
echo -e "   ${BLUE}export DISCORD_BOT_TOKEN=\"your-token-here\"${NC}"
echo
echo "2. Add to Claude Desktop config:"
echo -e "   ${BLUE}~/Library/Application Support/Claude/claude_desktop_config.json${NC} (macOS)"
echo -e "   ${BLUE}%APPDATA%\\Claude\\claude_desktop_config.json${NC} (Windows)"
echo
cat << 'EOF'
   {
     "mcpServers": {
       "discord-setup": {
         "command": "node",
EOF
echo "         \"args\": [\"${INSTALL_DIR}/dist/index.js\"],"
cat << 'EOF'
         "env": {
           "DISCORD_BOT_TOKEN": "your-token-here"
         }
       }
     }
   }
EOF
echo
echo "3. Or add to Claude Code:"
echo -e "   ${BLUE}claude mcp add discord-setup node ${INSTALL_DIR}/dist/index.js -e DISCORD_BOT_TOKEN=your-token${NC}"
echo
