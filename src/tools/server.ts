/**
 * Server Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for checking Discord status, creating servers,
 * and managing Discord application focus.
 */

import { z } from 'zod';
import {
  checkDiscordStatus,
  activateDiscord,
  type DiscordStatus,
} from '../automation/discord.js';
import {
  executeAppleScript,
  quoteAppleScriptString,
} from '../automation/executor.js';
import {
  delay,
  STANDARD_ACTION_DELAY,
  SERVER_CREATION_DELAY,
  MODAL_APPEAR_DELAY,
} from '../automation/waiter.js';
import {
  DiscordNotRunningError,
  DiscordStateError,
  wrapError,
} from '../utils/errors.js';
import { CreateServerInputSchema, type CreateServerInput } from '../utils/validation.js';

// ============================================
// Tool Input Schemas
// ============================================

/**
 * Schema for check_discord_status tool - no input required
 */
export const CheckDiscordStatusInputSchema = z.object({}).strict();

export type CheckDiscordStatusInput = z.infer<typeof CheckDiscordStatusInputSchema>;

/**
 * Schema for create_server tool
 */
export const CreateServerToolInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Server name must be at least 2 characters')
    .max(100, 'Server name must be 100 characters or less')
    .describe('Name for the new Discord server'),
  templateChoice: z
    .enum(['gaming', 'friends', 'club', 'study', 'artists', 'local', 'custom'])
    .optional()
    .default('custom')
    .describe('Discord template to use when creating the server. Use "custom" for a blank server.'),
});

export type CreateServerToolInput = z.infer<typeof CreateServerToolInputSchema>;

/**
 * Schema for focus_discord tool
 */
export const FocusDiscordInputSchema = z.object({
  launchIfNotRunning: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to launch Discord if it is not already running'),
  waitForWindow: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to wait for a Discord window to be available'),
});

export type FocusDiscordInput = z.infer<typeof FocusDiscordInputSchema>;

// ============================================
// Tool Response Types
// ============================================

/**
 * Response from check_discord_status tool
 */
export interface CheckDiscordStatusResult {
  success: true;
  status: DiscordStatus;
  message: string;
}

/**
 * Response from create_server tool
 */
export interface CreateServerResult {
  success: true;
  message: string;
  serverName: string;
  templateUsed: string;
}

/**
 * Response from focus_discord tool
 */
export interface FocusDiscordResult {
  success: true;
  message: string;
  wasLaunched: boolean;
  status: DiscordStatus;
}

/**
 * Error response for server tools
 */
