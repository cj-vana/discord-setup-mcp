/**
 * Discord Application Control Helpers
 * Provides functions to interact with the Discord desktop app via AppleScript/JXA
 */

import {
  executeAppleScript,
  executeJXA,
  quoteAppleScriptString,
  type ExecuteResult,
} from './executor.js';
import {
  DiscordNotRunningError,
  AccessibilityDeniedError,
  UIElementNotFoundError,
  TimeoutError,
  DiscordStateError,
  wrapError,
} from '../utils/errors.js';

/** Discord application bundle identifier */
const DISCORD_BUNDLE_ID = 'com.hnc.Discord';

/** Discord application name */
const DISCORD_APP_NAME = 'Discord';

/** Default delay between UI operations in seconds */
const DEFAULT_UI_DELAY = 0.3;

/** Default timeout for wait operations in milliseconds */
const DEFAULT_WAIT_TIMEOUT = 10000;

/**
 * Discord application status information
 */
export interface DiscordStatus {
  /** Whether Discord application is running */
  isRunning: boolean;
  /** Whether Discord is the frontmost application */
  isFrontmost: boolean;
  /** Whether Discord window is visible */
  isVisible: boolean;
  /** Number of Discord windows open */
  windowCount: number;
  /** Title of the main window if available */
  mainWindowTitle?: string;
}

/**
 * Options for clicking UI elements
 */
export interface ClickOptions {
  /** Number of clicks (default: 1) */
  clickCount?: number;
  /** Delay before clicking in seconds (default: DEFAULT_UI_DELAY) */
  delay?: number;
  /** Whether to use accessibility API (default: true) */
  useAccessibility?: boolean;
}

/**
 * Options for typing text
 */
export interface TypeOptions {
  /** Delay before typing in seconds (default: DEFAULT_UI_DELAY) */
  delay?: number;
  /** Whether to press Enter after typing (default: false) */
  pressEnter?: boolean;
  /** Modifier keys to hold while typing */
  modifiers?: Array<'command' | 'shift' | 'option' | 'control'>;
}

/**
 * Options for waiting on conditions
 */
export interface WaitOptions {
  /** Timeout in milliseconds (default: DEFAULT_WAIT_TIMEOUT) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 500) */
  pollInterval?: number;
}

/**
 * UI Element search criteria
 */
export interface ElementCriteria {
  /** Element role (e.g., 'button', 'text field', 'menu item') */
  role?: string;
  /** Element name/title */
  name?: string;
  /** Element description */
  description?: string;
  /** Element value */
  value?: string;
  /** Search within a specific parent element path */
  parentPath?: string[];
  /** Whether to use partial/contains matching instead of exact match */
  partialMatch?: boolean;
}

/**
 * Search strategy for finding UI elements
 */
export interface SearchStrategy {
  /** Strategy name for logging/debugging */
  name: string;
  /** The criteria to use for this strategy */
  criteria: ElementCriteria;
  /** Optional priority (higher = try first) */
  priority?: number;
}

/**
 * Result of an element search attempt
 */
export interface ElementSearchResult {
  /** Whether the element was found */
  found: boolean;
  /** Strategy that succeeded (if found) */
  successfulStrategy?: string;
  /** All strategies attempted */
  attemptedStrategies: string[];
  /** Detailed error messages from each failed attempt */
  failureDetails: Array<{ strategy: string; error: string }>;
}

/**
 * Options for element finding with fallback strategies
 */
export interface FindElementOptions {
  /** Timeout in milliseconds for the entire search operation */
  timeout?: number;
  /** Delay between strategy attempts in milliseconds */
  retryDelay?: number;
  /** Whether to use JXA for more reliable element discovery */
  useJXA?: boolean;
  /** Whether to search recursively through all UI elements */
  deepSearch?: boolean;
}

/**
 * Check the current status of the Discord application
 *
 * @returns Promise resolving to Discord status information
 */
export async function checkDiscordStatus(): Promise<DiscordStatus> {
  const script = `
    tell application "System Events"
      set discordRunning to (name of processes) contains "${DISCORD_APP_NAME}"
      if discordRunning then
        set discordProcess to first process whose name is "${DISCORD_APP_NAME}"
        set isFront to frontmost of discordProcess
        set isVis to visible of discordProcess
        set winCount to count of windows of discordProcess
        if winCount > 0 then
          set mainTitle to name of window 1 of discordProcess
        else
          set mainTitle to ""
        end if
        return "running:" & discordRunning & ",frontmost:" & isFront & ",visible:" & isVis & ",windows:" & winCount & ",title:" & mainTitle
      else
        return "running:false,frontmost:false,visible:false,windows:0,title:"
      end if
    end tell
  `;

  try {
    const result = await executeAppleScript(script);
    if (!result.success) {
      throw new Error(result.error || 'Failed to check Discord status');
    }

    // Parse the result
    const output = result.output;
    const parts: Record<string, string> = {};
    output.split(',').forEach((part) => {
      const [key, ...valueParts] = part.split(':');
      parts[key] = valueParts.join(':');
    });

    return {
      isRunning: parts['running'] === 'true',
      isFrontmost: parts['frontmost'] === 'true',
      isVisible: parts['visible'] === 'true',
      windowCount: parseInt(parts['windows'] || '0', 10),
      mainWindowTitle: parts['title'] || undefined,
    };
  } catch (error) {
    throw wrapError(error, 'Failed to check Discord status');
  }
}

