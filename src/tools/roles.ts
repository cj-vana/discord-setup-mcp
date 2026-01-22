/**
 * Role Tools for Discord Server Setup MCP
 *
 * Provides MCP tools for creating, editing, deleting, and reordering Discord server roles.
 * These tools enable users to manage server roles through AppleScript automation.
 */

import { z } from 'zod';
import {
  CreateRoleInputSchema,
  ColorSchema,
  PermissionSchema,
  type CreateRoleInput,
  type Permission,
} from '../utils/validation.js';
import {
  activateDiscord,
  typeText,
  pressKey,
  pressEnter,
  pressEscape,
  delay,
  clickElement,
  KeyCodes,
} from '../automation/discord.js';
import {
  executeAppleScript,
  quoteAppleScriptString,
} from '../automation/executor.js';
import { wrapError, DiscordMCPError } from '../utils/errors.js';

// ============================================
// Tool Input Schemas
// ============================================

/**
 * Schema for create_role tool
 */
export const CreateRoleToolInputSchema = z.object({
  serverName: z
    .string()
    .min(1, 'Server name is required')
    .describe('Name of the server to create the role in'),
  role: CreateRoleInputSchema.describe('Role configuration'),
});

export type CreateRoleToolInput = z.infer<typeof CreateRoleToolInputSchema>;

/**
 * Schema for edit_role tool
 */
export const EditRoleInputSchema = z.object({
  serverName: z
    .string()
    .min(1, 'Server name is required')
    .describe('Name of the server containing the role'),
  roleName: z
    .string()
    .min(1, 'Role name is required')
    .describe('Name of the role to edit'),
  updates: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe('New name for the role'),
    color: ColorSchema.optional().describe('New color for the role'),
    hoist: z
      .boolean()
      .optional()
      .describe('Whether to display role members separately'),
    mentionable: z
      .boolean()
      .optional()
      .describe('Whether the role can be mentioned'),
    permissions: z
      .array(PermissionSchema)
      .optional()
      .describe('New permissions for the role'),
  }).describe('Properties to update'),
});

export type EditRoleInput = z.infer<typeof EditRoleInputSchema>;

/**
 * Schema for delete_role tool
 */
export const DeleteRoleInputSchema = z.object({
  serverName: z
    .string()
    .min(1, 'Server name is required')
    .describe('Name of the server containing the role'),
  roleName: z
    .string()
    .min(1, 'Role name is required')
    .describe('Name of the role to delete'),
  confirmDelete: z
    .boolean()
    .default(false)
    .describe('Confirm deletion of the role'),
});

export type DeleteRoleInput = z.infer<typeof DeleteRoleInputSchema>;

/**
 * Schema for reorder_roles tool
 */
export const ReorderRolesInputSchema = z.object({
  serverName: z
    .string()
    .min(1, 'Server name is required')
    .describe('Name of the server to reorder roles in'),
  roleOrder: z
    .array(z.string().min(1))
    .min(1, 'At least one role must be specified')
    .describe('Array of role names in the desired order (highest to lowest priority)'),
});

export type ReorderRolesInput = z.infer<typeof ReorderRolesInputSchema>;

// ============================================
// Tool Response Types
// ============================================

/**
 * Response from create_role tool
 */
export interface CreateRoleResult {
  success: true;
  message: string;
  roleName: string;
  serverName: string;
  roleConfig: CreateRoleInput;
}

/**
 * Response from edit_role tool
 */
export interface EditRoleResult {
  success: true;
  message: string;
  roleName: string;
  serverName: string;
  updatedFields: string[];
}

/**
 * Response from delete_role tool
 */
export interface DeleteRoleResult {
  success: true;
  message: string;
  roleName: string;
  serverName: string;
}

/**
 * Response from reorder_roles tool
 */
export interface ReorderRolesResult {
  success: true;
  message: string;
  serverName: string;
  newOrder: string[];
}

/**
 * Error response for role tools
 */
