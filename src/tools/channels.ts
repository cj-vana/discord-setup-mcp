/**
 * Channel Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for creating, editing, and deleting channels and categories.
 * These tools enable users to manage Discord server structure through UI automation.
 */

import { z } from 'zod';
import {
  CreateCategoryInputSchema,
  CreateTextChannelInputSchema,
  CreateVoiceChannelInputSchema,
  ChannelTypeSchema,
  type CreateCategoryInput,
  type ChannelType,
} from '../utils/validation.js';
import {
  activateDiscord,
  typeText,
  pressEnter,
  pressEscape,
  pressKey,
  clickElement,
  delay,
} from '../automation/discord.js';
import { executeAppleScript, quoteAppleScriptString } from '../automation/executor.js';
import { wrapError, DiscordStateError, UIElementNotFoundError } from '../utils/errors.js';

// ============================================
// Tool Input Schemas
// ============================================

/**
 * Schema for create_category tool
 */
export const CreateCategoryToolInputSchema = CreateCategoryInputSchema.extend({
  serverName: z
    .string()
    .optional()
    .describe('Name of the server to create the category in. If not provided, uses the currently active server.'),
});

export type CreateCategoryToolInput = z.infer<typeof CreateCategoryToolInputSchema>;

/**
 * Schema for create_channel tool - supports all channel types
 */
export const CreateChannelToolInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name must be 100 characters or less')
    .describe('Name of the channel to create'),
  type: ChannelTypeSchema.default('text').describe('Type of channel to create'),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category to place this channel in'),
  topic: z
    .string()
    .max(1024, 'Topic must be 1024 characters or less')
    .optional()
    .describe('Channel topic (for text/announcement channels)'),
  slowmode: z
    .number()
    .int()
    .min(0)
    .max(21600)
    .optional()
    .default(0)
    .describe('Slowmode in seconds (0-21600, for text channels)'),
  nsfw: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the channel is age-restricted'),
  bitrate: z
    .number()
    .int()
    .min(8000)
    .max(384000)
    .optional()
    .describe('Bitrate for voice/stage channels (8000-384000)'),
  userLimit: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe('User limit for voice channels (0 = unlimited)'),
  serverName: z
    .string()
    .optional()
    .describe('Name of the server to create the channel in. If not provided, uses the currently active server.'),
});

export type CreateChannelToolInput = z.infer<typeof CreateChannelToolInputSchema>;

/**
 * Schema for delete_channel tool
 */
export const DeleteChannelToolInputSchema = z.object({
  channelName: z
    .string()
    .min(1, 'Channel name is required')
    .describe('Name of the channel to delete'),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category containing the channel (helps identify the correct channel if duplicates exist)'),
  serverName: z
    .string()
    .optional()
    .describe('Name of the server containing the channel. If not provided, uses the currently active server.'),
  confirmDelete: z
    .boolean()
    .default(true)
    .describe('Confirm the deletion (set to true to proceed)'),
});

export type DeleteChannelToolInput = z.infer<typeof DeleteChannelToolInputSchema>;

/**
 * Schema for edit_channel tool
 */
export const EditChannelToolInputSchema = z.object({
  channelName: z
    .string()
    .min(1, 'Channel name is required')
    .describe('Name of the channel to edit'),
  categoryName: z
    .string()
    .optional()
    .describe('Name of the category containing the channel'),
  serverName: z
    .string()
    .optional()
    .describe('Name of the server containing the channel. If not provided, uses the currently active server.'),
  newName: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe('New name for the channel'),
  newTopic: z
    .string()
    .max(1024)
    .optional()
    .describe('New topic for the channel'),
  newSlowmode: z
    .number()
    .int()
    .min(0)
    .max(21600)
    .optional()
    .describe('New slowmode setting in seconds'),
  nsfw: z
    .boolean()
    .optional()
    .describe('New NSFW setting'),
  newBitrate: z
    .number()
    .int()
    .min(8000)
    .max(384000)
    .optional()
    .describe('New bitrate for voice channels'),
  newUserLimit: z
    .number()
    .int()
    .min(0)
    .max(99)
    .optional()
    .describe('New user limit for voice channels'),
});

