/**
 * Study Group Discord Server Template
 *
 * A server structure optimized for study groups, academic collaboration,
 * online learning, and educational communities.
 */

/**
 * Channel type enumeration
 */
export type ChannelType = 'text' | 'voice' | 'forum' | 'announcement';

/**
 * Role definition with permissions and styling
 */
export interface RoleDefinition {
  name: string;
  color: string;
  permissions: string[];
  hoist: boolean;
  mentionable: boolean;
}

/**
 * Channel definition within a category
 */
export interface ChannelDefinition {
  name: string;
  type: ChannelType;
  topic?: string;
  slowMode?: number;
  nsfw?: boolean;
}

/**
 * Category definition containing channels
 */
export interface CategoryDefinition {
  name: string;
  channels: ChannelDefinition[];
}

/**
 * Complete server template definition
 */
export interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  categories: CategoryDefinition[];
  roles: RoleDefinition[];
  settings: {
    verificationLevel: 'none' | 'low' | 'medium' | 'high' | 'highest';
    defaultNotifications: 'all' | 'mentions';
    contentFilter: 'disabled' | 'members_without_roles' | 'all_members';
  };
}

/**
 * Study Group Server Template
 *
 * Designed for academic study groups with features for:
 * - Course organization
 * - Study sessions and collaboration
 * - Resource sharing
 * - Q&A and tutoring
 * - Project collaboration
 */
