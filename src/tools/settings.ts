/**
 * Settings Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for managing Discord server settings including
 * verification levels, content filters, and notification settings.
 */

import { z } from 'zod';
import {
  VerificationLevelSchema,
  ExplicitContentFilterSchema,
  DefaultNotificationsSchema,
  type VerificationLevel,
  type ExplicitContentFilter,
  type DefaultNotifications,
} from '../utils/validation.js';
import {
  activateDiscord,
  typeText,
  pressKey,
  pressEscape,
  clickElement,
  delay,
  KeyCodes,
} from '../automation/discord.js';
import { executeAppleScript, quoteAppleScriptString } from '../automation/executor.js';
import {
  DiscordStateError,
  UIElementNotFoundError,
  wrapError,
} from '../utils/errors.js';

// ============================================
// Constants
// ============================================

const DISCORD_APP_NAME = 'Discord';

/** Mapping of verification levels to their display names in Discord UI */
const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  highest: 'Highest',
};

/** Mapping of content filter levels to their display names in Discord UI */
const CONTENT_FILTER_LABELS: Record<ExplicitContentFilter, string> = {
  disabled: "Don't scan any media content",
  members_without_roles: 'Scan media content from members without a role',
  all_members: 'Scan media content from all members',
};

/** Mapping of notification settings to their display names in Discord UI */
const NOTIFICATION_LABELS: Record<DefaultNotifications, string> = {
  all_messages: 'All Messages',
  only_mentions: 'Only @mentions',
};

// ============================================
// Tool Input Schemas
// ============================================

/**
 * Schema for open_server_settings tool
 */
export const OpenServerSettingsInputSchema = z.object({
  serverName: z
    .string()
    .optional()
    .describe('Name of the server to open settings for. If not provided, opens settings for the currently selected server.'),
});

export type OpenServerSettingsInput = z.infer<typeof OpenServerSettingsInputSchema>;

/**
 * Schema for set_verification_level tool
 */
export const SetVerificationLevelInputSchema = z.object({
  level: VerificationLevelSchema.describe(
    'The verification level to set. Options: none, low (verified email), medium (registered 5+ mins), high (member 10+ mins), highest (verified phone)'
  ),
});

export type SetVerificationLevelInput = z.infer<typeof SetVerificationLevelInputSchema>;

/**
 * Schema for set_content_filter tool
 */
export const SetContentFilterInputSchema = z.object({
  level: ExplicitContentFilterSchema.describe(
    'The content filter level to set. Options: disabled (no scanning), members_without_roles (scan unroled members), all_members (scan everyone)'
  ),
});

export type SetContentFilterInput = z.infer<typeof SetContentFilterInputSchema>;

/**
 * Schema for set_default_notifications tool
 */
export const SetDefaultNotificationsInputSchema = z.object({
  setting: DefaultNotificationsSchema.describe(
    'The default notification setting. Options: all_messages, only_mentions'
  ),
});

export type SetDefaultNotificationsInput = z.infer<typeof SetDefaultNotificationsInputSchema>;

// ============================================
// Tool Response Types
// ============================================

/**
 * Response from open_server_settings tool
 */
export interface OpenServerSettingsResult {
  success: true;
  message: string;
  serverName?: string;
}

/**
 * Response from set_verification_level tool
 */
export interface SetVerificationLevelResult {
  success: true;
  message: string;
  level: VerificationLevel;
  levelLabel: string;
}

/**
 * Response from set_content_filter tool
 */
export interface SetContentFilterResult {
  success: true;
  message: string;
  level: ExplicitContentFilter;
  levelLabel: string;
}

/**
 * Response from set_default_notifications tool
 */
export interface SetDefaultNotificationsResult {
  success: true;
  message: string;
  setting: DefaultNotifications;
  settingLabel: string;
}

/**
 * Error response for settings tools
 */
export interface SettingsToolError {
  success: false;
  error: string;
  code: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Click on the server name dropdown to access server menu
 */
async function clickServerDropdown(): Promise<void> {
  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        delay 0.3

        -- Try to find the server header/dropdown button
        -- This is typically the server name at the top of the channel list
        try
          -- Look for a button with popup menu role in the header area
          set serverDropdown to first button of group 1 of group 1 of group 1 of window 1 whose role description is "popup button" or role description is "button"
          click serverDropdown
          return "clicked"
        on error
          -- Try alternative: click the area where server name usually is
          try
            set serverHeader to first static text of group 1 of group 1 of group 1 of window 1
            click serverHeader
            return "clicked_text"
          on error errMsg
            return "error:" & errMsg
          end try
        end try
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success || (result.output && result.output.startsWith('error:'))) {
    throw new DiscordStateError(
      'server view with accessible header',
      undefined,
      'Could not find server dropdown. Make sure a server is selected and visible.'
    );
  }

