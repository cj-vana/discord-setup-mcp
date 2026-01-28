/**
 * Business Workspace Server Template
 *
 * A professional server structure designed for team collaboration, project
 * management, and business communication. Features departments, projects,
 * and hierarchical permissions.
 */

import {
  ServerTemplate,
  TemplateRole,
  TemplateCategory,
  ChannelType,
  DiscordPermission,
} from './types.js';

/**
 * Roles for a business workspace server
 * Ordered by hierarchy (highest first)
 */
const businessRoles: TemplateRole[] = [
  {
    name: 'Owner',
    color: '#E74C3C',
    hoist: true,
    mentionable: false,
    position: 100,
    permissions: [DiscordPermission.Administrator],
  },
  {
    name: 'Executive',
    color: '#9B59B6',
    hoist: true,
    mentionable: true,
    position: 90,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.ManageChannels,
      DiscordPermission.ManageMessages,
      DiscordPermission.ManageThreads,
      DiscordPermission.KickMembers,
      DiscordPermission.MentionEveryone,
      DiscordPermission.MuteMembers,
      DiscordPermission.DeafenMembers,
      DiscordPermission.MoveMembers,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.PrioritySpeaker,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.CreatePrivateThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
      DiscordPermission.ViewAuditLog,
    ],
  },
  {
    name: 'Manager',
    color: '#3498DB',
    hoist: true,
    mentionable: true,
    position: 80,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.ManageMessages,
      DiscordPermission.ManageThreads,
      DiscordPermission.MentionEveryone,
      DiscordPermission.MuteMembers,
      DiscordPermission.MoveMembers,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.CreatePrivateThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'Team Lead',
    color: '#2ECC71',
    hoist: true,
    mentionable: true,
    position: 70,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.ManageMessages,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'Employee',
    color: '#1ABC9C',
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
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
      DiscordPermission.ChangeNickname,
    ],
  },
  {
    name: 'Contractor',
    color: '#F39C12',
    hoist: false,
    mentionable: false,
    position: 30,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'Guest',
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
      DiscordPermission.UseApplicationCommands,
    ],
  },
];

/**
 * Categories and channels for a business workspace server
 */