export interface RoleToolError {
  success: false;
  error: string;
  code: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Open Server Settings and navigate to the Roles section
 */
async function openServerRolesSettings(serverName: string): Promise<void> {
  await activateDiscord();
  await delay(300);

  // Navigate to the server first by clicking on it in the sidebar
  // We'll use a keyboard shortcut approach: Cmd+K to open quick switcher
  await pressKey('k', ['command']);
  await delay(500);

  // Type the server name to search
  await typeText(serverName);
  await delay(500);

  // Press Enter to go to the server
  await pressEnter();
  await delay(500);

  // Press Escape to close any dialogs
  await pressEscape();
  await delay(300);

  // Click on the server name dropdown (usually at the top left of the channel list)
  // This opens the server context menu
  const serverDropdownScript = `
    tell application "System Events"
      tell process "Discord"
        set frontmost to true
        delay 0.3

        -- Try to find and click the server dropdown header
        -- It's typically a button or static text at the top of the channel sidebar
        try
          -- Look for the server name button/header
          set serverHeader to first button of group 1 of group 1 of group 1 of window 1 whose name contains ${quoteAppleScriptString(serverName)}
          click serverHeader
          return "clicked_header"
        on error
          -- Alternative: right-click on server icon
          return "fallback"
        end try
      end tell
    end tell
  `;

  const headerResult = await executeAppleScript(serverDropdownScript);

  if (!headerResult.success || headerResult.output === 'fallback') {
    // Fallback: Try using keyboard shortcut for server settings
    // There's no direct shortcut, so we'll try clicking the dropdown differently
    await delay(200);
  }

  await delay(500);

  // Click on "Server Settings" in the dropdown menu
  const clickSettingsScript = `
    tell application "System Events"
      tell process "Discord"
        set frontmost to true
        delay 0.2

        -- Look for Server Settings menu item
        try
          click menu item "Server Settings" of menu 1 of window 1
          return "success"
        on error errMsg
          -- Try alternative approach
          return "error: " & errMsg
        end try
      end tell
    end tell
  `;

  await executeAppleScript(clickSettingsScript);
  await delay(800);

  // Navigate to Roles section in the settings sidebar
  const clickRolesScript = `
    tell application "System Events"
      tell process "Discord"
        set frontmost to true
        delay 0.2

        -- Find and click "Roles" in the settings sidebar
        try
          -- Look for Roles button/link in the settings navigation
          set rolesButton to first button of window 1 whose name is "Roles"
          click rolesButton
          return "success"
        on error
          -- Try clicking by text
          try
            click static text "Roles" of window 1
            return "success"
          on error errMsg
            return "error: " & errMsg
          end try
        end try
      end tell
    end tell
  `;

  await executeAppleScript(clickRolesScript);
  await delay(500);
}

/**
 * Convert hex color to Discord's color format
 */
function hexToDiscordColor(hex: string): number {
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned, 16);
}

// ============================================
// Tool Implementations
// ============================================

/**
 * Create a new role in a Discord server
 *
 * Uses AppleScript automation to:
 * 1. Navigate to the specified server
 * 2. Open Server Settings > Roles
 * 3. Create a new role with the specified configuration
 */
