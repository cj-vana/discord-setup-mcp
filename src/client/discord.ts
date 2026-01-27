import { Client, GatewayIntentBits, Events } from 'discord.js';
import { getConfig } from './config.js';
import { BotNotReadyError, ConfigurationError } from '../utils/errors.js';

let clientInstance: Client | null = null;
let readyPromise: Promise<Client> | null = null;
let isInitializing = false;

/**
 * Gets the Discord client singleton instance.
 * Creates and logs in the client on first call, reuses the instance on subsequent calls.
 *
 * @returns Promise<Client> - The authenticated Discord client
 * @throws {ConfigurationError} If bot token is missing or invalid
 * @throws {BotNotReadyError} If bot fails to connect
 */
export async function getDiscordClient(): Promise<Client> {
  // If client is ready, return immediately
  if (clientInstance?.isReady()) {
    return clientInstance;
  }

  // If already initializing, wait for the existing initialization
  if (isInitializing && readyPromise) {
    return readyPromise;
  }

  // Start new initialization
  if (!clientInstance) {
    isInitializing = true;

    try {
      // Create Discord client with required intents
      clientInstance = new Client({
        intents: [
          GatewayIntentBits.Guilds,           // Required for guild operations (channels, roles)
          GatewayIntentBits.GuildMembers,     // Required for role management
        ],
      });

      // Set up ready promise
      readyPromise = new Promise<Client>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new BotNotReadyError('Bot connection timeout after 30 seconds'));
        }, 30000);

        clientInstance!.once(Events.ClientReady, (client) => {
          clearTimeout(timeout);
          console.error(`Discord bot ready as ${client.user.tag}`);
          resolve(client);
        });

        clientInstance!.once(Events.Error, (error) => {
          clearTimeout(timeout);
          reject(new BotNotReadyError(`Bot connection failed: ${error.message}`));
        });
      });

      // Get token from config
      const config = getConfig();
      if (!config.discordToken) {
        throw new ConfigurationError('Discord bot token is required');
      }

      // Login to Discord
      await clientInstance.login(config.discordToken);

      // Wait for ready event
      await readyPromise;

      isInitializing = false;
      return clientInstance;
    } catch (error) {
      // Clean up on error
      isInitializing = false;
      if (clientInstance) {
        clientInstance.destroy();
        clientInstance = null;
      }
      readyPromise = null;

      if (error instanceof Error) {
        if (error.message.includes('TOKEN_INVALID') || error.message.includes('Incorrect login')) {
          throw new ConfigurationError('Invalid Discord bot token. Please check your DISCORD_BOT_TOKEN.');
        }
      }
      throw error;
    }
  }

  // Wait for existing client to be ready
  if (readyPromise) {
    return readyPromise;
  }

  throw new BotNotReadyError('Discord bot is not ready');
}

/**
 * Closes the Discord client connection and cleans up resources.
 * Should be called on MCP server shutdown.
 */
export async function closeDiscordClient(): Promise<void> {
  if (clientInstance) {
    console.error('Closing Discord client...');
    clientInstance.destroy();
    clientInstance = null;
    readyPromise = null;
    isInitializing = false;
  }
}

/**
 * Checks if the Discord client is currently ready and connected.
 *
 * @returns boolean - True if client is ready, false otherwise
 */
export function isClientReady(): boolean {
  return clientInstance?.isReady() ?? false;
}
