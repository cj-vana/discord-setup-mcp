/**
 * Template Executor for Discord Server Setup MCP
 *
 * Orchestrates the sequential execution of template creation:
 * 1. Create server
 * 2. Create roles
 * 3. Create categories
 * 4. Create channels within categories
 *
 * Provides progress reporting, error handling, and retry logic.
 */

import { z } from 'zod';
import {
  getTemplatePreview,
  getRawTemplate,
  hasTemplate,
  getTemplateIds,
  type TemplatePreview,
  type ServerTemplate,
  type TemplateRole,
  type TemplateCategory,
  type TemplateChannel,
} from '../templates/index.js';
import { createServerHandler, type CreateServerResult } from './server.js';
import { createRoleHandler, type CreateRoleResult } from './roles.js';
import {
  createCategoryHandler,
  createChannelHandler,
  type CreateCategoryResult,
  type CreateChannelResult,
} from './channels.js';
import {
  TemplateCustomizationSchema,
  type TemplateCustomization,
} from '../utils/validation.js';
import {
  DiscordMCPError,
  TemplateError,
  wrapError,
  TimeoutError,
} from '../utils/errors.js';
import {
  delay,
  STANDARD_ACTION_DELAY,
  LONG_ACTION_DELAY,
  SERVER_CREATION_DELAY,
  retry,
  type RetryOptions,
} from '../automation/waiter.js';

// ============================================
// Progress Tracking Types
// ============================================

/**
 * Current execution phase
 */
export type ExecutionPhase =
  | 'initializing'
  | 'creating_server'
  | 'creating_roles'
  | 'creating_categories'
  | 'creating_channels'
  | 'completed'
  | 'failed';

/**
 * Individual step result
 */
export interface StepResult {
  /** Step name/identifier */
  name: string;
  /** Whether the step succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of retry attempts made */
  retryAttempts: number;
  /** Time taken in milliseconds */
  durationMs: number;
}

/**
 * Progress update during execution
 */
export interface ExecutionProgress {
  /** Current phase */
  phase: ExecutionPhase;
  /** Current step within the phase (e.g., "Role 2 of 5") */
  currentStep: string;
  /** Total steps in current phase */
  totalSteps: number;
  /** Completed steps in current phase */
  completedSteps: number;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Time elapsed in milliseconds */
  elapsedMs: number;
  /** Estimated time remaining in milliseconds (if calculable) */
  estimatedRemainingMs?: number;
  /** Most recent step result */
  lastStepResult?: StepResult;
}

/**
 * Callback for progress updates
 */
export type ProgressCallback = (progress: ExecutionProgress) => void;

/**
 * Final execution result
 */
export interface ExecuteTemplateResult {
  success: true;
  message: string;
  serverName: string;
  templateId: string;
  /** Summary of what was created */
  summary: {
    rolesCreated: string[];
    rolesFailed: string[];
    categoriesCreated: string[];
    categoriesFailed: string[];
    channelsCreated: string[];
    channelsFailed: string[];
  };
  /** Total execution time in milliseconds */
  totalDurationMs: number;
  /** Detailed step results */
  stepResults: StepResult[];
}

/**
 * Error result from execution
 */
export interface ExecuteTemplateError {
  success: false;
  error: string;
  code: string;
  /** Phase where failure occurred */
  failedPhase: ExecutionPhase;
  /** Partial results before failure */
  partialResults?: {
    rolesCreated: string[];
    categoriesCreated: string[];
    channelsCreated: string[];
  };
  /** Step results up to failure */
  stepResults: StepResult[];
  /** Suggestion for recovery */
  suggestion?: string;
}

// ============================================
// Input Schema
// ============================================

/**
 * Schema for execute_template tool
 */
export const ExecuteTemplateInputSchema = z.object({
  templateId: z
    .enum(['gaming', 'community', 'business', 'study_group'])
    .describe('The ID of the template to execute'),
  serverName: z
    .string()
    .min(2, 'Server name must be at least 2 characters')
    .max(100, 'Server name must be 100 characters or less')
    .describe('Name for the new Discord server'),
  customization: TemplateCustomizationSchema.optional().describe(
    'Optional customization options for the template'
  ),
  retryOptions: z
    .object({
      maxAttempts: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .default(3)
        .describe('Maximum retry attempts per step'),
      retryDelayMs: z
        .number()
        .int()
        .min(100)
        .max(5000)
        .optional()
        .default(1000)
        .describe('Delay between retries in milliseconds'),
      useExponentialBackoff: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to use exponential backoff for retries'),
    })
    .optional()
    .describe('Options for retry behavior'),
  stopOnFirstError: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to stop execution on the first error or continue with remaining items'),
});

