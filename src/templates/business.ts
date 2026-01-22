/**
 * Business workspace server template for Discord
 * Provides a professional structure for team collaboration, projects, and communication
 */

/**
 * Discord permission flags for role configuration
 */
export const DiscordPermissions = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  ADD_REACTIONS: 1n << 6n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  STREAM: 1n << 9n,
  USE_VAD: 1n << 25n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_MESSAGES: 1n << 13n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
} as const;

/**
 * Channel types supported by Discord
 */
export type ChannelType = 'text' | 'voice' | 'announcement' | 'stage' | 'forum';

/**
 * Role definition for a Discord server
 */
export interface RoleDefinition {
  /** Role name */
  name: string;
  /** Role color in hex format (e.g., "#FF5733") */
  color: string;
  /** Whether the role is displayed separately in the member list */
  hoist: boolean;
  /** Whether the role is mentionable by anyone */
  mentionable: boolean;
  /** Permission bitfield for the role */
  permissions: bigint;
  /** Description of the role's purpose */
  description?: string;
}

/**
 * Channel definition within a category
 */
export interface ChannelDefinition {
  /** Channel name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Channel topic/description */
  topic?: string;
  /** Whether the channel is NSFW */
  nsfw?: boolean;
  /** Slowmode delay in seconds (0-21600) */
  slowmode?: number;
  /** Role names that can access this channel (empty means everyone) */
  allowedRoles?: string[];
  /** Role names that cannot access this channel */
  deniedRoles?: string[];
}

/**
 * Category definition containing multiple channels
 */
export interface CategoryDefinition {
  /** Category name */
  name: string;
  /** Channels within this category */
  channels: ChannelDefinition[];
  /** Role names that can access this category (empty means everyone) */
  allowedRoles?: string[];
  /** Role names that cannot access this category */
  deniedRoles?: string[];
}

/**
 * Server settings configuration
 */
export interface ServerSettings {
  /** Verification level: 0=None, 1=Low, 2=Medium, 3=High, 4=Highest */
  verificationLevel: 0 | 1 | 2 | 3 | 4;
  /** Explicit content filter: 0=Disabled, 1=Members without roles, 2=All members */
  contentFilter: 0 | 1 | 2;
  /** Default notification setting: 'all' or 'mentions' */
  defaultNotifications: 'all' | 'mentions';
}

/**
 * Complete server template definition
 */
export interface ServerTemplate {
  /** Template identifier */
  id: string;
  /** Template display name */
  name: string;
  /** Template description */
  description: string;
  /** Template icon (emoji or custom) */
  icon: string;
  /** Server roles (in order of hierarchy, highest first) */
  roles: RoleDefinition[];
  /** Server categories with channels */
  categories: CategoryDefinition[];
  /** Server settings */
  settings: ServerSettings;
}

/**
 * Business workspace server template
 * Designed for professional teams with structured communication and project management
 */