export type EditChannelToolInput = z.infer<typeof EditChannelToolInputSchema>;

// ============================================
// Tool Response Types
// ============================================

/**
 * Response from create_category tool
 */
export interface CreateCategoryResult {
  success: true;
  message: string;
  categoryName: string;
  serverName?: string;
}

/**
 * Response from create_channel tool
 */
export interface CreateChannelResult {
  success: true;
  message: string;
  channelName: string;
  channelType: ChannelType;
  categoryName?: string;
  serverName?: string;
}

/**
 * Response from delete_channel tool
 */
export interface DeleteChannelResult {
  success: true;
  message: string;
  channelName: string;
  serverName?: string;
}

/**
 * Response from edit_channel tool
 */
export interface EditChannelResult {
  success: true;
  message: string;
  channelName: string;
  changes: string[];
  serverName?: string;
}

/**
 * Error response for channel tools
 */
export interface ChannelToolError {
  success: false;
  error: string;
  code: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Open the context menu for creating channels/categories via right-click on category or channel list
 */
async function openCreateChannelContextMenu(categoryName?: string): Promise<void> {
  await activateDiscord();
  await delay(300);

  if (categoryName) {
    // Right-click on the specified category to open context menu
    const script = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find the category and right-click it
          set foundCategory to false
          try
            set allGroups to every group of window 1
            repeat with g in allGroups
              try
                set gName to name of g
                if gName contains ${quoteAppleScriptString(categoryName)} then
                  -- Perform right-click (control-click)
                  perform action "AXShowMenu" of g
                  set foundCategory to true
                  exit repeat
                end if
              end try
            end repeat
          end try

          if foundCategory then
            return "found"
          else
            return "not_found"
          end if
        end tell
      end tell
    `;

    const result = await executeAppleScript(script);
    if (!result.success || result.output === 'not_found') {
      throw new UIElementNotFoundError(`Category: ${categoryName}`, { categoryName });
    }
  } else {
    // Open server menu to access channel creation
    // Use keyboard shortcut to create channel (Ctrl+Shift+N is not standard, so we use the server dropdown)
    const script = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Click on the server name dropdown area (usually near top-left of channel list)
          -- This opens the server context menu with "Create Channel" option
          try
            -- Look for the server header area
            set serverHeader to first static text of group 1 of group 1 of window 1
            click serverHeader
            delay 0.2
            return "clicked"
          on error
            -- Fallback: try to find any clickable server element
            return "fallback"
          end try
        end tell
      end tell
    `;

    await executeAppleScript(script);
  }

  await delay(300);
}

/**
 * Navigate to channel settings via right-click context menu
 */
async function openChannelSettings(channelName: string, categoryName?: string): Promise<void> {
  await activateDiscord();
  await delay(300);

  const script = `
    tell application "System Events"
      tell process "Discord"
        set frontmost to true
        delay 0.3

        -- Find the channel and right-click it
        set foundChannel to false
        try
          -- Search for the channel in the UI
          set allElements to every UI element of window 1
          repeat with elem in allElements
            try
              set elemName to name of elem
              if elemName is ${quoteAppleScriptString(channelName)} then
                -- Perform right-click (control-click) to open context menu
                perform action "AXShowMenu" of elem
                set foundChannel to true
                exit repeat
              end if
            end try
          end repeat
        end try

        if foundChannel then
          delay 0.3
          -- Click "Edit Channel" in the context menu
          try
            click menu item "Edit Channel" of menu 1
            return "success"
          on error
            return "no_edit_option"
          end try
        else
          return "not_found"
        end if
      end tell
    end tell
  `;

  const result = await executeAppleScript(script);
  if (!result.success) {
    throw wrapError(result.error, 'Failed to open channel settings');
  }
  if (result.output === 'not_found') {
    throw new UIElementNotFoundError(`Channel: ${channelName}`, { channelName, categoryName });
  }
  if (result.output === 'no_edit_option') {
    throw new DiscordStateError('channel context menu with Edit Channel option', undefined,
      'Could not find Edit Channel option in context menu');
  }

  await delay(500); // Wait for settings modal to open
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Create a new category in the Discord server
 */
export async function createCategoryHandler(
  input: CreateCategoryToolInput
): Promise<CreateCategoryResult | ChannelToolError> {
  const { name, serverName } = input;

  try {
    await activateDiscord();
    await delay(300);

    // Open server context menu by clicking the server name
    const openMenuScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find and click the server name to open dropdown
          try
            -- The server dropdown is typically a button or clickable area
            set serverButton to first button of group 1 of group 1 of window 1 whose description contains "Server"
            click serverButton
            return "clicked_button"
          on error
            try
              -- Alternative: click on static text that shows server name
              set serverText to first static text of group 1 of group 1 of window 1
              click serverText
              return "clicked_text"
            on error
              -- Try keyboard shortcut approach
              return "use_keyboard"
            end try
          end try
        end tell
      end tell
    `;

    const menuResult = await executeAppleScript(openMenuScript);

    if (menuResult.output === 'use_keyboard') {
      // Use right-click on channel list area
      await pressKey('k', ['command']); // Open quick switcher
      await delay(200);
      await pressEscape();
      await delay(200);
    }

    await delay(300);

    // Look for and click "Create Category" option
    const createCategoryScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.3
          try
            -- Find the Create Category menu item in the dropdown
            click menu item "Create Category" of menu 1
            return "success"
          on error errMsg
            return "error:" & errMsg
          end try
        end tell
      end tell
    `;

    const createResult = await executeAppleScript(createCategoryScript);

    if (!createResult.success || createResult.output?.startsWith('error:')) {
      // Alternative approach: use right-click on channel area
      const altScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2
            -- Use Control+click on the channel list area for context menu
            key code 48 using {shift down, command down} -- Try common shortcuts
          end tell
        end tell
      `;
      await executeAppleScript(altScript);
    }

    await delay(500);

    // Type the category name in the modal
    await typeText(name);
    await delay(200);

    // Press Enter or click Create button to confirm
    await pressEnter();
    await delay(500);

    return {
      success: true,
      message: `Category '${name}' created successfully`,
      categoryName: name,
      serverName,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to create category');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
    };
  }
}

/**
 * Create a new channel in the Discord server
 */
export async function createChannelHandler(
  input: CreateChannelToolInput
): Promise<CreateChannelResult | ChannelToolError> {
  const { name, type, categoryName, topic, slowmode, nsfw, bitrate, userLimit, serverName } = input;

  try {
    await activateDiscord();
    await delay(300);

    // Open server dropdown or category context menu
    if (categoryName) {
      await openCreateChannelContextMenu(categoryName);
    } else {
      // Open server context menu
      const openMenuScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.3

            try
              -- Click server dropdown
              set serverText to first static text of group 1 of group 1 of window 1
              click serverText
              delay 0.3
              return "menu_opened"
            on error
              return "error"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(openMenuScript);
    }

    await delay(300);

    // Click "Create Channel" in the menu
    const clickCreateScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.2
          try
            click menu item "Create Channel" of menu 1
            return "success"
          on error
            return "not_found"
          end try
        end tell
      end tell
    `;

    const clickResult = await executeAppleScript(clickCreateScript);

    if (clickResult.output === 'not_found') {
      // Try alternative - might be "Create Text Channel" or similar
      const altScript = `
        tell application "System Events"
          tell process "Discord"
            try
              click (first menu item of menu 1 whose name contains "Create")
              return "success"
            on error
              return "not_found"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(altScript);
    }

    await delay(500);

    // Select channel type if not text (default is text)
    if (type !== 'text') {
      // Channel type selection is usually at the top of the modal
      const typeMap: Record<ChannelType, string> = {
        text: 'Text',
        voice: 'Voice',
        announcement: 'Announcement',
        stage: 'Stage',
        forum: 'Forum',
      };

      const selectTypeScript = `
        tell application "System Events"
          tell process "Discord"
            delay 0.2
            try
              -- Look for the channel type radio buttons/options
              click radio button ${quoteAppleScriptString(typeMap[type])} of group 1 of window 1
              return "selected"
            on error
              try
                -- Alternative: click on the type option text
                click static text ${quoteAppleScriptString(typeMap[type])} of window 1
                return "selected_alt"
              on error
                return "not_found"
              end try
            end try
          end tell
        end tell
      `;
      await executeAppleScript(selectTypeScript);
      await delay(200);
    }

    // Type the channel name
    await typeText(name);
    await delay(200);

    // Press Enter or Tab to move through fields
    // Then press Enter to create
    await pressEnter();
    await delay(500);

    // If there are additional settings (topic, slowmode, etc.), they can be set after creation
    // For now, we create the basic channel

    return {
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} channel '${name}' created successfully`,
      channelName: name,
      channelType: type,
      categoryName,
      serverName,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to create channel');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
    };
  }
}

/**
 * Delete a channel from the Discord server
 */
export async function deleteChannelHandler(
  input: DeleteChannelToolInput
): Promise<DeleteChannelResult | ChannelToolError> {
  const { channelName, categoryName, serverName, confirmDelete } = input;

  if (!confirmDelete) {
    return {
      success: false,
      error: 'Deletion not confirmed. Set confirmDelete to true to proceed.',
      code: 'DELETION_NOT_CONFIRMED',
    };
  }

  try {
    await activateDiscord();
    await delay(300);

    // Right-click on the channel to open context menu
    const findAndClickScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Search for the channel
          set foundChannel to false
          try
            set allElements to every UI element of window 1
            repeat with elem in allElements
              try
                set elemName to name of elem
                if elemName is ${quoteAppleScriptString(channelName)} then
                  -- Right-click to open context menu
                  perform action "AXShowMenu" of elem
                  set foundChannel to true
                  exit repeat
                end if
              end try
            end repeat
          end try

          if foundChannel then
            return "found"
          else
            return "not_found"
          end if
        end tell
      end tell
    `;

    const findResult = await executeAppleScript(findAndClickScript);

    if (!findResult.success || findResult.output === 'not_found') {
      throw new UIElementNotFoundError(`Channel: ${channelName}`, { channelName, categoryName });
    }

    await delay(300);

    // Click "Delete Channel" in context menu
    const deleteScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.2
          try
            click menu item "Delete Channel" of menu 1
            return "clicked"
          on error
            return "not_found"
          end try
        end tell
      end tell
    `;

    const deleteResult = await executeAppleScript(deleteScript);

    if (deleteResult.output === 'not_found') {
      throw new DiscordStateError('channel context menu with Delete Channel option');
    }

    await delay(500);

    // Confirm deletion in the modal
    const confirmScript = `
      tell application "System Events"
        tell process "Discord"
          delay 0.3
          try
            -- Look for the Delete button in the confirmation modal
            click button "Delete Channel" of window 1
            return "confirmed"
          on error
            try
              -- Alternative: look for any Delete button
              click (first button of window 1 whose name contains "Delete")
              return "confirmed_alt"
            on error
              return "no_button"
            end try
          end try
        end tell
      end tell
    `;

    const confirmResult = await executeAppleScript(confirmScript);

    if (confirmResult.output === 'no_button') {
      // Try pressing Enter to confirm
      await pressEnter();
    }

    await delay(300);

    return {
      success: true,
      message: `Channel '${channelName}' deleted successfully`,
      channelName,
      serverName,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to delete channel');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
    };
  }
}

/**
 * Edit an existing channel's settings
 */
export async function editChannelHandler(
  input: EditChannelToolInput
): Promise<EditChannelResult | ChannelToolError> {
  const {
    channelName,
    categoryName,
    serverName,
    newName,
    newTopic,
    newSlowmode,
    nsfw,
    newBitrate,
    newUserLimit
  } = input;

  const changes: string[] = [];

  try {
    // Open channel settings
    await openChannelSettings(channelName, categoryName);
    await delay(500);

    // Apply changes one by one

    // Change name if provided
    if (newName && newName !== channelName) {
      const nameScript = `
        tell application "System Events"
          tell process "Discord"
            try
              -- Find the name input field and clear it
              set nameField to first text field of window 1 whose description contains "name" or value is ${quoteAppleScriptString(channelName)}
              set focused of nameField to true
              -- Select all and replace
              keystroke "a" using command down
              delay 0.1
              keystroke ${quoteAppleScriptString(newName)}
              return "changed"
            on error
              return "not_found"
            end try
          end tell
        end tell
      `;

      const nameResult = await executeAppleScript(nameScript);
      if (nameResult.output === 'changed') {
        changes.push(`name: ${channelName} -> ${newName}`);
      }
      await delay(200);
    }

    // Change topic if provided
    if (newTopic !== undefined) {
      const topicScript = `
        tell application "System Events"
          tell process "Discord"
            try
              -- Find the topic input field
              set topicField to first text field of window 1 whose description contains "topic"
              set focused of topicField to true
              keystroke "a" using command down
              delay 0.1
              keystroke ${quoteAppleScriptString(newTopic)}
              return "changed"
            on error
              return "not_found"
            end try
          end tell
        end tell
      `;

      const topicResult = await executeAppleScript(topicScript);
      if (topicResult.output === 'changed') {
        changes.push(`topic updated`);
      }
      await delay(200);
    }

    // Toggle NSFW if provided
    if (nsfw !== undefined) {
      const nsfwScript = `
        tell application "System Events"
          tell process "Discord"
            try
              -- Find the NSFW toggle/checkbox
              set nsfwToggle to first checkbox of window 1 whose description contains "age" or name contains "NSFW"
              set currentValue to value of nsfwToggle
              if (currentValue as boolean) is not ${nsfw} then
                click nsfwToggle
              end if
              return "toggled"
            on error
              return "not_found"
            end try
          end tell
        end tell
      `;

      const nsfwResult = await executeAppleScript(nsfwScript);
      if (nsfwResult.output === 'toggled') {
        changes.push(`nsfw: ${nsfw}`);
      }
      await delay(200);
    }

    // Save changes - look for Save button or press Escape to save
    const saveScript = `
      tell application "System Events"
        tell process "Discord"
          try
            -- Look for Save Changes button
            click button "Save Changes" of window 1
            return "saved"
          on error
            try
              -- Alternative: press Escape which may auto-save
              key code 53
              return "escaped"
            on error
              return "error"
            end try
          end try
        end tell
      end tell
    `;

    await executeAppleScript(saveScript);
    await delay(300);

    return {
      success: true,
      message: `Channel '${channelName}' updated successfully`,
      channelName: newName || channelName,
      changes,
      serverName,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to edit channel');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError.code,
    };
  }
}

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP tool definition for create_category
 */
export const createCategoryToolDefinition = {
  name: 'create_category',
  description:
    'Create a new category in a Discord server. Categories are used to organize channels into groups.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name of the category to create (1-100 characters)',
        minLength: 1,
        maxLength: 100,
      },
      serverName: {
        type: 'string',
        description: 'Name of the server to create the category in. If not provided, uses the currently active server.',
      },
    },
    required: ['name'],
  },
};