export type ExecuteTemplateInput = z.infer<typeof ExecuteTemplateInputSchema>;

// ============================================
// Template Executor Class
// ============================================

/**
 * Orchestrates template execution with progress tracking and error recovery
 */
export class TemplateExecutor {
  private serverName: string;
  private templateId: string;
  private template: ServerTemplate;
  private preview: TemplatePreview;
  private customization?: TemplateCustomization;
  private retryOptions: RetryOptions;
  private stopOnFirstError: boolean;
  private progressCallback?: ProgressCallback;

  // Progress tracking
  private phase: ExecutionPhase = 'initializing';
  private startTime: number = 0;
  private stepResults: StepResult[] = [];

  // Results tracking
  private rolesCreated: string[] = [];
  private rolesFailed: string[] = [];
  private categoriesCreated: string[] = [];
  private categoriesFailed: string[] = [];
  private channelsCreated: string[] = [];
  private channelsFailed: string[] = [];

  constructor(
    serverName: string,
    templateId: string,
    template: ServerTemplate,
    preview: TemplatePreview,
    customization?: TemplateCustomization,
    retryOptions?: RetryOptions,
    stopOnFirstError: boolean = false,
    progressCallback?: ProgressCallback
  ) {
    this.serverName = serverName;
    this.templateId = templateId;
    this.template = template;
    this.preview = preview;
    this.customization = customization;
    this.retryOptions = retryOptions ?? {
      maxAttempts: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
    };
    this.stopOnFirstError = stopOnFirstError;
    this.progressCallback = progressCallback;
  }

