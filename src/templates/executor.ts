/**
 * Template Execution Orchestrator
 *
 * This module handles the actual execution of Discord server templates by
 * coordinating the creation of servers, roles, categories, and channels
 * in the proper sequence with appropriate delays and error handling.
 */

import {
  ServerTemplate,
  TemplateRole,
  TemplateCategory,
  TemplateChannel,
  ChannelType,
} from './types.js';
import { getTemplatePreview, getRawTemplate, hasTemplate } from './index.js';
import {
  createServerHandler,
  type CreateServerResult,
  type ServerToolError,
} from '../tools/server.js';
import {
  createCategoryHandler,
  createChannelHandler,
  CreateCategoryToolInputSchema,
  CreateChannelToolInputSchema,
  type CreateCategoryResult,
  type CreateChannelResult,
  type ChannelToolError,
} from '../tools/channels.js';
import {
  createRoleHandler,
  CreateRoleToolInputSchema,
  type CreateRoleResult,
  type RoleToolError,
} from '../tools/roles.js';
import { delay } from '../automation/waiter.js';
import {
  DiscordMCPError,
  TemplateError,
  wrapError,
} from '../utils/errors.js';
import type { TemplateCustomization } from '../utils/validation.js';

// ============================================
// Configuration Constants
// ============================================

/** Delay between creating individual roles (ms) */
const ROLE_CREATION_DELAY = 800;

/** Delay between creating categories (ms) */
const CATEGORY_CREATION_DELAY = 1000;

/** Delay between creating channels (ms) */
const CHANNEL_CREATION_DELAY = 600;

/** Delay after server creation before creating roles (ms) */
const POST_SERVER_CREATION_DELAY = 3000;

/** Maximum retry attempts for failed operations */
const MAX_RETRIES = 3;

/** Delay between retry attempts (ms) */
const RETRY_DELAY = 1000;

// ============================================
// Types
// ============================================

/**
 * Status of an individual operation
 */
export type OperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

/**
 * Result of a single operation
 */
export interface OperationResult {
  /** Type of operation performed */
  type: 'server' | 'role' | 'category' | 'channel';
  /** Name of the item created */
  name: string;
  /** Status of the operation */
  status: OperationStatus;
  /** Error message if failed */
  error?: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Number of retry attempts */
  retryCount?: number;
}

/**
 * Progress tracking for template execution
 */
export interface ExecutionProgress {
  /** Current phase of execution */
  phase: 'initializing' | 'server' | 'roles' | 'categories' | 'channels' | 'completed' | 'failed';
  /** Total operations to perform */
  totalOperations: number;
  /** Completed operations count */
  completedOperations: number;
  /** Failed operations count */
  failedOperations: number;
  /** Skipped operations count */
  skippedOperations: number;
  /** Current operation being performed */
  currentOperation?: string;
  /** All operation results */
  operations: OperationResult[];
  /** Start time */
  startTime: Date;
  /** End time (set when complete) */
  endTime?: Date;
}

/**
 * Options for template execution
 */
export interface ExecutionOptions {
  /** Customization options for the template */
  customization?: TemplateCustomization;
  /** Whether to skip server creation (use current server) */
  skipServerCreation?: boolean;
  /** Whether to continue on errors or stop */
  continueOnError?: boolean;
  /** Progress callback */
  onProgress?: (progress: ExecutionProgress) => void;
  /** Dry run mode - log actions without executing */
  dryRun?: boolean;
}

/**
 * Result of template execution
 */
export interface ExecutionResult {
  /** Whether execution was successful overall */
  success: boolean;
  /** Server name */
  serverName: string;
  /** Template ID used */
  templateId: string;
  /** Final progress state */
  progress: ExecutionProgress;
  /** Summary message */
  message: string;
  /** Detailed operation results */
  operations: OperationResult[];
  /** Total execution time in ms */
  executionTimeMs: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Execute an operation with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  isSuccess: (result: T) => boolean,
  maxRetries: number = MAX_RETRIES,
  retryDelay: number = RETRY_DELAY
): Promise<{ result: T; retryCount: number }> {
  let lastResult: T;
  let retryCount = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    lastResult = await operation();

    if (isSuccess(lastResult)) {
      return { result: lastResult, retryCount };
    }

    retryCount++;
    if (attempt < maxRetries - 1) {
      await delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
    }
  }

  return { result: lastResult!, retryCount };
}

/**
 * Convert template channel type to tool channel type
 */
function mapChannelType(type: ChannelType): 'text' | 'voice' | 'announcement' | 'stage' | 'forum' {
  switch (type) {
    case ChannelType.Text:
      return 'text';
    case ChannelType.Voice:
      return 'voice';
    case ChannelType.Announcement:
      return 'announcement';
    case ChannelType.Stage:
      return 'stage';
    case ChannelType.Forum:
      return 'forum';
    default:
      return 'text';
  }
}