  await delay(300);
}

/**
 * Navigate to a specific section in server settings
 */
async function navigateToSettingsSection(sectionName: string): Promise<void> {
  // Try to find and click the section in the settings sidebar
  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        delay 0.2

        -- Look for the settings section in the sidebar
        try
          set targetSection to first button of window 1 whose name contains ${quoteAppleScriptString(sectionName)} or description contains ${quoteAppleScriptString(sectionName)}
          click targetSection
          return "clicked"
        on error
          -- Try static text or other elements
          try
            set targetSection to first static text of window 1 whose value contains ${quoteAppleScriptString(sectionName)}
            click targetSection
            return "clicked_text"
          on error errMsg
            return "not_found:" & errMsg
          end try
        end try
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success || (result.output && result.output.startsWith('not_found:'))) {
    throw new UIElementNotFoundError(
      `Settings section: ${sectionName}`,
      { sectionName }
    );
  }

  await delay(300);
}

/**
 * Select an option from a dropdown or radio group
 */
async function selectOption(optionLabel: string): Promise<void> {
  const script = `
    tell application "System Events"
      tell process "${DISCORD_APP_NAME}"
        set frontmost to true
        delay 0.2

        -- Try to find and click the option
        try
          -- Look for radio buttons first
          set targetOption to first radio button of window 1 whose name contains ${quoteAppleScriptString(optionLabel)} or description contains ${quoteAppleScriptString(optionLabel)}
          click targetOption
          return "clicked_radio"
        on error
          -- Try checkbox
          try
            set targetOption to first checkbox of window 1 whose name contains ${quoteAppleScriptString(optionLabel)} or description contains ${quoteAppleScriptString(optionLabel)}
            click targetOption
            return "clicked_checkbox"
          on error
            -- Try button (for dropdown menu items)
            try
              set targetOption to first button of window 1 whose name contains ${quoteAppleScriptString(optionLabel)}
              click targetOption
              return "clicked_button"
            on error
              -- Try menu item
              try
                set targetOption to first menu item of menu 1 of window 1 whose name contains ${quoteAppleScriptString(optionLabel)}
                click targetOption
                return "clicked_menu"
              on error errMsg
                return "not_found:" & errMsg
              end try
            end try
          end try
        end try
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);

  if (!result.success || (result.output && result.output.startsWith('not_found:'))) {
    throw new UIElementNotFoundError(
      `Option: ${optionLabel}`,
      { optionLabel }
    );
  }

  await delay(200);
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Open server settings for the currently selected or specified server
 */
export async function openServerSettingsHandler(
  input: OpenServerSettingsInput
): Promise<OpenServerSettingsResult | SettingsToolError> {
  try {
    // Activate Discord
    await activateDiscord();
    await delay(300);

    // If a server name is provided, we would need to navigate to it first
    // For now, we assume the user has the correct server selected
    if (input.serverName) {
      // Future: implement server navigation
      // For now, just note that the user should have it selected
    }

    // Click on the server dropdown to open the menu
    await clickServerDropdown();
    await delay(300);

    // Click on "Server Settings" in the dropdown menu
    const script = `
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          delay 0.2

          -- Look for Server Settings menu item
          try
            -- Try clicking the menu item
            click menu item "Server Settings" of menu 1 of window 1
            return "success"
          on error
            -- Try button approach
            try
              set settingsButton to first button of window 1 whose name contains "Server Settings"
              click settingsButton
              return "success_button"
            on error
              -- Try static text that might be clickable
              try
                set settingsText to first UI element of window 1 whose name is "Server Settings" or value is "Server Settings"
                click settingsText
                return "success_element"
              on error errMsg
                return "not_found:" & errMsg
              end try
            end try
          end try
        end tell
      end tell
    `;

    const result = await executeAppleScript(script);

    if (!result.success || (result.output && result.output.startsWith('not_found:'))) {
      // Close the dropdown and report error
      await pressEscape();
      throw new UIElementNotFoundError(
        'Server Settings menu item',
        { menuItem: 'Server Settings' }
      );
    }

    await delay(500); // Wait for settings to load

    return {
      success: true,
      message: 'Server settings opened successfully',
      serverName: input.serverName,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return {
        success: false,
        error: error.message,
        code: (error as { code: string }).code,
      };
    }
    const wrapped = wrapError(error, 'Failed to open server settings');
    return {
      success: false,
      error: wrapped.message,
      code: wrapped.code,
    };
  }
}

/**
 * Set the server verification level
 */
export async function setVerificationLevelHandler(
  input: SetVerificationLevelInput
): Promise<SetVerificationLevelResult | SettingsToolError> {
  const { level } = input;
  const levelLabel = VERIFICATION_LEVEL_LABELS[level];

  try {
    // First ensure we're in server settings
    // The user should have already opened server settings
    await activateDiscord();
    await delay(300);

    // Navigate to the Safety Setup or Moderation section
    // Discord organizes verification under "Safety Setup" or "Moderation"
    try {
      await navigateToSettingsSection('Safety Setup');
    } catch {
      // Try alternative section name
      await navigateToSettingsSection('Moderation');
    }

    await delay(300);

    // Look for and click the verification level dropdown/selector
    const script = `
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          set frontmost to true
          delay 0.3

          -- Find verification level section and click on it or the dropdown
          try
            -- Look for elements containing "Verification Level"
            set verificationSection to first UI element of window 1 whose name contains "Verification Level" or description contains "Verification Level"
            click verificationSection
            return "clicked"
          on error
            -- Try finding a dropdown/popup button near verification text
            try
              set verificationDropdown to first pop up button of window 1
              click verificationDropdown
              return "clicked_dropdown"
            on error errMsg
              return "not_found:" & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const dropdownResult = await executeAppleScript(script);

    if (dropdownResult.success && !dropdownResult.output?.startsWith('not_found:')) {
      await delay(300);
    }

    // Select the appropriate verification level
    await selectOption(levelLabel);
    await delay(200);

    // Confirm selection if needed (press Enter or click confirm)
    await pressKey(KeyCodes.RETURN);

    return {
      success: true,
      message: `Verification level set to ${levelLabel}`,
      level,
      levelLabel,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return {
        success: false,
        error: error.message,
        code: (error as { code: string }).code,
      };
    }
    const wrapped = wrapError(error, 'Failed to set verification level');
    return {
      success: false,
      error: wrapped.message,
      code: wrapped.code,
    };
  }
}

