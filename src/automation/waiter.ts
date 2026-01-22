/**
 * UI Waiting Utilities
 * Provides functions to wait for UI elements, handle delays between actions,
 * and manage timing for Discord automation via AppleScript/JXA
 */

import { executeJXA, executeAppleScript } from './executor.js';
import {
  TimeoutError,
  UIElementNotFoundError,
  DiscordNotRunningError,
} from '../utils/errors.js';

// ============================================
// Configuration Types
// ============================================

/**
 * Options for waiting operations
 */
export interface WaitOptions {
  /** Maximum time to wait in milliseconds (default: 10000) */
  timeout?: number;
  /** Interval between checks in milliseconds (default: 100) */
  pollInterval?: number;
  /** Whether to throw on timeout (default: true) */
  throwOnTimeout?: boolean;
}

/**
 * Options for delay operations
 */
export interface DelayOptions {
  /** Minimum delay in milliseconds (default: same as delay) */
  minDelay?: number;
  /** Maximum delay in milliseconds (for random delays) */
  maxDelay?: number;
}

/**
 * Element search criteria for finding UI elements
 */
export interface ElementCriteria {
  /** The role of the element (e.g., 'button', 'text field', 'menu item') */
  role?: string;
  /** The accessibility description */
  description?: string;
  /** The title/label of the element */
  title?: string;
  /** The value of the element */
  value?: string;
  /** Partial text to match in the element's name or title */
  contains?: string;
  /** The subrole (for more specific matching) */
  subrole?: string;
  /** Whether the element should be enabled */
  enabled?: boolean;
  /** Whether the element should be focused */
  focused?: boolean;
}

/**
 * Result of waiting for an element
 */
export interface WaitResult {
  /** Whether the wait was successful */
  success: boolean;
  /** Time elapsed in milliseconds */
  elapsedMs: number;
  /** Error if the wait failed */
  error?: string;
  /** Element found (basic info) */
  element?: {
    role: string;
    title: string;
    description: string;
    enabled: boolean;
  };
}

// ============================================
// Default Configuration
// ============================================

/** Default timeout for wait operations (10 seconds) */
export const DEFAULT_WAIT_TIMEOUT = 10000;

/** Default polling interval (100ms) */
export const DEFAULT_POLL_INTERVAL = 100;

/** Standard delay between UI actions (300ms) */
export const STANDARD_ACTION_DELAY = 300;

/** Short delay for quick succession actions (100ms) */
export const SHORT_ACTION_DELAY = 100;

/** Long delay for operations that need more time (500ms) */
export const LONG_ACTION_DELAY = 500;

/** Very long delay for major UI transitions (1000ms) */
export const TRANSITION_DELAY = 1000;

/** Delay for waiting after clicks for UI response (200ms) */
export const CLICK_RESPONSE_DELAY = 200;

/** Delay for waiting after typing for text to register (150ms) */
export const TYPE_RESPONSE_DELAY = 150;

/** Delay for waiting for modal dialogs to appear (400ms) */
export const MODAL_APPEAR_DELAY = 400;

/** Delay for waiting after modal dialogs close (300ms) */
export const MODAL_CLOSE_DELAY = 300;

/** Delay for waiting after server creation starts (2000ms) */
export const SERVER_CREATION_DELAY = 2000;

// ============================================
// Basic Delay Functions
// ============================================

/**
 * Simple delay/sleep function
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay with random variance (useful for more human-like automation)
 *
 * @param baseMs - Base delay in milliseconds
 * @param varianceMs - Maximum variance (+/-) in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delayWithVariance(
  baseMs: number,
  varianceMs: number = 50
): Promise<void> {
  const variance = Math.floor(Math.random() * varianceMs * 2) - varianceMs;
  const actualDelay = Math.max(0, baseMs + variance);
  return delay(actualDelay);
}

/**
 * Random delay within a range
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(delayTime);
}

/**
 * Standard delay between UI actions
 *
 * @returns Promise that resolves after standard delay
 */
