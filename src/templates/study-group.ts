/**
 * Study Group Server Template
 *
 * A server structure optimized for study groups, academic collaboration,
 * online learning, and educational communities. Features organized subject
 * channels, study session coordination, resource sharing, and tutoring areas.
 */

import {
  ServerTemplate,
  TemplateRole,
  TemplateCategory,
  ChannelType,
  DiscordPermission,
} from './types.js';

/**
 * Roles for a study group server
 * Ordered by hierarchy (highest first)
 */
const studyGroupRoles: TemplateRole[] = [
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
      DiscordPermission.ManageNicknames,
      DiscordPermission.ViewAuditLog,
    ],
  },
  {
    name: 'Tutor',
    color: '#9B59B6',
    hoist: true,
    mentionable: true,
    position: 80,
    permissions: [
      DiscordPermission.ViewChannels,
      DiscordPermission.SendMessages,
      DiscordPermission.ManageMessages,
      DiscordPermission.ManageThreads,
      DiscordPermission.EmbedLinks,
      DiscordPermission.AttachFiles,
      DiscordPermission.ReadMessageHistory,
      DiscordPermission.MentionEveryone,
      DiscordPermission.UseExternalEmojis,
      DiscordPermission.AddReactions,
      DiscordPermission.Connect,
      DiscordPermission.Speak,
      DiscordPermission.Video,
      DiscordPermission.MuteMembers,
      DiscordPermission.PrioritySpeaker,
      DiscordPermission.UseActivities,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.CreatePrivateThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  {
    name: 'Senior Member',
    color: '#2ECC71',
    hoist: true,
    mentionable: false,
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
      DiscordPermission.UseActivities,
      DiscordPermission.CreatePublicThreads,
      DiscordPermission.CreatePrivateThreads,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
      DiscordPermission.CreateInvite,
      DiscordPermission.ChangeNickname,
    ],
  },
  {
    name: 'Study Buddy',
    color: '#F39C12',
    hoist: false,
    mentionable: false,
    position: 40,
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
    name: 'Verified Member',
    color: '#1ABC9C',
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
      DiscordPermission.UseVoiceActivity,
      DiscordPermission.SendMessagesInThreads,
      DiscordPermission.UseApplicationCommands,
    ],
  },
  // Subject-specific roles (no additional permissions, just for pinging)
  {
    name: 'Mathematics',
    color: '#E67E22',
    hoist: false,
    mentionable: true,
    position: 10,
    permissions: [],
  },
  {
    name: 'Sciences',
    color: '#27AE60',
    hoist: false,
    mentionable: true,
    position: 10,
    permissions: [],
  },
  {
    name: 'Humanities',
    color: '#8E44AD',
    hoist: false,
    mentionable: true,
    position: 10,
    permissions: [],
  },
  {
    name: 'Programming',
    color: '#2980B9',
    hoist: false,
    mentionable: true,
    position: 10,
    permissions: [],
  },
  {
    name: 'Languages',
    color: '#C0392B',
    hoist: false,
    mentionable: true,
    position: 10,
    permissions: [],
  },
];

/**
 * Categories and channels for a study group server
 */
