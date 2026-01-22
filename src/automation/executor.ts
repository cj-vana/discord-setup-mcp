/**
 * AppleScript Execution Engine
 * Handles executing AppleScript via osascript with error handling, timeouts, and result parsing
 */

import { spawn } from 'child_process';

/**
 * Configuration for retry behavior with exponential backoff
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds between retries (default: 10000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to delays to avoid thundering herd (default: true) */
  jitter?: boolean;
  /** Custom function to determine if an error is retryable */
  isRetryable?: (error: Error, result?: ExecuteResult) => boolean;
}

/** Default retry configuration */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'isRetryable'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Options for AppleScript execution
 */
export interface ExecuteOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to use JavaScript for Automation (JXA) instead of AppleScript */
  useJXA?: boolean;
  /** Arguments to pass to the script */
  args?: string[];
  /** Retry options for transient failures (default: no retries) */
  retry?: RetryOptions | boolean;
}

/**
 * Result of an AppleScript execution
 */
export interface ExecuteResult {
  /** Whether the execution was successful */
  success: boolean;
  /** The output from the script (stdout) */
  output: string;
  /** Any error message (stderr or error) */
  error?: string;
  /** The exit code of the process */
  exitCode: number;
  /** Parsed result if output is valid JSON or structured data */
  parsed?: unknown;
}

/**
 * Error thrown when AppleScript execution fails
 */
export class AppleScriptError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'AppleScriptError';
  }
}

/**
 * Error thrown when AppleScript execution times out
 */
export class AppleScriptTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`AppleScript execution timed out after ${timeoutMs}ms`);
    this.name = 'AppleScriptTimeoutError';
  }
}

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/**
 * Calculate delay for exponential backoff with optional jitter
 * @param attempt - Current retry attempt (0-indexed)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'isRetryable'>>
): number {
  // Calculate exponential delay: initialDelay * (multiplier ^ attempt)
  const exponentialDelay =
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  // Add jitter if enabled (random value between 0% and 25% of delay)
  if (options.jitter) {
    const jitterRange = cappedDelay * 0.25;
    const jitter = Math.random() * jitterRange;
    return Math.floor(cappedDelay + jitter);
  }

  return Math.floor(cappedDelay);
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Patterns that indicate transient/retryable errors in AppleScript output
 */
const TRANSIENT_ERROR_PATTERNS = [
  // UI timing issues
  /can't get/i,
  /unable to find/i,
  /doesn't understand/i,
  /not found/i,
  /timed out/i,
  /timeout/i,
  // Connection/application issues
  /connection invalid/i,
  /not running/i,
  /application isn't running/i,
  // UI element issues that may resolve with retry
  /no such element/i,
  /element not found/i,
  /ui element/i,
  // Accessibility issues that may be temporary
  /not accessible/i,
  /accessibility/i,
  // Generic transient patterns
  /try again/i,
  /temporarily unavailable/i,
  /busy/i,
];

/**
 * Patterns that indicate permanent/non-retryable errors
 */
const PERMANENT_ERROR_PATTERNS = [
  /syntax error/i,
  /compile error/i,
  /invalid syntax/i,
  /expected/i, // AppleScript syntax errors often contain "expected"
  /permission denied/i, // Permissions won't change between retries
  /not permitted/i,
];

/**
 * Determine if an error or result indicates a transient failure that can be retried
 * @param error - The error that occurred (if any)
 * @param result - The execution result (if any)
 * @returns true if the error is likely transient and retryable
 */
function isTransientError(error?: Error, result?: ExecuteResult): boolean {
  // Check thrown errors
  if (error) {
    const message = error.message.toLowerCase();

    // AppleScriptTimeoutError is always retryable
    if (error.name === 'AppleScriptTimeoutError') {
      return true;
    }

    // Check for permanent error patterns first (they take precedence)
    for (const pattern of PERMANENT_ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return false;
      }
    }

    // Check for transient error patterns
    for (const pattern of TRANSIENT_ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return true;
      }
    }
  }

  // Check failed results
  if (result && !result.success && result.error) {
    const errorMessage = result.error.toLowerCase();

    // Check for permanent error patterns first
    for (const pattern of PERMANENT_ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        return false;
      }
    }

    // Check for transient error patterns
    for (const pattern of TRANSIENT_ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        return true;
      }
    }
  }

  // Default: don't retry unknown errors
  return false;
}

/**
 * Parse the output from osascript into a structured result
 * Handles common AppleScript output formats including JSON, lists, and records
 */
