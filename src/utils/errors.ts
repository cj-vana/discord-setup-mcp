/**
 * Custom error types for Discord MCP Server
 * Provides specific error classes for common failure scenarios with Discord Bot API
 */

import { DiscordAPIError } from 'discord.js';

/**
 * Base error class for all Discord MCP errors
 */
export class DiscordMCPError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly suggestion?: string;

  constructor(
    message: string,
    code: string,
    recoverable: boolean = false,
    suggestion?: string
  ) {
    super(message);
    this.name = 'DiscordMCPError';
    this.code = code;
    this.recoverable = recoverable;
    this.suggestion = suggestion;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      suggestion: this.suggestion,
    };
  }
}

/**
 * Error thrown when Discord bot is not ready or failed to connect
 */
export class BotNotReadyError extends DiscordMCPError {
  constructor(message?: string) {
    super(
      message || 'Discord bot is not ready yet',
      'BOT_NOT_READY',
      true,
      'Wait a moment for the bot to connect, then try again. Check that your bot token is valid.'
    );
    this.name = 'BotNotReadyError';
  }
}

/**
 * Error thrown when bot lacks required permissions for an operation
 */
export class InsufficientPermissionsError extends DiscordMCPError {
  public readonly requiredPermissions: string[];

  constructor(requiredPermissions: string[], message?: string) {
    super(
      message ||
        `Bot lacks required permissions: ${requiredPermissions.join(', ')}`,
      'INSUFFICIENT_PERMISSIONS',
      false,
      'Grant the bot the required permissions in Discord server settings (Server Settings > Roles > Bot Role).'
    );
    this.name = 'InsufficientPermissionsError';
    this.requiredPermissions = requiredPermissions;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requiredPermissions: this.requiredPermissions,
    };
  }
}

/**
 * Error thrown when a guild (server) is not found or bot doesn't have access
 */
export class GuildNotFoundError extends DiscordMCPError {
  public readonly guildIdentifier: string;

  constructor(guildIdentifier: string, message?: string) {
    super(
      message || `Guild '${guildIdentifier}' not found`,
      'GUILD_NOT_FOUND',
      false,
      'Ensure the bot has been invited to the server and has necessary permissions. Use list_guilds to see available servers.'
    );
    this.name = 'GuildNotFoundError';
    this.guildIdentifier = guildIdentifier;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      guildIdentifier: this.guildIdentifier,
    };
  }
}

/**
 * Error thrown when no guild is selected for an operation
 */
export class GuildNotSelectedError extends DiscordMCPError {
  constructor(message?: string) {
    super(
      message || 'No guild selected for operation',
      'GUILD_NOT_SELECTED',
      true,
      'Use list_guilds to see available servers, then select_guild to set the target, or specify guildId parameter.'
    );
    this.name = 'GuildNotSelectedError';
  }
}

/**
 * Error thrown when Discord API rate limit is hit
 */