  /**
   * Execute the template creation
   */
  async execute(): Promise<ExecuteTemplateResult | ExecuteTemplateError> {
    this.startTime = Date.now();
    this.phase = 'initializing';

    try {
      // Calculate total steps for progress tracking
      const skipRoles = new Set(this.customization?.skipRoles ?? []);
      const skipChannels = new Set(this.customization?.skipChannels ?? []);

      const rolesToCreate = this.preview.roles.filter((r) => !skipRoles.has(r.name));
      const categoriesToCreate = this.preview.categories;
      const channelsToCreate = this.preview.categories.flatMap((cat) =>
        cat.channels.filter((ch) => !skipChannels.has(ch.name))
      );

      const totalSteps =
        1 + // server creation
        rolesToCreate.length +
        categoriesToCreate.length +
        channelsToCreate.length;

      let completedSteps = 0;

      // Phase 1: Create Server
      this.phase = 'creating_server';
      this.reportProgress({
        phase: this.phase,
        currentStep: 'Creating server',
        totalSteps,
        completedSteps,
        overallProgress: 0,
        elapsedMs: this.getElapsedMs(),
      });

      const serverResult = await this.createServerWithRetry();
      completedSteps++;

      if (!serverResult.success) {
        return this.buildErrorResult(
          serverResult.error || 'Failed to create server',
          'SERVER_CREATION_FAILED',
          'creating_server'
        );
      }

      this.stepResults.push({
        name: `Server: ${this.serverName}`,
        success: true,
        retryAttempts: 0,
        durationMs: this.getElapsedMs(),
      });

      // Wait after server creation for Discord to fully load
      await delay(SERVER_CREATION_DELAY);

      // Phase 2: Create Roles
      this.phase = 'creating_roles';
      for (let i = 0; i < rolesToCreate.length; i++) {
        const role = rolesToCreate[i];
        this.reportProgress({
          phase: this.phase,
          currentStep: `Creating role: ${role.name}`,
          totalSteps,
          completedSteps,
          overallProgress: Math.round((completedSteps / totalSteps) * 100),
          elapsedMs: this.getElapsedMs(),
        });

        const stepStart = Date.now();
        const result = await this.createRoleWithRetry(role);

        const stepResult: StepResult = {
          name: `Role: ${role.name}`,
          success: result.success,
          error: result.success ? undefined : (result as { error?: string }).error,
          retryAttempts: 0,
          durationMs: Date.now() - stepStart,
        };

        this.stepResults.push(stepResult);

        if (result.success) {
          this.rolesCreated.push(role.name);
        } else {
          this.rolesFailed.push(role.name);
          if (this.stopOnFirstError) {
            return this.buildErrorResult(
              `Failed to create role: ${role.name}`,
              'ROLE_CREATION_FAILED',
              'creating_roles'
            );
          }
        }

        completedSteps++;
        await delay(STANDARD_ACTION_DELAY);
      }

      // Phase 3: Create Categories and Channels
      this.phase = 'creating_categories';
      for (const category of categoriesToCreate) {
        this.reportProgress({
          phase: this.phase,
          currentStep: `Creating category: ${category.name}`,
          totalSteps,
          completedSteps,
          overallProgress: Math.round((completedSteps / totalSteps) * 100),
          elapsedMs: this.getElapsedMs(),
        });

        const stepStart = Date.now();
        const catResult = await this.createCategoryWithRetry(category.name);

        const catStepResult: StepResult = {
          name: `Category: ${category.name}`,
          success: catResult.success,
          error: catResult.success ? undefined : (catResult as { error?: string }).error,
          retryAttempts: 0,
          durationMs: Date.now() - stepStart,
        };

        this.stepResults.push(catStepResult);

        if (catResult.success) {
          this.categoriesCreated.push(category.name);
        } else {
          this.categoriesFailed.push(category.name);
          if (this.stopOnFirstError) {
            return this.buildErrorResult(
              `Failed to create category: ${category.name}`,
              'CATEGORY_CREATION_FAILED',
              'creating_categories'
            );
          }
        }

        completedSteps++;
        await delay(STANDARD_ACTION_DELAY);

        // Phase 4: Create Channels in this category
        this.phase = 'creating_channels';
        const categoryChannels = category.channels.filter(
          (ch) => !skipChannels.has(ch.name)
        );

        for (const channel of categoryChannels) {
          this.reportProgress({
            phase: this.phase,
            currentStep: `Creating channel: ${channel.name} in ${category.name}`,
            totalSteps,
            completedSteps,
            overallProgress: Math.round((completedSteps / totalSteps) * 100),
            elapsedMs: this.getElapsedMs(),
          });

          const chStepStart = Date.now();
          const chResult = await this.createChannelWithRetry(channel, category.name);

          const chStepResult: StepResult = {
            name: `Channel: ${channel.name}`,
            success: chResult.success,
            error: chResult.success ? undefined : (chResult as { error?: string }).error,
            retryAttempts: 0,
            durationMs: Date.now() - chStepStart,
          };

          this.stepResults.push(chStepResult);

          if (chResult.success) {
            this.channelsCreated.push(channel.name);
          } else {
            this.channelsFailed.push(channel.name);
            if (this.stopOnFirstError) {
              return this.buildErrorResult(
                `Failed to create channel: ${channel.name}`,
                'CHANNEL_CREATION_FAILED',
                'creating_channels'
              );
            }
          }

          completedSteps++;
          await delay(STANDARD_ACTION_DELAY);
        }
      }

      // Completed
      this.phase = 'completed';
      const totalDurationMs = this.getElapsedMs();

      this.reportProgress({
        phase: this.phase,
        currentStep: 'Completed',
        totalSteps,
        completedSteps,
        overallProgress: 100,
        elapsedMs: totalDurationMs,
      });

      return {
        success: true,
        message: `Successfully applied template '${this.preview.name}' to server '${this.serverName}'`,
        serverName: this.serverName,
        templateId: this.templateId,
        summary: {
          rolesCreated: this.rolesCreated,
          rolesFailed: this.rolesFailed,
          categoriesCreated: this.categoriesCreated,
          categoriesFailed: this.categoriesFailed,
          channelsCreated: this.channelsCreated,
          channelsFailed: this.channelsFailed,
        },
        totalDurationMs,
        stepResults: this.stepResults,
      };
    } catch (error) {
      this.phase = 'failed';
      const wrappedError = wrapError(error, 'Template execution failed');
      return this.buildErrorResult(
        wrappedError.message,
        wrappedError.code,
        this.phase
      );
    }
  }

  /**
   * Create server with retry logic
   */
  private async createServerWithRetry(): Promise<
    CreateServerResult | { success: false; error: string }
  > {
    try {
      const result = await retry(
        async () => {
          const res = await createServerHandler({
            name: this.serverName,
            templateChoice: 'custom', // We'll add custom structure ourselves
          });

          if (!res.success) {
            throw new Error((res as { error?: string }).error || 'Server creation failed');
          }

          return res;
        },
        this.retryOptions
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Server creation failed',
      };
    }
  }

