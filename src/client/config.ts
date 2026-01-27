import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationError } from '../utils/errors.js';

/**
 * Configuration schema for the Discord MCP server
 */
export const ConfigSchema = z.object({
  discordToken: z
    .string()
    .min(1, 'Discord bot token is required')
    .describe('Discord bot token from https://discord.com/developers/applications'),

  defaultGuildId: z
    .string()
    .optional()
    .describe('Default guild ID to use when not specified in tool calls'),

  rateLimit: z
    .object({
      maxRetries: z.number().int().positive().default(3),
      retryDelay: z.number().int().positive().default(1000),
    })
    .optional()
    .default({ maxRetries: 3, retryDelay: 1000 })
    .describe('Rate limit retry configuration'),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

/**
 * Loads configuration from environment variables or config file.
 * Priority order:
 * 1. Environment variable: DISCORD_BOT_TOKEN
 * 2. Config file: ~/.discord-mcp/config.json
 *
 * @returns Config - The validated configuration
 * @throws {ConfigurationError} If no valid configuration is found
 */
export function getConfig(): Config {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Try environment variables first
  const envToken = process.env.DISCORD_BOT_TOKEN;
  if (envToken) {
    try {
      const config = ConfigSchema.parse({
        discordToken: envToken,
        defaultGuildId: process.env.DISCORD_DEFAULT_GUILD_ID,
        rateLimit: {
          maxRetries: process.env.DISCORD_RATE_LIMIT_MAX_RETRIES
            ? parseInt(process.env.DISCORD_RATE_LIMIT_MAX_RETRIES, 10)
            : 3,
          retryDelay: process.env.DISCORD_RATE_LIMIT_RETRY_DELAY
            ? parseInt(process.env.DISCORD_RATE_LIMIT_RETRY_DELAY, 10)
            : 1000,
        },
      });
      cachedConfig = config;
      return config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid configuration from environment variables: ${error.message}`
        );
      }
      throw error;
    }
  }

  // Try config file
  const configPath = path.join(os.homedir(), '.discord-mcp', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const config = ConfigSchema.parse(rawConfig);
      cachedConfig = config;
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ConfigurationError(
          `Invalid JSON in config file ${configPath}: ${error.message}`
        );
      }
      if (error instanceof z.ZodError) {
        throw new ConfigurationError(
          `Invalid configuration in ${configPath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  // No configuration found
  throw new ConfigurationError(
    'Discord bot token not found. ' +
      'Set DISCORD_BOT_TOKEN environment variable or create ~/.discord-mcp/config.json with your bot token. ' +
      'See documentation for setup instructions.'
  );
}

/**
 * Clears the cached configuration.
 * Useful for testing or forcing a config reload.
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