export function actionDelay(): Promise<void> {
  return delayWithVariance(STANDARD_ACTION_DELAY, 50);
}

/**
 * Short delay for quick actions
 *
 * @returns Promise that resolves after short delay
 */
export function shortDelay(): Promise<void> {
  return delayWithVariance(SHORT_ACTION_DELAY, 25);
}

/**
 * Long delay for operations requiring more time
 *
 * @returns Promise that resolves after long delay
 */
export function longDelay(): Promise<void> {
  return delayWithVariance(LONG_ACTION_DELAY, 100);
}

/**
 * Very long delay for major transitions
 *
 * @returns Promise that resolves after transition delay
 */
export function transitionDelay(): Promise<void> {
  return delayWithVariance(TRANSITION_DELAY, 200);
}

// ============================================
// Discord-specific Wait Functions
// ============================================

/**
 * Wait for Discord application to be running and accessible
 *
 * @param options - Wait options
 * @returns Promise resolving to true if Discord is running
 * @throws DiscordNotRunningError if Discord is not running after timeout
 */
export async function waitForDiscord(
  options: WaitOptions = {}
): Promise<boolean> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const script = `
    const app = Application("Discord");
    return app.running();
  `;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await executeJXA(script, { timeout: 2000 });
      if (result.success && result.parsed === true) {
        return true;
      }
    } catch {
      // Discord not running or not accessible yet
    }

    await delay(pollInterval);
  }

  if (throwOnTimeout) {
    throw new DiscordNotRunningError(
      `Discord did not become available within ${timeout}ms`
    );
  }

  return false;
}

/**
 * Wait for Discord window to be frontmost/focused
 *
 * @param options - Wait options
 * @returns Promise resolving to true if Discord is focused
 */
export async function waitForDiscordFocused(
  options: WaitOptions = {}
): Promise<boolean> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const script = `
    const systemEvents = Application("System Events");
    const frontApp = systemEvents.processes.whose({ frontmost: true })[0];
    return frontApp.name() === "Discord";
  `;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await executeJXA(script, { timeout: 2000 });
      if (result.success && result.parsed === true) {
        return true;
      }
    } catch {
      // Not focused yet
    }

    await delay(pollInterval);
  }

  if (throwOnTimeout) {
    throw new TimeoutError(
      'waitForDiscordFocused',
      timeout,
      'Discord window did not become focused'
    );
  }

  return false;
}

/**
 * Activate Discord (bring to front) and wait for it to be focused
 *
 * @param options - Wait options
 * @returns Promise resolving when Discord is focused
 */
export async function activateDiscord(
  options: WaitOptions = {}
): Promise<boolean> {
  const activateScript = `
    const app = Application("Discord");
    app.activate();
    return true;
  `;

  try {
    await executeJXA(activateScript, { timeout: 5000 });
  } catch {
    throw new DiscordNotRunningError('Failed to activate Discord');
  }

  // Wait a moment for the activation to take effect
  await delay(CLICK_RESPONSE_DELAY);

  return waitForDiscordFocused(options);
}

// ============================================
// Generic UI Element Wait Functions
// ============================================

/**
 * Build JXA code to find an element matching the given criteria
 *
 * @param criteria - Element search criteria
 * @returns JXA code snippet for finding the element
 */
function buildElementSearchCode(criteria: ElementCriteria): string {
  const conditions: string[] = [];

  if (criteria.role) {
    conditions.push(`el.role() === "${criteria.role}"`);
  }
  if (criteria.subrole) {
    conditions.push(`el.subrole() === "${criteria.subrole}"`);
  }
  if (criteria.description) {
    conditions.push(`el.description() === "${criteria.description}"`);
  }
  if (criteria.title) {
    conditions.push(`el.title() === "${criteria.title}"`);
  }
  if (criteria.value !== undefined) {
    conditions.push(`el.value() === "${criteria.value}"`);
  }
  if (criteria.contains) {
    conditions.push(
      `(el.name() && el.name().includes("${criteria.contains}")) || ` +
        `(el.title() && el.title().includes("${criteria.contains}")) || ` +
        `(el.description() && el.description().includes("${criteria.contains}"))`
    );
  }
  if (criteria.enabled !== undefined) {
    conditions.push(`el.enabled() === ${criteria.enabled}`);
  }
  if (criteria.focused !== undefined) {
    conditions.push(`el.focused() === ${criteria.focused}`);
  }

  return conditions.join(' && ') || 'true';
}