export interface ServerToolError {
  success: false;
  error: string;
  code: string;
  suggestion?: string;
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Check the current status of the Discord application
 *
 * Returns information about whether Discord is running, focused,
 * visible, and the number of windows open.
 */
export async function checkDiscordStatusHandler(
  _input: CheckDiscordStatusInput
): Promise<CheckDiscordStatusResult | ServerToolError> {
  try {
    const status = await checkDiscordStatus();

    let message: string;
    if (!status.isRunning) {
      message = 'Discord is not running. Launch Discord to begin server setup.';
    } else if (!status.isFrontmost) {
      message = `Discord is running with ${status.windowCount} window(s) but is not focused.`;
    } else if (status.windowCount === 0) {
      message = 'Discord is running and focused but no windows are visible.';
    } else {
      message = `Discord is running and focused with ${status.windowCount} window(s).`;
      if (status.mainWindowTitle) {
        message += ` Main window: "${status.mainWindowTitle}"`;
      }
    }

    return {
      success: true,
      status,
      message,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to check Discord status');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
      suggestion: wrappedError.suggestion,
    };
  }
}

/**
 * Create a new Discord server
 *
 * This uses AppleScript to automate the Discord UI to create a new server.
 * Discord must be running and accessible for this to work.
 */
export async function createServerHandler(
  input: CreateServerToolInput
): Promise<CreateServerResult | ServerToolError> {
  const { name, templateChoice = 'custom' } = input;

  try {
    // First, ensure Discord is running and focused
    const status = await checkDiscordStatus();
    if (!status.isRunning) {
      throw new DiscordNotRunningError();
    }

    // Activate Discord
    await activateDiscord({ waitForWindow: true });
    await delay(STANDARD_ACTION_DELAY);

    // Click the "Add a Server" button (the + icon in the server sidebar)
    // This is typically at the bottom of the server list
    const clickAddServerScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Try to find and click the Add Server button
          -- It's usually a button with "Add a Server" in its description
          set foundButton to false
          repeat with btn in (every button of window 1)
            try
              set btnDesc to description of btn
              if btnDesc contains "Add a Server" or btnDesc contains "Create" then
                click btn
                set foundButton to true
                exit repeat
              end if
            end try
          end repeat

          if not foundButton then
            -- Try using keyboard shortcut as fallback
            -- Note: Discord doesn't have a direct keyboard shortcut for this,
            -- so we try clicking at the expected location
            return "button_not_found"
          end if

          return "clicked"
        end tell
      end tell
    `;

    let addServerResult = await executeAppleScript(clickAddServerScript);

    // If button wasn't found, try alternative approach using coordinate click
    if (!addServerResult.success || addServerResult.output === 'button_not_found') {
      // Use JXA to search more thoroughly
      const jxaSearchScript = `
        const se = Application('System Events');
        const discord = se.processes.byName('Discord');
        discord.frontmost = true;
        delay(0.3);

        const windows = discord.windows();
        if (windows.length === 0) {
          return JSON.stringify({ success: false, error: 'No Discord window found' });
        }

        // Search recursively for the add server button
        function findAddButton(element, depth = 0) {
          if (depth > 10) return null;

          try {
            const role = element.role();
            const desc = element.description();
            const name = element.name();

            if (role === 'AXButton' &&
                (desc && (desc.includes('Add a Server') || desc.includes('Create')))) {
              element.click();
              return { success: true };
            }

            // Check children
            const children = element.uiElements();
            for (let i = 0; i < children.length; i++) {
              const result = findAddButton(children[i], depth + 1);
              if (result) return result;
            }
          } catch (e) {
            // Continue searching
          }

          return null;
        }

        const result = findAddButton(windows[0]);
        return JSON.stringify(result || { success: false, error: 'Add server button not found' });
      `;

      const jxaResult = await executeAppleScript(jxaSearchScript, { useJXA: true });

      if (!jxaResult.success) {
        throw new DiscordStateError(
          'Discord with visible Add Server button',
          undefined,
          'Could not find the Add Server button. Make sure Discord is showing the main view with the server sidebar visible.'
        );
      }

      try {
        const parsed = JSON.parse(jxaResult.output) as { success: boolean; error?: string };
        if (!parsed.success) {
          throw new DiscordStateError(
            'Discord with visible Add Server button',
            undefined,
            parsed.error || 'Could not find the Add Server button.'
          );
        }
      } catch (e) {
        if (e instanceof DiscordStateError) throw e;
        // If JSON parsing fails, assume the click worked
      }
    }

    // Wait for the server creation modal to appear
    await delay(MODAL_APPEAR_DELAY);

    // Click "Create My Own" button in the modal
    const clickCreateOwnScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.3

          -- Look for "Create My Own" button
          repeat with btn in (every button of window 1)
            try
              set btnName to name of btn
              set btnDesc to description of btn
              if btnName contains "Create My Own" or btnDesc contains "Create My Own" then
                click btn
                return "clicked_create_own"
              end if
            end try
          end repeat

          -- Try static text elements that might be clickable
          repeat with elem in (every UI element of window 1)
            try
              set elemValue to value of elem
              if elemValue contains "Create My Own" then
                click elem
                return "clicked_create_own"
              end if
            end try
          end repeat

          return "create_own_not_found"
        end tell
      end tell
    `;

    await executeAppleScript(clickCreateOwnScript);
    await delay(MODAL_APPEAR_DELAY);

    // Select template based on choice (or skip for custom)
    if (templateChoice !== 'custom') {
      // Map our template names to Discord's template button text
      const templateButtonText: Record<string, string> = {
        gaming: 'Gaming',
        friends: 'Friends',
        club: 'Club',
        study: 'Study',
        artists: 'Artists',
        local: 'Local',
      };

      const templateText = templateButtonText[templateChoice] || templateChoice;

      const selectTemplateScript = `
        tell application "System Events"
          tell process "Discord"
            delay 0.3

            -- Look for the template button
            repeat with btn in (every button of window 1)
              try
                set btnName to name of btn
                set btnDesc to description of btn
                if btnName contains "${templateText}" or btnDesc contains "${templateText}" then
                  click btn
                  return "template_selected"
                end if
              end try
            end repeat

            return "template_not_found"
          end tell
        end tell
      `;

      await executeAppleScript(selectTemplateScript);
      await delay(MODAL_APPEAR_DELAY);
    } else {
      // Click "For me and my friends" or skip to custom
      const skipTemplateScript = `
        tell application "System Events"
          tell process "Discord"
            delay 0.3

            -- Look for "For me and my friends" or skip button
            repeat with btn in (every button of window 1)
              try
                set btnName to name of btn
                set btnDesc to description of btn
                if btnName contains "me and my friends" or btnDesc contains "me and my friends" then
                  click btn
                  return "skipped"
                end if
              end try
            end repeat

            return "continue"
          end tell
        end tell
      `;

      await executeAppleScript(skipTemplateScript);
      await delay(MODAL_APPEAR_DELAY);
    }

    // Now we should be at the "Customize your server" screen
    // Enter the server name
    const enterNameScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.3

          -- Find the text field for server name
          set textFields to every text field of window 1
          if (count of textFields) > 0 then
            set serverNameField to item 1 of textFields
            set focused of serverNameField to true
            delay 0.1

            -- Select all existing text
            keystroke "a" using command down
            delay 0.1

            -- Type the new server name
            keystroke ${quoteAppleScriptString(name)}
            return "name_entered"
          else
            return "text_field_not_found"
          end if
        end tell
      end tell
    `;

    const nameResult = await executeAppleScript(enterNameScript);

    if (!nameResult.success || nameResult.output === 'text_field_not_found') {
      throw new DiscordStateError(
        'Server name input field',
        undefined,
        'Could not find the server name input field. The server creation dialog may not have opened correctly.'
      );
    }

    await delay(STANDARD_ACTION_DELAY);

    // Click the "Create" button
    const clickCreateScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.3

          -- Look for Create button
          repeat with btn in (every button of window 1)
            try
              set btnName to name of btn
              if btnName is "Create" or btnName contains "Create" then
                click btn
                return "server_created"
              end if
            end try
          end repeat

          -- Try pressing Enter as fallback
          key code 36
          return "pressed_enter"
        end tell
      end tell
    `;

    await executeAppleScript(clickCreateScript);

    // Wait for server creation to complete
    await delay(SERVER_CREATION_DELAY);

    return {
      success: true,
      message: `Successfully initiated creation of server "${name}"`,
      serverName: name,
      templateUsed: templateChoice,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to create server');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
      suggestion: wrappedError.suggestion,
    };
  }
}

/**
 * Focus the Discord application window
 *
 * Brings Discord to the foreground. Optionally launches it if not running.
 */
export async function focusDiscordHandler(
  input: FocusDiscordInput
): Promise<FocusDiscordResult | ServerToolError> {
  const { launchIfNotRunning = false, waitForWindow = true } = input;

  try {
    // Check if Discord is running
    const initialStatus = await checkDiscordStatus();
    let wasLaunched = false;

    if (!initialStatus.isRunning) {
      if (!launchIfNotRunning) {
        throw new DiscordNotRunningError(
          'Discord is not running. Set launchIfNotRunning to true to launch it automatically.'
        );
      }

      // Launch Discord
      const launchScript = `
        tell application "Discord"
          activate
        end tell
      `;

      await executeAppleScript(launchScript);
      wasLaunched = true;

      // Wait for Discord to launch
      if (waitForWindow) {
        // Give Discord time to start up
        await delay(3000);

        // Check if it's running now
        const launchCheck = await checkDiscordStatus();
        if (!launchCheck.isRunning) {
          throw new DiscordStateError(
            'Discord running',
            'not running',
            'Discord failed to launch. Please try launching it manually.'
          );
        }
      }
    } else {
      // Discord is running, just activate it
      await activateDiscord({ waitForWindow });
    }

    // Give it a moment to focus
    await delay(STANDARD_ACTION_DELAY);

    // Get final status
    const finalStatus = await checkDiscordStatus();

    let message: string;
    if (wasLaunched) {
      message = 'Discord was launched and brought to the foreground.';
    } else if (finalStatus.isFrontmost) {
      message = 'Discord is now focused and in the foreground.';
    } else {
      message = 'Discord activation was requested but may not be fully focused.';
    }

    return {
      success: true,
      message,
      wasLaunched,
      status: finalStatus,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to focus Discord');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
      suggestion: wrappedError.suggestion,
    };
  }
}

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP tool definition for check_discord_status
 */
export const checkDiscordStatusToolDefinition = {
  name: 'check_discord_status',
  description:
    'Check the current status of the Discord desktop application. Returns information about whether Discord is running, focused, visible, and the number of windows open. Use this to verify Discord is ready before performing server setup operations.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
};

/**
 * MCP tool definition for create_server
 */
export const createServerToolDefinition = {
  name: 'create_server',
  description:
    'Create a new Discord server by automating the Discord desktop application UI. Requires Discord to be running and accessible. This opens the server creation dialog, optionally selects a template, enters the server name, and creates the server.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name for the new Discord server (2-100 characters)',
        minLength: 2,
        maxLength: 100,
      },
      templateChoice: {
        type: 'string',
        enum: ['gaming', 'friends', 'club', 'study', 'artists', 'local', 'custom'],
        description:
          'Discord template to use. Options: gaming, friends, club, study, artists, local, custom (blank server). Default is custom.',
        default: 'custom',
      },
    },
    required: ['name'],
  },
};

