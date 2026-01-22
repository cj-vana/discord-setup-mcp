/**
 * Community Server Template
 *
 * A community hub server structure designed for general community engagement,
 * content creators, social groups, and community building. Features welcome
 * areas, general chat spaces, media sharing, events, and community organization.
 */

/**
 * Discord channel type enumeration
 */
export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  ANNOUNCEMENT = 'announcement',
  FORUM = 'forum',
  STAGE = 'stage',
}

/**
 * Role permission presets for community servers
 */
export interface RolePermissions {
  administrator?: boolean;
  manageGuild?: boolean;
  manageRoles?: boolean;
  manageChannels?: boolean;
  kickMembers?: boolean;
  banMembers?: boolean;
  manageMessages?: boolean;
  mentionEveryone?: boolean;
  sendMessages?: boolean;
  readMessageHistory?: boolean;
  connect?: boolean;
  speak?: boolean;
  stream?: boolean;
  useExternalEmojis?: boolean;
  addReactions?: boolean;
  createPublicThreads?: boolean;
  createPrivateThreads?: boolean;
  sendMessagesInThreads?: boolean;
}

/**
 * Role definition for community server templates
 */
export interface RoleDefinition {
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
  permissions: RolePermissions;
  position?: number;
}

/**
 * Channel definition for community server templates
 */
export interface ChannelDefinition {
  name: string;
  type: ChannelType;
  topic?: string;
  nsfw?: boolean;
  slowMode?: number;
  permissionOverwrites?: Array<{
    role: string;
    allow?: string[];
    deny?: string[];
  }>;
}

/**
 * Category definition containing channels
 */
export interface CategoryDefinition {
  name: string;
  channels: ChannelDefinition[];
  permissionOverwrites?: Array<{
    role: string;
    allow?: string[];
    deny?: string[];
  }>;
}

/**
 * Complete server template structure
 */
export interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  roles: RoleDefinition[];
  categories: CategoryDefinition[];
}

/**
 * Community hub server template
 * Designed for content creators, social communities, and general community building
 */