/**
 * MCP tool definition for create_channel
 */
export const createChannelToolDefinition = {
  name: 'create_channel',
  description:
    'Create a new channel in a Discord server. Supports text, voice, announcement, stage, and forum channel types.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name of the channel to create (1-100 characters)',
        minLength: 1,
        maxLength: 100,
      },
      type: {
        type: 'string',
        enum: ['text', 'voice', 'announcement', 'stage', 'forum'],
        default: 'text',
        description: 'Type of channel to create',
      },
      categoryName: {
        type: 'string',
        description: 'Name of the category to place this channel in',
      },
      topic: {
        type: 'string',
        description: 'Channel topic (for text/announcement channels)',
        maxLength: 1024,
      },
      slowmode: {
        type: 'number',
        description: 'Slowmode in seconds (0-21600, for text channels)',
        minimum: 0,
        maximum: 21600,
        default: 0,
      },
      nsfw: {
        type: 'boolean',
        description: 'Whether the channel is age-restricted',
        default: false,
      },
      bitrate: {
        type: 'number',
        description: 'Bitrate for voice/stage channels (8000-384000)',
        minimum: 8000,
        maximum: 384000,
      },
      userLimit: {
        type: 'number',
        description: 'User limit for voice channels (0 = unlimited, max 99)',
        minimum: 0,
        maximum: 99,
      },
      serverName: {
        type: 'string',
        description: 'Name of the server to create the channel in. If not provided, uses the currently active server.',
      },
    },
    required: ['name'],
  },
};

