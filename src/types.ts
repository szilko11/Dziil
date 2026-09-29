import { ChannelType } from 'discord.js';

export type PermConfig = 'READ_ONLY' | 'STAFF_ONLY_TEXT' | 'STAFF_ONLY_VOICE' | 'ADMIN_PULL_VOICE' | 'OWNER_ONLY' | 'STATS_VOICE' | 'BOOSTER_ONLY' | 'CITIZEN_WRITE';

export interface ChannelData {
  name: string;
  type: ChannelType;
  perm?: PermConfig;
  panel?: string;
  topic?: string;
}

export interface CategoryData {
  category: string;
  perm?: PermConfig;
  channels: ChannelData[];
}

export interface Warn { 
  id: string; 
  reason: string; 
  date: Date; 
  moderator: string; 
}

export interface BotStatus {
  state: string;
  user: string | null;
  error: string | null;
  ping: number;
  guilds?: string[];
}

export interface FactionMember {
  id: string;
  discordTag: string;
  discordId?: string;
  fivemName: string;
  fivemIdentifier?: string;
  rank: string;
  rankLevel: number; // 1 = Leader, 2 = Co-Leader, 3 = High Command, 4 = Member, 5 = Prospect/Recruit
  roleTitle?: string;
  notes?: string;
  joinedAt: string;
  status: 'active' | 'suspended' | 'kicked';
}

export interface FactionRank {
  id: string;
  name: string;
  level: number;
  description: string;
  permissions: string[]; // e.g. ['manage_members', 'post_announcements', 'create_events', 'access_hq_vault']
}

export interface FactionEvent {
  id: string;
  factionId: string;
  title: string;
  description: string;
  date: string;
  location: string;
  createdBy: string;
  createdAt: string;
  attendees: {
    accepted: string[]; // discord IDs or tags
    declined: string[];
    tentative: string[];
  };
  messageId?: string;
  channelId?: string;
}

export interface FactionWarn {
  id: string;
  factionId: string;
  reason: string;
  givenBy: string;
  createdAt: string;
  active: boolean;
}

export interface FactionAuditLog {
  id: string;
  factionId: string;
  action: 'create' | 'approve' | 'reject' | 'member_add' | 'member_remove' | 'rank_change' | 'warn' | 'suspend' | 'unsuspend' | 'archive' | 'disband' | 'announcement' | 'event_created';
  executor: string;
  details: string;
  timestamp: string;
}