// ============================================
// Template Executor Class
// ============================================

/**
 * Orchestrates the execution of a Discord server template
 */
export class TemplateExecutor {
  private templateId: string;
  private serverName: string;
  private options: ExecutionOptions;
  private progress: ExecutionProgress;
  private template: ServerTemplate | null = null;

  constructor(
    templateId: string,
    serverName: string,
    options: ExecutionOptions = {}
  ) {
    this.templateId = templateId;
    this.serverName = serverName;
    this.options = {
      continueOnError: true,
      skipServerCreation: false,
      dryRun: false,
      ...options,
    };
    this.progress = {
      phase: 'initializing',
      totalOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      skippedOperations: 0,
      operations: [],
      startTime: new Date(),
    };
  }

  /**
   * Load and validate the template
   */
  private loadTemplate(): void {
    if (!hasTemplate(this.templateId)) {
      throw new TemplateError(this.templateId, `Template '${this.templateId}' not found`);
    }

    const rawTemplate = getRawTemplate(this.templateId);
    if (!rawTemplate) {
      throw new TemplateError(this.templateId, `Failed to load template '${this.templateId}'`);
    }

    this.template = rawTemplate as ServerTemplate;
  }

  /**
   * Calculate total operations
   */
  private calculateTotalOperations(): number {
    if (!this.template) return 0;

    const skipRoles = new Set(this.options.customization?.skipRoles ?? []);
    const skipChannels = new Set(this.options.customization?.skipChannels ?? []);

    let total = 0;

    // Server creation (if not skipped)
    if (!this.options.skipServerCreation) {
      total += 1;
    }

    // Roles
    total += this.template.roles.filter(r => !skipRoles.has(r.name)).length;

    // Additional roles from customization
    if (this.options.customization?.additionalRoles) {
      total += this.options.customization.additionalRoles.length;
    }

    // Categories
    total += this.template.categories.length;

    // Channels
    for (const category of this.template.categories) {
      total += category.channels.filter(ch => !skipChannels.has(ch.name)).length;
    }

    return total;
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(update: Partial<ExecutionProgress>): void {
    Object.assign(this.progress, update);
    if (this.options.onProgress) {
      this.options.onProgress({ ...this.progress });
    }
  }

  /**
   * Record an operation result
   */
  private recordOperation(result: OperationResult): void {
    this.progress.operations.push(result);

    switch (result.status) {
      case 'completed':
        this.progress.completedOperations++;
        break;
      case 'failed':
        this.progress.failedOperations++;
        break;
      case 'skipped':
        this.progress.skippedOperations++;
        break;
    }

    this.updateProgress({});
  }

  /**
   * Create the Discord server
   */
  private async createServer(): Promise<boolean> {
    if (this.options.skipServerCreation) {
      this.recordOperation({
        type: 'server',
        name: this.serverName,
        status: 'skipped',
        details: { reason: 'skipServerCreation option enabled' },
      });
      return true;
    }

    this.updateProgress({
      phase: 'server',
      currentOperation: `Creating server: ${this.serverName}`,
    });

    if (this.options.dryRun) {
      this.recordOperation({
        type: 'server',
        name: this.serverName,
        status: 'completed',
        details: { dryRun: true },
      });
      return true;
    }

    const { result, retryCount } = await executeWithRetry(
      () => createServerHandler({ name: this.serverName, templateChoice: 'custom' }),
      (r): r is CreateServerResult => r.success === true
    );

    if (result.success) {
      this.recordOperation({
        type: 'server',
        name: this.serverName,
        status: 'completed',
        retryCount,
      });
      await delay(POST_SERVER_CREATION_DELAY);
      return true;
    } else {
      const errorResult = result as ServerToolError;
      this.recordOperation({
        type: 'server',
        name: this.serverName,
        status: 'failed',
        error: errorResult.error,
        retryCount,
      });
      return false;
    }
  }

  /**
   * Create all roles from the template
   */
  private async createRoles(): Promise<boolean> {
    if (!this.template) return false;

    this.updateProgress({ phase: 'roles' });

    const skipRoles = new Set(this.options.customization?.skipRoles ?? []);
    const colorOverrides = this.options.customization?.roleColorOverrides ?? {};

    let allSuccess = true;

    // Create template roles (in order of hierarchy - highest first)
    const sortedRoles = [...this.template.roles].sort((a, b) => b.position - a.position);

    for (const role of sortedRoles) {
      if (skipRoles.has(role.name)) {
        this.recordOperation({
          type: 'role',
          name: role.name,
          status: 'skipped',
          details: { reason: 'In skipRoles list' },
        });
        continue;
      }

      this.updateProgress({
        currentOperation: `Creating role: ${role.name}`,
      });

      const roleColor = colorOverrides[role.name] || role.color;

      if (this.options.dryRun) {
        this.recordOperation({
          type: 'role',
          name: role.name,
          status: 'completed',
          details: { color: roleColor, dryRun: true },
        });
        continue;
      }

      const roleInput = CreateRoleToolInputSchema.parse({
        serverName: this.serverName,
        role: {
          name: role.name,
          color: roleColor,
          hoist: role.hoist,
          mentionable: role.mentionable,
          permissions: role.permissions as string[],
        },
      });

      const { result, retryCount } = await executeWithRetry(
        () => createRoleHandler(roleInput),
        (r): r is CreateRoleResult => r.success === true
      );

      if (result.success) {
        this.recordOperation({
          type: 'role',
          name: role.name,
          status: 'completed',
          retryCount,
          details: { color: roleColor },
        });
      } else {
        const errorResult = result as RoleToolError;
        this.recordOperation({
          type: 'role',
          name: role.name,
          status: 'failed',
          error: errorResult.error,
          retryCount,
        });
        allSuccess = false;

        if (!this.options.continueOnError) {
          return false;
        }
      }

      await delay(ROLE_CREATION_DELAY);
    }

    // Create additional roles from customization
    if (this.options.customization?.additionalRoles) {
      for (const role of this.options.customization.additionalRoles) {
        this.updateProgress({
          currentOperation: `Creating additional role: ${role.name}`,
        });

        if (this.options.dryRun) {
          this.recordOperation({
            type: 'role',
            name: role.name,
            status: 'completed',
            details: { additional: true, dryRun: true },
          });
          continue;
        }

        const additionalRoleInput = CreateRoleToolInputSchema.parse({
          serverName: this.serverName,
          role: {
            name: role.name,
            color: role.color,
            hoist: role.hoist ?? false,
            mentionable: role.mentionable ?? false,
            permissions: (role.permissions ?? []) as string[],
          },
        });

        const { result, retryCount } = await executeWithRetry(
          () => createRoleHandler(additionalRoleInput),
          (r): r is CreateRoleResult => r.success === true
        );

        if (result.success) {
          this.recordOperation({
            type: 'role',
            name: role.name,
            status: 'completed',
            retryCount,
            details: { additional: true },
          });
        } else {
          const errorResult = result as RoleToolError;
          this.recordOperation({
            type: 'role',
            name: role.name,
            status: 'failed',
            error: errorResult.error,
            retryCount,
            details: { additional: true },
          });
          allSuccess = false;

          if (!this.options.continueOnError) {
            return false;
          }
        }

        await delay(ROLE_CREATION_DELAY);
      }
    }

    return allSuccess;
  }

  /**
   * Create all categories and channels from the template
   */
  private async createCategoriesAndChannels(): Promise<boolean> {
    if (!this.template) return false;

    this.updateProgress({ phase: 'categories' });

    const skipChannels = new Set(this.options.customization?.skipChannels ?? []);
    let allSuccess = true;

    for (const category of this.template.categories) {
      // Create category
      this.updateProgress({
        currentOperation: `Creating category: ${category.name}`,
      });

      if (this.options.dryRun) {
        this.recordOperation({
          type: 'category',
          name: category.name,
          status: 'completed',
          details: { dryRun: true },
        });
      } else {
        const categoryInput = CreateCategoryToolInputSchema.parse({ name: category.name });
        const { result: categoryResult, retryCount: categoryRetryCount } = await executeWithRetry(
          () => createCategoryHandler(categoryInput),
          (r): r is CreateCategoryResult => r.success === true
        );

        if (categoryResult.success) {
          this.recordOperation({
            type: 'category',
            name: category.name,
            status: 'completed',
            retryCount: categoryRetryCount,
          });
        } else {
          const errorResult = categoryResult as ChannelToolError;
          this.recordOperation({
            type: 'category',
            name: category.name,
            status: 'failed',
            error: errorResult.error,
            retryCount: categoryRetryCount,
          });
          allSuccess = false;

          if (!this.options.continueOnError) {
            return false;
          }
        }

        await delay(CATEGORY_CREATION_DELAY);
      }

      // Create channels within category
      this.updateProgress({ phase: 'channels' });

      for (const channel of category.channels) {
        if (skipChannels.has(channel.name)) {
          this.recordOperation({
            type: 'channel',
            name: channel.name,
            status: 'skipped',
            details: { category: category.name, reason: 'In skipChannels list' },
          });
          continue;
        }

        this.updateProgress({
          currentOperation: `Creating channel: ${channel.name} in ${category.name}`,
        });

        if (this.options.dryRun) {
          this.recordOperation({
            type: 'channel',
            name: channel.name,
            status: 'completed',
            details: {
              category: category.name,
              type: channel.type,
              dryRun: true,
            },
          });
          continue;
        }

        const channelInput = CreateChannelToolInputSchema.parse({
          name: channel.name,
          type: mapChannelType(channel.type),
          categoryName: category.name,
          topic: channel.topic,
          slowmode: channel.slowmode ?? 0,
          nsfw: channel.nsfw ?? false,
        });

        const { result: channelResult, retryCount: channelRetryCount } = await executeWithRetry(
          () => createChannelHandler(channelInput),
          (r): r is CreateChannelResult => r.success === true
        );

        if (channelResult.success) {
          this.recordOperation({
            type: 'channel',
            name: channel.name,
            status: 'completed',
            retryCount: channelRetryCount,
            details: {
              category: category.name,
              type: channel.type,
            },
          });
        } else {
          const errorResult = channelResult as ChannelToolError;
          this.recordOperation({
            type: 'channel',
            name: channel.name,
            status: 'failed',
            error: errorResult.error,
            retryCount: channelRetryCount,
            details: { category: category.name },
          });
          allSuccess = false;

          if (!this.options.continueOnError) {
            return false;
          }
        }

        await delay(CHANNEL_CREATION_DELAY);
      }
    }

    return allSuccess;
  }

  /**
   * Execute the template setup
   */
  async execute(): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Load and validate template
      this.loadTemplate();

      // Calculate total operations
      this.progress.totalOperations = this.calculateTotalOperations();
      this.updateProgress({});

      // Phase 1: Create server
      const serverSuccess = await this.createServer();
      if (!serverSuccess && !this.options.continueOnError) {
        throw new DiscordMCPError(
          'Failed to create server',
          'SERVER_CREATION_FAILED',
          false
        );
      }

      // Phase 2: Create roles
      const rolesSuccess = await this.createRoles();
      if (!rolesSuccess && !this.options.continueOnError) {
        throw new DiscordMCPError(
          'Failed to create roles',
          'ROLE_CREATION_FAILED',
          false
        );
      }

      // Phase 3: Create categories and channels
      const channelsSuccess = await this.createCategoriesAndChannels();

      // Complete
      const endTime = new Date();
      this.updateProgress({
        phase: 'completed',
        endTime,
        currentOperation: undefined,
      });

      const allSuccess = serverSuccess && rolesSuccess && channelsSuccess;
      const executionTimeMs = Date.now() - startTime;

      return {
        success: allSuccess,
        serverName: this.serverName,
        templateId: this.templateId,
        progress: this.progress,
        message: this.generateSummaryMessage(allSuccess),
        operations: this.progress.operations,
        executionTimeMs,
      };
    } catch (error) {
      const endTime = new Date();
      this.updateProgress({
        phase: 'failed',
        endTime,
        currentOperation: undefined,
      });

      const wrappedError = wrapError(error, 'Template execution failed');

      return {
        success: false,
        serverName: this.serverName,
        templateId: this.templateId,
        progress: this.progress,
        message: wrappedError.message,
        operations: this.progress.operations,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate a summary message for the execution result
   */
  private generateSummaryMessage(success: boolean): string {
    const { completedOperations, failedOperations, skippedOperations, totalOperations } = this.progress;

    if (success) {
      if (skippedOperations > 0) {
        return `Successfully applied template '${this.templateId}' to server '${this.serverName}'. ` +
               `Completed ${completedOperations}/${totalOperations} operations (${skippedOperations} skipped).`;
      }
      return `Successfully applied template '${this.templateId}' to server '${this.serverName}'. ` +
             `All ${completedOperations} operations completed.`;
    } else {
      return `Template '${this.templateId}' applied with errors to server '${this.serverName}'. ` +
             `Completed: ${completedOperations}, Failed: ${failedOperations}, Skipped: ${skippedOperations}.`;
    }
  }
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Execute a template with default options
 */
export async function executeTemplate(
  templateId: string,
  serverName: string,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  const executor = new TemplateExecutor(templateId, serverName, options);
  return executor.execute();
}

/**
 * Execute a template in dry-run mode to preview operations
 */
export async function previewTemplateExecution(
  templateId: string,
  serverName: string,
  customization?: TemplateCustomization
): Promise<ExecutionResult> {
  const executor = new TemplateExecutor(templateId, serverName, {
    customization,
    dryRun: true,
  });
  return executor.execute();
}