/**
 * Check if Discord is currently running
 *
 * @returns Promise resolving to true if Discord is running
 */
export async function isDiscordRunning(): Promise<boolean> {
  const status = await checkDiscordStatus();
  return status.isRunning;
}

/**
 * Ensure Discord is running, throw error if not
 *
 * @throws DiscordNotRunningError if Discord is not running
 */
export async function ensureDiscordRunning(): Promise<void> {
  const running = await isDiscordRunning();
  if (!running) {
    throw new DiscordNotRunningError();
  }
}

/**
 * Activate Discord application (bring to foreground)
 *
 * @param options - Optional settings for activation
 * @returns Promise resolving when Discord is activated
 * @throws DiscordNotRunningError if Discord is not running
 */
export async function activateDiscord(
  options: { launchIfNotRunning?: boolean; waitForWindow?: boolean } = {}
): Promise<void> {
  const { launchIfNotRunning = false, waitForWindow = true } = options;

  // Check if Discord is running
  const running = await isDiscordRunning();

  if (!running) {
    if (launchIfNotRunning) {
      // Launch Discord
      const launchScript = `
        tell application "${DISCORD_APP_NAME}"
          activate
        end tell
      `;
      await executeAppleScript(launchScript);

      // Wait for Discord to launch
      if (waitForWindow) {
        await waitForDiscordWindow({ timeout: 30000 });
      }
    } else {
      throw new DiscordNotRunningError();
    }
  } else {
    // Activate existing Discord
    const activateScript = `
      tell application "${DISCORD_APP_NAME}"
        activate
      end tell
      delay ${DEFAULT_UI_DELAY}
    `;
    const result = await executeAppleScript(activateScript);
    if (!result.success) {
      throw wrapError(result.error, 'Failed to activate Discord');
    }
  }
}

/**
 * Wait for Discord window to be available
 *
 * @param options - Wait options
 * @throws TimeoutError if window doesn't appear within timeout
 */
export async function waitForDiscordWindow(
  options: WaitOptions = {}
): Promise<void> {
  const { timeout = DEFAULT_WAIT_TIMEOUT, pollInterval = 500 } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await checkDiscordStatus();
    if (status.isRunning && status.windowCount > 0) {
      return;
    }
    await delay(pollInterval);
  }

  throw new TimeoutError('waitForDiscordWindow', timeout);
}

/**
 * Click at specific screen coordinates
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param options - Click options
 */
export async function clickAtCoordinates(
  x: number,
  y: number,
  options: ClickOptions = {}
): Promise<void> {
  const { clickCount = 1, delay: clickDelay = DEFAULT_UI_DELAY } = options;

  await ensureDiscordRunning();

  const script = `
    delay ${clickDelay}
    tell application "System Events"
      repeat ${clickCount} times
        click at {${x}, ${y}}
        delay 0.1
      end repeat
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result.success) {
    throw wrapError(result.error, `Failed to click at (${x}, ${y})`);
  }
}

/**
 * Click a UI element by search criteria
 *
 * @param criteria - Element search criteria
 * @param options - Click options
 * @throws UIElementNotFoundError if element cannot be found
 * @throws AccessibilityDeniedError if accessibility permissions are denied
 */
export async function clickElement(
  criteria: ElementCriteria,
  options: ClickOptions = {}
): Promise<void> {
  const { clickCount = 1, delay: clickDelay = DEFAULT_UI_DELAY } = options;

  await ensureDiscordRunning();

  // Build the element search path
  const searchPath = buildElementSearchPath(criteria);

  const script = `
    delay ${clickDelay}
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        ${searchPath}
        if exists targetElement then
          repeat ${clickCount} times
            click targetElement
            delay 0.1
          end repeat
          return "clicked"
        else
          return "not_found"
        end if
      end tell
    end tell
  `;

  try {
    const result = await executeAppleScript(script);

    if (!result.success) {
      // Check for accessibility errors
      if (
        result.error?.includes('not allowed assistive access') ||
        result.error?.includes('accessibility')
      ) {
        throw new AccessibilityDeniedError();
      }
      throw wrapError(result.error, 'Failed to click element');
    }

    if (result.output === 'not_found') {
      throw new UIElementNotFoundError(
        describeCriteria(criteria),
        criteria as Record<string, unknown>
      );
    }
  } catch (error) {
    if (
      error instanceof UIElementNotFoundError ||
      error instanceof AccessibilityDeniedError
    ) {
      throw error;
    }
    throw wrapError(error, 'Failed to click element');
  }
}

/**
 * Click a button by its name/title
 *
 * @param buttonName - The name or title of the button
 * @param options - Click options
 */
export async function clickButton(
  buttonName: string,
  options: ClickOptions = {}
): Promise<void> {
  return clickElement({ role: 'button', name: buttonName }, options);
}

/**
 * Click a menu item in Discord
 *
 * @param menuPath - Array of menu item names (e.g., ['File', 'Settings'])
 * @param options - Click options
 */
export async function clickMenuItem(
  menuPath: string[],
  options: ClickOptions = {}
): Promise<void> {
  const { delay: clickDelay = DEFAULT_UI_DELAY } = options;

  await ensureDiscordRunning();

  if (menuPath.length === 0) {
    throw new Error('Menu path cannot be empty');
  }

  // Build menu navigation script
  let menuScript = `
    delay ${clickDelay}
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
  `;

  // Click through menu hierarchy
  menuScript += `        click menu bar item ${quoteAppleScriptString(menuPath[0])} of menu bar 1\n`;

  for (let i = 1; i < menuPath.length; i++) {
    const parentMenus = menuPath.slice(0, i).map(quoteAppleScriptString);
    menuScript += `        click menu item ${quoteAppleScriptString(menuPath[i])} of menu ${parentMenus[parentMenus.length - 1]} of menu bar item ${parentMenus[0]} of menu bar 1\n`;
  }

  menuScript += `
      end tell
    end tell
  `;

  const result = await executeAppleScript(menuScript);
  if (!result.success) {
    throw new UIElementNotFoundError(`Menu: ${menuPath.join(' > ')}`, {
      menuPath,
    });
  }
}

/**
 * Type text using keyboard simulation
 *
 * @param text - The text to type
 * @param options - Type options
 */
export async function typeText(
  text: string,
  options: TypeOptions = {}
): Promise<void> {
  const {
    delay: typeDelay = DEFAULT_UI_DELAY,
    pressEnter = false,
    modifiers = [],
  } = options;

  await ensureDiscordRunning();

  // Build modifier key string for AppleScript
  const modifierString =
    modifiers.length > 0
      ? `using {${modifiers.map((m) => `${m} down`).join(', ')}}`
      : '';

  const script = `
    delay ${typeDelay}
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        keystroke ${quoteAppleScriptString(text)} ${modifierString}
        ${pressEnter ? 'key code 36' : ''}
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result.success) {
    throw wrapError(result.error, 'Failed to type text');
  }
}