/**
 * Wait for a UI element to appear in the Discord window
 *
 * @param criteria - Criteria for finding the element
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForElement(
  criteria: ElementCriteria,
  options: WaitOptions = {}
): Promise<WaitResult> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const searchCondition = buildElementSearchCode(criteria);

  const script = `
    function findElement(element, depth = 0) {
      if (depth > 15) return null; // Limit recursion depth

      try {
        const el = element;
        if (${searchCondition}) {
          return {
            found: true,
            role: el.role() || '',
            title: el.title() || '',
            description: el.description() || '',
            enabled: el.enabled() || false
          };
        }

        // Search children
        const children = el.uiElements();
        for (let i = 0; i < children.length; i++) {
          const result = findElement(children[i], depth + 1);
          if (result) return result;
        }
      } catch (e) {
        // Element may have disappeared
      }

      return null;
    }

    const systemEvents = Application("System Events");
    const discord = systemEvents.processes.byName("Discord");
    const windows = discord.windows();

    if (windows.length === 0) {
      return JSON.stringify({ found: false, error: "No Discord window found" });
    }

    const mainWindow = windows[0];
    const result = findElement(mainWindow);

    return JSON.stringify(result || { found: false });
  `;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await executeJXA(script, { timeout: 3000 });

      if (result.success && result.output) {
        const parsed =
          typeof result.parsed === 'object'
            ? result.parsed
            : JSON.parse(result.output);

        if (
          parsed &&
          typeof parsed === 'object' &&
          'found' in parsed &&
          parsed.found === true
        ) {
          return {
            success: true,
            elapsedMs: Date.now() - startTime,
            element: {
              role: String(parsed.role || ''),
              title: String(parsed.title || ''),
              description: String(parsed.description || ''),
              enabled: Boolean(parsed.enabled),
            },
          };
        }
      }
    } catch {
      // Element not found yet, continue waiting
    }

    await delay(pollInterval);
  }

  const elapsedMs = Date.now() - startTime;

  if (throwOnTimeout) {
    throw new UIElementNotFoundError(
      JSON.stringify(criteria),
      criteria as Record<string, unknown>,
      `Element not found within ${timeout}ms`
    );
  }

  return {
    success: false,
    elapsedMs,
    error: `Element not found within ${timeout}ms`,
  };
}

/**
 * Wait for a button with the specified text to appear
 *
 * @param buttonText - The text of the button to find
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForButton(
  buttonText: string,
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      role: 'AXButton',
      contains: buttonText,
    },
    options
  );
}

/**
 * Wait for a text field to appear
 *
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForTextField(
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      role: 'AXTextField',
      enabled: true,
    },
    options
  );
}

/**
 * Wait for a menu item with the specified text to appear
 *
 * @param menuItemText - The text of the menu item
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForMenuItem(
  menuItemText: string,
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      role: 'AXMenuItem',
      contains: menuItemText,
    },
    options
  );
}

/**
 * Wait for any element containing specific text
 *
 * @param text - The text to search for
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForText(
  text: string,
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      contains: text,
    },
    options
  );
}

// ============================================
// Element State Wait Functions
// ============================================

/**
 * Wait for an element to become enabled
 *
 * @param criteria - Criteria for finding the element
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForElementEnabled(
  criteria: ElementCriteria,
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      ...criteria,
      enabled: true,
    },
    options
  );
}

/**
 * Wait for an element to become focused
 *
 * @param criteria - Criteria for finding the element
 * @param options - Wait options
 * @returns Promise resolving to wait result
 */
export async function waitForElementFocused(
  criteria: ElementCriteria,
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElement(
    {
      ...criteria,
      focused: true,
    },
    options
  );
}