const businessCategories: TemplateCategory[] = [
  {
    name: 'ANNOUNCEMENTS',
    permissionOverrides: [
      {
        role: '@everyone',
        allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
        deny: [DiscordPermission.SendMessages],
      },
      {
        role: 'Guest',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
    ],
    channels: [
      {
        name: 'company-news',
        type: ChannelType.Announcement,
        topic: 'Official company announcements and updates',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'hr-updates',
        type: ChannelType.Announcement,
        topic: 'HR policies, benefits, and important notices',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'it-notices',
        type: ChannelType.Text,
        topic: 'IT system updates, maintenance windows, and tech announcements',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
          {
            role: 'Team Lead',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
    ],
  },
  {
    name: 'GENERAL',
    channels: [
      {
        name: 'lobby',
        type: ChannelType.Text,
        topic: 'General discussion and company-wide conversations',
      },
      {
        name: 'introductions',
        type: ChannelType.Text,
        topic: 'Introduce yourself to the team!',
        slowmode: 60,
      },
      {
        name: 'watercooler',
        type: ChannelType.Text,
        topic: 'Casual chat, memes, and non-work conversations',
      },
      {
        name: 'kudos',
        type: ChannelType.Text,
        topic: 'Recognize and appreciate your colleagues',
      },
    ],
  },
  {
    name: 'DEPARTMENTS',
    permissionOverrides: [
      {
        role: 'Guest',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
      {
        role: 'Contractor',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
    ],
    channels: [
      {
        name: 'engineering',
        type: ChannelType.Text,
        topic: 'Engineering team discussions and updates',
      },
      {
        name: 'design',
        type: ChannelType.Text,
        topic: 'Design team discussions and creative work',
      },
      {
        name: 'marketing',
        type: ChannelType.Text,
        topic: 'Marketing campaigns and strategy',
      },
      {
        name: 'sales',
        type: ChannelType.Text,
        topic: 'Sales team coordination and deal discussions',
      },
      {
        name: 'operations',
        type: ChannelType.Text,
        topic: 'Operations and logistics coordination',
      },
      {
        name: 'hr-team',
        type: ChannelType.Text,
        topic: 'HR team internal discussions',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [],
            deny: [DiscordPermission.ViewChannels],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.ViewChannels],
            deny: [],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.ViewChannels],
            deny: [],
          },
        ],
      },
      {
        name: 'finance',
        type: ChannelType.Text,
        topic: 'Finance team discussions',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [],
            deny: [DiscordPermission.ViewChannels],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.ViewChannels],
            deny: [],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.ViewChannels],
            deny: [],
          },
        ],
      },
    ],
  },
  {
    name: 'PROJECTS',
    permissionOverrides: [
      {
        role: 'Guest',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
    ],
    channels: [
      {
        name: 'project-alpha',
        type: ChannelType.Text,
        topic: 'Project Alpha coordination and updates',
      },
      {
        name: 'project-beta',
        type: ChannelType.Text,
        topic: 'Project Beta coordination and updates',
      },
      {
        name: 'project-archive',
        type: ChannelType.Text,
        topic: 'Archived project discussions and learnings',
      },
      {
        name: 'project-ideas',
        type: ChannelType.Forum,
        topic: 'Submit and discuss new project ideas',
      },
    ],
  },
  {
    name: 'RESOURCES',
    channels: [
      {
        name: 'documentation',
        type: ChannelType.Text,
        topic: 'Important documents, guides, and resources',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
          {
            role: 'Team Lead',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'onboarding',
        type: ChannelType.Text,
        topic: 'New employee onboarding materials and FAQs',
      },
      {
        name: 'tools-and-apps',
        type: ChannelType.Text,
        topic: 'Company tools, software, and access information',
      },
      {
        name: 'policies',
        type: ChannelType.Text,
        topic: 'Company policies and procedures',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
    ],
  },
  {
    name: 'SUPPORT',
    channels: [
      {
        name: 'it-helpdesk',
        type: ChannelType.Text,
        topic: 'IT support requests and troubleshooting',
      },
      {
        name: 'hr-questions',
        type: ChannelType.Text,
        topic: 'HR questions and support',
      },
      {
        name: 'facilities',
        type: ChannelType.Text,
        topic: 'Office facilities and building-related requests',
      },
    ],
  },
  {
    name: 'LEADERSHIP',
    permissionOverrides: [
      {
        role: '@everyone',
        allow: [],
        deny: [DiscordPermission.ViewChannels],
      },
      {
        role: 'Executive',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'exec-discussion',
        type: ChannelType.Text,
        topic: 'Executive team private discussions',
      },
      {
        name: 'strategic-planning',
        type: ChannelType.Text,
        topic: 'Long-term strategy and planning',
      },
      {
        name: 'sensitive-matters',
        type: ChannelType.Text,
        topic: 'Confidential discussions',
      },
      {
        name: 'Executive Boardroom',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'MEETINGS',
    channels: [
      {
        name: 'All Hands',
        type: ChannelType.Voice,
      },
      {
        name: 'Conference Room A',
        type: ChannelType.Voice,
      },
      {
        name: 'Conference Room B',
        type: ChannelType.Voice,
      },
      {
        name: 'Quick Sync',
        type: ChannelType.Voice,
      },
      {
        name: 'Interview Room',
        type: ChannelType.Voice,
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [],
            deny: [DiscordPermission.ViewChannels],
          },
          {
            role: 'Executive',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.Connect],
            deny: [],
          },
          {
            role: 'Manager',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.Connect],
            deny: [],
          },
          {
            role: 'Team Lead',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.Connect],
            deny: [],
          },
        ],
      },
    ],
  },
  {
    name: 'SOCIAL',
    channels: [
      {
        name: 'events',
        type: ChannelType.Text,
        topic: 'Company events, parties, and social gatherings',
      },
      {
        name: 'birthdays',
        type: ChannelType.Text,
        topic: 'Celebrate team member birthdays!',
      },
      {
        name: 'hobbies',
        type: ChannelType.Text,
        topic: 'Share your hobbies and interests',
      },
      {
        name: 'pets',
        type: ChannelType.Text,
        topic: 'Show off your furry (or not so furry) friends',
      },
      {
        name: 'game-night',
        type: ChannelType.Text,
        topic: 'Coordinate game nights and fun activities',
      },
      {
        name: 'Social Lounge',
        type: ChannelType.Voice,
      },
    ],
  },
];

/**
 * Business workspace server template
 */
export const businessTemplate: ServerTemplate = {
  id: 'business',
  name: 'Business Workspace',
  description: 'Professional workspace for teams with departments, projects, and structured communication channels.',
  useCase: 'Companies, startups, remote teams, and professional organizations',
  roles: businessRoles,
  categories: businessCategories,
  systemChannel: 'lobby',
  afkChannel: 'Social Lounge',
  afkTimeout: 600,
};

export default businessTemplate;
