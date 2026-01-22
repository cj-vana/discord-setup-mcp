/**
 * Custom error types for Discord MCP Server
 * Provides specific error classes for common failure scenarios
 */

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
 * Error thrown when Discord application is not running
 */
export class DiscordNotRunningError extends DiscordMCPError {
  constructor(message?: string) {
    super(
      message || 'Discord application is not running',
      'DISCORD_NOT_RUNNING',
      true,
      'Please launch the Discord desktop application and try again'
    );
    this.name = 'DiscordNotRunningError';
  }
}

/**
 * Error thrown when macOS accessibility permissions are not granted
 */
export class AccessibilityDeniedError extends DiscordMCPError {
  constructor(message?: string) {
    super(
      message ||
        'Accessibility permissions are required but not granted',
      'ACCESSIBILITY_DENIED',
      true,
      'Grant accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility'
    );
    this.name = 'AccessibilityDeniedError';
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
      'Try again - Discord may be slow to respond or the UI may be loading'
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
 * Error thrown when a UI element cannot be found
 */
export class UIElementNotFoundError extends DiscordMCPError {
  public readonly elementDescription: string;
  public readonly searchCriteria?: Record<string, unknown>;

  constructor(
    elementDescription: string,
    searchCriteria?: Record<string, unknown>,
    message?: string
  ) {
    super(
      message || `UI element not found: ${elementDescription}`,
      'UI_ELEMENT_NOT_FOUND',
      true,
      'The Discord UI may have changed or the element may not be visible. Ensure Discord is focused and try again.'
    );
    this.name = 'UIElementNotFoundError';
    this.elementDescription = elementDescription;
    this.searchCriteria = searchCriteria;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      elementDescription: this.elementDescription,
      searchCriteria: this.searchCriteria,
    };
  }
}

/**
 * Error thrown when AppleScript execution fails
 */
export class AppleScriptError extends DiscordMCPError {
  public readonly scriptError?: string;

  constructor(message: string, scriptError?: string) {
    super(
      message,
      'APPLESCRIPT_ERROR',
      false,
      'Check if Discord is running and accessible, and that accessibility permissions are granted'
    );
    this.name = 'AppleScriptError';
    this.scriptError = scriptError;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      scriptError: this.scriptError,
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
      'Navigate to the correct location in Discord and try again'
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
 * Error codes for quick reference
 */
export const ErrorCodes = {
  DISCORD_NOT_RUNNING: 'DISCORD_NOT_RUNNING',
  ACCESSIBILITY_DENIED: 'ACCESSIBILITY_DENIED',
  TIMEOUT: 'TIMEOUT',
  UI_ELEMENT_NOT_FOUND: 'UI_ELEMENT_NOT_FOUND',
  APPLESCRIPT_ERROR: 'APPLESCRIPT_ERROR',
  DISCORD_STATE_ERROR: 'DISCORD_STATE_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