/**
 * Wait for an element to disappear from the UI
 *
 * @param criteria - Criteria for the element that should disappear
 * @param options - Wait options
 * @returns Promise resolving when element is gone
 */
export async function waitForElementGone(
  criteria: ElementCriteria,
  options: WaitOptions = {}
): Promise<WaitResult> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await waitForElement(criteria, {
      timeout: pollInterval * 2,
      pollInterval,
      throwOnTimeout: false,
    });

    if (!result.success) {
      // Element is gone
      return {
        success: true,
        elapsedMs: Date.now() - startTime,
      };
    }

    await delay(pollInterval);
  }

  const elapsedMs = Date.now() - startTime;

  if (throwOnTimeout) {
    throw new TimeoutError(
      'waitForElementGone',
      timeout,
      `Element still present after ${timeout}ms`
    );
  }

  return {
    success: false,
    elapsedMs,
    error: `Element still present after ${timeout}ms`,
  };
}

// ============================================
// Discord-specific Element Waiters
// ============================================

/**
 * Wait for the server creation modal to appear
 *
 * @param options - Wait options
 * @returns Promise resolving when modal appears
 */
export async function waitForServerCreationModal(
  options: WaitOptions = {}
): Promise<WaitResult> {
  // Look for "Create a server" or similar text in the modal
  return waitForText('Create a server', {
    timeout: options.timeout ?? 5000,
    ...options,
  });
}

/**
 * Wait for a modal/dialog to appear
 *
 * @param options - Wait options
 * @returns Promise resolving when modal appears
 */
export async function waitForModal(
  options: WaitOptions = {}
): Promise<WaitResult> {
  // Discord modals typically have a sheet or dialog role
  return waitForElement(
    {
      role: 'AXSheet',
    },
    {
      timeout: options.timeout ?? MODAL_APPEAR_DELAY * 3,
      ...options,
    }
  );
}

/**
 * Wait for a modal/dialog to close
 *
 * @param options - Wait options
 * @returns Promise resolving when modal is gone
 */
export async function waitForModalClosed(
  options: WaitOptions = {}
): Promise<WaitResult> {
  return waitForElementGone(
    {
      role: 'AXSheet',
    },
    {
      timeout: options.timeout ?? MODAL_CLOSE_DELAY * 5,
      ...options,
    }
  );
}

/**
 * Wait for the channel list to be visible and loaded
 *
 * @param options - Wait options
 * @returns Promise resolving when channel list is ready
 */
export async function waitForChannelList(
  options: WaitOptions = {}
): Promise<WaitResult> {
  // Look for typical channel list indicators
  return waitForElement(
    {
      role: 'AXList',
      description: 'Channels',
    },
    {
      timeout: options.timeout ?? 5000,
      throwOnTimeout: false,
      ...options,
    }
  );
}

/**
 * Wait for the server sidebar to be visible
 *
 * @param options - Wait options
 * @returns Promise resolving when sidebar is ready
 */
export async function waitForServerSidebar(
  options: WaitOptions = {}
): Promise<WaitResult> {
  // Sidebar contains server icons
  return waitForElement(
    {
      role: 'AXList',
    },
    {
      timeout: options.timeout ?? 5000,
      ...options,
    }
  );
}

// ============================================
// Retry Utilities
// ============================================

/**
 * Options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to increase delay exponentially */
  exponentialBackoff?: boolean;
  /** Maximum delay when using exponential backoff */
  maxDelay?: number;
  /** Callback called before each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Retry a function until it succeeds or max attempts reached
 *
 * @param fn - The async function to retry
 * @param options - Retry options
 * @returns Promise resolving to the function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    retryDelay = STANDARD_ACTION_DELAY,
    exponentialBackoff = false,
    maxDelay = 5000,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        let waitTime = retryDelay;
        if (exponentialBackoff) {
          waitTime = Math.min(retryDelay * Math.pow(2, attempt - 1), maxDelay);
        }

        await delay(waitTime);
      }
    }
  }

  throw lastError;
}

/**
 * Retry with condition check - keeps retrying until condition is met
 *
 * @param conditionFn - Function that returns true when condition is met
 * @param options - Wait options
 * @returns Promise resolving when condition is met
 */