/**
 * MCP tool definition for focus_discord
 */
export const focusDiscordToolDefinition = {
  name: 'focus_discord',
  description:
    'Focus the Discord desktop application window, bringing it to the foreground. Optionally can launch Discord if it is not running. Use this before performing UI automation operations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      launchIfNotRunning: {
        type: 'boolean',
        description:
          'Whether to launch Discord if it is not already running. Default is false.',
        default: false,
      },
      waitForWindow: {
        type: 'boolean',
        description:
          'Whether to wait for a Discord window to be available after launching. Default is true.',
        default: true,
      },
    },
    required: [],
  },
};

/**
 * All server tool definitions for registration with MCP server
 */
export const serverToolDefinitions = [
  checkDiscordStatusToolDefinition,
  createServerToolDefinition,
  focusDiscordToolDefinition,
];

/**
 * Handler map for server tools
 */
export const serverToolHandlers = {
  check_discord_status: checkDiscordStatusHandler,
  create_server: createServerHandler,
  focus_discord: focusDiscordHandler,
} as const;

/**
 * Validate and handle a server tool call
 */
export async function handleServerToolCall(
  toolName: string,
  args: unknown
): Promise<
  | CheckDiscordStatusResult
  | CreateServerResult
  | FocusDiscordResult
  | ServerToolError
> {
  switch (toolName) {
    case 'check_discord_status': {
      const parsed = CheckDiscordStatusInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        };
      }
      return checkDiscordStatusHandler(parsed.data);
    }

    case 'create_server': {
      const parsed = CreateServerToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        };
      }
      return createServerHandler(parsed.data);
    }

    case 'focus_discord': {
      const parsed = FocusDiscordInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        };
      }
      return focusDiscordHandler(parsed.data);
    }

    default:
      return {
        success: false,
        error: `Unknown server tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      };
  }
}
