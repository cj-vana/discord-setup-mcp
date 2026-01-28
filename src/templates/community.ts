/**
 * Community Hub Server Template
 *
 * A community hub server structure designed for general community engagement,
 * content creators, social groups, and community building. Features welcome
 * areas, general chat spaces, media sharing, events, and community organization.
 */

import {
  ServerTemplate,
  TemplateRole,
  TemplateCategory,
  ChannelType,
  DiscordPermission,
} from './types.js';

/**
 * Roles for a community hub server
 * Ordered by hierarchy (highest first)
 */
const communityRoles: TemplateRole[] = [
  {
    name: 'Admin',
    color: '#E74C3C',
    hoist: true,
    mentionable: false,
    position: 100,
    permissions: [DiscordPermission.Administrator],
  },
  {
    name: 'Moderator',
    color: '#3498DB',
    hoist: true,
    mentionable: true,
    position: 90,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.ManageMessages,
      DiscordPermission.ManageThreads,
      DiscordPermission.KickMembers,
      DiscordPermission.BanMembers,
      DiscordPermission.TimeoutMembers,
      DiscordPermission.MuteMembers,
      DiscordPermission.DeafenMembers,
      DiscordPermission.MoveMembers,
      DiscordPermission.MentionEveryone,
      DiscordPermission.ViewAuditLog,
    ],
  },
  {
    name: 'Content Creator',
    color: '#9B59B6',
    hoist: true,
    mentionable: true,
    position: 70,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.UseExternalStickers,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.UseActivities,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'VIP',
    color: '#F1C40F',
    hoist: true,
    mentionable: true,
    position: 60,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.UseExternalStickers,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'Active Member',
    color: '#2ECC71',
    hoist: false,
    mentionable: false,
    position: 50,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
      DiscordPermission.ChangeNickname,
    ],
  },
  {
    name: 'Member',
    color: '#95A5A6',
    hoist: false,
    mentionable: false,
    position: 10,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
];

/**
 * Categories and channels for a community hub server
 */
const communityCategories: TemplateCategory[] = [
  {
    name: 'INFORMATION',
    channels: [
      {
        name: 'welcome',
        type: ChannelType.Text,
        topic: 'Welcome to our community! Read the rules and introduce yourself.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'announcements',
        type: ChannelType.Announcement,
        topic: 'Important community announcements and updates.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'rules',
        type: ChannelType.Text,
        topic: 'Community guidelines and rules. Please read before participating.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'role-selection',
        type: ChannelType.Text,
        topic: 'Get your roles here! React to assign roles.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory, DiscordPermission.AddReactions],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
    ],
  },
  {
    name: 'GENERAL',
    channels: [
      {
        name: 'general-chat',
        type: ChannelType.Text,
        topic: 'General discussions and conversations. Be friendly!',
      },
      {
        name: 'introductions',
        type: ChannelType.Text,
        topic: 'New here? Introduce yourself to the community!',
        slowmode: 60,
      },
      {
        name: 'off-topic',
        type: ChannelType.Text,
        topic: 'Random discussions and off-topic conversations.',
      },
      {
        name: 'memes',
        type: ChannelType.Text,
        topic: 'Share your favorite memes and funny content.',
        slowmode: 10,
      },
    ],
  },
  {
    name: 'MEDIA & CONTENT',
    channels: [
      {
        name: 'share-your-work',
        type: ChannelType.Text,
        topic: 'Share your creations, art, projects, and content.',
        slowmode: 30,
      },
      {
        name: 'photos',
        type: ChannelType.Text,
        topic: 'Share your photography and images.',
        slowmode: 15,
      },
      {
        name: 'videos',
        type: ChannelType.Text,
        topic: 'Share video content and clips.',
        slowmode: 30,
      },
      {
        name: 'music',
        type: ChannelType.Text,
        topic: 'Share and discuss music.',
      },
      {
        name: 'feedback',
        type: ChannelType.Forum,
        topic: 'Get feedback on your work from the community.',
      },
    ],
  },
  {
    name: 'EVENTS & ACTIVITIES',
    channels: [
      {
        name: 'event-announcements',
        type: ChannelType.Announcement,
        topic: 'Upcoming community events and activities.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Moderator',
            allow: [DiscordPermission.SendMessages, DiscordPermission.MentionEveryone],
            deny: [],
          },
        ],
      },
      {
        name: 'event-chat',
        type: ChannelType.Text,
        topic: 'Discuss ongoing and upcoming events.',
      },
      {
        name: 'giveaways',
        type: ChannelType.Text,
        topic: 'Community giveaways and contests.',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory, DiscordPermission.AddReactions],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Moderator',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'suggestions',
        type: ChannelType.Forum,
        topic: 'Suggest ideas for events and community improvements.',
      },
    ],
  },
  {
    name: 'VOICE CHANNELS',
    channels: [
      {
        name: 'General Voice',
        type: ChannelType.Voice,
      },
      {
        name: 'Chill Lounge',
        type: ChannelType.Voice,
      },
      {
        name: 'Music Room',
        type: ChannelType.Voice,
      },
      {
        name: 'Community Stage',
        type: ChannelType.Stage,
      },
    ],
  },
  {
    name: 'VIP LOUNGE',
    permissionOverrides: [
      {
        role: '@everyone',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
      {
        role: 'VIP',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
      {
        role: 'Content Creator',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'vip-chat',
        type: ChannelType.Text,
        topic: 'Exclusive chat for VIP members and content creators.',
      },
      {
        name: 'sneak-peeks',
        type: ChannelType.Text,
        topic: 'Early access to announcements and content.',
      },
      {
        name: 'VIP Voice',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'STAFF',
    permissionOverrides: [
      {
        role: '@everyone',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
      {
        role: 'Moderator',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'mod-chat',
        type: ChannelType.Text,
        topic: 'Staff discussions and coordination.',
      },
      {
        name: 'mod-logs',
        type: ChannelType.Text,
        topic: 'Moderation action logs.',
        permissionOverrides: [
          {
            role: 'Moderator',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'reports',
        type: ChannelType.Text,
        topic: 'Member reports and issues to review.',
      },
      {
        name: 'Staff Voice',
        type: ChannelType.Voice,
      },
    ],
  },
];

/**
 * Community hub server template
 */
export const communityTemplate: ServerTemplate = {
  id: 'community',
  name: 'Community Hub',
  description: 'A welcoming community server for social groups, content creators, and community building with areas for announcements, discussions, media sharing, and events.',
  useCase: 'Social communities, fan groups, content creator communities, and general interest groups',
  roles: communityRoles,
  categories: communityCategories,
  systemChannel: 'general-chat',
  afkChannel: 'Chill Lounge',
  afkTimeout: 300,
};

export default communityTemplate;