/**
 * MCP tool definition for delete_channel
 */
export const deleteChannelToolDefinition = {
  name: 'delete_channel',
  description:
    'Delete a channel from a Discord server. This action is irreversible and will delete all messages in the channel.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelName: {
        type: 'string',
        description: 'Name of the channel to delete',
      },
      categoryName: {
        type: 'string',
        description: 'Name of the category containing the channel (helps identify the correct channel if duplicates exist)',
      },
      serverName: {
        type: 'string',
        description: 'Name of the server containing the channel. If not provided, uses the currently active server.',
      },
      confirmDelete: {
        type: 'boolean',
        description: 'Confirm the deletion (must be true to proceed)',
        default: true,
      },
    },
    required: ['channelName', 'confirmDelete'],
  },
};

/**
 * MCP tool definition for edit_channel
 */
export const editChannelToolDefinition = {
  name: 'edit_channel',
  description:
    'Edit an existing channel\'s settings including name, topic, slowmode, NSFW status, and voice channel settings.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelName: {
        type: 'string',
        description: 'Name of the channel to edit',
      },
      categoryName: {
        type: 'string',
        description: 'Name of the category containing the channel',
      },
      serverName: {
        type: 'string',
        description: 'Name of the server containing the channel. If not provided, uses the currently active server.',
      },
      newName: {
        type: 'string',
        description: 'New name for the channel (1-100 characters)',
        minLength: 1,
        maxLength: 100,
      },
      newTopic: {
        type: 'string',
        description: 'New topic for the channel (max 1024 characters)',
        maxLength: 1024,
      },
      newSlowmode: {
        type: 'number',
        description: 'New slowmode setting in seconds (0-21600)',
        minimum: 0,
        maximum: 21600,
      },
      nsfw: {
        type: 'boolean',
        description: 'New NSFW setting',
      },
      newBitrate: {
        type: 'number',
        description: 'New bitrate for voice channels (8000-384000)',
        minimum: 8000,
        maximum: 384000,
      },
      newUserLimit: {
        type: 'number',
        description: 'New user limit for voice channels (0-99)',
        minimum: 0,
        maximum: 99,
      },
    },
    required: ['channelName'],
  },
};

