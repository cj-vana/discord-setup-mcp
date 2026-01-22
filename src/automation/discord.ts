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