export const businessTemplate: ServerTemplate = {
  id: 'business',
  name: 'Business Workspace',
  description: 'Professional workspace for teams with departments, projects, and structured communication channels',
  icon: '💼',

  roles: [
    {
      name: 'Owner',
      color: '#E74C3C',
      hoist: true,
      mentionable: false,
      permissions: DiscordPermissions.ADMINISTRATOR,
      description: 'Server owner with full administrative access',
    },
    {
      name: 'Executive',
      color: '#9B59B6',
      hoist: true,
      mentionable: true,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.ATTACH_FILES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.MENTION_EVERYONE |
        DiscordPermissions.USE_EXTERNAL_EMOJIS |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK |
        DiscordPermissions.STREAM |
        DiscordPermissions.MANAGE_CHANNELS |
        DiscordPermissions.MANAGE_MESSAGES |
        DiscordPermissions.MUTE_MEMBERS |
        DiscordPermissions.MOVE_MEMBERS |
        DiscordPermissions.KICK_MEMBERS,
      description: 'Executive leadership with elevated permissions',
    },
    {
      name: 'Manager',
      color: '#3498DB',
      hoist: true,
      mentionable: true,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.ATTACH_FILES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.MENTION_EVERYONE |
        DiscordPermissions.USE_EXTERNAL_EMOJIS |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK |
        DiscordPermissions.STREAM |
        DiscordPermissions.MANAGE_MESSAGES |
        DiscordPermissions.MUTE_MEMBERS,
      description: 'Department managers with moderation capabilities',
    },
    {
      name: 'Team Lead',
      color: '#2ECC71',
      hoist: true,
      mentionable: true,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.ATTACH_FILES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.USE_EXTERNAL_EMOJIS |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK |
        DiscordPermissions.STREAM |
        DiscordPermissions.MANAGE_MESSAGES,
      description: 'Team leads with limited moderation',
    },
    {
      name: 'Employee',
      color: '#1ABC9C',
      hoist: false,
      mentionable: false,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.ATTACH_FILES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.USE_EXTERNAL_EMOJIS |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK |
        DiscordPermissions.STREAM,
      description: 'Standard employee access',
    },
    {
      name: 'Contractor',
      color: '#F39C12',
      hoist: false,
      mentionable: false,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.EMBED_LINKS |
        DiscordPermissions.ATTACH_FILES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK,
      description: 'External contractors with limited access',
    },
    {
      name: 'Guest',
      color: '#95A5A6',
      hoist: false,
      mentionable: false,
      permissions:
        DiscordPermissions.VIEW_CHANNEL |
        DiscordPermissions.SEND_MESSAGES |
        DiscordPermissions.READ_MESSAGE_HISTORY |
        DiscordPermissions.ADD_REACTIONS |
        DiscordPermissions.CONNECT |
        DiscordPermissions.SPEAK,
      description: 'Guests with minimal access',
    },
  ],

  categories: [
    {
      name: '📢 ANNOUNCEMENTS',
      channels: [
        {
          name: 'company-news',
          type: 'announcement',
          topic: 'Official company announcements and updates',
          allowedRoles: ['Executive', 'Manager'],
        },
        {
          name: 'hr-updates',
          type: 'announcement',
          topic: 'HR policies, benefits, and important notices',
          allowedRoles: ['Executive', 'Manager'],
        },
        {
          name: 'it-notices',
          type: 'text',
          topic: 'IT system updates, maintenance windows, and tech announcements',
          allowedRoles: ['Manager', 'Team Lead'],
        },
      ],
      deniedRoles: ['Guest'],
    },
    {
      name: '💬 GENERAL',
      channels: [
        {
          name: 'lobby',
          type: 'text',
          topic: 'General discussion and company-wide conversations',
        },
        {
          name: 'introductions',
          type: 'text',
          topic: 'Introduce yourself to the team!',
        },
        {
          name: 'watercooler',
          type: 'text',
          topic: 'Casual chat, memes, and non-work conversations',
        },
        {
          name: 'kudos',
          type: 'text',
          topic: 'Recognize and appreciate your colleagues',
        },
      ],
    },
    {
      name: '🏢 DEPARTMENTS',
      channels: [
        {
          name: 'engineering',
          type: 'text',
          topic: 'Engineering team discussions and updates',
        },
        {
          name: 'design',
          type: 'text',
          topic: 'Design team discussions and creative work',
        },
        {
          name: 'marketing',
          type: 'text',
          topic: 'Marketing campaigns and strategy',
        },
        {
          name: 'sales',
          type: 'text',
          topic: 'Sales team coordination and deal discussions',
        },
        {
          name: 'operations',
          type: 'text',
          topic: 'Operations and logistics coordination',
        },
        {
          name: 'hr-team',
          type: 'text',
          topic: 'HR team internal discussions',
          allowedRoles: ['Executive', 'Manager'],
        },
        {
          name: 'finance',
          type: 'text',
          topic: 'Finance team discussions',
          allowedRoles: ['Executive', 'Manager'],
        },
      ],
      deniedRoles: ['Guest', 'Contractor'],
    },
    {
      name: '📋 PROJECTS',
      channels: [
        {
          name: 'project-alpha',
          type: 'text',
          topic: 'Project Alpha coordination and updates',
        },
        {
          name: 'project-beta',
          type: 'text',
          topic: 'Project Beta coordination and updates',
        },
        {
          name: 'project-archive',
          type: 'text',
          topic: 'Archived project discussions and learnings',
        },
        {
          name: 'project-ideas',
          type: 'forum',
          topic: 'Submit and discuss new project ideas',
        },
      ],
      deniedRoles: ['Guest'],
    },
    {
      name: '📚 RESOURCES',
      channels: [
        {
          name: 'documentation',
          type: 'text',
          topic: 'Important documents, guides, and resources',
        },
        {
          name: 'onboarding',
          type: 'text',
          topic: 'New employee onboarding materials and FAQs',
        },
        {
          name: 'tools-and-apps',
          type: 'text',
          topic: 'Company tools, software, and access information',
        },
        {
          name: 'policies',
          type: 'text',
          topic: 'Company policies and procedures',
        },
      ],
    },
    {
      name: '🆘 SUPPORT',
      channels: [
        {
          name: 'it-helpdesk',
          type: 'text',
          topic: 'IT support requests and troubleshooting',
        },
        {
          name: 'hr-questions',
          type: 'text',
          topic: 'HR questions and support',
        },
        {
          name: 'facilities',
          type: 'text',
          topic: 'Office facilities and building-related requests',
        },
      ],
    },
    {
      name: '🔒 LEADERSHIP',
      channels: [
        {
          name: 'exec-discussion',
          type: 'text',
          topic: 'Executive team private discussions',
        },
        {
          name: 'strategic-planning',
          type: 'text',
          topic: 'Long-term strategy and planning',
        },
        {
          name: 'sensitive-matters',
          type: 'text',
          topic: 'Confidential discussions',
        },
      ],
      allowedRoles: ['Owner', 'Executive'],
    },
    {
      name: '🎤 MEETINGS',
      channels: [
        {
          name: 'All Hands',
          type: 'voice',
          topic: 'Company-wide meetings and town halls',
        },
        {
          name: 'Conference Room A',
          type: 'voice',
          topic: 'General purpose meeting room',
        },
        {
          name: 'Conference Room B',
          type: 'voice',
          topic: 'General purpose meeting room',
        },
        {
          name: 'Quick Sync',
          type: 'voice',
          topic: 'Quick informal sync calls',
        },
        {
          name: 'Interview Room',
          type: 'voice',
          topic: 'Candidate interviews',
          allowedRoles: ['Executive', 'Manager', 'Team Lead'],
        },
        {
          name: 'Executive Boardroom',
          type: 'voice',
          topic: 'Executive meetings',
          allowedRoles: ['Owner', 'Executive'],
        },
      ],
    },
    {
      name: '🎉 SOCIAL',
      channels: [
        {
          name: 'events',
          type: 'text',
          topic: 'Company events, parties, and social gatherings',
        },
        {
          name: 'birthdays',
          type: 'text',
          topic: 'Celebrate team member birthdays!',
        },
        {
          name: 'hobbies',
          type: 'text',
          topic: 'Share your hobbies and interests',
        },
        {
          name: 'pets',
          type: 'text',
          topic: 'Show off your furry (or not so furry) friends',
        },
        {
          name: 'game-night',
          type: 'text',
          topic: 'Coordinate game nights and fun activities',
        },
        {
          name: 'Social Lounge',
          type: 'voice',
          topic: 'Casual voice chat for social time',
        },
      ],
    },
  ],

  settings: {
    verificationLevel: 2, // Medium - must have verified email
    contentFilter: 1, // Scan media from members without roles
    defaultNotifications: 'mentions', // Only mentions to avoid notification overload
  },
};

/**
 * Get the business template
 */
export function getBusinessTemplate(): ServerTemplate {
  return businessTemplate;
}

/**
 * Get a preview of the business template structure
 */
export function getBusinessTemplatePreview(): {
  name: string;
  description: string;
  icon: string;
  roleCount: number;
  categoryCount: number;
  channelCount: number;
  roles: string[];
  categories: string[];
} {
  const channelCount = businessTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    name: businessTemplate.name,
    description: businessTemplate.description,
    icon: businessTemplate.icon,
    roleCount: businessTemplate.roles.length,
    categoryCount: businessTemplate.categories.length,
    channelCount,
    roles: businessTemplate.roles.map((r) => r.name),
    categories: businessTemplate.categories.map((c) => c.name),
  };
}

export default businessTemplate;