const studyGroupCategories: TemplateCategory[] = [
  {
    name: 'INFORMATION',
    channels: [
      {
        name: 'announcements',
        type: ChannelType.Announcement,
        topic: 'Important announcements, schedule changes, and updates',
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
          {
            role: 'Tutor',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'rules-and-guidelines',
        type: ChannelType.Text,
        topic: 'Study group rules, academic integrity guidelines, and expectations',
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
        topic: 'Introduce yourself! Share your subjects, goals, and study interests',
        slowmode: 60,
      },
      {
        name: 'schedule',
        type: ChannelType.Text,
        topic: 'Study session schedules, exam dates, and important deadlines',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Moderator',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
          {
            role: 'Tutor',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'role-selection',
        type: ChannelType.Text,
        topic: 'React to get your subject roles for notifications',
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
        topic: 'General discussion and casual conversation',
      },
      {
        name: 'study-motivation',
        type: ChannelType.Text,
        topic: 'Share motivation, progress updates, and celebrate achievements',
      },
      {
        name: 'off-topic',
        type: ChannelType.Text,
        topic: 'Non-study related conversations and fun discussions',
      },
      {
        name: 'bot-commands',
        type: ChannelType.Text,
        topic: 'Use bot commands here',
      },
    ],
  },
  {
    name: 'SUBJECTS',
    channels: [
      {
        name: 'mathematics',
        type: ChannelType.Text,
        topic: 'Math help, problem-solving, and discussions',
      },
      {
        name: 'sciences',
        type: ChannelType.Text,
        topic: 'Physics, Chemistry, Biology, and other sciences',
      },
      {
        name: 'humanities',
        type: ChannelType.Text,
        topic: 'History, Literature, Philosophy, and social sciences',
      },
      {
        name: 'languages',
        type: ChannelType.Text,
        topic: 'Language learning and practice',
      },
      {
        name: 'programming',
        type: ChannelType.Text,
        topic: 'Coding, computer science, and software development',
      },
      {
        name: 'other-subjects',
        type: ChannelType.Text,
        topic: 'Any other subjects not covered above',
      },
    ],
  },
  {
    name: 'Q&A',
    channels: [
      {
        name: 'homework-help',
        type: ChannelType.Forum,
        topic: 'Post homework questions and get help from peers and tutors',
      },
      {
        name: 'exam-prep',
        type: ChannelType.Forum,
        topic: 'Exam preparation questions, study tips, and practice problems',
      },
      {
        name: 'concept-clarification',
        type: ChannelType.Forum,
        topic: 'Ask for explanations of difficult concepts',
      },
    ],
  },
  {
    name: 'RESOURCES',
    channels: [
      {
        name: 'study-materials',
        type: ChannelType.Text,
        topic: 'Share notes, summaries, and study guides',
        slowmode: 60,
      },
      {
        name: 'useful-links',
        type: ChannelType.Text,
        topic: 'Educational websites, tools, and online resources',
        slowmode: 60,
      },
      {
        name: 'book-recommendations',
        type: ChannelType.Text,
        topic: 'Textbook and reading recommendations',
      },
      {
        name: 'past-papers',
        type: ChannelType.Text,
        topic: 'Past exam papers and practice tests',
        slowmode: 60,
      },
    ],
  },
  {
    name: 'COLLABORATION',
    channels: [
      {
        name: 'find-study-partners',
        type: ChannelType.Text,
        topic: 'Find study buddies and form study groups',
      },
      {
        name: 'group-projects',
        type: ChannelType.Forum,
        topic: 'Coordinate group projects and assignments',
      },
      {
        name: 'peer-review',
        type: ChannelType.Text,
        topic: 'Get feedback on essays, papers, and assignments',
      },
    ],
  },
  {
    name: 'STUDY SESSIONS',
    channels: [
      {
        name: 'session-planning',
        type: ChannelType.Text,
        topic: 'Plan and coordinate study sessions',
      },
      {
        name: 'Quiet Study',
        type: ChannelType.Voice,
      },
      {
        name: 'Study Together',
        type: ChannelType.Voice,
      },
      {
        name: 'Group Discussion',
        type: ChannelType.Voice,
      },
      {
        name: 'Pomodoro Room',
        type: ChannelType.Voice,
      },
      {
        name: 'AFK',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'TUTORING',
    permissionOverrides: [
      {
        role: '@everyone',
        allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'tutor-listings',
        type: ChannelType.Text,
        topic: 'Tutors can offer their services here',
        permissionOverrides: [
          {
            role: '@everyone',
            allow: [DiscordPermission.ViewChannels, DiscordPermission.ReadMessageHistory],
            deny: [DiscordPermission.SendMessages],
          },
          {
            role: 'Tutor',
            allow: [DiscordPermission.SendMessages],
            deny: [],
          },
        ],
      },
      {
        name: 'request-tutoring',
        type: ChannelType.Text,
        topic: 'Request tutoring help in specific subjects',
      },
      {
        name: 'tutor-feedback',
        type: ChannelType.Text,
        topic: 'Leave reviews and feedback for tutors',
        slowmode: 120,
      },
      {
        name: 'Tutoring Room 1',
        type: ChannelType.Voice,
      },
      {
        name: 'Tutoring Room 2',
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
      {
        role: 'Tutor',
        allow: [DiscordPermission.ViewChannels],
        deny: [],
      },
    ],
    channels: [
      {
        name: 'staff-chat',
        type: ChannelType.Text,
        topic: 'Staff discussions and coordination',
      },
      {
        name: 'tutor-coordination',
        type: ChannelType.Text,
        topic: 'Tutor scheduling and coordination',
      },
      {
        name: 'reports',
        type: ChannelType.Text,
        topic: 'Member reports and issues to review',
      },
      {
        name: 'Staff Voice',
        type: ChannelType.Voice,
      },
    ],
  },
  {
    name: 'META',
    channels: [
      {
        name: 'suggestions',
        type: ChannelType.Forum,
        topic: 'Suggest improvements for the study group',
      },
    ],
  },
];

/**
 * Study group server template
 */
export const studyGroupTemplate: ServerTemplate = {
  id: 'study-group',
  name: 'Study Group',
  description: 'A server template for study groups, academic collaboration, and online learning communities. Features organized subject channels, study session coordination, resource sharing, and collaborative spaces.',
  useCase: 'Study groups, academic courses, tutoring communities, and educational organizations',
  roles: studyGroupRoles,
  categories: studyGroupCategories,
  systemChannel: 'general-chat',
  afkChannel: 'AFK',
  afkTimeout: 300,
};

export default studyGroupTemplate;