  /**
   * Create role with retry logic
   */
  private async createRoleWithRetry(
    role: TemplatePreview['roles'][0]
  ): Promise<CreateRoleResult | { success: false; error: string }> {
    // Apply color overrides if specified
    let roleColor = role.color;
    if (this.customization?.roleColorOverrides?.[role.name]) {
      const override = this.customization.roleColorOverrides[role.name];
      roleColor = typeof override === 'string' ? override : `#${override.toString(16).padStart(6, '0')}`;
    }

    try {
      const result = await retry(
        async () => {
          const res = await createRoleHandler({
            serverName: this.serverName,
            role: {
              name: role.name,
              color: roleColor,
              hoist: role.hoist,
              mentionable: role.mentionable,
              permissions: [], // Default to empty permissions - template roles don't specify permissions in this format
            },
          });

          if (!res.success) {
            throw new Error((res as { error?: string }).error || 'Role creation failed');
          }

          return res;
        },
        this.retryOptions
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Role creation failed',
      };
    }
  }

  /**
   * Create category with retry logic
   */
  private async createCategoryWithRetry(
    categoryName: string
  ): Promise<CreateCategoryResult | { success: false; error: string }> {
    try {
      const result = await retry(
        async () => {
          // CreateCategoryToolInput expects: name, serverName (optional), permissionOverwrites (from base schema)
          const res = await createCategoryHandler({
            name: categoryName,
            serverName: this.serverName,
            permissionOverwrites: [], // Default to no permission overwrites
          });

          if (!res.success) {
            throw new Error((res as { error?: string }).error || 'Category creation failed');
          }

          return res;
        },
        this.retryOptions
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Category creation failed',
      };
    }
  }

  /**
   * Create channel with retry logic
   */
  private async createChannelWithRetry(
    channel: TemplatePreview['categories'][0]['channels'][0],
    categoryName: string
  ): Promise<CreateChannelResult | { success: false; error: string }> {
    try {
      const result = await retry(
        async () => {
          // CreateChannelToolInput expects: name, type, categoryName, topic, slowmode, nsfw, bitrate, userLimit, serverName
          const res = await createChannelHandler({
            name: channel.name,
            type: channel.type as 'text' | 'voice' | 'announcement' | 'stage' | 'forum',
            categoryName,
            topic: channel.topic,
            slowmode: 0, // Default slowmode
            nsfw: false, // Default NSFW setting
            serverName: this.serverName,
          });

          if (!res.success) {
            throw new Error((res as { error?: string }).error || 'Channel creation failed');
          }

          return res;
        },
        this.retryOptions
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Channel creation failed',
      };
    }
  }