/**
 * Press a keyboard shortcut
 *
 * @param key - The key to press
 * @param modifiers - Modifier keys to hold
 */
export async function pressKey(
  key: string | number,
  modifiers: Array<'command' | 'shift' | 'option' | 'control'> = []
): Promise<void> {
  await ensureDiscordRunning();

  const modifierString =
    modifiers.length > 0
      ? `using {${modifiers.map((m) => `${m} down`).join(', ')}}`
      : '';

  // Determine if we should use key code or keystroke
  const keyCommand =
    typeof key === 'number'
      ? `key code ${key}`
      : `keystroke ${quoteAppleScriptString(key)}`;

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        ${keyCommand} ${modifierString}
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result.success) {
    throw wrapError(result.error, 'Failed to press key');
  }
}

/**
 * Press Enter key
 */
export async function pressEnter(): Promise<void> {
  return pressKey(36); // 36 is the key code for Enter/Return
}

/**
 * Press Escape key
 */
export async function pressEscape(): Promise<void> {
  return pressKey(53); // 53 is the key code for Escape
}

/**
 * Press Tab key
 */
export async function pressTab(withShift = false): Promise<void> {
  return pressKey(48, withShift ? ['shift'] : []); // 48 is the key code for Tab
}

/**
 * Open Discord settings
 */
export async function openSettings(): Promise<void> {
  await activateDiscord();
  // Discord settings shortcut: Command + ,
  await pressKey(',', ['command']);
  await delay(500); // Wait for settings to open
}

/**
 * Close current modal/dialog in Discord
 */
export async function closeModal(): Promise<void> {
  await pressEscape();
}

/**
 * Navigate to a specific server by name in the server list
 *
 * @param serverName - Name of the server to navigate to
 * @throws UIElementNotFoundError if server is not found
 */
export async function navigateToServer(serverName: string): Promise<void> {
  await activateDiscord();

  // Use JXA for more reliable element finding
  const script = `
    const se = Application('System Events');
    const discord = se.processes.byName('Discord');
    discord.frontmost = true;
    delay(0.3);

    // Try to find and click the server in the sidebar
    const windows = discord.windows();
    if (windows.length === 0) {
      return JSON.stringify({ success: false, error: 'No Discord window found' });
    }

    // Look for server list - typically in a scroll area or list
    try {
      const groups = discord.windows[0].groups();
      // Server icons are usually in the first group/navigation area
      for (const group of groups) {
        const buttons = group.buttons();
        for (const button of buttons) {
          try {
            const name = button.name();
            const desc = button.description();
            if (name === ${JSON.stringify(serverName)} ||
                (desc && desc.includes(${JSON.stringify(serverName)}))) {
              button.click();
              return JSON.stringify({ success: true });
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    } catch (e) {
      return JSON.stringify({ success: false, error: e.toString() });
    }

    return JSON.stringify({ success: false, error: 'Server not found' });
  `;

  const result = await executeJXA(script);

  if (!result.success) {
    throw wrapError(result.error, `Failed to navigate to server: ${serverName}`);
  }

  try {
    const parsed = JSON.parse(result.output) as {
      success: boolean;
      error?: string;
    };
    if (!parsed.success) {
      throw new UIElementNotFoundError(`Server: ${serverName}`, {
        serverName,
      });
    }
  } catch (error) {
    if (error instanceof UIElementNotFoundError) {
      throw error;
    }
    throw wrapError(error, `Failed to navigate to server: ${serverName}`);
  }
}

