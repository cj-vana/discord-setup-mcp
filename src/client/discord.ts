import { Client, GatewayIntentBits, Events } from 'discord.js';
import { getConfig } from './config.js';
import { BotNotReadyError, ConfigurationError } from '../utils/errors.js';
import { info, warn } from '../utils/logger.js';

let clientInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;

/**
 * Creates, logs in, and waits for a fresh Discord client. Only called when there
 * is no usable instance. `clientInstance` is assigned once the client is ready.
 */
async function initializeClient(): Promise<Client> {
  const config = getConfig();
  if (!config.discordToken) {
    throw new ConfigurationError('Discord bot token is required');
  }

  // Only the Guilds intent is needed: all operations act on guild structure
  // (channels/roles/settings) and the bot's own member, none of which require
  // the privileged GuildMembers intent. Requesting privileged intents that
  // aren't enabled in the Developer Portal makes login fail outright.
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const ready = new Promise<Client>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new BotNotReadyError('Bot connection timeout after 30 seconds'));
    }, 30000);

    client.once(Events.ClientReady, (readyClient) => {
      clearTimeout(timeout);
      info(`Discord bot ready as ${readyClient.user.tag}`);
      resolve(readyClient);
    });

    client.once(Events.Error, (error) => {
      clearTimeout(timeout);
      reject(new BotNotReadyError(`Bot connection failed: ${error.message}`));
    });
  });

  try {
    await client.login(config.discordToken);
    await ready;
    // If discord.js permanently gives up on the session, drop our reference so
    // the next call rebuilds. We do NOT destroy here — in-flight callers may
    // still hold this instance, and discord.js auto-reconnects transient drops.
    client.once(Events.Invalidated, () => {
      if (clientInstance === client) clientInstance = null;
      warn('Discord session invalidated; a new client will be created on the next operation.');
    });
    clientInstance = client;
    return client;
  } catch (error) {
    try {
      await client.destroy();
    } catch {
      // ignore
    }

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('token_invalid') ||
        msg.includes('incorrect login') ||
        msg.includes('disallowed intents')
      ) {
        throw new ConfigurationError(
          'Login failed: invalid Discord bot token or disallowed intents. ' +
            'Check your DISCORD_BOT_TOKEN.'
        );
      }
    }
    throw error;
  }
}

/**
 * Gets the Discord client singleton, creating it on first use. An established
 * client is reused even while its gateway is momentarily reconnecting — discord.js
 * auto-reconnects transient drops, and REST operations don't require a ready
 * gateway. A permanently invalidated session clears the reference (see
 * initializeClient) so the next call rebuilds. Concurrent first-time callers
 * share a single in-flight initialization.
 */
export async function getDiscordClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  if (!initPromise) {
    initPromise = initializeClient().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
}

/**
 * Closes the Discord client connection and cleans up resources.
 * Should be called on MCP server shutdown.
 */
export async function closeDiscordClient(): Promise<void> {
  if (clientInstance) {
    info('Closing Discord client...');
    try {
      await clientInstance.destroy();
    } catch (error) {
      warn('Error destroying Discord client:', error);
    }
    clientInstance = null;
  }
  initPromise = null;
}

/**
 * Checks if the Discord client is currently ready and connected.
 */
export function isClientReady(): boolean {
  return clientInstance?.isReady() ?? false;
}