export interface FactionData {
  id: string;
  applicationId?: string;
  name: string;
  tag: string; // e.g. "LSK", "CMC"
  type: 'gang' | 'mafia' | 'cartel' | 'mc' | 'syndicate' | 'legal' | 'custom';
  leaderIC: string;
  leaderDiscord: string;
  leaderDiscordId?: string;
  coLeaderIC?: string;
  coLeaderDiscord?: string;
  coLeaderDiscordId?: string;
  membersCount: number;
  maxMembers: number;
  primaryColor: string;
  color?: string;
  secondaryColor?: string;
  hqLocation?: string;
  hqCoordinates?: string;
  logoUrl?: string;
  referenceImages?: string[];
  clothingStyle?: string;
  vehiclesPlanned?: string;
  backstory: string;
  rpPlan: string;
  status: 'active' | 'suspended' | 'archived' | 'disbanded';
  warnCount: number;
  warnings?: number;
  warns: FactionWarn[];
  ranks: FactionRank[];
  members: FactionMember[];
  events: FactionEvent[];
  discordInfo: {
    guildId?: string;
    categoryId?: string;
    roleId?: string;
    leaderRoleId?: string;
    coLeaderRoleId?: string;
    memberRoleId?: string;
    infoChannelId?: string;
    announcementsChannelId?: string;
    chatChannelId?: string;
    rosterChannelId?: string;
    eventsChannelId?: string;
    leaderChatChannelId?: string;
    logChannelId?: string;
    voiceGeneralId?: string;
    voiceMeetingId?: string;
    voiceLeaderId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FactionApplicationFull {
  id: string;
  applicant: {
    discordTag: string;
    discordId: string;
    fivemCharacterName: string;
    fivemIdentifier: string;
    age: number;
    weeklyHours: number;
    serverExperienceTime: string;
    wasLeaderBefore: boolean;
    pastExperienceDesc: string;
  };
  faction: {
    fullName: string;
    tag: string;
    type: 'gang' | 'mafia' | 'cartel' | 'mc' | 'syndicate' | 'legal' | 'custom';
    leaderIC: string;
    coLeaderIC: string;
    initialMembersCount: number;
    plannedMaxMembers: number;
    primaryColor: string;
    secondaryColor: string;
  };
  lore: {
    backstory: string;
    whyFormed: string;
    whyLosSantos: string;
    mainGoal: string;
    valuesAndPrinciples: string;
    uniqueness: string;
  };
  rpPlan: {
    rpVision: string;
    civilianInteraction: string;
    otherFactionsInteraction: string;
    policeRelation: string;
    legalActivities: string;
    illegalActivities: string;
    moneyMakingModel: string;
    offPeakPlan: string;
    antiGunplayStrategy: string;
    scenarios: [string, string, string]; // 3 concrete RP scenarios
  };
  members: Array<{
    discordTag: string;
    discordId?: string;
    fivemName: string;
    plannedRank: string;
    roleTitle: string;
    notes?: string;
  }>;
  ranks: Array<{
    id?: string;
    name: string;
    level: number;
    description: string;
    permissions: string[];
  }>;
  appearance: {
    logoUrl: string;
    referenceImages: string[];
    clothingStyle: string;
    vehiclesPlanned: string;
    hqVision: string;
    hqCoordinates: string;
  };
  rulesAccepted: boolean;
  rulesAcceptedAt: string;
  status: 'pending' | 'interview' | 'approved' | 'rejected' | 'changes_requested';
  changesRequestedReason?: string;
  rejectReason?: string;
  interviewChannelId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  channelId?: string;
  guildId?: string;
  categoryCreatedId?: string;
  roleCreatedId?: string;
  createdAt: string;
  updatedAt: string;
  source: 'web' | 'discord';
}

export interface AdminDutyRecord {
  id: string;
  adminId: string;
  adminName: string;
  adminAvatar?: string;
  roleName?: string;
  startTime: number;
  endTime?: number;
  durationMinutes?: number;
  active: boolean;
  date: string; // YYYY-MM-DD
  weekNumber: number;
}

export interface WhitelistQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: 'RP Alapok' | 'Fogalmak' | 'Szabályzat';
}

export interface WhitelistResult {
  id?: string;
  discordId: string;
  discordTag: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  attemptedAt: string;
}

export interface PlayerHistoryRecord {
  id: string;
  targetId?: string; // FiveM ID
  targetName: string;
  targetDiscordId?: string;
  targetIdentifier?: string; // steam, license, etc.
  type: 'warn' | 'kick' | 'ban' | 'jail';
  reason: string;
  durationMinutes?: number;
  adminName: string;
  adminDiscordId?: string;
  createdAt: string;
  expiresAt?: string;
  active: boolean;
}

export interface KillLogRecord {
  id: string;
  killerId?: string | number;
  killerName: string;
  killerDiscordId?: string;
  victimId: string | number;
  victimName: string;
  victimDiscordId?: string;
  weapon: string;
  weaponIcon?: string;
  distance: number;
  bodyPart: string;
  location?: string;
  timestamp: string;
}

export interface RobberyLogRecord {
  id: string;
  robberyType: 'store' | 'vangelico' | 'fleeca' | 'pacific' | 'armored_truck' | 'house';
  locationName: string;
  robbers: string[];
  lootEstimated?: string;
  policeAlerted: boolean;
  timestamp: string;
}

export interface DailyRewardClaim {
  id?: string;
  discordId: string;
  discordTag: string;
  lastClaimedAt: number; // timestamp ms
  streak: number;
  rewardType: 'pp' | 'money' | 'discordCoins';
  rewardAmount: number;
}

export interface BoosterRewardRecord {
  id?: string;
  discordId: string;
  discordTag: string;
  rewardGrantedAt: string;
  ppGranted: number;
  roleGranted: string;
}

export interface UserBalance {
  balance: number; // In-Game FiveM Cash
  ppBalance: number; // Prémium Pont
  discordCoins: number; // Discord Pénz / Érme
  authenticated?: boolean;
}

export type ItemRarity = 'common' | 'rare' | 'classified' | 'covert' | 'special';

export interface CaseDropItem {
  id: string;
  name: string;
  category: string;
  rarity: ItemRarity; // common (blue), rare (purple), classified (pink), covert (red), special (gold/knife)
  rarityLabel: string;
  rarityColor: string;
  icon: string;
  image?: string;
  type: 'discordCoins' | 'money' | 'pp' | 'item';
  rewardAmount: number;
  displayValue: string;
  weight: number; // Relative chance
}

export interface CaseDefinition {
  id: string;
  name: string;
  description: string;
  price: number; // In Discord Coins
  icon: string;
  color: string;
  bannerImage: string;
  items: CaseDropItem[];
}