export const communityTemplate: ServerTemplate = {
  id: 'community',
  name: 'Community Hub',
  description: 'A welcoming community server for social groups, content creators, and community building with areas for announcements, discussions, media sharing, and events.',

  roles: [
    {
      name: 'Admin',
      color: '#e74c3c',
      hoist: true,
      mentionable: false,
      permissions: {
        administrator: true,
      },
      position: 100,
    },
    {
      name: 'Moderator',
      color: '#3498db',
      hoist: true,
      mentionable: true,
      permissions: {
        manageMessages: true,
        kickMembers: true,
        banMembers: true,
        manageChannels: false,
        manageRoles: false,
        mentionEveryone: true,
        sendMessages: true,
        readMessageHistory: true,
        connect: true,
        speak: true,
        stream: true,
      },
      position: 90,
    },
    {
      name: 'Content Creator',
      color: '#9b59b6',
      hoist: true,
      mentionable: true,
      permissions: {
        sendMessages: true,
        readMessageHistory: true,
        useExternalEmojis: true,
        addReactions: true,
        connect: true,
        speak: true,
        stream: true,
        createPublicThreads: true,
      },
      position: 70,
    },
    {
      name: 'VIP',
      color: '#f1c40f',
      hoist: true,
      mentionable: true,
      permissions: {
        sendMessages: true,
        readMessageHistory: true,
        useExternalEmojis: true,
        addReactions: true,
        connect: true,
        speak: true,
        stream: true,
        createPublicThreads: true,
      },
      position: 60,
    },
    {
      name: 'Active Member',
      color: '#2ecc71',
      hoist: false,
      mentionable: false,
      permissions: {
        sendMessages: true,
        readMessageHistory: true,
        useExternalEmojis: true,
        addReactions: true,
        connect: true,
        speak: true,
        createPublicThreads: true,
        sendMessagesInThreads: true,
      },
      position: 50,
    },
    {
      name: 'Member',
      color: '#95a5a6',
      hoist: false,
      mentionable: false,
      permissions: {
        sendMessages: true,
        readMessageHistory: true,
        addReactions: true,
        connect: true,
        speak: true,
        sendMessagesInThreads: true,
      },
      position: 10,
    },
  ],

  categories: [
    {
      name: '📢 INFORMATION',
      channels: [
        {
          name: 'welcome',
          type: ChannelType.TEXT,
          topic: 'Welcome to our community! Read the rules and introduce yourself.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
        {
          name: 'announcements',
          type: ChannelType.ANNOUNCEMENT,
          topic: 'Important community announcements and updates.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
        {
          name: 'rules',
          type: ChannelType.TEXT,
          topic: 'Community guidelines and rules. Please read before participating.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
        {
          name: 'roles',
          type: ChannelType.TEXT,
          topic: 'Get your roles here! React to assign roles.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
      ],
    },
    {
      name: '💬 GENERAL',
      channels: [
        {
          name: 'general-chat',
          type: ChannelType.TEXT,
          topic: 'General discussions and conversations. Be friendly!',
        },
        {
          name: 'introductions',
          type: ChannelType.TEXT,
          topic: 'New here? Introduce yourself to the community!',
        },
        {
          name: 'off-topic',
          type: ChannelType.TEXT,
          topic: 'Random discussions and off-topic conversations.',
        },
        {
          name: 'memes',
          type: ChannelType.TEXT,
          topic: 'Share your favorite memes and funny content.',
        },
      ],
    },
    {
      name: '🎨 MEDIA & CONTENT',
      channels: [
        {
          name: 'share-your-work',
          type: ChannelType.TEXT,
          topic: 'Share your creations, art, projects, and content.',
        },
        {
          name: 'photos',
          type: ChannelType.TEXT,
          topic: 'Share your photography and images.',
        },
        {
          name: 'videos',
          type: ChannelType.TEXT,
          topic: 'Share video content and clips.',
        },
        {
          name: 'music',
          type: ChannelType.TEXT,
          topic: 'Share and discuss music.',
        },
        {
          name: 'feedback',
          type: ChannelType.FORUM,
          topic: 'Get feedback on your work from the community.',
        },
      ],
    },
    {
      name: '📅 EVENTS & ACTIVITIES',
      channels: [
        {
          name: 'events',
          type: ChannelType.ANNOUNCEMENT,
          topic: 'Upcoming community events and activities.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
        {
          name: 'event-chat',
          type: ChannelType.TEXT,
          topic: 'Discuss ongoing and upcoming events.',
        },
        {
          name: 'giveaways',
          type: ChannelType.TEXT,
          topic: 'Community giveaways and contests.',
          permissionOverwrites: [
            {
              role: 'Member',
              deny: ['sendMessages'],
            },
          ],
        },
        {
          name: 'suggestions',
          type: ChannelType.FORUM,
          topic: 'Suggest ideas for events and community improvements.',
        },
      ],
    },
    {
      name: '🎙️ VOICE CHANNELS',
      channels: [
        {
          name: 'General Voice',
          type: ChannelType.VOICE,
        },
        {
          name: 'Chill Lounge',
          type: ChannelType.VOICE,
        },
        {
          name: 'Music Room',
          type: ChannelType.VOICE,
        },
        {
          name: 'Community Stage',
          type: ChannelType.STAGE,
        },
      ],
    },
    {
      name: '🔒 VIP LOUNGE',
      permissionOverwrites: [
        {
          role: 'Member',
          deny: ['readMessageHistory', 'sendMessages', 'connect'],
        },
        {
          role: 'VIP',
          allow: ['readMessageHistory', 'sendMessages', 'connect'],
        },
        {
          role: 'Content Creator',
          allow: ['readMessageHistory', 'sendMessages', 'connect'],
        },
      ],
      channels: [
        {
          name: 'vip-chat',
          type: ChannelType.TEXT,
          topic: 'Exclusive chat for VIP members and content creators.',
        },
        {
          name: 'sneak-peeks',
          type: ChannelType.TEXT,
          topic: 'Early access to announcements and content.',
        },
        {
          name: 'VIP Voice',
          type: ChannelType.VOICE,
        },
      ],
    },
    {
      name: '🛠️ STAFF',
      permissionOverwrites: [
        {
          role: 'Member',
          deny: ['readMessageHistory', 'sendMessages', 'connect'],
        },
        {
          role: 'VIP',
          deny: ['readMessageHistory', 'sendMessages', 'connect'],
        },
        {
          role: 'Moderator',
          allow: ['readMessageHistory', 'sendMessages', 'connect'],
        },
        {
          role: 'Admin',
          allow: ['readMessageHistory', 'sendMessages', 'connect'],
        },
      ],
      channels: [
        {
          name: 'mod-chat',
          type: ChannelType.TEXT,
          topic: 'Staff discussions and coordination.',
        },
        {
          name: 'mod-logs',
          type: ChannelType.TEXT,
          topic: 'Moderation action logs.',
        },
        {
          name: 'reports',
          type: ChannelType.TEXT,
          topic: 'Member reports and issues to review.',
        },
        {
          name: 'Staff Voice',
          type: ChannelType.VOICE,
        },
      ],
    },
  ],
};

/**
 * Export the template as default for easy importing
 */
export default communityTemplate;