/**
 * Open server settings for the current server
 */
export async function openServerSettings(): Promise<void> {
  await activateDiscord();

  // Right-click on the server name to get context menu, then click Server Settings
  // Alternative: Click the server name dropdown then settings
  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        delay 0.3

        -- Try to find and click the server dropdown (usually has the server name)
        -- This is typically near the top of the channel list
        try
          set serverHeader to first group of window 1 whose role description is "heading"
          click serverHeader
          delay 0.3

          -- Look for "Server Settings" in the dropdown menu
          click menu item "Server Settings" of menu 1
          return "success"
        on error
          -- Alternative: use keyboard shortcut or other method
          return "fallback"
        end try
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success || result.output === 'fallback') {
    // Fallback: Try clicking directly in the expected location
    throw new DiscordStateError(
      'server view with accessible header',
      undefined,
      'Could not open server settings. Make sure a server is selected.'
    );
  }
}

/**
 * Focus a text input field in Discord
 *
 * @param fieldType - Type of field to focus ('message', 'search', 'name', etc.)
 */
export async function focusTextField(
  fieldType: 'message' | 'search' | 'name' | 'topic' = 'message'
): Promise<void> {
  await ensureDiscordRunning();

  const roleDescriptions: Record<string, string> = {
    message: 'Message input',
    search: 'Search',
    name: 'Name',
    topic: 'Topic',
  };

  const description = roleDescriptions[fieldType] || fieldType;

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        delay 0.2

        -- Find text fields
        set textFields to every text field of window 1
        repeat with tf in textFields
          try
            set tfDesc to description of tf
            if tfDesc contains ${quoteAppleScriptString(description)} then
              set focused of tf to true
              return "focused"
            end if
          end try
        end repeat

        -- Also check text areas
        set textAreas to every text area of window 1
        repeat with ta in textAreas
          try
            set taDesc to description of ta
            if taDesc contains ${quoteAppleScriptString(description)} then
              set focused of ta to true
              return "focused"
            end if
          end try
        end repeat

        return "not_found"
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success || result.output === 'not_found') {
    throw new UIElementNotFoundError(`Text field: ${fieldType}`, {
      fieldType,
    });
  }
}

/**
 * Wait for a UI element to appear
 *
 * @param criteria - Element search criteria
 * @param options - Wait options
 * @throws TimeoutError if element doesn't appear within timeout
 */
export async function waitForElement(
  criteria: ElementCriteria,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout = DEFAULT_WAIT_TIMEOUT, pollInterval = 500 } = options;

  await ensureDiscordRunning();

  const searchPath = buildElementSearchPath(criteria);
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const script = `
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          ${searchPath}
          return exists targetElement
        end tell
      end tell
    `;

    const result = await executeAppleScript(script);
    if (result.success && result.parsed === true) {
      return;
    }

    await delay(pollInterval);
  }

  throw new TimeoutError(`waitForElement: ${describeCriteria(criteria)}`, timeout);
}

/**
 * Get the value of a UI element
 *
 * @param criteria - Element search criteria
 * @returns The value of the element
 */
export async function getElementValue(
  criteria: ElementCriteria
): Promise<string | null> {
  await ensureDiscordRunning();

  const searchPath = buildElementSearchPath(criteria);

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        ${searchPath}
        if exists targetElement then
          try
            return value of targetElement
          on error
            return name of targetElement
          end try
        else
          return "<<NOT_FOUND>>"
        end if
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success) {
    throw wrapError(result.error, 'Failed to get element value');
  }

  if (result.output === '<<NOT_FOUND>>') {
    return null;
  }

  return result.output;
}

/**
 * Check if a UI element exists
 *
 * @param criteria - Element search criteria
 * @returns True if element exists
 */
export async function elementExists(criteria: ElementCriteria): Promise<boolean> {
  await ensureDiscordRunning();

  const searchPath = buildElementSearchPath(criteria);

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        ${searchPath}
        return exists targetElement
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  return result.success && result.parsed === true;
}

/**
 * Scroll within Discord window
 *
 * @param direction - Direction to scroll
 * @param amount - Number of scroll units (default: 3)
 */
