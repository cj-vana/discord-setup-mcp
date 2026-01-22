/**
 * Gaming Community Server Template
 *
 * A comprehensive Discord server structure designed for gaming communities.
 * Includes categories for general chat, voice channels for different games,
 * competitive/ranked sections, and community engagement areas.
 */

import {
  ServerTemplate,
  TemplateRole,
  TemplateCategory,
  ChannelType,
  DiscordPermission,
} from './types.js';

/**
 * Roles for a gaming community server
 * Ordered by hierarchy (highest first)
 */
const gamingRoles: TemplateRole[] = [
  {
    name: 'Owner',
    color: '#E74C3C',
    hoist: true,
    mentionable: false,
    position: 100,
    permissions: [DiscordPermission.Administrator],
  },
  {
    name: 'Admin',
    color: '#E91E63',
    hoist: true,
    mentionable: false,
    position: 90,
    permissions: [
      DiscordPermission.Administrator,
    ],
  },
  {
    name: 'Moderator',
    color: '#9B59B6',
    hoist: true,
    mentionable: true,
    position: 80,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.ManageChannels,
      DiscordPermission.ManageRoles,
      DiscordPermission.KickMembers,
      DiscordPermission.BanMembers,
      DiscordPermission.TimeoutMembers,
      DiscordPermission.ManageMessages,
      DiscordPermission.ManageThreads,
      DiscordPermission.MuteMembers,
      DiscordPermission.DeafenMembers,
      DiscordPermission.MoveMembers,
      DiscordPermission.ViewAuditLog,
    ],
  },
  {
    name: 'Event Host',
    color: '#F39C12',
    hoist: true,
    mentionable: true,
    position: 70,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.CreateEvents,
      DiscordPermission.ManageEvents,
      DiscordPermission.MentionEveryone,
      DiscordPermission.MoveMembers,
      DiscordPermission.MuteMembers,
      DiscordPermission.PrioritySpeaker,
    ],
  },
  {
    name: 'Streamer',
    color: '#9146FF',
    hoist: true,
    mentionable: true,
    position: 60,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.Video,
      DiscordPermission.PrioritySpeaker,
      DiscordPermission.UseActivities,
    ],
  },
  {
    name: 'VIP',
    color: '#FFD700',
    hoist: true,
    mentionable: false,
    position: 50,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.CreateInvite,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.UseExternalStickers,
      DiscordPermission.UseExternalSounds,
    ],
  },
  {
    name: 'Veteran',
    color: '#3498DB',
    hoist: true,
    mentionable: false,
    position: 40,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.CreateInvite,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.UseExternalStickers,
    ],
  },
  {
    name: 'Regular',
    color: '#2ECC71',
    hoist: false,
    mentionable: false,
    position: 30,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.CreateInvite,
    ],
  },
  {
    name: 'Member',
    color: '#95A5A6',
    hoist: false,
    mentionable: false,
    position: 20,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.UseActivities,
      DiscordPermission.UseSoundboard,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
      DiscordPermission.ChangeNickname,
    ],
  },
  {
    name: 'Newbie',
    color: '#BDC3C7',
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
      DiscordPermission.UseApplicationCommands,
    ],
  },
];

/**
 * Categories and channels for a gaming community server
 */
