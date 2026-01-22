/**
 * AppleScript Execution Engine
 * Handles executing AppleScript via osascript with error handling, timeouts, and result parsing
 */

import { spawn } from 'child_process';

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
 * Execute an AppleScript string via osascript
 *
 * @param script - The AppleScript code to execute
 * @param options - Execution options
 * @returns Promise resolving to the execution result
 * @throws AppleScriptTimeoutError if execution times out
 * @throws AppleScriptError if execution fails
 */
export async function executeAppleScript(
  script: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const { timeout = DEFAULT_TIMEOUT, useJXA = false, args = [] } = options;

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
 * Execute an AppleScript file via osascript
 *
 * @param filePath - Path to the AppleScript file (.scpt or .applescript)
 * @param options - Execution options
 * @returns Promise resolving to the execution result
 */
export async function executeAppleScriptFile(
  filePath: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const { timeout = DEFAULT_TIMEOUT, args = [] } = options;

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
