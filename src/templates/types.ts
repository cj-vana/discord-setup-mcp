/**
 * Type definitions for Discord server templates
 */

/**
 * Discord permission flags
 * Based on Discord's permission system
 */
export enum DiscordPermission {
  // General
  Administrator = 'ADMINISTRATOR',
  ViewChannels = 'VIEW_CHANNEL',
  ManageChannels = 'MANAGE_CHANNELS',
  ManageRoles = 'MANAGE_ROLES',
  ManageEmojis = 'MANAGE_EMOJIS_AND_STICKERS',
  ViewAuditLog = 'VIEW_AUDIT_LOG',
  ManageWebhooks = 'MANAGE_WEBHOOKS',
  ManageServer = 'MANAGE_GUILD',

  // Membership
  CreateInvite = 'CREATE_INSTANT_INVITE',
  ChangeNickname = 'CHANGE_NICKNAME',
  ManageNicknames = 'MANAGE_NICKNAMES',
  KickMembers = 'KICK_MEMBERS',
  BanMembers = 'BAN_MEMBERS',
  TimeoutMembers = 'MODERATE_MEMBERS',

  // Text Channel
  SendMessages = 'SEND_MESSAGES',
  SendMessagesInThreads = 'SEND_MESSAGES_IN_THREADS',
  CreatePublicThreads = 'CREATE_PUBLIC_THREADS',
  CreatePrivateThreads = 'CREATE_PRIVATE_THREADS',
  EmbedLinks = 'EMBED_LINKS',
  AttachFiles = 'ATTACH_FILES',
  AddReactions = 'ADD_REACTIONS',
  UseExternalEmojis = 'USE_EXTERNAL_EMOJIS',
  UseExternalStickers = 'USE_EXTERNAL_STICKERS',
  MentionEveryone = 'MENTION_EVERYONE',
  ManageMessages = 'MANAGE_MESSAGES',
  ManageThreads = 'MANAGE_THREADS',
  ReadMessageHistory = 'READ_MESSAGE_HISTORY',
  SendTTSMessages = 'SEND_TTS_MESSAGES',
  UseApplicationCommands = 'USE_APPLICATION_COMMANDS',

  // Voice Channel
  Connect = 'CONNECT',
  Speak = 'SPEAK',
  Video = 'STREAM',
  UseActivities = 'USE_EMBEDDED_ACTIVITIES',
  UseSoundboard = 'USE_SOUNDBOARD',
  UseExternalSounds = 'USE_EXTERNAL_SOUNDS',
  UseVoiceActivity = 'USE_VAD',
  PrioritySpeaker = 'PRIORITY_SPEAKER',
  MuteMembers = 'MUTE_MEMBERS',
  DeafenMembers = 'DEAFEN_MEMBERS',
  MoveMembers = 'MOVE_MEMBERS',

  // Events
  CreateEvents = 'CREATE_EVENTS',
  ManageEvents = 'MANAGE_EVENTS',
}

/**
 * Discord channel types
 */
export enum ChannelType {
  Text = 'text',
  Voice = 'voice',
  Announcement = 'announcement',
  Forum = 'forum',
  Stage = 'stage',
}

/**
 * Role definition in a template
 */
export interface TemplateRole {
  /** Role name */
  name: string;
  /** Role color in hex format (e.g., "#FF0000") */
  color: string;
  /** Whether the role should be displayed separately in the member list */
  hoist: boolean;
  /** Whether users with this role can be @mentioned */
  mentionable: boolean;
  /** Permissions granted to this role */
  permissions: DiscordPermission[];
  /** Position in the role hierarchy (higher = more power) */
  position: number;
}

/**
 * Permission override for a channel
 */
export interface ChannelPermissionOverride {
  /** Role name this override applies to */
  role: string;
  /** Permissions to allow */
  allow: DiscordPermission[];
  /** Permissions to deny */
  deny: DiscordPermission[];
}

/**
 * Channel definition in a template
 */
export interface TemplateChannel {
  /** Channel name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Channel topic/description (for text channels) */
  topic?: string;
  /** Whether the channel is NSFW */
  nsfw?: boolean;
  /** Slowmode delay in seconds (0 = disabled) */
  slowmode?: number;
  /** Bitrate for voice/stage channels (8000-384000) */
  bitrate?: number;
  /** User limit for voice channels (0 = unlimited) */
  userLimit?: number;
  /** Permission overrides for this channel */
  permissionOverrides?: ChannelPermissionOverride[];
}

/**
 * Category definition in a template
 */
export interface TemplateCategory {
  /** Category name */
  name: string;
  /** Channels within this category */
  channels: TemplateChannel[];
  /** Permission overrides for this category (inherited by channels) */
  permissionOverrides?: ChannelPermissionOverride[];
}

/**
 * Server template definition
 */
export interface ServerTemplate {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Description of the template's purpose */
  description: string;
  /** Target audience or use case */
  useCase: string;
  /** Icon for the template (emoji) */
  icon?: string;
  /** Roles to create (in order of hierarchy, highest first) */
  roles: TemplateRole[];
  /** Categories and channels to create */
  categories: TemplateCategory[];
  /** Default system channel name (for welcome messages) */
  systemChannel?: string;
  /** Default AFK channel name */
  afkChannel?: string;
  /** AFK timeout in seconds */
  afkTimeout?: number;
}