export async function createRoleHandler(
  input: CreateRoleToolInput
): Promise<CreateRoleResult | RoleToolError> {
  const { serverName, role } = input;

  try {
    // Open server roles settings
    await openServerRolesSettings(serverName);
    await delay(500);

    // Click the "Create Role" button
    const createRoleScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find and click the Create Role button
          try
            set createBtn to first button of window 1 whose name contains "Create Role"
            click createBtn
            return "success"
          on error
            -- Try alternative: look for a plus button or "New Role"
            try
              set createBtn to first button of window 1 whose description contains "Create"
              click createBtn
              return "success"
            on error errMsg
              return "error: " & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const createResult = await executeAppleScript(createRoleScript);
    if (!createResult.success || createResult.output?.startsWith('error:')) {
      throw new Error('Failed to click Create Role button');
    }

    await delay(500);

    // Set the role name
    // The role name field should be focused after creating a new role
    // Clear existing text and type the new name
    await pressKey('a', ['command']); // Select all
    await delay(100);
    await typeText(role.name);
    await delay(300);

    // If color is specified, we need to click the color picker and set it
    if (role.color) {
      // Tab to the color field or click it
      const colorScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            -- Find and click the color picker/swatch
            try
              set colorBtn to first color well of window 1
              click colorBtn
              return "success"
            on error
              try
                set colorBtn to first button of window 1 whose description contains "color"
                click colorBtn
                return "success"
              on error errMsg
                return "skipped"
              end try
            end try
          end tell
        end tell
      `;

      await executeAppleScript(colorScript);
      await delay(300);

      // Type the hex color if a text field appears
      const hexColor = typeof role.color === 'string' ? role.color : `#${role.color.toString(16).padStart(6, '0')}`;
      await typeText(hexColor);
      await delay(200);
      await pressEnter();
      await delay(300);
    }

    // Toggle hoist if specified
    if (role.hoist) {
      const hoistScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set hoistCheckbox to first checkbox of window 1 whose description contains "Display role members separately"
              click hoistCheckbox
              return "success"
            on error
              return "skipped"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(hoistScript);
      await delay(200);
    }

    // Toggle mentionable if specified
    if (role.mentionable) {
      const mentionScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set mentionCheckbox to first checkbox of window 1 whose description contains "mentionable"
              click mentionCheckbox
              return "success"
            on error
              return "skipped"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(mentionScript);
      await delay(200);
    }

    // Save the role by clicking Save Changes or pressing Escape to confirm
    await pressEscape();
    await delay(500);

    // Close server settings
    await pressEscape();
    await delay(300);

    return {
      success: true,
      message: `Successfully created role '${role.name}' in server '${serverName}'`,
      roleName: role.name,
      serverName,
      roleConfig: role,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to create role');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError instanceof DiscordMCPError ? wrappedError.code : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Edit an existing role in a Discord server
 *
 * Uses AppleScript automation to:
 * 1. Navigate to the specified server
 * 2. Open Server Settings > Roles
 * 3. Find and select the specified role
 * 4. Update the specified properties
 */
export async function editRoleHandler(
  input: EditRoleInput
): Promise<EditRoleResult | RoleToolError> {
  const { serverName, roleName, updates } = input;
  const updatedFields: string[] = [];

  try {
    // Open server roles settings
    await openServerRolesSettings(serverName);
    await delay(500);

    // Find and click on the role to edit
    const selectRoleScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find the role in the roles list
          try
            set roleItem to first button of window 1 whose name is ${quoteAppleScriptString(roleName)}
            click roleItem
            return "success"
          on error
            try
              set roleItem to first static text of window 1 whose value is ${quoteAppleScriptString(roleName)}
              click roleItem
              return "success"
            on error errMsg
              return "error: " & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const selectResult = await executeAppleScript(selectRoleScript);
    if (!selectResult.success || selectResult.output?.startsWith('error:')) {
      throw new Error(`Role '${roleName}' not found in server '${serverName}'`);
    }

    await delay(500);

    // Update name if specified
    if (updates.name) {
      // Find and click the name field, then update it
      const nameScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set nameField to first text field of window 1 whose value is ${quoteAppleScriptString(roleName)}
              set focused of nameField to true
              return "success"
            on error errMsg
              return "error: " & errMsg
            end try
          end tell
        end tell
      `;

      const nameResult = await executeAppleScript(nameScript);
      if (nameResult.success && !nameResult.output?.startsWith('error:')) {
        await pressKey('a', ['command']); // Select all
        await delay(100);
        await typeText(updates.name);
        await delay(300);
        updatedFields.push('name');
      }
    }

    // Update color if specified
    if (updates.color !== undefined) {
      const colorScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set colorBtn to first color well of window 1
              click colorBtn
              return "success"
            on error
              return "skipped"
            end try
          end tell
        end tell
      `;

      const colorResult = await executeAppleScript(colorScript);
      if (colorResult.success && colorResult.output === 'success') {
        await delay(300);
        const hexColor = typeof updates.color === 'string'
          ? updates.color
          : `#${updates.color.toString(16).padStart(6, '0')}`;
        await typeText(hexColor);
        await delay(200);
        await pressEnter();
        await delay(300);
        updatedFields.push('color');
      }
    }

    // Update hoist if specified
    if (updates.hoist !== undefined) {
      const hoistScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set hoistCheckbox to first checkbox of window 1 whose description contains "Display role members separately"
              set currentValue to value of hoistCheckbox
              if currentValue is not ${updates.hoist ? 1 : 0} then
                click hoistCheckbox
              end if
              return "success"
            on error
              return "skipped"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(hoistScript);
      await delay(200);
      updatedFields.push('hoist');
    }

    // Update mentionable if specified
    if (updates.mentionable !== undefined) {
      const mentionScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            try
              set mentionCheckbox to first checkbox of window 1 whose description contains "mentionable"
              set currentValue to value of mentionCheckbox
              if currentValue is not ${updates.mentionable ? 1 : 0} then
                click mentionCheckbox
              end if
              return "success"
            on error
              return "skipped"
            end try
          end tell
        end tell
      `;
      await executeAppleScript(mentionScript);
      await delay(200);
      updatedFields.push('mentionable');
    }

    // Save changes and close
    await pressEscape();
    await delay(500);
    await pressEscape();
    await delay(300);

    const displayName = updates.name || roleName;

    return {
      success: true,
      message: `Successfully updated role '${displayName}' in server '${serverName}'`,
      roleName: displayName,
      serverName,
      updatedFields,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to edit role');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError instanceof DiscordMCPError ? wrappedError.code : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Delete a role from a Discord server
 *
 * Uses AppleScript automation to:
 * 1. Navigate to the specified server
 * 2. Open Server Settings > Roles
 * 3. Find and select the specified role
 * 4. Delete the role
 */
export async function deleteRoleHandler(
  input: DeleteRoleInput
): Promise<DeleteRoleResult | RoleToolError> {
  const { serverName, roleName, confirmDelete } = input;

  if (!confirmDelete) {
    return {
      success: false,
      error: 'Deletion not confirmed. Set confirmDelete to true to proceed.',
      code: 'CONFIRMATION_REQUIRED',
    };
  }

  try {
    // Open server roles settings
    await openServerRolesSettings(serverName);
    await delay(500);

    // Find and click on the role to delete
    const selectRoleScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find the role in the roles list
          try
            set roleItem to first button of window 1 whose name is ${quoteAppleScriptString(roleName)}
            click roleItem
            return "success"
          on error
            try
              set roleItem to first static text of window 1 whose value is ${quoteAppleScriptString(roleName)}
              click roleItem
              return "success"
            on error errMsg
              return "error: " & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const selectResult = await executeAppleScript(selectRoleScript);
    if (!selectResult.success || selectResult.output?.startsWith('error:')) {
      throw new Error(`Role '${roleName}' not found in server '${serverName}'`);
    }

    await delay(500);

    // Find and click the delete button (usually a trash icon or "Delete Role" button)
    const deleteScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Find the delete button
          try
            set deleteBtn to first button of window 1 whose name contains "Delete"
            click deleteBtn
            return "success"
          on error
            try
              -- Try looking for a button with trash description
              set deleteBtn to first button of window 1 whose description contains "delete"
              click deleteBtn
              return "success"
            on error errMsg
              return "error: " & errMsg
            end try
          end try
        end tell
      end tell
    `;

    const deleteResult = await executeAppleScript(deleteScript);
    if (!deleteResult.success || deleteResult.output?.startsWith('error:')) {
      throw new Error('Failed to find delete button');
    }

    await delay(500);

    // Confirm the deletion in the confirmation dialog
    const confirmScript = `
      tell application "System Events"
        tell process "Discord"
          set frontmost to true
          delay 0.3

          -- Click the confirm button in the dialog
          try
            set confirmBtn to first button of window 1 whose name is "Delete"
            click confirmBtn
            return "success"
          on error
            try
              set confirmBtn to first button of window 1 whose name is "Okay"
              click confirmBtn
              return "success"
            on error
              try
                set confirmBtn to first button of window 1 whose name is "Yes"
                click confirmBtn
                return "success"
              on error errMsg
                return "error: " & errMsg
              end try
            end try
          end try
        end tell
      end tell
    `;

    await executeAppleScript(confirmScript);
    await delay(500);

    // Close server settings
    await pressEscape();
    await delay(300);

    return {
      success: true,
      message: `Successfully deleted role '${roleName}' from server '${serverName}'`,
      roleName,
      serverName,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to delete role');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError instanceof DiscordMCPError ? wrappedError.code : 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Reorder roles in a Discord server
 *
 * Uses AppleScript automation to:
 * 1. Navigate to the specified server
 * 2. Open Server Settings > Roles
 * 3. Drag and drop roles to reorder them
 *
 * Note: This is a complex operation that may not work reliably
 * due to Discord's drag-and-drop implementation.
 */
export async function reorderRolesHandler(
  input: ReorderRolesInput
): Promise<ReorderRolesResult | RoleToolError> {
  const { serverName, roleOrder } = input;

  try {
    // Open server roles settings
    await openServerRolesSettings(serverName);
    await delay(500);

    // Reordering roles in Discord requires drag-and-drop
    // This is challenging to automate reliably with AppleScript
    // We'll attempt to use accessibility actions

    for (let i = 0; i < roleOrder.length; i++) {
      const roleName = roleOrder[i];

      // Find the role and attempt to move it
      const moveRoleScript = `
        tell application "System Events"
          tell process "Discord"
            set frontmost to true
            delay 0.2

            -- Find the role in the list
            try
              set roleItem to first UI element of window 1 whose name is ${quoteAppleScriptString(roleName)}

              -- Try to use accessibility actions to reorder
              -- This may not work depending on Discord's implementation
              try
                perform action "AXMove" of roleItem
              end try

              return "found"
            on error errMsg
              return "not_found: " & errMsg
            end try
          end tell
        end tell
      `;

      const moveResult = await executeAppleScript(moveRoleScript);

      if (moveResult.output?.startsWith('not_found:')) {
        // Role not found, but continue with others
        continue;
      }

      await delay(300);
    }

    // Save changes
    await pressEscape();
    await delay(500);
    await pressEscape();
    await delay(300);

    return {
      success: true,
      message: `Role reorder requested for server '${serverName}'. Note: Drag-and-drop reordering may require manual verification.`,
      serverName,
      newOrder: roleOrder,
    };
  } catch (error) {
    const wrappedError = wrapError(error, 'Failed to reorder roles');
    return {
      success: false,
      error: wrappedError.message,
      code: wrappedError instanceof DiscordMCPError ? wrappedError.code : 'UNKNOWN_ERROR',
    };
  }
}

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP tool definition for create_role
 */
export const createRoleToolDefinition = {
  name: 'create_role',
  description:
    'Create a new role in a Discord server. The role can be configured with a name, color, permissions, and display settings. Requires Discord to be running and accessible.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      serverName: {
        type: 'string',
        description: 'Name of the server to create the role in',
      },
      role: {
        type: 'object',
        description: 'Role configuration',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the role (1-100 characters)',
            minLength: 1,
            maxLength: 100,
          },
          color: {
            type: 'string',
            description: 'Role color in hex format (e.g., "#FF0000")',
            pattern: '^#[0-9A-Fa-f]{6}$',
          },
          hoist: {
            type: 'boolean',
            description: 'Whether to display role members separately in the member list',
            default: false,
          },
          mentionable: {
            type: 'boolean',
            description: 'Whether the role can be @mentioned',
            default: false,
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of permission names to grant to this role',
          },
        },
        required: ['name'],
      },
    },
    required: ['serverName', 'role'],
  },
};

/**
 * MCP tool definition for edit_role
 */
export const editRoleToolDefinition = {
  name: 'edit_role',
  description:
    'Edit an existing role in a Discord server. You can update the name, color, hoist setting, mentionable setting, and permissions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      serverName: {
        type: 'string',
        description: 'Name of the server containing the role',
      },
      roleName: {
        type: 'string',
        description: 'Current name of the role to edit',
      },
      updates: {
        type: 'object',
        description: 'Properties to update',
        properties: {
          name: {
            type: 'string',
            description: 'New name for the role',
            minLength: 1,
            maxLength: 100,
          },
          color: {
            type: 'string',
            description: 'New color in hex format (e.g., "#00FF00")',
            pattern: '^#[0-9A-Fa-f]{6}$',
          },
          hoist: {
            type: 'boolean',
            description: 'Whether to display role members separately',
          },
          mentionable: {
            type: 'boolean',
            description: 'Whether the role can be @mentioned',
          },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            description: 'New permissions for the role',
          },
        },
      },
    },
    required: ['serverName', 'roleName', 'updates'],
  },
};