/**
 * Set the explicit content filter level
 */
export async function setContentFilterHandler(
  input: SetContentFilterInput
): Promise<SetContentFilterResult | SettingsToolError> {
  const { level } = input;
  const levelLabel = CONTENT_FILTER_LABELS[level];

  try {
    await activateDiscord();
    await delay(300);

    // Navigate to Safety Setup or Moderation section
    try {
      await navigateToSettingsSection('Safety Setup');
    } catch {
      await navigateToSettingsSection('Moderation');
    }

    await delay(300);

    // Find and interact with the content filter settings
    const script = `
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          set frontmost to true
          delay 0.3

          -- Find explicit content filter section
          try
            set filterSection to first UI element of window 1 whose name contains "Explicit Media Content" or description contains "Explicit" or name contains "Content Filter"
            click filterSection
            return "clicked"
          on error errMsg
            return "not_found:" & errMsg
          end try
        end tell
      end tell
    `;

    await executeAppleScript(script);
    await delay(300);

    // Select the appropriate content filter level
    // The options are usually presented as radio buttons or a list
    await selectOption(levelLabel);
    await delay(200);

    return {
      success: true,
      message: `Content filter set to: ${levelLabel}`,
      level,
      levelLabel,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return {
        success: false,
        error: error.message,
        code: (error as { code: string }).code,
      };
    }
    const wrapped = wrapError(error, 'Failed to set content filter');
    return {
      success: false,
      error: wrapped.message,
      code: wrapped.code,
    };
  }
}

/**
 * Set the default notification setting for the server
 */