const gamingCategories: TemplateCategory[] = [
  {
    name: 'WELCOME',
    channels: [
      {
        name: 'rules',
        type: ChannelType.Text,
        topic: 'Server rules and guidelines. Please read before participating!',
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
        topic: 'Important server announcements and updates',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'introductions',
        type: ChannelType.Text,
        topic: 'Introduce yourself to the community!',
        slowmode: 60,
      },
      {
        name: 'role-selection',
        type: ChannelType.Text,
        topic: 'React to get your game roles and notification preferences',
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
        topic: 'General discussion - keep it friendly!',
      },
      {
        name: 'memes',
        type: ChannelType.Text,
        topic: 'Share your gaming memes and funny content',
        slowmode: 10,
      },
      {
        name: 'media-share',
        type: ChannelType.Text,
        topic: 'Share screenshots, clips, and other gaming media',
        slowmode: 15,
      },
      {
        name: 'bot-commands',
        type: ChannelType.Text,
        topic: 'Use bot commands here to keep other channels clean',
      },
    ],
  },
  {
    name: 'GAMING DISCUSSION',
    channels: [
      {
        name: 'fps-games',
        type: ChannelType.Text,
        topic: 'Discussion for FPS games - Valorant, CS2, Apex, etc.',
      },
      {
        name: 'mmorpg-games',
        type: ChannelType.Text,
        topic: 'Discussion for MMORPGs - WoW, FFXIV, Lost Ark, etc.',
      },
      {
        name: 'moba-games',
        type: ChannelType.Text,
        topic: 'Discussion for MOBAs - League of Legends, Dota 2, etc.',
      },
      {
        name: 'battle-royale',
        type: ChannelType.Text,
        topic: 'Discussion for Battle Royale games - Fortnite, Warzone, PUBG, etc.',
      },
      {
        name: 'indie-games',
        type: ChannelType.Text,
        topic: 'Discussion for indie and smaller titles',
      },
      {
        name: 'game-deals',
        type: ChannelType.Text,
        topic: 'Share gaming deals, free games, and sales',
        slowmode: 30,
      },
    ],
  },
  {
    name: 'COMPETITIVE',
    channels: [
      {
        name: 'ranked-discussion',
        type: ChannelType.Text,
        topic: 'Discuss competitive/ranked gameplay, strategies, and tips',
      },
      {
        name: 'team-recruitment',
        type: ChannelType.Text,
        topic: 'Find teammates for ranked games and tournaments',
        slowmode: 60,
      },
      {
        name: 'scrims-and-matches',
        type: ChannelType.Text,
        topic: 'Organize scrimmages and competitive matches',
      },
      {
        name: 'tournament-info',
        type: ChannelType.Text,
        topic: 'Tournament announcements and sign-ups',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Event Host',
            allow: [DiscordPermission.SendMessages, DiscordPermission.ManageMessages],
            deny: [],
          },
        ],
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
        name: 'Gaming 1',
        type: ChannelType.Voice,
      },
      {
        name: 'Gaming 2',
        type: ChannelType.Voice,
      },
      {
        name: 'Gaming 3',
        type: ChannelType.Voice,
      },
      {
        name: 'Duo Queue',
        type: ChannelType.Voice,
      },
      {
        name: 'Squad (5 Players)',
        type: ChannelType.Voice,
      },
      {
        name: 'Full Lobby (10 Players)',
        type: ChannelType.Voice,
      },
      {
        name: 'AFK',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'STREAMS & CONTENT',
    channels: [
      {
        name: 'stream-announcements',
        type: ChannelType.Text,
        topic: 'Announce when you go live!',
        slowmode: 300,
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Streamer',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'content-creators',
        type: ChannelType.Text,
        topic: 'Discussion for content creators - tips, collabs, feedback',
      },
      {
        name: 'clip-highlights',
        type: ChannelType.Text,
        topic: 'Share your best gaming clips and highlights',
        slowmode: 30,
      },
      {
        name: 'Stream Stage',
        type: ChannelType.Stage,
      },
    ],
  },
  {
    name: 'EVENTS',
    channels: [
      {
        name: 'event-announcements',
        type: ChannelType.Text,
        topic: 'Upcoming events and community activities',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Event Host',
            allow: [DiscordPermission.SendMessages, DiscordPermission.MentionEveryone],
            deny: [],
          },
        ],
      },
      {
        name: 'event-chat',
        type: ChannelType.Text,
        topic: 'Chat during events',
      },
      {
        name: 'Event Voice',
        type: ChannelType.Voice,
      },
      {
        name: 'Event Stage',
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
        role: 'Veteran',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'vip-chat',
        type: ChannelType.Text,
        topic: 'Exclusive chat for VIP and Veteran members',
      },
      {
        name: 'vip-media',
        type: ChannelType.Text,
        topic: 'Share content in the VIP area',
      },
      {
        name: 'VIP Voice',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'SUPPORT',
    channels: [
      {
        name: 'help-desk',
        type: ChannelType.Forum,
        topic: 'Need help? Create a post and our team will assist you',
      },
      {
        name: 'suggestions',
        type: ChannelType.Forum,
        topic: 'Share your ideas to improve the server',
      },
      {
        name: 'report-issues',
        type: ChannelType.Text,
        topic: 'Report bugs, issues, or rule violations to staff',
        slowmode: 120,
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
        name: 'staff-chat',
        type: ChannelType.Text,
        topic: 'Staff-only discussion',
      },
      {
        name: 'mod-logs',
        type: ChannelType.Text,
        topic: 'Moderation action logs',
        permissionOverrides: [
          {
            role: 'Moderator',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
        ],
      },
      {
        name: 'staff-announcements',
        type: ChannelType.Text,
        topic: 'Important staff announcements',
      },
      {
        name: 'Staff Voice',
        type: ChannelType.Voice,
      },
    ],
  },
];

/**
 * Gaming community server template
 */
export const gamingTemplate: ServerTemplate = {
  id: 'gaming',
  name: 'Gaming Community',
  description: 'A comprehensive server template for gaming communities with organized channels for different game genres, competitive play, voice chat, streaming, and events.',
  useCase: 'Gaming communities, esports teams, game-specific fan servers, and multi-game communities',
  roles: gamingRoles,
  categories: gamingCategories,
  systemChannel: 'general-chat',
  afkChannel: 'AFK',
  afkTimeout: 300,
};

export default gamingTemplate;