function parseOutput(output: string): unknown {
  const trimmed = output.trim();

  // Empty output
  if (!trimmed) {
    return null;
  }

  // Try parsing as JSON first (useful for JXA which can output JSON directly)
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not JSON, continue with other parsing
  }

  // AppleScript boolean values
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // AppleScript missing value
  if (trimmed === 'missing value') return null;

  // AppleScript number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }

  // AppleScript list format: {item1, item2, item3}
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1);
    // Simple list parsing - handles basic cases
    const items = parseAppleScriptList(inner);
    if (items !== null) {
      return items;
    }
  }

  // AppleScript quoted string: "value"
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }

  // Return as plain string
  return trimmed;
}

/**
 * Parse an AppleScript list/record string into an array or object
 */
function parseAppleScriptList(inner: string): unknown[] | null {
  if (!inner.trim()) {
    return [];
  }

  const items: unknown[] = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    const prevChar = i > 0 ? inner[i - 1] : '';

    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      current += char;
    } else if (!inString) {
      if (char === '{') {
        depth++;
        current += char;
      } else if (char === '}') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        items.push(parseOutput(current.trim()));
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  // Add the last item
  if (current.trim()) {
    items.push(parseOutput(current.trim()));
  }

  return items;
}

/**
 * Internal function to execute AppleScript once (without retry logic)
 */
async function executeAppleScriptOnce(
  script: string,
  timeout: number,
  useJXA: boolean,
  args: string[]
): Promise<ExecuteResult> {
  return new Promise((resolve, reject) => {
    const osascriptArgs: string[] = [];

    // Use JXA if requested
    if (useJXA) {
      osascriptArgs.push('-l', 'JavaScript');
    }

    // Add the script via -e flag
    osascriptArgs.push('-e', script);

    // Add any additional arguments
    osascriptArgs.push(...args);

    const process = spawn('osascript', osascriptArgs);

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      process.kill('SIGTERM');
      // Force kill after 1 second if SIGTERM doesn't work
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 1000);
    }, timeout);

    process.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    process.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      const code = exitCode ?? 1;

      if (killed) {
        reject(new AppleScriptTimeoutError(timeout));
        return;
      }

      const output = stdout.trim();
      const error = stderr.trim();

      if (code !== 0) {
        resolve({
          success: false,
          output,
          error: error || `Process exited with code ${code}`,
          exitCode: code,
        });
        return;
      }

      resolve({
        success: true,
        output,
        error: error || undefined,
        exitCode: code,
        parsed: parseOutput(output),
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new AppleScriptError(err.message, 1, err.message));
    });
  });
}

/**
 * Execute an AppleScript string via osascript with optional retry logic
 *
 * @param script - The AppleScript code to execute
 * @param options - Execution options including retry configuration
 * @returns Promise resolving to the execution result
 * @throws AppleScriptTimeoutError if execution times out after all retries
 * @throws AppleScriptError if execution fails after all retries
 *
 * @example
 * // Simple execution without retries
 * const result = await executeAppleScript('return "hello"');
 *
 * @example
 * // With default retry settings
 * const result = await executeAppleScript(script, { retry: true });
 *
 * @example
 * // With custom retry configuration
 * const result = await executeAppleScript(script, {
 *   retry: {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *     maxDelayMs: 5000,
 *   }
 * });
 */
export async function executeAppleScript(
  script: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const { timeout = DEFAULT_TIMEOUT, useJXA = false, args = [], retry } = options;

  // If no retry options, execute once
  if (!retry) {
    return executeAppleScriptOnce(script, timeout, useJXA, args);
  }

  // Normalize retry options
  const retryOpts: Required<Omit<RetryOptions, 'isRetryable'>> & Pick<RetryOptions, 'isRetryable'> =
    typeof retry === 'boolean'
      ? { ...DEFAULT_RETRY_OPTIONS }
      : { ...DEFAULT_RETRY_OPTIONS, ...retry };

  const { maxRetries, isRetryable } = retryOpts;

  let lastError: Error | undefined;
  let lastResult: ExecuteResult | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeAppleScriptOnce(script, timeout, useJXA, args);

      // If successful, return immediately
      if (result.success) {
        return result;
      }

      // Execution completed but with failure status
      lastResult = result;

      // Check if we should retry this failure
      const shouldRetry = isRetryable
        ? isRetryable(new Error(result.error || 'Unknown error'), result)
        : isTransientError(undefined, result);

      if (!shouldRetry || attempt >= maxRetries) {
        return result;
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, retryOpts);
      await sleep(delay);
    } catch (error) {
      // Handle thrown errors (timeouts, process errors)
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      const shouldRetry = isRetryable
        ? isRetryable(lastError)
        : isTransientError(lastError);

      if (!shouldRetry || attempt >= maxRetries) {
        throw lastError;
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, retryOpts);
      await sleep(delay);
    }
  }

  // Should not reach here, but handle just in case
  if (lastError) {
    throw lastError;
  }
  if (lastResult) {
    return lastResult;
  }

  // Fallback - should never happen
  return {
    success: false,
    output: '',
    error: 'Unexpected retry loop exit',
    exitCode: 1,
  };
}