export const studyGroupTemplate: ServerTemplate = {
  id: 'study-group',
  name: 'Study Group',
  description: 'A server template for study groups, academic collaboration, and online learning communities. Features organized subject channels, study session coordination, resource sharing, and collaborative spaces.',

  categories: [
    {
      name: '📢 Information',
      channels: [
        {
          name: 'announcements',
          type: 'announcement',
          topic: 'Important announcements, schedule changes, and updates'
        },
        {
          name: 'rules-and-guidelines',
          type: 'text',
          topic: 'Study group rules, academic integrity guidelines, and expectations'
        },
        {
          name: 'introductions',
          type: 'text',
          topic: 'Introduce yourself! Share your subjects, goals, and study interests'
        },
        {
          name: 'schedule',
          type: 'text',
          topic: 'Study session schedules, exam dates, and important deadlines'
        }
      ]
    },
    {
      name: '💬 General',
      channels: [
        {
          name: 'general-chat',
          type: 'text',
          topic: 'General discussion and casual conversation'
        },
        {
          name: 'study-motivation',
          type: 'text',
          topic: 'Share motivation, progress updates, and celebrate achievements'
        },
        {
          name: 'off-topic',
          type: 'text',
          topic: 'Non-study related conversations and fun discussions'
        }
      ]
    },
    {
      name: '📚 Subjects',
      channels: [
        {
          name: 'mathematics',
          type: 'text',
          topic: 'Math help, problem-solving, and discussions'
        },
        {
          name: 'sciences',
          type: 'text',
          topic: 'Physics, Chemistry, Biology, and other sciences'
        },
        {
          name: 'humanities',
          type: 'text',
          topic: 'History, Literature, Philosophy, and social sciences'
        },
        {
          name: 'languages',
          type: 'text',
          topic: 'Language learning and practice'
        },
        {
          name: 'programming',
          type: 'text',
          topic: 'Coding, computer science, and software development'
        },
        {
          name: 'other-subjects',
          type: 'text',
          topic: 'Any other subjects not covered above'
        }
      ]
    },
    {
      name: '❓ Q&A',
      channels: [
        {
          name: 'homework-help',
          type: 'forum',
          topic: 'Post homework questions and get help from peers and tutors'
        },
        {
          name: 'exam-prep',
          type: 'forum',
          topic: 'Exam preparation questions, study tips, and practice problems'
        },
        {
          name: 'concept-clarification',
          type: 'forum',
          topic: 'Ask for explanations of difficult concepts'
        }
      ]
    },
    {
      name: '📁 Resources',
      channels: [
        {
          name: 'study-materials',
          type: 'text',
          topic: 'Share notes, summaries, and study guides',
          slowMode: 60
        },
        {
          name: 'useful-links',
          type: 'text',
          topic: 'Educational websites, tools, and online resources',
          slowMode: 60
        },
        {
          name: 'book-recommendations',
          type: 'text',
          topic: 'Textbook and reading recommendations'
        },
        {
          name: 'past-papers',
          type: 'text',
          topic: 'Past exam papers and practice tests',
          slowMode: 60
        }
      ]
    },
    {
      name: '🤝 Collaboration',
      channels: [
        {
          name: 'find-study-partners',
          type: 'text',
          topic: 'Find study buddies and form study groups'
        },
        {
          name: 'group-projects',
          type: 'forum',
          topic: 'Coordinate group projects and assignments'
        },
        {
          name: 'peer-review',
          type: 'text',
          topic: 'Get feedback on essays, papers, and assignments'
        }
      ]
    },
    {
      name: '🎧 Study Sessions',
      channels: [
        {
          name: 'session-planning',
          type: 'text',
          topic: 'Plan and coordinate study sessions'
        },
        {
          name: 'Quiet Study',
          type: 'voice',
          topic: 'Silent study room - cameras/mics optional'
        },
        {
          name: 'Study Together',
          type: 'voice',
          topic: 'Collaborative study with discussion'
        },
        {
          name: 'Tutoring Room',
          type: 'voice',
          topic: 'One-on-one or group tutoring sessions'
        },
        {
          name: 'Pomodoro Room',
          type: 'voice',
          topic: '25min study / 5min break cycles'
        }
      ]
    },
    {
      name: '🎓 Tutoring',
      channels: [
        {
          name: 'tutor-listings',
          type: 'text',
          topic: 'Tutors can offer their services here'
        },
        {
          name: 'request-tutoring',
          type: 'text',
          topic: 'Request tutoring help in specific subjects'
        },
        {
          name: 'tutor-feedback',
          type: 'text',
          topic: 'Leave reviews and feedback for tutors'
        }
      ]
    },
    {
      name: '⚙️ Meta',
      channels: [
        {
          name: 'suggestions',
          type: 'text',
          topic: 'Suggest improvements for the study group'
        },
        {
          name: 'bot-commands',
          type: 'text',
          topic: 'Use bot commands here'
        }
      ]
    }
  ],

  roles: [
    {
      name: 'Admin',
      color: '#E74C3C',
      permissions: [
        'ADMINISTRATOR'
      ],
      hoist: true,
      mentionable: false
    },
    {
      name: 'Moderator',
      color: '#3498DB',
      permissions: [
        'KICK_MEMBERS',
        'BAN_MEMBERS',
        'MANAGE_MESSAGES',
        'MANAGE_CHANNELS',
        'MUTE_MEMBERS',
        'DEAFEN_MEMBERS',
        'MOVE_MEMBERS',
        'MANAGE_NICKNAMES'
      ],
      hoist: true,
      mentionable: true
    },
    {
      name: 'Tutor',
      color: '#9B59B6',
      permissions: [
        'MANAGE_MESSAGES',
        'MUTE_MEMBERS',
        'PRIORITY_SPEAKER'
      ],
      hoist: true,
      mentionable: true
    },
    {
      name: 'Senior Member',
      color: '#2ECC71',
      permissions: [
        'CREATE_INSTANT_INVITE',
        'ATTACH_FILES',
        'EMBED_LINKS',
        'ADD_REACTIONS',
        'USE_EXTERNAL_EMOJIS'
      ],
      hoist: true,
      mentionable: false
    },
    {
      name: 'Study Buddy',
      color: '#F39C12',
      permissions: [
        'SEND_MESSAGES',
        'READ_MESSAGE_HISTORY',
        'CONNECT',
        'SPEAK',
        'STREAM',
        'USE_VAD'
      ],
      hoist: false,
      mentionable: false
    },
    {
      name: 'Verified Member',
      color: '#1ABC9C',
      permissions: [
        'SEND_MESSAGES',
        'READ_MESSAGE_HISTORY',
        'CONNECT',
        'SPEAK',
        'ADD_REACTIONS'
      ],
      hoist: false,
      mentionable: false
    },
    {
      name: 'Mathematics',
      color: '#E67E22',
      permissions: [],
      hoist: false,
      mentionable: true
    },
    {
      name: 'Sciences',
      color: '#27AE60',
      permissions: [],
      hoist: false,
      mentionable: true
    },
    {
      name: 'Humanities',
      color: '#8E44AD',
      permissions: [],
      hoist: false,
      mentionable: true
    },
    {
      name: 'Programming',
      color: '#2980B9',
      permissions: [],
      hoist: false,
      mentionable: true
    },
    {
      name: 'Languages',
      color: '#C0392B',
      permissions: [],
      hoist: false,
      mentionable: true
    }
  ],

  settings: {
    verificationLevel: 'medium',
    defaultNotifications: 'mentions',
    contentFilter: 'members_without_roles'
  }
};

/**
 * Get the study group template
 */
export function getStudyGroupTemplate(): ServerTemplate {
  return studyGroupTemplate;
}

/**
 * Get a summary of the study group template for preview
 */
export function getStudyGroupTemplateSummary(): {
  id: string;
  name: string;
  description: string;
  categoryCount: number;
  channelCount: number;
  roleCount: number;
} {
  const channelCount = studyGroupTemplate.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  return {
    id: studyGroupTemplate.id,
    name: studyGroupTemplate.name,
    description: studyGroupTemplate.description,
    categoryCount: studyGroupTemplate.categories.length,
    channelCount,
    roleCount: studyGroupTemplate.roles.length
  };
}

export default studyGroupTemplate;