  /**
   * Report progress to callback
   */
  private reportProgress(progress: ExecutionProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Get elapsed time since start
   */
  private getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Build error result object
   */
  private buildErrorResult(
    error: string,
    code: string,
    failedPhase: ExecutionPhase
  ): ExecuteTemplateError {
    return {
      success: false,
      error,
      code,
      failedPhase,
      partialResults: {
        rolesCreated: this.rolesCreated,
        categoriesCreated: this.categoriesCreated,
        channelsCreated: this.channelsCreated,
      },
      stepResults: this.stepResults,
      suggestion: this.getSuggestionForPhase(failedPhase),
    };
  }

  /**
   * Get recovery suggestion based on failed phase
   */
  private getSuggestionForPhase(phase: ExecutionPhase): string {
    switch (phase) {
      case 'creating_server':
        return 'Ensure Discord is running and visible. Check that the Add Server button is accessible.';
      case 'creating_roles':
        return 'Server was created but role creation failed. You can manually add roles or retry with the same template.';
      case 'creating_categories':
        return 'Roles were created but category creation failed. Try navigating to the server and using the create_category tool directly.';
      case 'creating_channels':
        return 'Categories were created but channel creation failed. Try using the create_channel tool directly for remaining channels.';
      default:
        return 'Ensure Discord is running, visible, and accessibility permissions are granted.';
    }
  }
}

// ============================================
// Tool Handler
// ============================================

/**
 * Execute a template to create a new Discord server with all configured
 * roles, categories, and channels.
 *
 * This is the main entry point for template execution. Unlike apply_template
 * which only previews what would be created, this tool actually performs
 * the automation to create everything in Discord.
 */
export async function executeTemplateHandler(
  input: ExecuteTemplateInput,
  progressCallback?: ProgressCallback
): Promise<ExecuteTemplateResult | ExecuteTemplateError> {
  const {
    templateId,
    serverName,
    customization,
    retryOptions,
    stopOnFirstError = false,
  } = input;

  // Validate template exists
  if (!hasTemplate(templateId)) {
    return {
      success: false,
      error: `Template '${templateId}' not found`,
      code: 'TEMPLATE_NOT_FOUND',
      failedPhase: 'initializing',
      stepResults: [],
      suggestion: `Available templates: ${getTemplateIds().join(', ')}`,
    };
  }

  // Get template data
  const preview = getTemplatePreview(templateId);
  const rawTemplate = getRawTemplate(templateId) as ServerTemplate;

  if (!preview || !rawTemplate) {
    return {
      success: false,
      error: `Failed to load template '${templateId}'`,
      code: 'TEMPLATE_LOAD_FAILED',
      failedPhase: 'initializing',
      stepResults: [],
    };
  }

  // Create executor with configured options
  const executor = new TemplateExecutor(
    serverName,
    templateId,
    rawTemplate,
    preview,
    customization,
    retryOptions
      ? {
          maxAttempts: retryOptions.maxAttempts ?? 3,
          retryDelay: retryOptions.retryDelayMs ?? 1000,
          exponentialBackoff: retryOptions.useExponentialBackoff ?? true,
        }
      : undefined,
    stopOnFirstError,
    progressCallback
  );

  // Execute the template
  return executor.execute();
}

// ============================================
// MCP Tool Definition
// ============================================

/**
 * MCP tool definition for execute_template
 */
export const executeTemplateToolDefinition = {
  name: 'execute_template',
  description:
    'Execute a pre-built template to create a new Discord server with all configured roles, categories, and channels. This performs the actual automation to create everything in Discord, unlike apply_template which only previews. Progress is reported during execution.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      templateId: {
        type: 'string',
        enum: ['gaming', 'community', 'business', 'study_group'],
        description: 'The ID of the template to execute',
      },
      serverName: {
        type: 'string',
        description: 'Name for the new Discord server (2-100 characters)',
        minLength: 2,
        maxLength: 100,
      },
      customization: {
        type: 'object',
        description: 'Optional customization options',
        properties: {
          skipChannels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Channel names to skip when creating',
          },
          skipRoles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Role names to skip when creating',
          },
          roleColorOverrides: {
            type: 'object',
            description: 'Override colors for specific roles (role name -> hex color)',
            additionalProperties: { type: 'string' },
          },
        },
      },
      retryOptions: {
        type: 'object',
        description: 'Options for retry behavior',
        properties: {
          maxAttempts: {
            type: 'number',
            description: 'Maximum retry attempts per step (1-5)',
            minimum: 1,
            maximum: 5,
            default: 3,
          },
          retryDelayMs: {
            type: 'number',
            description: 'Delay between retries in milliseconds',
            minimum: 100,
            maximum: 5000,
            default: 1000,
          },
          useExponentialBackoff: {
            type: 'boolean',
            description: 'Whether to use exponential backoff for retries',
            default: true,
          },
        },
      },
      stopOnFirstError: {
        type: 'boolean',
        description:
          'Whether to stop execution on the first error or continue with remaining items',
        default: false,
      },
    },
    required: ['templateId', 'serverName'],
  },
};

/**
 * All template executor tool definitions
 */
export const templateExecutorToolDefinitions = [executeTemplateToolDefinition];

/**
 * Handler map for template executor tools
 */
export const templateExecutorToolHandlers = {
  execute_template: executeTemplateHandler,
} as const;

/**
 * Validate and handle a template executor tool call
 */
export async function handleTemplateExecutorToolCall(
  toolName: string,
  args: unknown
): Promise<ExecuteTemplateResult | ExecuteTemplateError> {
  switch (toolName) {
    case 'execute_template': {
      const parsed = ExecuteTemplateInputSchema.safeParse(args);
      if (!parsed.success) {
        return {
          success: false,
          error: `Invalid input: ${parsed.error.message}`,
          code: 'INVALID_INPUT',
          failedPhase: 'initializing',
          stepResults: [],
          suggestion: `Available templates: ${getTemplateIds().join(', ')}`,
        };
      }
      return executeTemplateHandler(parsed.data);
    }

    default:
      return {
        success: false,
        error: `Unknown template executor tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
        failedPhase: 'initializing',
        stepResults: [],
      };
  }
}