/**
 * Internal function to execute AppleScript file once (without retry logic)
 */
async function executeAppleScriptFileOnce(
  filePath: string,
  timeout: number,
  args: string[]
): Promise<ExecuteResult> {
  return new Promise((resolve, reject) => {
    const osascriptArgs = [filePath, ...args];

    const process = spawn('osascript', osascriptArgs);

    let stdout = '';
    let stderr = '';
    let killed = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      process.kill('SIGTERM');
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 1000);
    }, timeout);

    process.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    process.on('close', (exitCode) => {
      clearTimeout(timeoutId);

      const code = exitCode ?? 1;

      if (killed) {
        reject(new AppleScriptTimeoutError(timeout));
        return;
      }

      const output = stdout.trim();
      const error = stderr.trim();

      if (code !== 0) {
        resolve({
          success: false,
          output,
          error: error || `Process exited with code ${code}`,
          exitCode: code,
        });
        return;
      }

      resolve({
        success: true,
        output,
        error: error || undefined,
        exitCode: code,
        parsed: parseOutput(output),
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new AppleScriptError(err.message, 1, err.message));
    });
  });
}

/**
 * Execute an AppleScript file via osascript with optional retry logic
 *
 * @param filePath - Path to the AppleScript file (.scpt or .applescript)
 * @param options - Execution options including retry configuration
 * @returns Promise resolving to the execution result
 */
export async function executeAppleScriptFile(
  filePath: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const { timeout = DEFAULT_TIMEOUT, args = [], retry } = options;

  // If no retry options, execute once
  if (!retry) {
    return executeAppleScriptFileOnce(filePath, timeout, args);
  }

  // Normalize retry options
  const retryOpts: Required<Omit<RetryOptions, 'isRetryable'>> & Pick<RetryOptions, 'isRetryable'> =
    typeof retry === 'boolean'
      ? { ...DEFAULT_RETRY_OPTIONS }
      : { ...DEFAULT_RETRY_OPTIONS, ...retry };

  const { maxRetries, isRetryable } = retryOpts;

  let lastError: Error | undefined;
  let lastResult: ExecuteResult | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeAppleScriptFileOnce(filePath, timeout, args);

      // If successful, return immediately
      if (result.success) {
        return result;
      }

      // Execution completed but with failure status
      lastResult = result;

      // Check if we should retry this failure
      const shouldRetry = isRetryable
        ? isRetryable(new Error(result.error || 'Unknown error'), result)
        : isTransientError(undefined, result);

      if (!shouldRetry || attempt >= maxRetries) {
        return result;
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, retryOpts);
      await sleep(delay);
    } catch (error) {
      // Handle thrown errors (timeouts, process errors)
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      const shouldRetry = isRetryable
        ? isRetryable(lastError)
        : isTransientError(lastError);

      if (!shouldRetry || attempt >= maxRetries) {
        throw lastError;
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, retryOpts);
      await sleep(delay);
    }
  }

  // Should not reach here, but handle just in case
  if (lastError) {
    throw lastError;
  }
  if (lastResult) {
    return lastResult;
  }

  // Fallback - should never happen
  return {
    success: false,
    output: '',
    error: 'Unexpected retry loop exit',
    exitCode: 1,
  };
}

/**
 * Execute JavaScript for Automation (JXA) code
 * Convenience wrapper for executeAppleScript with useJXA: true
 *
 * @param script - The JXA code to execute
 * @param options - Execution options (useJXA is automatically set to true)
 * @returns Promise resolving to the execution result
 */
export async function executeJXA(
  script: string,
  options: Omit<ExecuteOptions, 'useJXA'> = {}
): Promise<ExecuteResult> {
  return executeAppleScript(script, { ...options, useJXA: true });
}

/**
 * Check if osascript is available on the system
 *
 * @returns Promise resolving to true if osascript is available
 */
export async function isOsascriptAvailable(): Promise<boolean> {
  try {
    const result = await executeAppleScript('return "ok"', { timeout: 5000 });
    return result.success && result.output === 'ok';
  } catch {
    return false;
  }
}

/**
 * Escape a string for use in AppleScript
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in AppleScript
 */
export function escapeAppleScriptString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Build a quoted AppleScript string
 *
 * @param str - The string to quote
 * @returns The quoted and escaped string
 */
export function quoteAppleScriptString(str: string): string {
  return `"${escapeAppleScriptString(str)}"`;
}