export async function setDefaultNotificationsHandler(
  input: SetDefaultNotificationsInput
): Promise<SetDefaultNotificationsResult | SettingsToolError> {
  const { setting } = input;
  const settingLabel = NOTIFICATION_LABELS[setting];

  try {
    await activateDiscord();
    await delay(300);

    // Navigate to Overview or Notifications section in server settings
    try {
      await navigateToSettingsSection('Overview');
    } catch {
      // Overview might not be clickable if already there, continue
    }

    await delay(300);

    // Find and interact with the default notifications settings
    const script = `
      tell application "System Events"
        tell process "${DISCORD_APP_NAME}"
          set frontmost to true
          delay 0.3

          -- Find default notifications section
          try
            set notificationSection to first UI element of window 1 whose name contains "Default Notification" or description contains "notification"
            click notificationSection
            return "clicked"
          on error
            -- Try finding radio buttons for notification settings
            try
              set notificationRadio to first radio button of window 1 whose name contains ${quoteAppleScriptString(settingLabel)}
              click notificationRadio
              return "clicked_radio"
            on error errMsg
              return "not_found:" & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const result = await executeAppleScript(script);

    if (result.output?.startsWith('clicked_radio')) {
      // Already selected the right option
      return {
        success: true,
        message: `Default notifications set to: ${settingLabel}`,
        setting,
        settingLabel,
      };
    }

    await delay(300);

    // Select the notification setting
    await selectOption(settingLabel);
    await delay(200);

    return {
      success: true,
      message: `Default notifications set to: ${settingLabel}`,
      setting,
      settingLabel,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      return {
        success: false,
        error: error.message,
        code: (error as { code: string }).code,
      };
    }
    const wrapped = wrapError(error, 'Failed to set default notifications');
    return {
      success: false,
      error: wrapped.message,
      code: wrapped.code,
    };
  }
}

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP tool definition for open_server_settings
 */
export const openServerSettingsToolDefinition = {
  name: 'open_server_settings',
  description:
    'Open the server settings panel for the currently selected Discord server. This must be called before using other settings tools like set_verification_level or set_content_filter.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      serverName: {
        type: 'string',
        description:
          'Optional: Name of the server to open settings for. If not provided, uses the currently selected server.',
      },
    },
    required: [] as string[],
  },
};

/**
 * MCP tool definition for set_verification_level
 */
export const setVerificationLevelToolDefinition = {
  name: 'set_verification_level',
  description:
    'Set the verification level for the Discord server. Requires server settings to be open first (use open_server_settings). Levels: none (no requirements), low (verified email), medium (registered 5+ mins), high (member 10+ mins), highest (verified phone).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      level: {
        type: 'string',
        enum: ['none', 'low', 'medium', 'high', 'highest'],
        description:
          'Verification level to set. none=no requirements, low=verified email, medium=registered 5+ mins, high=member 10+ mins, highest=verified phone',
      },
    },
    required: ['level'],
  },
};

/**
 * MCP tool definition for set_content_filter
 */
export const setContentFilterToolDefinition = {
  name: 'set_content_filter',
  description:
    'Set the explicit content filter level for the Discord server. Requires server settings to be open first. Options: disabled (no scanning), members_without_roles (scan members without roles), all_members (scan all messages).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      level: {
        type: 'string',
        enum: ['disabled', 'members_without_roles', 'all_members'],
        description:
          'Content filter level. disabled=no scanning, members_without_roles=scan unroled members only, all_members=scan everyone',
      },
    },
    required: ['level'],
  },
};

/**
 * MCP tool definition for set_default_notifications
 */
export const setDefaultNotificationsToolDefinition = {
  name: 'set_default_notifications',
  description:
    'Set the default notification setting for new members joining the Discord server. Requires server settings to be open first. Options: all_messages (notify on all messages), only_mentions (notify only when mentioned).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      setting: {
        type: 'string',
        enum: ['all_messages', 'only_mentions'],
        description:
          'Default notification setting for new members. all_messages=all messages, only_mentions=only @mentions',
      },
    },
    required: ['setting'],
  },
};

/**
 * All settings tool definitions for registration with MCP server
 */
export const settingsToolDefinitions = [
  openServerSettingsToolDefinition,
  setVerificationLevelToolDefinition,
  setContentFilterToolDefinition,
  setDefaultNotificationsToolDefinition,
];

/**
 * Handler map for settings tools
 */
export const settingsToolHandlers = {
  open_server_settings: openServerSettingsHandler,
  set_verification_level: setVerificationLevelHandler,
  set_content_filter: setContentFilterHandler,
  set_default_notifications: setDefaultNotificationsHandler,
} as const;

/**
 * Validate and handle a settings tool call
 */
export function handleSettingsToolCall(
  toolName: string,
  args: unknown
): Promise<
  | OpenServerSettingsResult
  | SetVerificationLevelResult
  | SetContentFilterResult
  | SetDefaultNotificationsResult
  | SettingsToolError
> {
  switch (toolName) {
    case 'open_server_settings': {
      const parsed = OpenServerSettingsInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return openServerSettingsHandler(parsed.data);
    }

    case 'set_verification_level': {
      const parsed = SetVerificationLevelInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return setVerificationLevelHandler(parsed.data);
    }

    case 'set_content_filter': {
      const parsed = SetContentFilterInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return setContentFilterHandler(parsed.data);
    }

    case 'set_default_notifications': {
      const parsed = SetDefaultNotificationsInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return setDefaultNotificationsHandler(parsed.data);
    }

    default:
      return Promise.resolve({
        success: false as const,
        error: `Unknown settings tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      });
  }
}