export async function waitUntil(
  conditionFn: () => Promise<boolean> | boolean,
  options: WaitOptions = {}
): Promise<boolean> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await conditionFn();
      if (result) {
        return true;
      }
    } catch {
      // Condition check failed, continue waiting
    }

    await delay(pollInterval);
  }

  if (throwOnTimeout) {
    throw new TimeoutError(
      'waitUntil',
      timeout,
      'Condition was not met within timeout'
    );
  }

  return false;
}

// ============================================
// Combination Utilities
// ============================================

/**
 * Wait for any of the given conditions to be true
 *
 * @param conditions - Array of wait functions
 * @param options - Wait options
 * @returns Promise resolving to the index of the first matching condition
 */
export async function waitForAny(
  conditions: Array<() => Promise<WaitResult>>,
  options: WaitOptions = {}
): Promise<{ index: number; result: WaitResult }> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (let i = 0; i < conditions.length; i++) {
      try {
        const result = await conditions[i]();
        if (result.success) {
          return { index: i, result };
        }
      } catch {
        // This condition not met yet
      }
    }

    await delay(pollInterval);
  }

  if (throwOnTimeout) {
    throw new TimeoutError(
      'waitForAny',
      timeout,
      'None of the conditions were met within timeout'
    );
  }

  return {
    index: -1,
    result: {
      success: false,
      elapsedMs: Date.now() - startTime,
      error: 'No conditions met',
    },
  };
}

/**
 * Wait for all conditions to be true
 *
 * @param conditions - Array of wait functions
 * @param options - Wait options
 * @returns Promise resolving when all conditions are met
 */
export async function waitForAll(
  conditions: Array<() => Promise<WaitResult>>,
  options: WaitOptions = {}
): Promise<WaitResult[]> {
  const {
    timeout = DEFAULT_WAIT_TIMEOUT,
    pollInterval = DEFAULT_POLL_INTERVAL,
    throwOnTimeout = true,
  } = options;

  const startTime = Date.now();
  const results: WaitResult[] = new Array(conditions.length).fill(null);
  const completed: boolean[] = new Array(conditions.length).fill(false);

  while (Date.now() - startTime < timeout) {
    let allComplete = true;

    for (let i = 0; i < conditions.length; i++) {
      if (completed[i]) continue;

      try {
        const result = await conditions[i]();
        if (result.success) {
          results[i] = result;
          completed[i] = true;
        } else {
          allComplete = false;
        }
      } catch {
        allComplete = false;
      }
    }

    if (allComplete) {
      return results;
    }

    await delay(pollInterval);
  }

  if (throwOnTimeout) {
    const notCompleted = completed
      .map((c, i) => (c ? null : i))
      .filter((i) => i !== null);
    throw new TimeoutError(
      'waitForAll',
      timeout,
      `Conditions at indices [${notCompleted.join(', ')}] were not met within timeout`
    );
  }

  return results;
}

// ============================================
// Utility Exports
// ============================================

/**
 * Pre-configured delays for common Discord automation scenarios
 */
export const Delays = {
  /** Delay after clicking a button */
  afterClick: () => delay(CLICK_RESPONSE_DELAY),
  /** Delay after typing text */
  afterType: () => delay(TYPE_RESPONSE_DELAY),
  /** Delay after a modal appears */
  afterModalOpen: () => delay(MODAL_APPEAR_DELAY),
  /** Delay after a modal closes */
  afterModalClose: () => delay(MODAL_CLOSE_DELAY),
  /** Delay for server creation */
  afterServerCreate: () => delay(SERVER_CREATION_DELAY),
  /** Standard action delay */
  standard: actionDelay,
  /** Short delay */
  short: shortDelay,
  /** Long delay */
  long: longDelay,
  /** Transition delay */
  transition: transitionDelay,
} as const;