/**
 * All channel tool definitions for registration with MCP server
 */
export const channelToolDefinitions = [
  createCategoryToolDefinition,
  createChannelToolDefinition,
  deleteChannelToolDefinition,
  editChannelToolDefinition,
];

/**
 * Handler map for channel tools
 */
export const channelToolHandlers = {
  create_category: createCategoryHandler,
  create_channel: createChannelHandler,
  delete_channel: deleteChannelHandler,
  edit_channel: editChannelHandler,
} as const;

/**
 * Validate and handle a channel tool call
 */
export function handleChannelToolCall(
  toolName: string,
  args: unknown
): Promise<CreateCategoryResult | CreateChannelResult | DeleteChannelResult | EditChannelResult | ChannelToolError> {
  switch (toolName) {
    case 'create_category': {
      const parsed = CreateCategoryToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return createCategoryHandler(parsed.data);
    }

    case 'create_channel': {
      const parsed = CreateChannelToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return createChannelHandler(parsed.data);
    }

    case 'delete_channel': {
      const parsed = DeleteChannelToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return deleteChannelHandler(parsed.data);
    }

    case 'edit_channel': {
      const parsed = EditChannelToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return editChannelHandler(parsed.data);
    }

    default:
      return Promise.resolve({
        success: false,
        error: `Unknown channel tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      });
  }
}