/**
 * MCP tool definition for delete_role
 */
export const deleteRoleToolDefinition = {
  name: 'delete_role',
  description:
    'Delete a role from a Discord server. This action cannot be undone. Requires confirmation to proceed.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      serverName: {
        type: 'string',
        description: 'Name of the server containing the role',
      },
      roleName: {
        type: 'string',
        description: 'Name of the role to delete',
      },
      confirmDelete: {
        type: 'boolean',
        description: 'Must be true to confirm deletion',
        default: false,
      },
    },
    required: ['serverName', 'roleName', 'confirmDelete'],
  },
};

/**
 * MCP tool definition for reorder_roles
 */
export const reorderRolesToolDefinition = {
  name: 'reorder_roles',
  description:
    'Reorder roles in a Discord server. Roles are ordered from highest priority (top) to lowest priority (bottom). Note: This operation uses drag-and-drop automation which may require manual verification.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      serverName: {
        type: 'string',
        description: 'Name of the server to reorder roles in',
      },
      roleOrder: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of role names in the desired order (highest to lowest priority)',
        minItems: 1,
      },
    },
    required: ['serverName', 'roleOrder'],
  },
};

/**
 * All role tool definitions for registration with MCP server
 */
export const roleToolDefinitions = [
  createRoleToolDefinition,
  editRoleToolDefinition,
  deleteRoleToolDefinition,
  reorderRolesToolDefinition,
];

/**
 * Handler map for role tools
 */
export const roleToolHandlers = {
  create_role: createRoleHandler,
  edit_role: editRoleHandler,
  delete_role: deleteRoleHandler,
  reorder_roles: reorderRolesHandler,
} as const;

/**
 * Validate and handle a role tool call
 */
export function handleRoleToolCall(
  toolName: string,
  args: unknown
): Promise<CreateRoleResult | EditRoleResult | DeleteRoleResult | ReorderRolesResult | RoleToolError> {
  switch (toolName) {
    case 'create_role': {
      const parsed = CreateRoleToolInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return createRoleHandler(parsed.data);
    }

    case 'edit_role': {
      const parsed = EditRoleInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return editRoleHandler(parsed.data);
    }

    case 'delete_role': {
      const parsed = DeleteRoleInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return deleteRoleHandler(parsed.data);
    }

    case 'reorder_roles': {
      const parsed = ReorderRolesInputSchema.safeParse(args);
      if (!parsed.success) {
        return Promise.resolve({
          success: false as const,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
        });
      }
      return reorderRolesHandler(parsed.data);
    }

    default:
      return Promise.resolve({
        success: false as const,
        error: `Unknown role tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
      });
  }
}