export async function scroll(
  direction: 'up' | 'down' | 'left' | 'right',
  amount = 3
): Promise<void> {
  await ensureDiscordRunning();

  const scrollDirection: Record<string, string> = {
    up: 'scroll up',
    down: 'scroll down',
    left: 'scroll left',
    right: 'scroll right',
  };

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        repeat ${amount} times
          ${scrollDirection[direction]}
          delay 0.1
        end repeat
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result.success) {
    throw wrapError(result.error, `Failed to scroll ${direction}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build AppleScript element search path from criteria
 */
function buildElementSearchPath(criteria: ElementCriteria): string {
  const conditions: string[] = [];

  if (criteria.role) {
    conditions.push(`role description is ${quoteAppleScriptString(criteria.role)}`);
  }
  if (criteria.name) {
    conditions.push(`name is ${quoteAppleScriptString(criteria.name)}`);
  }
  if (criteria.description) {
    conditions.push(`description contains ${quoteAppleScriptString(criteria.description)}`);
  }
  if (criteria.value) {
    conditions.push(`value is ${quoteAppleScriptString(criteria.value)}`);
  }

  if (conditions.length === 0) {
    throw new Error('At least one search criterion must be specified');
  }

  // Build the search within a parent path if specified
  let searchScope = 'window 1';
  if (criteria.parentPath && criteria.parentPath.length > 0) {
    // Build nested path like "group 1 of group 2 of window 1"
    searchScope = criteria.parentPath.reduceRight(
      (acc, parent) => `${parent} of ${acc}`,
      'window 1'
    );
  }

  // Use first element matching all conditions
  return `set targetElement to first UI element of ${searchScope} whose ${conditions.join(' and ')}`;
}

/**
 * Create a human-readable description of element criteria
 */
function describeCriteria(criteria: ElementCriteria): string {
  const parts: string[] = [];

  if (criteria.role) parts.push(`role="${criteria.role}"`);
  if (criteria.name) parts.push(`name="${criteria.name}"`);
  if (criteria.description) parts.push(`description="${criteria.description}"`);
  if (criteria.value) parts.push(`value="${criteria.value}"`);

  return parts.join(', ') || 'unknown element';
}

/**
 * Utility function to create a delay
 *
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export delay utility for external use
export { delay };

/**
 * Common key codes for reference
 */
export const KeyCodes = {
  RETURN: 36,
  TAB: 48,
  SPACE: 49,
  DELETE: 51,
  ESCAPE: 53,
  ARROW_LEFT: 123,
  ARROW_RIGHT: 124,
  ARROW_DOWN: 125,
  ARROW_UP: 126,
} as const;

// ============================================================================
// Advanced Element Finding with Fallback Strategies
// ============================================================================

/**
 * Generate multiple search strategies for finding a button
 * Returns strategies in order of specificity (most specific first)
 *
 * @param buttonIdentifier - Button name, description, or partial text
 * @returns Array of search strategies to try
 */
export function generateButtonSearchStrategies(
  buttonIdentifier: string
): SearchStrategy[] {
  return [
    // Strategy 1: Exact name match with button role
    {
      name: 'exact-name-button',
      priority: 100,
      criteria: { role: 'button', name: buttonIdentifier },
    },
    // Strategy 2: Exact name match with AXButton role
    {
      name: 'exact-name-axbutton',
      priority: 95,
      criteria: { role: 'AXButton', name: buttonIdentifier },
    },
    // Strategy 3: Description contains the identifier
    {
      name: 'description-contains',
      priority: 90,
      criteria: { role: 'button', description: buttonIdentifier, partialMatch: true },
    },
    // Strategy 4: Name with partial matching
    {
      name: 'partial-name-button',
      priority: 85,
      criteria: { role: 'button', name: buttonIdentifier, partialMatch: true },
    },
    // Strategy 5: Any UI element with exact name (might be a group acting as button)
    {
      name: 'any-element-exact-name',
      priority: 80,
      criteria: { name: buttonIdentifier },
    },
    // Strategy 6: Any UI element with description
    {
      name: 'any-element-description',
      priority: 75,
      criteria: { description: buttonIdentifier, partialMatch: true },
    },
    // Strategy 7: Static text that might be clickable
    {
      name: 'static-text',
      priority: 70,
      criteria: { role: 'static text', value: buttonIdentifier },
    },
    // Strategy 8: Group with name (Discord uses groups as clickable areas)
    {
      name: 'group-with-name',
      priority: 65,
      criteria: { role: 'group', name: buttonIdentifier, partialMatch: true },
    },
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Build AppleScript for searching with partial matching support
 */
function buildPartialMatchSearchPath(criteria: ElementCriteria): string {
  const conditions: string[] = [];

  if (criteria.role) {
    conditions.push(`role description is ${quoteAppleScriptString(criteria.role)}`);
  }

  if (criteria.name) {
    if (criteria.partialMatch) {
      conditions.push(`name contains ${quoteAppleScriptString(criteria.name)}`);
    } else {
      conditions.push(`name is ${quoteAppleScriptString(criteria.name)}`);
    }
  }

  if (criteria.description) {
    if (criteria.partialMatch) {
      conditions.push(`description contains ${quoteAppleScriptString(criteria.description)}`);
    } else {
      conditions.push(`description is ${quoteAppleScriptString(criteria.description)}`);
    }
  }

  if (criteria.value) {
    if (criteria.partialMatch) {
      conditions.push(`value contains ${quoteAppleScriptString(criteria.value)}`);
    } else {
      conditions.push(`value is ${quoteAppleScriptString(criteria.value)}`);
    }
  }

  if (conditions.length === 0) {
    throw new Error('At least one search criterion must be specified');
  }

  // Build the search within a parent path if specified
  let searchScope = 'window 1';
  if (criteria.parentPath && criteria.parentPath.length > 0) {
    searchScope = criteria.parentPath.reduceRight(
      (acc, parent) => `${parent} of ${acc}`,
      'window 1'
    );
  }

  return `set targetElement to first UI element of ${searchScope} whose ${conditions.join(' and ')}`;
}

/**
 * Try to find an element using a single strategy
 *
 * @param strategy - The search strategy to try
 * @returns Result object with success status and details
 */
async function tryStrategy(
  strategy: SearchStrategy
): Promise<{ found: boolean; error?: string }> {
  const searchPath = buildPartialMatchSearchPath(strategy.criteria);

  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        try
          ${searchPath}
          if exists targetElement then
            return "found"
          else
            return "not_found"
          end if
        on error errMsg
          return "error:" & errMsg
        end try
      end tell
    end tell
  `;

  try {
    const result = await executeAppleScript(script);

    if (!result.success) {
      return { found: false, error: result.error || 'AppleScript execution failed' };
    }

    if (result.output === 'found') {
      return { found: true };
    }

    if (result.output?.startsWith('error:')) {
      return { found: false, error: result.output.substring(6) };
    }

    return { found: false, error: 'Element not found' };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find a UI element using multiple fallback strategies
 * Tries each strategy in order until one succeeds
 *
 * @param strategies - Array of search strategies to try
 * @param options - Search options
 * @returns Result containing the successful strategy or all failure details
 */
export async function findElementWithStrategies(
  strategies: SearchStrategy[],
  options: FindElementOptions = {}
): Promise<ElementSearchResult> {
  const { retryDelay = 100 } = options;

  await ensureDiscordRunning();

  const attemptedStrategies: string[] = [];
  const failureDetails: Array<{ strategy: string; error: string }> = [];

  // Sort strategies by priority if not already sorted
  const sortedStrategies = [...strategies].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  for (const strategy of sortedStrategies) {
    attemptedStrategies.push(strategy.name);

    const result = await tryStrategy(strategy);

    if (result.found) {
      return {
        found: true,
        successfulStrategy: strategy.name,
        attemptedStrategies,
        failureDetails,
      };
    }

    failureDetails.push({
      strategy: strategy.name,
      error: result.error || 'Unknown error',
    });

    // Small delay between attempts to let UI settle
    if (retryDelay > 0) {
      await delay(retryDelay);
    }
  }

  return {
    found: false,
    attemptedStrategies,
    failureDetails,
  };
}

/**
 * Find and click a UI element using multiple fallback strategies
 *
 * @param strategies - Array of search strategies to try
 * @param options - Click options
 * @returns The name of the successful strategy
 * @throws UIElementNotFoundError with detailed failure information
 */
export async function clickElementWithStrategies(
  strategies: SearchStrategy[],
  options: ClickOptions = {}
): Promise<string> {
  const { clickCount = 1, delay: clickDelay = DEFAULT_UI_DELAY } = options;

  await ensureDiscordRunning();

  const attemptedStrategies: string[] = [];
  const failureDetails: Array<{ strategy: string; error: string }> = [];

  // Sort strategies by priority
  const sortedStrategies = [...strategies].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0)
  );

  for (const strategy of sortedStrategies) {
    attemptedStrategies.push(strategy.name);

    const searchPath = buildPartialMatchSearchPath(strategy.criteria);

    const script = `
      delay ${clickDelay}
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          set frontmost to true
          try
            ${searchPath}
            if exists targetElement then
              repeat ${clickCount} times
                click targetElement
                delay 0.1
              end repeat
              return "clicked"
            else
              return "not_found"
            end if
          on error errMsg
            return "error:" & errMsg
          end try
        end tell
      end tell
    `;

    try {
      const result = await executeAppleScript(script);

      if (result.success && result.output === 'clicked') {
        return strategy.name;
      }

      if (result.output?.startsWith('error:')) {
        failureDetails.push({
          strategy: strategy.name,
          error: result.output.substring(6),
        });
      } else {
        failureDetails.push({
          strategy: strategy.name,
          error: result.error || 'Element not found',
        });
      }
    } catch (error) {
      failureDetails.push({
        strategy: strategy.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Small delay between attempts
    await delay(100);
  }

  // All strategies failed - throw detailed error
  const errorMessage = buildDetailedElementNotFoundMessage(
    'element',
    attemptedStrategies,
    failureDetails
  );

  throw new UIElementNotFoundError(errorMessage, {
    strategies: strategies.map((s) => s.name),
    attemptedStrategies,
    failureDetails,
  });
}

/**
 * Click a button using multiple fallback strategies
 * This is the recommended function for clicking buttons in Discord
 *
 * @param buttonIdentifier - Button name, description, or partial text to search for
 * @param options - Click options
 * @returns The name of the successful strategy used
 * @throws UIElementNotFoundError with detailed failure information
 */
export async function clickButtonWithFallback(
  buttonIdentifier: string,
  options: ClickOptions = {}
): Promise<string> {
  const strategies = generateButtonSearchStrategies(buttonIdentifier);
  return clickElementWithStrategies(strategies, options);
}

/**
 * Build a detailed error message for element not found errors
 */
function buildDetailedElementNotFoundMessage(
  elementType: string,
  attemptedStrategies: string[],
  failureDetails: Array<{ strategy: string; error: string }>
): string {
  const lines: string[] = [
    `Could not find ${elementType} after trying ${attemptedStrategies.length} strategies.`,
    '',
    'Attempted strategies:',
  ];

  for (const detail of failureDetails) {
    lines.push(`  • ${detail.strategy}: ${detail.error}`);
  }

  lines.push(
    '',
    'Troubleshooting tips:',
    '  1. Ensure Discord is visible and not minimized',
    '  2. Check if the element is in a modal/dialog that needs to be opened',
    '  3. Verify the button/element name matches what appears in Discord',
    '  4. Try closing any open modals and retrying'
  );

  return lines.join('\n');
}

/**
 * Find a button using JXA with deep search capability
 * More reliable for complex UI hierarchies
 *
 * @param buttonIdentifier - Button name or description
 * @returns Object with found status and element details
 */
export async function findButtonWithJXA(
  buttonIdentifier: string
): Promise<{ found: boolean; details?: Record<string, unknown>; error?: string }> {
  await ensureDiscordRunning();

  const script = `
    const se = Application('System Events');
    const discord = se.processes.byName('Discord');
    discord.frontmost = true;
    delay(0.2);

    const windows = discord.windows();
    if (windows.length === 0) {
      return JSON.stringify({ found: false, error: 'No Discord window found' });
    }

    const searchTerm = ${JSON.stringify(buttonIdentifier)}.toLowerCase();

    // Recursive function to search all UI elements
    function searchElements(elements, depth = 0) {
      if (depth > 10) return null; // Prevent infinite recursion

      for (const element of elements) {
        try {
          const name = (element.name() || '').toLowerCase();
          const desc = (element.description() || '').toLowerCase();
          const role = element.role() || '';
          const roleDesc = (element.roleDescription() || '').toLowerCase();

          // Check if this element matches
          const isMatch = name.includes(searchTerm) ||
                         desc.includes(searchTerm) ||
                         name === searchTerm ||
                         desc === searchTerm;

          if (isMatch) {
            return {
              name: element.name(),
              description: element.description(),
              role: role,
              roleDescription: element.roleDescription(),
              position: element.position(),
              size: element.size()
            };
          }

          // Search children
          const children = element.uiElements();
          if (children && children.length > 0) {
            const childResult = searchElements(children, depth + 1);
            if (childResult) return childResult;
          }
        } catch (e) {
          // Continue searching on errors
        }
      }
      return null;
    }

    try {
      const result = searchElements(windows[0].uiElements());
      if (result) {
        return JSON.stringify({ found: true, details: result });
      }
      return JSON.stringify({
        found: false,
        error: 'Element not found in UI hierarchy'
      });
    } catch (e) {
      return JSON.stringify({ found: false, error: e.toString() });
    }
  `;

  try {
    const result = await executeJXA(script);

    if (!result.success) {
      return { found: false, error: result.error || 'JXA execution failed' };
    }

    return JSON.parse(result.output) as {
      found: boolean;
      details?: Record<string, unknown>;
      error?: string;
    };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Click a button found via JXA deep search
 *
 * @param buttonIdentifier - Button name or description
 * @param options - Click options
 * @throws UIElementNotFoundError if button cannot be found
 */
export async function clickButtonWithJXA(
  buttonIdentifier: string,
  options: ClickOptions = {}
): Promise<void> {
  const { clickCount = 1, delay: clickDelay = DEFAULT_UI_DELAY } = options;

  await ensureDiscordRunning();

  const script = `
    const se = Application('System Events');
    const discord = se.processes.byName('Discord');
    discord.frontmost = true;
    delay(${clickDelay});

    const windows = discord.windows();
    if (windows.length === 0) {
      return JSON.stringify({ success: false, error: 'No Discord window found' });
    }

    const searchTerm = ${JSON.stringify(buttonIdentifier)}.toLowerCase();

    // Recursive function to find and click element
    function findAndClick(elements, depth = 0) {
      if (depth > 10) return null;

      for (const element of elements) {
        try {
          const name = (element.name() || '').toLowerCase();
          const desc = (element.description() || '').toLowerCase();

          const isMatch = name.includes(searchTerm) ||
                         desc.includes(searchTerm) ||
                         name === searchTerm ||
                         desc === searchTerm;

          if (isMatch) {
            // Try to click the element
            for (let i = 0; i < ${clickCount}; i++) {
              element.click();
              delay(0.1);
            }
            return {
              clicked: true,
              name: element.name(),
              description: element.description()
            };
          }

          // Search children
          const children = element.uiElements();
          if (children && children.length > 0) {
            const childResult = findAndClick(children, depth + 1);
            if (childResult) return childResult;
          }
        } catch (e) {
          // Continue searching
        }
      }
      return null;
    }

    try {
      const result = findAndClick(windows[0].uiElements());
      if (result) {
        return JSON.stringify({ success: true, ...result });
      }
      return JSON.stringify({
        success: false,
        error: 'Button not found in UI hierarchy. Searched for: ' + ${JSON.stringify(buttonIdentifier)}
      });
    } catch (e) {
      return JSON.stringify({ success: false, error: e.toString() });
    }
  `;

  try {
    const result = await executeJXA(script);

    if (!result.success) {
      throw new UIElementNotFoundError(
        `Button: ${buttonIdentifier}`,
        { buttonIdentifier, error: result.error },
        `Failed to find button "${buttonIdentifier}". JXA error: ${result.error}`
      );
    }

    const parsed = JSON.parse(result.output) as {
      success: boolean;
      error?: string;
      clicked?: boolean;
    };

    if (!parsed.success) {
      throw new UIElementNotFoundError(
        `Button: ${buttonIdentifier}`,
        { buttonIdentifier, error: parsed.error },
        buildDetailedElementNotFoundMessage(
          `button "${buttonIdentifier}"`,
          ['jxa-deep-search'],
          [{ strategy: 'jxa-deep-search', error: parsed.error || 'Not found' }]
        )
      );
    }
  } catch (error) {
    if (error instanceof UIElementNotFoundError) {
      throw error;
    }
    throw new UIElementNotFoundError(
      `Button: ${buttonIdentifier}`,
      { buttonIdentifier, error: error instanceof Error ? error.message : String(error) },
      `Failed to click button "${buttonIdentifier}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Smart button click that tries multiple approaches
 * This is the most robust way to click buttons in Discord
 *
 * @param buttonIdentifier - Button name, description, or partial text
 * @param options - Click options with optional fallback configuration
 * @returns Object with success status and strategy used
 */
export async function smartClickButton(
  buttonIdentifier: string,
  options: ClickOptions & { useJXAFallback?: boolean } = {}
): Promise<{ success: boolean; strategyUsed: string }> {
  const { useJXAFallback = true, ...clickOptions } = options;

  // First try the standard fallback strategies
  try {
    const strategy = await clickButtonWithFallback(buttonIdentifier, clickOptions);
    return { success: true, strategyUsed: strategy };
  } catch (error) {
    // If standard strategies fail and JXA fallback is enabled, try JXA
    if (useJXAFallback) {
      try {
        await clickButtonWithJXA(buttonIdentifier, clickOptions);
        return { success: true, strategyUsed: 'jxa-deep-search' };
      } catch (jxaError) {
        // Both approaches failed - throw with combined info
        const combinedError = new UIElementNotFoundError(
          `Button: ${buttonIdentifier}`,
          {
            buttonIdentifier,
            standardError: error instanceof Error ? error.message : String(error),
            jxaError: jxaError instanceof Error ? jxaError.message : String(jxaError),
          },
          buildDetailedElementNotFoundMessage(
            `button "${buttonIdentifier}"`,
            ['standard-strategies', 'jxa-deep-search'],
            [
              { strategy: 'standard-strategies', error: error instanceof Error ? error.message : 'Failed' },
              { strategy: 'jxa-deep-search', error: jxaError instanceof Error ? jxaError.message : 'Failed' },
            ]
          )
        );
        throw combinedError;
      }
    }
    throw error;
  }
}

/**
 * Debug utility: List all accessible UI elements in Discord window
 * Useful for discovering element names and roles
 *
 * @param maxDepth - Maximum depth to traverse (default: 3)
 * @returns Array of element information
 */
export async function listDiscordUIElements(
  maxDepth = 3
): Promise<Array<Record<string, unknown>>> {
  await ensureDiscordRunning();

  const script = `
    const se = Application('System Events');
    const discord = se.processes.byName('Discord');
    discord.frontmost = true;
    delay(0.2);

    const windows = discord.windows();
    if (windows.length === 0) {
      return JSON.stringify({ error: 'No Discord window found', elements: [] });
    }

    const elements = [];
    const maxDepth = ${maxDepth};

    function collectElements(uiElements, depth = 0, path = '') {
      if (depth > maxDepth) return;

      for (let i = 0; i < uiElements.length; i++) {
        const element = uiElements[i];
        try {
          const info = {
            path: path + '[' + i + ']',
            depth: depth,
            name: element.name() || null,
            role: element.role() || null,
            roleDescription: element.roleDescription() || null,
            description: element.description() || null,
            value: null
          };

          try {
            info.value = element.value();
          } catch (e) {}

          elements.push(info);

          // Recurse into children
          try {
            const children = element.uiElements();
            if (children && children.length > 0) {
              collectElements(children, depth + 1, info.path);
            }
          } catch (e) {}
        } catch (e) {
          // Skip elements that can't be read
        }
      }
    }

    try {
      collectElements(windows[0].uiElements());
      return JSON.stringify({ error: null, elements: elements });
    } catch (e) {
      return JSON.stringify({ error: e.toString(), elements: [] });
    }
  `;

  try {
    const result = await executeJXA(script);

    if (!result.success) {
      throw wrapError(result.error, 'Failed to list UI elements');
    }

    const parsed = JSON.parse(result.output) as {
      error: string | null;
      elements: Array<Record<string, unknown>>;
    };

    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return parsed.elements;
  } catch (error) {
    throw wrapError(error, 'Failed to list Discord UI elements');
  }
}