export class RateLimitError extends DiscordMCPError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message?: string) {
    super(
      message || `Rate limited. Retry after ${retryAfter}ms`,
      'RATE_LIMITED',
      true,
      'Discord API rate limit reached. Operation will be retried automatically or wait a moment before trying again.'
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Error thrown when configuration is missing or invalid
 */
export class ConfigurationError extends DiscordMCPError {
  constructor(message: string) {
    super(
      message,
      'CONFIGURATION_ERROR',
      false,
      'Check your DISCORD_BOT_TOKEN environment variable or ~/.discord-mcp/config.json file.'
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when a channel is not found
 */
export class ChannelNotFoundError extends DiscordMCPError {
  public readonly channelIdentifier: string;

  constructor(channelIdentifier: string, message?: string) {
    super(
      message || `Channel '${channelIdentifier}' not found`,
      'CHANNEL_NOT_FOUND',
      false,
      'Verify the channel ID or name is correct and the bot has access to view channels.'
    );
    this.name = 'ChannelNotFoundError';
    this.channelIdentifier = channelIdentifier;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      channelIdentifier: this.channelIdentifier,
    };
  }
}

/**
 * Error thrown when a role is not found
 */
export class RoleNotFoundError extends DiscordMCPError {
  public readonly roleIdentifier: string;

  constructor(roleIdentifier: string, message?: string) {
    super(
      message || `Role '${roleIdentifier}' not found`,
      'ROLE_NOT_FOUND',
      false,
      'Verify the role ID or name is correct.'
    );
    this.name = 'RoleNotFoundError';
    this.roleIdentifier = roleIdentifier;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      roleIdentifier: this.roleIdentifier,
    };
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends DiscordMCPError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', false, 'Check your input parameters and try again.');
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when an operation times out
 */
export class TimeoutError extends DiscordMCPError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(operation: string, timeoutMs: number, message?: string) {
    super(
      message || `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      true,
      'Try again - Discord API may be slow to respond'
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
      operation: this.operation,
    };
  }
}

/**
 * Error thrown when Discord is in an unexpected state
 */
export class DiscordStateError extends DiscordMCPError {
  public readonly expectedState: string;
  public readonly actualState?: string;

  constructor(
    expectedState: string,
    actualState?: string,
    message?: string
  ) {
    super(
      message ||
        `Discord is not in expected state. Expected: ${expectedState}${actualState ? `, Actual: ${actualState}` : ''}`,
      'DISCORD_STATE_ERROR',
      true,
      'Try the operation again or check Discord server state'
    );
    this.name = 'DiscordStateError';
    this.expectedState = expectedState;
    this.actualState = actualState;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      expectedState: this.expectedState,
      actualState: this.actualState,
    };
  }
}

/**
 * Error thrown when a server template is invalid or not found
 */
export class TemplateError extends DiscordMCPError {
  public readonly templateName: string;

  constructor(templateName: string, message?: string) {
    super(
      message || `Template '${templateName}' is invalid or not found`,
      'TEMPLATE_ERROR',
      false,
      'Available templates: gaming, community, business, study-group'
    );
    this.name = 'TemplateError';
    this.templateName = templateName;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      templateName: this.templateName,
    };
  }
}

/**
 * Type guard to check if an error is a DiscordMCPError
 */
export function isDiscordMCPError(error: unknown): error is DiscordMCPError {
  return error instanceof DiscordMCPError;
}

/**
 * Wraps an unknown error into a DiscordMCPError
 */
export function wrapError(error: unknown, context?: string): DiscordMCPError {
  if (isDiscordMCPError(error)) {
    return error;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unknown error occurred';

  return new DiscordMCPError(
    context ? `${context}: ${message}` : message,
    'UNKNOWN_ERROR',
    false
  );
}

/**
 * Wraps a Discord API error into an appropriate DiscordMCPError
 * Maps Discord API error codes to user-friendly error types
 */
export function wrapDiscordError(
  error: unknown,
  context?: string
): DiscordMCPError {
  // Handle Discord API errors
  if (error instanceof DiscordAPIError) {
    const apiError = error as DiscordAPIError;

    switch (apiError.code) {
      case 10004: // Unknown Guild
        return new GuildNotFoundError(
          'specified guild',
          `Discord API error: ${apiError.message}`
        );

      case 10003: // Unknown Channel
        return new ChannelNotFoundError(
          'specified channel',
          `Discord API error: ${apiError.message}`
        );

      case 10011: // Unknown Role
        return new RoleNotFoundError(
          'specified role',
          `Discord API error: ${apiError.message}`
        );

      case 50001: // Missing Access
        return new InsufficientPermissionsError(
          ['ACCESS'],
          `Discord API error: Bot does not have access to perform this action`
        );

      case 50013: // Missing Permissions
        return new InsufficientPermissionsError(
          ['MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_GUILD'],
          `Discord API error: ${apiError.message}`
        );

      case 50035: // Invalid Form Body
        return new ValidationError(
          `Discord API validation error: ${apiError.message}`
        );

      case 30001: // Maximum guilds reached
        return new DiscordMCPError(
          'Cannot create guild: Maximum number of guilds reached (10)',
          'MAX_GUILDS',
          false,
          'Delete an existing guild before creating a new one, or wait 24 hours.'
        );

      case 30013: // Maximum roles reached
        return new DiscordMCPError(
          'Cannot create role: Maximum number of roles reached (250)',
          'MAX_ROLES',
          false,
          'Delete unused roles before creating new ones.'
        );

      case 30005: // Maximum channels reached
        return new DiscordMCPError(
          'Cannot create channel: Maximum number of channels reached (500)',
          'MAX_CHANNELS',
          false,
          'Delete unused channels before creating new ones.'
        );

      default:
        return new DiscordMCPError(
          context
            ? `${context}: Discord API error (${apiError.code}): ${apiError.message}`
            : `Discord API error (${apiError.code}): ${apiError.message}`,
          `DISCORD_API_${apiError.code}`,
          false
        );
    }
  }

  // Handle rate limit errors (if not caught by DiscordAPIError)
  if (error instanceof Error && error.message.includes('rate limit')) {
    return new RateLimitError(
      1000,
      context ? `${context}: ${error.message}` : error.message
    );
  }

  // Fall back to generic error wrapping
  return wrapError(error, context);
}

/**
 * Error codes for quick reference
 */
export const ErrorCodes = {
  BOT_NOT_READY: 'BOT_NOT_READY',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  GUILD_NOT_FOUND: 'GUILD_NOT_FOUND',
  GUILD_NOT_SELECTED: 'GUILD_NOT_SELECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT: 'TIMEOUT',
  DISCORD_STATE_ERROR: 'DISCORD_STATE_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
