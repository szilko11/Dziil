import { 
  Client, 
  Guild, 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  TextChannel,
  ColorResolvable,
  GuildMember
} from 'discord.js';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FactionData, 
  FactionApplicationFull, 
  FactionMember, 
  FactionRank, 
  FactionEvent, 
  FactionWarn, 
  FactionAuditLog 
} from '../types';

// In-memory caching stores for ultra-fast response and reliability
const factionApplications: Map<string, FactionApplicationFull> = new Map();
const activeFactions: Map<string, FactionData> = new Map();
const factionAuditLogs: Map<string, FactionAuditLog[]> = new Map();

// Helper to get all apps
export function getAllFactionApplications(): FactionApplicationFull[] {
  return Array.from(factionApplications.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getFactionApplicationById(id: string): FactionApplicationFull | undefined {
  return factionApplications.get(id);
}

export function getAllActiveFactions(): FactionData[] {
  return Array.from(activeFactions.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getFactionById(id: string): FactionData | undefined {
  return activeFactions.get(id);
}

export function getFactionAuditLogs(factionId: string): FactionAuditLog[] {
  return factionAuditLogs.get(factionId) || [];
}

export function addAuditLog(factionId: string, log: Omit<FactionAuditLog, 'id' | 'timestamp'>) {
  const newLog: FactionAuditLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };
  const current = factionAuditLogs.get(factionId) || [];
  factionAuditLogs.set(factionId, [newLog, ...current]);
  return newLog;
}

export const FACTION_TYPE_META: Record<string, { label: string; emoji: string; defaultColor: string }> = {
  gang: { label: 'Utcai Banda', emoji: '👑', defaultColor: '#f59e0b' },
  mafia: { label: 'Maffia', emoji: '🏴‍☠️', defaultColor: '#d97706' },
  cartel: { label: 'Kartell', emoji: '💀', defaultColor: '#dc2626' },
  mc: { label: 'Motoros Klub (MC)', emoji: '🏍️', defaultColor: '#7c3aed' },
  syndicate: { label: 'Szervezett Bűnözői Csoport', emoji: '💼', defaultColor: '#0284c7' },
  legal: { label: 'Legális Szervezet', emoji: '🚓', defaultColor: '#2563eb' },
  custom: { label: 'Egyedi Frakció', emoji: '⚔️', defaultColor: '#10b981' }
};

// ========================================================
// 1. SUBMIT FULL FACTION APPLICATION
// ========================================================
export async function submitFullFactionApplication(
  client: Client | null,
  payload: Partial<FactionApplicationFull>
): Promise<FactionApplicationFull> {
  const appId = payload.id || `fac_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const applicant = {
    discordTag: payload.applicant?.discordTag || 'Ismeretlen',
    discordId: payload.applicant?.discordId || '',
    fivemCharacterName: payload.applicant?.fivemCharacterName || 'N/A',
    fivemIdentifier: payload.applicant?.fivemIdentifier || '',
    age: Number(payload.applicant?.age) || 18,
    weeklyHours: Number(payload.applicant?.weeklyHours) || 20,
    serverExperienceTime: payload.applicant?.serverExperienceTime || '6 hónap',
    wasLeaderBefore: Boolean(payload.applicant?.wasLeaderBefore),
    pastExperienceDesc: payload.applicant?.pastExperienceDesc || ''
  };

  const faction = {
    fullName: payload.faction?.fullName || 'Ismeretlen Frakció',
    tag: (payload.faction?.tag || payload.faction?.fullName?.substring(0, 4) || 'TAG').toUpperCase(),
    type: payload.faction?.type || 'gang',
    leaderIC: payload.faction?.leaderIC || applicant.fivemCharacterName,
    coLeaderIC: payload.faction?.coLeaderIC || '',
    initialMembersCount: Number(payload.faction?.initialMembersCount) || 5,
    plannedMaxMembers: Number(payload.faction?.plannedMaxMembers) || 15,
    primaryColor: payload.faction?.primaryColor || '#f59e0b',
    secondaryColor: payload.faction?.secondaryColor || '#000000'
  };

  const lore = {
    backstory: payload.lore?.backstory || '',
    whyFormed: payload.lore?.whyFormed || '',
    whyLosSantos: payload.lore?.whyLosSantos || '',
    mainGoal: payload.lore?.mainGoal || '',
    valuesAndPrinciples: payload.lore?.valuesAndPrinciples || '',
    uniqueness: payload.lore?.uniqueness || ''
  };

  const rpPlan = {
    rpVision: payload.rpPlan?.rpVision || '',
    civilianInteraction: payload.rpPlan?.civilianInteraction || '',
    otherFactionsInteraction: payload.rpPlan?.otherFactionsInteraction || '',
    policeRelation: payload.rpPlan?.policeRelation || '',
    legalActivities: payload.rpPlan?.legalActivities || '',
    illegalActivities: payload.rpPlan?.illegalActivities || '',
    moneyMakingModel: payload.rpPlan?.moneyMakingModel || '',
    offPeakPlan: payload.rpPlan?.offPeakPlan || '',
    antiGunplayStrategy: payload.rpPlan?.antiGunplayStrategy || '',
    scenarios: payload.rpPlan?.scenarios || ['', '', '']
  };

  const members = payload.members && payload.members.length > 0 ? payload.members : [
    {
      discordTag: applicant.discordTag,
      discordId: applicant.discordId,
      fivemName: applicant.fivemCharacterName,
      plannedRank: 'Leader (Frakcióvezető)',
      roleTitle: 'Alapító / Leader',
      notes: 'Fő pályázó'
    }
  ];

  const defaultRanks: FactionRank[] = [
    { id: '1', name: 'Leader', level: 1, description: 'Frakcióvezető és döntéshozó', permissions: ['all'] },
    { id: '2', name: 'Co-Leader', level: 2, description: 'Alvezér és operatív irányító', permissions: ['manage_members', 'events', 'announcements'] },
    { id: '3', name: 'High Command', level: 3, description: 'Tapasztalt vezető tag', permissions: ['invite', 'events'] },
    { id: '4', name: 'Member', level: 4, description: 'Teljes jogú frakciótag', permissions: ['chat', 'voice'] },
    { id: '5', name: 'Prospect / Újonc', level: 5, description: 'Próbaidős tag', permissions: ['chat', 'voice'] }
  ];

  const ranks = payload.ranks && payload.ranks.length > 0 ? payload.ranks : defaultRanks;

  const appearance = {
    logoUrl: payload.appearance?.logoUrl || '',
    referenceImages: payload.appearance?.referenceImages || [],
    clothingStyle: payload.appearance?.clothingStyle || '',
    vehiclesPlanned: payload.appearance?.vehiclesPlanned || '',
    hqVision: payload.appearance?.hqVision || '',
    hqCoordinates: payload.appearance?.hqCoordinates || ''
  };

  const app: FactionApplicationFull = {
    id: appId,
    applicant,
    faction,
    lore,
    rpPlan,
    members,
    ranks,
    appearance,
    rulesAccepted: true,
    rulesAcceptedAt: new Date().toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: payload.source || 'web'
  };

  factionApplications.set(appId, app);

  // Firestore backup
  try {
    const ref = doc(db, 'faction_applications', appId);
    setDoc(ref, app).catch(() => {});
  } catch (e) {}

  // Send Discord notification to Staff Channel `📥・frakció-kérelmek`
  if (client && client.isReady()) {
    try {
      const guild = client.guilds.cache.first();
      if (guild) {
        app.guildId = guild.id;
        await sendStaffApplicationNotification(client, guild, app);
      }
    } catch (discordErr: any) {
      console.error('[Factions] Error sending staff notification on Discord:', discordErr.message);
    }
  }

  return app;
}

// Backward compatibility helper
export async function submitFactionApplication(client: Client, data: any): Promise<any> {
  const fullApp: Partial<FactionApplicationFull> = {
    applicant: {
      discordTag: data.leaderDiscord || '',
      discordId: data.leaderDiscordId || '',
      fivemCharacterName: data.leaderIC || '',
      fivemIdentifier: '',
      age: 18,
      weeklyHours: 25,
      serverExperienceTime: '1 év',
      wasLeaderBefore: true,
      pastExperienceDesc: data.experience || ''
    },
    faction: {
      fullName: data.factionName || 'Ismeretlen',
      tag: (data.factionName?.slice(0, 4) || 'TAG').toUpperCase(),
      type: data.factionType || 'gang',
      leaderIC: data.leaderIC || '',
      coLeaderIC: data.coLeader || '',
      initialMembersCount: parseInt(data.membersCount) || 5,
      plannedMaxMembers: 15,
      primaryColor: data.color || '#f59e0b',
      secondaryColor: '#000000'
    },
    lore: {
      backstory: data.backstory || '',
      whyFormed: 'Közös RP célok és új színfolt a város életében',
      whyLosSantos: 'Itt a legaktívabb a közösségi és alvilági élet',
      mainGoal: 'Minőségi RP és szervezett közösségi élmény',
      valuesAndPrinciples: 'Tisztelet, hűség, szabályok betartása',
      uniqueness: 'Egyedi történet és változatos események'
    },
    rpPlan: {
      rpVision: data.rpPlan || data.backstory || '',
      civilianInteraction: 'Kereskedelmi és védelmi szálak',
      otherFactionsInteraction: 'Tárgyalások, szövetségek és tiszta RP konfliktusok',
      policeRelation: 'Reális életféltés és taktikus menekülés, DM kerülés',
      legalActivities: 'Autós találkozók, szórakozóhelyek',
      illegalActivities: 'Feketepiac, területszerzés',
      moneyMakingModel: 'Kereskedelem és rendezvényszervezés',
      offPeakPlan: 'Belső frakció RP, gyűlések, toborzás',
      antiGunplayStrategy: 'Tárgyalások előnyben részesítése, csak végső esetben fegyver',
      scenarios: [
        'Civil szórakozóhely megnyitása és védelem kialakítása',
        'Tárgyalás rivális csoporttal területfelosztásról',
        'Frakció belső avatási rituálé és eskütétel'
      ]
    },
    members: [
      {
        discordTag: data.leaderDiscord || '',
        discordId: data.leaderDiscordId || '',
        fivemName: data.leaderIC || '',
        plannedRank: 'Leader',
        roleTitle: 'Alapító'
      }
    ],
    appearance: {
      logoUrl: '',
      referenceImages: [],
      clothingStyle: 'Egységes frakció stílus és színek',
      vehiclesPlanned: 'Frakció színű gépjárművek',
      hqVision: data.hqLocation || '',
      hqCoordinates: ''
    },
    source: data.source || 'web'
  };

  return await submitFullFactionApplication(client, fullApp);
}

// ========================================================
// 2. DISCORD STAFF NOTIFICATION EMBED (`📥・frakció-kérelmek`)
// ========================================================
export async function sendStaffApplicationNotification(
  client: Client,
  guild: Guild,
  app: FactionApplicationFull
) {
  // Find or create the `📥・frakció-kérelmek` channel
  let staffChannel = guild.channels.cache.find(
    c => c.name.includes('frakció-kérelmek') || c.name.includes('frakcio-kerelmek') || c.name.includes('igénylések')
  ) as TextChannel;

  if (!staffChannel) {
    // Find staff category
    const staffCat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name.includes('STAFF') || c.name.includes('ADMIN') || c.name.includes('VEZETŐSÉG')));
    staffChannel = await guild.channels.create({
      name: '📥・frakció-kérelmek',
      type: ChannelType.GuildText,
      parent: staffCat ? staffCat.id : undefined,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });
    // Add staff overwrites
    guild.roles.cache.forEach(r => {
      const n = r.name.toLowerCase();
      if (n.includes('admin') || n.includes('staff') || n.includes('tulajdonos') || n.includes('vezetőség')) {
        staffChannel.permissionOverwrites.create(r.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        }).catch(() => {});
      }
    });
  }

  const typeMeta = FACTION_TYPE_META[app.faction.type] || FACTION_TYPE_META.gang;

  const embed = new EmbedBuilder()
    .setTitle(`🏴 Új frakciókérelem • ${app.faction.fullName}`)
    .setDescription(
      `Egy játékos új frakció alapítási kérelmet nyújtott be a webes felületen.\n\n` +
      `**Frakció:** ${app.faction.fullName}\n` +
      `**Rövidítés:** \`[${app.faction.tag}]\`\n` +
      `**Típus:** ${typeMeta.emoji} ${typeMeta.label}\n` +
      `**Vezető:** ${app.applicant.fivemCharacterName} (${app.applicant.discordTag})\n` +
      `**Induló tagok:** ${app.faction.initialMembersCount} fő (Tervezett max: ${app.faction.plannedMaxMembers} fő)\n` +
      `**Beküldő:** <@${app.applicant.discordId || '0'}> (\`${app.applicant.discordTag}\`)\n` +
      `**Státusz:** 🟡 **Elbírálás alatt**`
    )
    .setColor(app.faction.primaryColor as ColorResolvable || '#f59e0b')
    .addFields([
      { name: '📍 Tervezett HQ', value: app.appearance.hqVision || 'Nincs megadva', inline: true },
      { name: '🎨 Fő szín', value: `\`${app.faction.primaryColor}\``, inline: true },
      { name: '⏳ Heti aktivitás', value: `${app.applicant.weeklyHours} óra`, inline: true },
      { name: '📖 Háttértörténet kivonat', value: app.lore.backstory.slice(0, 300) + (app.lore.backstory.length > 300 ? '...' : ''), inline: false },
      { name: '🎯 RP Célkitűzés', value: app.rpPlan.rpVision.slice(0, 300) + (app.rpPlan.rpVision.length > 300 ? '...' : ''), inline: false }
    ])
    .setFooter({ text: `Kérelem ID: ${app.id} • Nexus Horizon RP Frakció Rendszer` })
    .setTimestamp();

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`fac_view_details:${app.id}`)
      .setLabel('👁 Megtekintés')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`fac_interview_room:${app.id}`)
      .setLabel('💬 Interjú')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎤'),
    new ButtonBuilder()
      .setCustomId(`fac_request_changes:${app.id}`)
      .setLabel('📝 Módosítás kérése')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`fac_approve_confirm:${app.id}`)
      .setLabel('✅ Elfogadás & Létrehozás')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`fac_reject_prompt:${app.id}`)
      .setLabel('❌ Elutasítás')
      .setStyle(ButtonStyle.Danger)
  );

  await staffChannel.send({ embeds: [embed], components: [row1, row2] });
}

// ========================================================
// 3. CREATE PRIVATE INTERVIEW ROOM (`🎤・interju-[tag]`)
// ========================================================
export async function createInterviewChannel(
  client: Client,
  guildId: string,
  appId: string,
  staffUser: { id: string; username?: string; tag?: string }
): Promise<{ success: boolean; message: string; channelId?: string }> {
  const app = factionApplications.get(appId);
  if (!app) return { success: false, message: 'A kérelem nem található.' };

  const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
  if (!guild) return { success: false, message: 'Discord szerver nem elérhető.' };

  try {
    const safeTag = app.faction.tag.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 10);
    const channelName = `🎤・interju-${safeTag || 'frakcio'}`;

    // Overwrites: Staff + Applicant
    const overwrites: any[] = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ];

    // Add Staff
    guild.roles.cache.forEach(r => {
      const n = r.name.toLowerCase();
      if (n.includes('admin') || n.includes('staff') || n.includes('tulajdonos') || n.includes('vezetőség') || n.includes('frakció')) {
        overwrites.push({
          id: r.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        });
      }
    });

    // Add Applicant
    let applicantMember = app.applicant.discordId ? guild.members.cache.get(app.applicant.discordId) : null;
    if (!applicantMember && app.applicant.discordTag) {
      applicantMember = guild.members.cache.find(m => 
        m.user.tag.toLowerCase() === app.applicant.discordTag.toLowerCase() ||
        m.user.username.toLowerCase() === app.applicant.discordTag.toLowerCase()
      ) || null;
    }

    if (applicantMember) {
      overwrites.push({
        id: applicantMember.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles
        ]
      });
    }

    // Find parent category
    const parentCategory = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && (c.name.includes('ÜGYINTÉZÉS') || c.name.includes('INTERJÚ') || c.name.includes('FRAKCIÓ'))
    );

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategory ? parentCategory.id : undefined,
      permissionOverwrites: overwrites
    });

    app.interviewChannelId = channel.id;
    app.status = 'interview';
    factionApplications.set(appId, app);

    // Initial message strictly as required:
    const embed = new EmbedBuilder()
      .setTitle('🎤 Frakcióinterjú')
      .setDescription(
        `Ez a szoba a frakciókérelemmel kapcsolatos interjú és egyeztetés helyszíne.\n` +
        `Itt a staff további kérdéseket tehet fel a frakcióvezetőnek.\n` +
        `Kérjük, hogy az interjú során minden kérdésre részletesen és őszintén válaszolj.\n\n` +
        `**Frakció:** ${app.faction.fullName} (\`[${app.faction.tag}]\`)\n` +
        `**Pályázó:** ${applicantMember ? `<@${applicantMember.id}>` : app.applicant.discordTag}\n` +
        `**Interjút kezdeményezte:** ${staffUser.username || staffUser.tag || 'Staff'}`
      )
      .setColor('#3b82f6')
      .setFooter({ text: `Kérelem ID: ${app.id} • Nexus Horizon RP` })
      .setTimestamp();

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`fac_approve_confirm:${app.id}`)
        .setLabel('✅ Elfogadás')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`fac_reject_prompt:${app.id}`)
        .setLabel('❌ Elutasítás')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Interjú Lezárása')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: applicantMember ? `<@${applicantMember.id}>` : undefined,
      embeds: [embed],
      components: [actionRow]
    });

    return {
      success: true,
      message: `Interjú szoba sikeresen létrehozva: #${channel.name}`,
      channelId: channel.id
    };
  } catch (err: any) {
    return { success: false, message: `Hiba az interjú szoba létrehozásakor: ${err.message}` };
  }
}

// ========================================================
// 4. APPROVE & AUTOMATICALLY PROVISION DISCORD CHANNELS & ROLES
// ========================================================
export async function approveAndProvisionFaction(
  client: Client,
  guildId: string,
  appId: string,
  approverUser: { id: string; tag?: string; username?: string }
): Promise<{ success: boolean; message: string; faction?: FactionData }> {
  const app = factionApplications.get(appId);
  if (!app) {
    return { success: false, message: 'Nem található a megadott frakció kérelem.' };
  }

  const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
  if (!guild) {
    return { success: false, message: 'Discord szerver nem elérhető.' };
  }

  const typeMeta = FACTION_TYPE_META[app.faction.type] || FACTION_TYPE_META.gang;

  try {
    const roleColor: ColorResolvable = (app.faction.primaryColor || '#f59e0b') as ColorResolvable;

    // 1. Create Distinct Faction Roles:
    // 1.1 Leader Role: 👑 [TAG] | Leader
    const leaderRoleName = `👑 [${app.faction.tag}] | Leader`;
    let leaderRole = guild.roles.cache.find(r => r.name.toLowerCase() === leaderRoleName.toLowerCase());
    if (!leaderRole) {
      leaderRole = await guild.roles.create({
        name: leaderRoleName,
        color: '#fbbf24',
        mentionable: true,
        hoist: true,
        reason: `Automatikus Frakció Leader Szerepkör: ${app.faction.fullName}`
      });
    }

    // 1.2 Co-Leader Role: 🛡️ [TAG] | Co-Leader
    const coLeaderRoleName = `🛡️ [${app.faction.tag}] | Co-Leader`;
    let coLeaderRole = guild.roles.cache.find(r => r.name.toLowerCase() === coLeaderRoleName.toLowerCase());
    if (!coLeaderRole) {
      coLeaderRole = await guild.roles.create({
        name: coLeaderRoleName,
        color: '#f59e0b',
        mentionable: true,
        hoist: true,
        reason: `Automatikus Frakció Co-Leader Szerepkör: ${app.faction.fullName}`
      });
    }

    // 1.3 Member Role: 🏴 [TAG] | Member
    const memberRoleName = `🏴 [${app.faction.tag}] | Member`;
    let memberRole = guild.roles.cache.find(r => r.name.toLowerCase() === memberRoleName.toLowerCase());
    if (!memberRole) {
      memberRole = await guild.roles.create({
        name: memberRoleName,
        color: roleColor,
        mentionable: true,
        hoist: true,
        reason: `Automatikus Frakció Member Szerepkör: ${app.faction.fullName}`
      });
    }

    // 2. Assign Leader role to applicant
    let leaderMember: GuildMember | null = null;
    if (app.applicant.discordId) {
      leaderMember = guild.members.cache.get(app.applicant.discordId) || null;
    }
    if (!leaderMember && app.applicant.discordTag) {
      leaderMember = guild.members.cache.find(m => 
        m.user.tag.toLowerCase() === app.applicant.discordTag.toLowerCase() ||
        m.user.username.toLowerCase() === app.applicant.discordTag.toLowerCase()
      ) || null;
    }

    if (leaderMember) {
      try {
        await leaderMember.roles.add([leaderRole.id, memberRole.id]);
      } catch (err: any) {
        console.warn(`[Factions] Failed to assign roles to leader:`, err.message);
      }
    }

    // 3. Create Discord Category: 🏴 [FAKCIÓ NEVE]
    const categoryName = `🏴・${app.faction.fullName.toUpperCase()}`;

    const baseOverwrites: any[] = [
      {
        id: guild.roles.everyone.id,
        deny: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.Connect
        ]
      },
      {
        id: memberRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.AddReactions
        ]
      },
      {
        id: leaderRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.MentionEveryone
        ]
      }
    ];

    // Staff access
    guild.roles.cache.forEach(role => {
      const name = role.name.toLowerCase();
      if (name.includes('admin') || name.includes('staff') || name.includes('tulajdonos') || name.includes('vezetőség')) {
        baseOverwrites.push({
          id: role.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.Connect
          ]
        });
      }
    });

    const category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: baseOverwrites
    });

    // 4. Create Standard Channels:
    // 4.1 👋・utmutato (Read-only for members)
    const guideChannel = await guild.channels.create({
      name: '👋・utmutato',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        ...baseOverwrites,
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // 4.2 📢・hirdetmenyek (Leader & Co-Leader post only)
    const announcementsChannel = await guild.channels.create({
      name: '📢・hirdetmenyek',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        ...baseOverwrites,
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages]
        },
        {
          id: leaderRole.id,
          allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.MentionEveryone]
        },
        {
          id: coLeaderRole.id,
          allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.MentionEveryone]
        }
      ]
    });

    // 4.3 💬・frakcio-chat (Members chat)
    const chatChannel = await guild.channels.create({
      name: '💬・frakcio-chat',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: baseOverwrites
    });

    // 4.4 📋・informaciok
    const infoChannel = await guild.channels.create({
      name: '📋・informaciok',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        ...baseOverwrites,
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // 4.5 👥・taglista (Roster)
    const rosterChannel = await guild.channels.create({
      name: '👥・taglista',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        ...baseOverwrites,
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // 4.6 📅・esemenyek (Events)
    const eventsChannel = await guild.channels.create({
      name: '📅・esemenyek',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: baseOverwrites
    });

    // 4.7 🔒・vezetoseg-chat (Only Leader & Co-Leader & Staff)
    const leaderChatChannel = await guild.channels.create({
      name: '🔒・vezetoseg-chat',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: memberRole.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: leaderRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        },
        {
          id: coLeaderRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        }
      ]
    });

    // 4.8 📑・frakcio-log (Audit Log)
    const logChannel = await guild.channels.create({
      name: '📑・frakcio-log',
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        ...baseOverwrites,
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // 4.9 Voice Channels
    const voiceGeneral = await guild.channels.create({
      name: '🔊・Frakció',
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: baseOverwrites
    });

    const voiceMeeting = await guild.channels.create({
      name: '🔊・Meeting',
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: baseOverwrites
    });

    const voiceLeader = await guild.channels.create({
      name: '🔒・Vezetőség',
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
        },
        {
          id: memberRole.id,
          deny: [PermissionsBitField.Flags.Connect],
          allow: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: leaderRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
        },
        {
          id: coLeaderRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
        }
      ]
    });

    // 5. Populate Initial Embeds:
    // 5.1 Guide in `👋・utmutato`
    const guideEmbed = new EmbedBuilder()
      .setTitle(`👋 Üdvözlünk a(z) ${app.faction.fullName} frakcióban!`)
      .setDescription(
        `Ez a csatorna a frakció hivatalos útmutatója és belépési tájékoztatója.\n\n` +
        `**Frakció Neve:** ${app.faction.fullName} (\`[${app.faction.tag}]\`)\n` +
        `**Frakció Típusa:** ${typeMeta.emoji} ${typeMeta.label}\n` +
        `**Leader:** ${app.faction.leaderIC} (${app.applicant.discordTag})\n` +
        `**Bázis / HQ:** ${app.appearance.hqVision || 'Kijelölt zóna'}\n\n` +
        `📌 **Alapvető szabályok tagoknak:**\n` +
        `1. A szerver és a frakciók szabályzatát minden tag köteles maradéktalanul betartani.\n` +
        `2. Tilos a NonRP, PG, MG és az indokolatlan fegyverhasználat (DM).\n` +
        `3. A belső csatornák tartalmát tilos OOC kiszivárogtatni.\n` +
        `4. Kérdés vagy probléma esetén a Leaderhez és Co-Leaderhez fordulhatsz.`
      )
      .setColor(roleColor)
      .setFooter({ text: 'Nexus Horizon RP • Frakció Rendszer' })
      .setTimestamp();

    await guideChannel.send({ embeds: [guideEmbed] });

    // 5.2 Information in `📋・informaciok`
    const infoEmbed = new EmbedBuilder()
      .setTitle(`📋 ${app.faction.fullName} • Frakció Információk`)
      .setDescription(
        `**Történet & Célok:**\n${app.lore.backstory}\n\n` +
        `**Értékek és elvek:**\n${app.lore.valuesAndPrinciples || 'Tisztelet és hűség'}\n\n` +
        `**Tervezett RP Tevékenységek:**\n${app.rpPlan.rpVision}`
      )
      .setColor(roleColor)
      .addFields([
        { name: '👑 Leader Rang', value: `<@&${leaderRole.id}>`, inline: true },
        { name: '🛡️ Co-Leader Rang', value: `<@&${coLeaderRole.id}>`, inline: true },
        { name: '🏴 Tag Rang', value: `<@&${memberRole.id}>`, inline: true }
      ])
      .setTimestamp();

    await infoChannel.send({ embeds: [infoEmbed] });

    // 5.3 Initial Roster in `👥・taglista`
    const rosterEmbed = new EmbedBuilder()
      .setTitle(`👥 ${app.faction.fullName} • Taglista`)
      .setDescription(`Jelenlegi aktív taglétszám: **1 fő**`)
      .setColor(roleColor)
      .addFields([
        { 
          name: '👑 Vezetőség (Leader & Co-Leader)', 
          value: `• **${app.faction.leaderIC}** (${leaderMember ? `<@${leaderMember.id}>` : app.applicant.discordTag}) - *Leader*` + 
                 (app.faction.coLeaderIC ? `\n• **${app.faction.coLeaderIC}** - *Co-Leader*` : ''), 
          inline: false 
        },
        { 
          name: '🏴 Tagok', 
          value: app.members.filter(m => m.plannedRank !== 'Leader').map(m => `• **${m.fivemName}** (\`${m.discordTag}\`) - *${m.plannedRank}*`).join('\n') || '*Jelenleg nincs további felvett tag.*', 
          inline: false 
        }
      ])
      .setTimestamp();

    await rosterChannel.send({ embeds: [rosterEmbed] });

    // 5.4 Initial Welcome in `💬・frakcio-chat`
    await chatChannel.send({
      content: `🎉 Üdvözlünk mindenkit a(z) **${app.faction.fullName}** frakció csevegőjében! Jó és élvezetes szerepjátékot kívánunk!`
    });

    // 5.5 Initial Audit Log in `📑・frakcio-log`
    const initialLogEmbed = new EmbedBuilder()
      .setTitle('📑 Frakció Létrehozva & Aktiválva')
      .setDescription(
        `A frakciót hivatalosan jóváhagyta és legenerálta a vezetőség.\n\n` +
        `**Bíráló:** ${approverUser.username || approverUser.tag || 'Adminisztrátor'}\n` +
        `**Időpont:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor('#10b981')
      .setTimestamp();

    await logChannel.send({ embeds: [initialLogEmbed] });

    // 6. Create Active Faction Record
    const factionId = `faction_${Date.now()}_${app.faction.tag.toLowerCase()}`;
    const initialMembers: FactionMember[] = [
      {
        id: `mem_1`,
        discordTag: app.applicant.discordTag,
        discordId: app.applicant.discordId,
        fivemName: app.applicant.fivemCharacterName,
        fivemIdentifier: app.applicant.fivemIdentifier,
        rank: 'Leader',
        rankLevel: 1,
        roleTitle: 'Alapító / Frakcióvezető',
        joinedAt: new Date().toISOString(),
        status: 'active'
      }
    ];

    const newFaction: FactionData = {
      id: factionId,
      applicationId: app.id,
      name: app.faction.fullName,
      tag: app.faction.tag,
      type: app.faction.type,
      leaderIC: app.faction.leaderIC,
      leaderDiscord: app.applicant.discordTag,
      leaderDiscordId: app.applicant.discordId,
      coLeaderIC: app.faction.coLeaderIC,
      membersCount: 1,
      maxMembers: app.faction.plannedMaxMembers,
      primaryColor: app.faction.primaryColor,
      secondaryColor: app.faction.secondaryColor,
      hqLocation: app.appearance.hqVision,
      hqCoordinates: app.appearance.hqCoordinates,
      logoUrl: app.appearance.logoUrl,
      clothingStyle: app.appearance.clothingStyle,
      vehiclesPlanned: app.appearance.vehiclesPlanned,
      backstory: app.lore.backstory,
      rpPlan: app.rpPlan.rpVision,
      status: 'active',
      warnCount: 0,
      warns: [],
      ranks: app.ranks as FactionRank[],
      members: initialMembers,
      events: [],
      discordInfo: {
        guildId: guild.id,
        categoryId: category.id,
        roleId: memberRole.id,
        leaderRoleId: leaderRole.id,
        coLeaderRoleId: coLeaderRole.id,
        memberRoleId: memberRole.id,
        infoChannelId: infoChannel.id,
        announcementsChannelId: announcementsChannel.id,
        chatChannelId: chatChannel.id,
        rosterChannelId: rosterChannel.id,
        eventsChannelId: eventsChannel.id,
        leaderChatChannelId: leaderChatChannel.id,
        logChannelId: logChannel.id,
        voiceGeneralId: voiceGeneral.id,
        voiceMeetingId: voiceMeeting.id,
        voiceLeaderId: voiceLeader.id
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    activeFactions.set(factionId, newFaction);

    // Save to Firestore
    try {
      setDoc(doc(db, 'active_factions', factionId), newFaction).catch(() => {});
    } catch (e) {}

    addAuditLog(factionId, {
      factionId,
      action: 'approve',
      executor: approverUser.username || approverUser.tag || 'Admin',
      details: `Frakció elfogadva és Discord struktúra legenerálva.`
    });

    // 7. Update Application status
    app.status = 'approved';
    app.reviewedBy = approverUser.username || approverUser.tag || approverUser.id;
    app.reviewedAt = new Date().toISOString();
    app.categoryCreatedId = category.id;
    app.roleCreatedId = memberRole.id;
    factionApplications.set(appId, app);

    try {
      updateDoc(doc(db, 'faction_applications', appId), {
        status: 'approved',
        reviewedBy: app.reviewedBy,
        reviewedAt: app.reviewedAt,
        categoryCreatedId: category.id,
        roleCreatedId: memberRole.id
      }).catch(() => {});
    } catch (e) {}

    // 8. If interview or review channel exists, notify there
    if (app.interviewChannelId) {
      const ch = guild.channels.cache.get(app.interviewChannelId) as TextChannel;
      if (ch) {
        const approvedNotice = new EmbedBuilder()
          .setTitle('🎉 Frakciókérelem Jóváhagyva!')
          .setDescription(
            `A(z) **${app.faction.fullName}** frakció kérelme elfogadásra került!\n\n` +
            `📁 **Létrehozott kategória:** <#${category.id}>\n` +
            `👑 **Leader rang:** <@&${leaderRole.id}>\n` +
            `🏴 **Member rang:** <@&${memberRole.id}>\n\n` +
            `Jó szerepjátékot kívánunk!`
          )
          .setColor('#10b981')
          .setTimestamp();

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Szoba Lezárása').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await ch.send({ embeds: [approvedNotice], components: [closeRow] }).catch(() => {});
      }
    }

    return {
      success: true,
      message: `A(z) ${app.faction.fullName} frakció és teljes Discord struktúrája (${category.name}) sikeresen létrejött!`,
      faction: newFaction
    };

  } catch (error: any) {
    console.error('[Factions] Error provisioning faction structure:', error);
    return { success: false, message: `Hiba a frakció szobák létrehozásakor: ${error.message}` };
  }
}

// ========================================================
// 5. REJECT FACTION APPLICATION
// ========================================================
export async function rejectFactionApplication(
  client: Client,
  guildId: string,
  appId: string,
  rejectorUser: { id: string; tag?: string; username?: string },
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const app = factionApplications.get(appId);
  if (!app) return { success: false, message: 'Kérelem nem található.' };

  app.status = 'rejected';
  app.rejectReason = reason || 'A vezetőség elbírálása alapján nem felelt meg az elvárt követelményeknek.';
  app.reviewedBy = rejectorUser.username || rejectorUser.tag || rejectorUser.id;
  app.reviewedAt = new Date().toISOString();
  factionApplications.set(appId, app);

  try {
    updateDoc(doc(db, 'faction_applications', appId), {
      status: 'rejected',
      rejectReason: app.rejectReason,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt
    }).catch(() => {});
  } catch (e) {}

  if (client && client.isReady()) {
    const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
    if (guild && app.interviewChannelId) {
      const ch = guild.channels.cache.get(app.interviewChannelId) as TextChannel;
      if (ch) {
        const rejectEmbed = new EmbedBuilder()
          .setTitle('🔴 Frakciókérelem Elutasítva')
          .setDescription(
            `A(z) **${app.faction.fullName}** frakció alapítási kérelme elutasításra került.\n\n` +
            `**Indoklás:** ${app.rejectReason}\n` +
            `**Bírálta:** ${rejectorUser.username || rejectorUser.tag}`
          )
          .setColor('#ef4444')
          .setTimestamp();

        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('close_ticket').setLabel('Szoba Lezárása').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await ch.send({ embeds: [rejectEmbed], components: [closeRow] }).catch(() => {});
      }
    }
  }

  return { success: true, message: 'A frakciókérelem sikeresen elutasítva.' };
}

// ========================================================
// 6. REQUEST APPLICATION CHANGES
// ========================================================
export async function requestApplicationChanges(
  client: Client,
  guildId: string,
  appId: string,
  staffUser: { id: string; tag?: string; username?: string },
  changesReason: string
): Promise<{ success: boolean; message: string }> {
  const app = factionApplications.get(appId);
  if (!app) return { success: false, message: 'Kérelem nem található.' };

  app.status = 'changes_requested';
  app.changesRequestedReason = changesReason;
  app.reviewedBy = staffUser.username || staffUser.tag;
  app.reviewedAt = new Date().toISOString();
  factionApplications.set(appId, app);

  try {
    updateDoc(doc(db, 'faction_applications', appId), {
      status: 'changes_requested',
      changesRequestedReason: changesReason,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt
    }).catch(() => {});
  } catch (e) {}

  if (client && client.isReady()) {
    const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
    if (guild && app.interviewChannelId) {
      const ch = guild.channels.cache.get(app.interviewChannelId) as TextChannel;
      if (ch) {
        const changesEmbed = new EmbedBuilder()
          .setTitle('📝 Módosítás Kérése a Frakciókérelemhez')
          .setDescription(
            `A vezetőség átnézte a jelentkezést, és az alábbi pontok javítását kéri:\n\n` +
            `**Kért módosítások:**\n${changesReason}\n\n` +
            `Kérjük, egyeztess a vezetőséggel ebben a szobában a módosításokról!`
          )
          .setColor('#f59e0b')
          .setTimestamp();

        await ch.send({ embeds: [changesEmbed] }).catch(() => {});
      }
    }
  }

  return { success: true, message: 'Módosítási kérelem rögzítve.' };
}

// ========================================================
// 7. FACTION MEMBER MANAGEMENT (ADD, REMOVE, RANK CHANGE)
// ========================================================
export async function addFactionMember(
  client: Client | null,
  factionId: string,
  memberData: {
    discordTag: string;
    discordId?: string;
    fivemName: string;
    fivemIdentifier?: string;
    rank?: string;
    rankLevel?: number;
    roleTitle?: string;
    notes?: string;
  },
  executorName: string
): Promise<{ success: boolean; message: string; member?: FactionMember }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  const memberId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newMember: FactionMember = {
    id: memberId,
    discordTag: memberData.discordTag,
    discordId: memberData.discordId,
    fivemName: memberData.fivemName,
    fivemIdentifier: memberData.fivemIdentifier,
    rank: memberData.rank || 'Member',
    rankLevel: memberData.rankLevel || 4,
    roleTitle: memberData.roleTitle || 'Tag',
    notes: memberData.notes || '',
    joinedAt: new Date().toISOString(),
    status: 'active'
  };

  faction.members.push(newMember);
  faction.membersCount = faction.members.filter(m => m.status === 'active').length;
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'member_add',
    executor: executorName,
    details: `Új tag felvéve: ${newMember.fivemName} (${newMember.discordTag}) - Rang: ${newMember.rank}`
  });

  // Discord role assignment & welcome message
  if (client && client.isReady() && faction.discordInfo.guildId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        // Assign role
        let discordMember: GuildMember | null = null;
        if (newMember.discordId) {
          discordMember = guild.members.cache.get(newMember.discordId) || null;
        }
        if (!discordMember && newMember.discordTag) {
          discordMember = guild.members.cache.find(m => 
            m.user.tag.toLowerCase() === newMember.discordTag.toLowerCase() ||
            m.user.username.toLowerCase() === newMember.discordTag.toLowerCase()
          ) || null;
        }

        if (discordMember && faction.discordInfo.memberRoleId) {
          await discordMember.roles.add(faction.discordInfo.memberRoleId).catch(() => {});
        }

        // Welcome message in `💬・frakcio-chat` strictly formatted as requested:
        if (faction.discordInfo.chatChannelId) {
          const chatCh = guild.channels.cache.get(faction.discordInfo.chatChannelId) as TextChannel;
          if (chatCh) {
            const welcomeMsgEmbed = new EmbedBuilder()
              .setTitle('👋 Új frakciótag!')
              .setDescription(
                `Üdvözlünk, ${discordMember ? `<@${discordMember.id}>` : newMember.discordTag}!\n\n` +
                `Csatlakoztál a következő frakcióhoz: **${faction.name}**\n` +
                `Rangod: **${newMember.rank}**\n\n` +
                `Első lépésként olvasd el: <#${faction.discordInfo.infoChannelId || ''}> csatornát.\n\n` +
                `Jó RP-t kívánunk!`
              )
              .setColor(faction.primaryColor as ColorResolvable || '#f59e0b')
              .setTimestamp();

            await chatCh.send({ 
              content: discordMember ? `<@${discordMember.id}>` : undefined, 
              embeds: [welcomeMsgEmbed] 
            }).catch(() => {});
          }
        }

        // Update Roster in `👥・taglista`
        await updateDiscordRosterEmbed(guild, faction);

        // Send log entry in `📑・frakcio-log`
        if (faction.discordInfo.logChannelId) {
          const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
          if (logCh) {
            const logEmb = new EmbedBuilder()
              .setTitle('📥 Tagfelvétel Napló')
              .setDescription(
                `**Felvett tag:** ${newMember.fivemName} (${newMember.discordTag})\n` +
                `**Kezdő rang:** ${newMember.rank}\n` +
                `**Műveletet végezte:** ${executorName}`
              )
              .setColor('#10b981')
              .setTimestamp();
            await logCh.send({ embeds: [logEmb] }).catch(() => {});
          }
        }
      }
    } catch (e: any) {
      console.error('[Factions] Error during member add Discord actions:', e.message);
    }
  }

  return { success: true, message: `Tag (${newMember.fivemName}) sikeresen hozzáadva!`, member: newMember };
}

export async function removeFactionMember(
  client: Client | null,
  factionId: string,
  memberId: string,
  reason: string,
  executorName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  const member = faction.members.find(m => m.id === memberId);
  if (!member) return { success: false, message: 'Tag nem található a frakcióban.' };

  member.status = 'kicked';
  faction.membersCount = faction.members.filter(m => m.status === 'active').length;
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'member_remove',
    executor: executorName,
    details: `Tag eltávolítva: ${member.fivemName} (${member.discordTag}) - Indok: ${reason}`
  });

  // Remove role and log in Discord
  if (client && client.isReady() && faction.discordInfo.guildId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        let discordMember: GuildMember | null = null;
        if (member.discordId) {
          discordMember = guild.members.cache.get(member.discordId) || null;
        }
        if (!discordMember && member.discordTag) {
          discordMember = guild.members.cache.find(m => m.user.tag.toLowerCase() === member.discordTag.toLowerCase()) || null;
        }

        if (discordMember) {
          const rolesToRemove = [
            faction.discordInfo.memberRoleId,
            faction.discordInfo.leaderRoleId,
            faction.discordInfo.coLeaderRoleId
          ].filter(Boolean) as string[];
          await discordMember.roles.remove(rolesToRemove).catch(() => {});
        }

        await updateDiscordRosterEmbed(guild, faction);

        if (faction.discordInfo.logChannelId) {
          const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
          if (logCh) {
            const logEmb = new EmbedBuilder()
              .setTitle('📤 Tag Eltávolítás Napló')
              .setDescription(
                `**Eltávolított tag:** ${member.fivemName} (${member.discordTag})\n` +
                `**Volt rangja:** ${member.rank}\n` +
                `**Indoklás:** ${reason}\n` +
                `**Műveletet végezte:** ${executorName}`
              )
              .setColor('#ef4444')
              .setTimestamp();
            await logCh.send({ embeds: [logEmb] }).catch(() => {});
          }
        }
      }
    } catch (e: any) {
      console.error('[Factions] Error during member remove Discord actions:', e.message);
    }
  }

  return { success: true, message: `Tag (${member.fivemName}) sikeresen eltávolítva!` };
}

export async function changeFactionMemberRank(
  client: Client | null,
  factionId: string,
  memberId: string,
  newRank: string,
  newRankLevel: number,
  executorName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  const member = faction.members.find(m => m.id === memberId);
  if (!member) return { success: false, message: 'Tag nem található.' };

  const oldRank = member.rank;
  member.rank = newRank;
  member.rankLevel = newRankLevel;
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'rank_change',
    executor: executorName,
    details: `Rangmódosítás: ${member.fivemName} (${oldRank} ➔ ${newRank})`
  });

  if (client && client.isReady() && faction.discordInfo.guildId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        await updateDiscordRosterEmbed(guild, faction);

        if (faction.discordInfo.logChannelId) {
          const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
          if (logCh) {
            const logEmb = new EmbedBuilder()
              .setTitle('⚡ Rangmódosítás Napló')
              .setDescription(
                `**Tag:** ${member.fivemName} (${member.discordTag})\n` +
                `**Új rang:** ${newRank} (Előző: ${oldRank})\n` +
                `**Módosította:** ${executorName}`
              )
              .setColor('#3b82f6')
              .setTimestamp();
            await logCh.send({ embeds: [logEmb] }).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Rang sikeresen módosítva: ${newRank}` };
}

// ========================================================
// 8. FACTION ANNOUNCEMENTS & EVENTS (LEADER FEATURES)
// ========================================================
export async function postFactionAnnouncement(
  client: Client | null,
  factionId: string,
  title: string,
  message: string,
  authorName: string,
  pingEveryone: boolean = false
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  addAuditLog(factionId, {
    factionId,
    action: 'announcement',
    executor: authorName,
    details: `Hirdetmény közzétéve: ${title}`
  });

  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.announcementsChannelId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const channel = guild.channels.cache.get(faction.discordInfo.announcementsChannelId) as TextChannel;
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(`📢 ${title}`)
            .setDescription(message)
            .setColor(faction.primaryColor as ColorResolvable || '#f59e0b')
            .setFooter({ text: `Közzétette: ${authorName} • ${faction.name}` })
            .setTimestamp();

          await channel.send({
            content: pingEveryone ? `@everyone` : undefined,
            embeds: [embed]
          });
          return { success: true, message: 'Hirdetmény sikeresen kiküldve a Discord csatornába!' };
        }
      }
    } catch (e: any) {
      return { success: false, message: `Hiba a hirdetmény küldésekor: ${e.message}` };
    }
  }

  return { success: true, message: 'Hirdetmény rögzítve.' };
}

export async function createFactionEvent(
  client: Client | null,
  factionId: string,
  eventData: {
    title: string;
    description: string;
    date: string;
    location: string;
  },
  authorName: string
): Promise<{ success: boolean; message: string; event?: FactionEvent }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newEvent: FactionEvent = {
    id: eventId,
    factionId,
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    location: eventData.location,
    createdBy: authorName,
    createdAt: new Date().toISOString(),
    attendees: {
      accepted: [],
      declined: [],
      tentative: []
    }
  };

  faction.events.push(newEvent);
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'event_created',
    executor: authorName,
    details: `Új frakció esemény létrehozva: ${newEvent.title} (${newEvent.date})`
  });

  // Post to Discord `📅・esemenyek` with RSVP buttons
  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.eventsChannelId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const channel = guild.channels.cache.get(faction.discordInfo.eventsChannelId) as TextChannel;
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(`📅 Új Esemény • ${newEvent.title}`)
            .setDescription(newEvent.description)
            .setColor(faction.primaryColor as ColorResolvable || '#3b82f6')
            .addFields([
              { name: '⏰ Időpont', value: newEvent.date, inline: true },
              { name: '📍 Helyszín', value: newEvent.location, inline: true },
              { name: '👤 Szervező', value: authorName, inline: true },
              { name: '✅ Résztvevők (0)', value: '*Még senki nem jelzett vissza*', inline: true },
              { name: '❌ Nem vesz részt (0)', value: '*Nincs*', inline: true },
              { name: '❔ Bizonytalan (0)', value: '*Nincs*', inline: true }
            ])
            .setFooter({ text: `Esemény ID: ${newEvent.id}` })
            .setTimestamp();

          const rsvpRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`event_rsvp:yes:${newEvent.id}`)
              .setLabel('✅ Részt veszek')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`event_rsvp:no:${newEvent.id}`)
              .setLabel('❌ Nem veszek részt')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`event_rsvp:maybe:${newEvent.id}`)
              .setLabel('❔ Még nem tudom')
              .setStyle(ButtonStyle.Secondary)
          );

          const msg = await channel.send({ embeds: [embed], components: [rsvpRow] });
          newEvent.messageId = msg.id;
          newEvent.channelId = channel.id;
          activeFactions.set(factionId, faction);
        }
      }
    } catch (e: any) {
      console.error('[Factions] Failed to post event to Discord:', e.message);
    }
  }

  return { success: true, message: 'Esemény sikeresen létrehozva!', event: newEvent };
}

// ========================================================
// 9. STAFF ACTIONS (WARN, SUSPEND, UNSUSPEND, ARCHIVE, DISBAND)
// ========================================================
export async function warnFaction(
  client: Client | null,
  factionId: string,
  reason: string,
  staffName: string
): Promise<{ success: boolean; message: string; warnCount: number }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.', warnCount: 0 };

  const warnId = `warn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  const warn: FactionWarn = {
    id: warnId,
    factionId,
    reason,
    givenBy: staffName,
    createdAt: new Date().toISOString(),
    active: true
  };

  faction.warns.push(warn);
  faction.warnCount = faction.warns.filter(w => w.active).length;
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'warn',
    executor: staffName,
    details: `Figyelmeztetés (Warn #${faction.warnCount}) kiosztva: ${reason}`
  });

  // Discord notification to log channel
  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.logChannelId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
        if (logCh) {
          const warnEmbed = new EmbedBuilder()
            .setTitle(`⚠️ FRAKCIÓ FIGYELMEZTETÉS (WARN ${faction.warnCount}/3)`)
            .setDescription(
              `A vezetőség hivatalos figyelmeztetésben részesítette a frakciót.\n\n` +
              `**Indok:** ${reason}\n` +
              `**Admin:** ${staffName}\n` +
              `**Összes aktív warn:** ${faction.warnCount}/3`
            )
            .setColor('#f59e0b')
            .setTimestamp();

          await logCh.send({ embeds: [warnEmbed] }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Figyelmeztetés sikeresen kiosztva (${faction.warnCount}/3)`, warnCount: faction.warnCount };
}

export async function suspendFaction(
  client: Client | null,
  factionId: string,
  reason: string,
  staffName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  faction.status = 'suspended';
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'suspend',
    executor: staffName,
    details: `Frakció felfüggesztve: ${reason}`
  });

  // Discord: Rename category to ⛔・[TAG]・FELFÜGGESZTVE and restrict permissions
  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.categoryId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const cat = guild.channels.cache.get(faction.discordInfo.categoryId);
        if (cat) {
          await cat.setName(`⛔・${faction.tag}・FELFÜGGESZTVE`).catch(() => {});
        }

        if (faction.discordInfo.memberRoleId && cat && 'permissionOverwrites' in cat) {
          await (cat as any).permissionOverwrites.edit(faction.discordInfo.memberRoleId, {
            SendMessages: false,
            Connect: false
          }).catch(() => {});
        }

        if (faction.discordInfo.logChannelId) {
          const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
          if (logCh) {
            const suspEmbed = new EmbedBuilder()
              .setTitle('⛔ FRAKCIÓ FELFÜGGESZTVE')
              .setDescription(
                `A vezetőség felfüggesztette a frakció működését.\n\n` +
                `**Indok:** ${reason}\n` +
                `**Intézkedő staff:** ${staffName}`
              )
              .setColor('#dc2626')
              .setTimestamp();
            await logCh.send({ embeds: [suspEmbed] }).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Frakció (${faction.name}) sikeresen felfüggesztve!` };
}

export async function unsuspendFaction(
  client: Client | null,
  factionId: string,
  staffName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  faction.status = 'active';
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'unsuspend',
    executor: staffName,
    details: `Frakció felfüggesztése feloldva.`
  });

  // Discord: Restore category name and permissions
  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.categoryId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const cat = guild.channels.cache.get(faction.discordInfo.categoryId);
        if (cat) {
          await cat.setName(`🏴・${faction.name.toUpperCase()}`).catch(() => {});
        }

        if (faction.discordInfo.memberRoleId && cat && 'permissionOverwrites' in cat) {
          await (cat as any).permissionOverwrites.edit(faction.discordInfo.memberRoleId, {
            SendMessages: true,
            Connect: true
          }).catch(() => {});
        }

        if (faction.discordInfo.logChannelId) {
          const logCh = guild.channels.cache.get(faction.discordInfo.logChannelId) as TextChannel;
          if (logCh) {
            const unsuspEmb = new EmbedBuilder()
              .setTitle('✅ Frakció Felfüggesztése Feloldva')
              .setDescription(`A frakció jogosultságai visszaállítva.\n**Intézkedő:** ${staffName}`)
              .setColor('#10b981')
              .setTimestamp();
            await logCh.send({ embeds: [unsuspEmb] }).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Frakció felfüggesztése sikeresen feloldva!` };
}

export async function archiveFaction(
  client: Client | null,
  factionId: string,
  staffName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  faction.status = 'archived';
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'archive',
    executor: staffName,
    details: `Frakció archiválva.`
  });

  if (client && client.isReady() && faction.discordInfo.guildId && faction.discordInfo.categoryId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        const cat = guild.channels.cache.get(faction.discordInfo.categoryId);
        if (cat) {
          await cat.setName(`📦・ARCHÍV・${faction.tag}`).catch(() => {});
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Frakció sikeresen archiválva!` };
}

export async function disbandFaction(
  client: Client | null,
  factionId: string,
  reason: string,
  staffName: string
): Promise<{ success: boolean; message: string }> {
  const faction = activeFactions.get(factionId);
  if (!faction) return { success: false, message: 'Frakció nem található.' };

  faction.status = 'disbanded';
  faction.updatedAt = new Date().toISOString();
  activeFactions.set(factionId, faction);

  addAuditLog(factionId, {
    factionId,
    action: 'disband',
    executor: staffName,
    details: `Frakció feloszlatva: ${reason}`
  });

  // Clean up Discord roles or archive
  if (client && client.isReady() && faction.discordInfo.guildId) {
    try {
      const guild = client.guilds.cache.get(faction.discordInfo.guildId);
      if (guild) {
        if (faction.discordInfo.categoryId) {
          const cat = guild.channels.cache.get(faction.discordInfo.categoryId);
          if (cat) {
            await cat.setName(`🗑️・FELOSZLATVA・${faction.tag}`).catch(() => {});
          }
        }
      }
    } catch (e) {}
  }

  return { success: true, message: `Frakció (${faction.name}) sikeresen feloszlatva.` };
}

// ========================================================
// 10. HELPER TO UPDATE DISCORD ROSTER EMBED
// ========================================================
async function updateDiscordRosterEmbed(guild: Guild, faction: FactionData) {
  if (!faction.discordInfo.rosterChannelId) return;
  try {
    const channel = guild.channels.cache.get(faction.discordInfo.rosterChannelId) as TextChannel;
    if (!channel) return;

    const activeMembers = faction.members.filter(m => m.status === 'active');
    const leaders = activeMembers.filter(m => m.rankLevel <= 2);
    const regularMembers = activeMembers.filter(m => m.rankLevel > 2);

    const embed = new EmbedBuilder()
      .setTitle(`👥 ${faction.name} • Hivatalos Taglista`)
      .setDescription(`Aktív tagok létszáma: **${activeMembers.length} fő** (Kapacitás: ${faction.maxMembers} fő)`)
      .setColor(faction.primaryColor as ColorResolvable || '#f59e0b')
      .addFields([
        {
          name: '👑 Vezetőség (Leader & Co-Leader)',
          value: leaders.map(m => `• **${m.fivemName}** (\`${m.discordTag}\`) - *${m.rank}*`).join('\n') || '*Nincs kijelölve*',
          inline: false
        },
        {
          name: '🏴 Frakció Tagok',
          value: regularMembers.map(m => `• **${m.fivemName}** (\`${m.discordTag}\`) - *${m.rank}*`).join('\n') || '*Jelenleg nincs további felvett tag.*',
          inline: false
        }
      ])
      .setFooter({ text: 'Utoljára frissítve' })
      .setTimestamp();

    const messages = await channel.messages.fetch({ limit: 10 });
    const botMsg = messages.find(m => m.author.id === guild.client.user?.id && m.embeds.some(e => e.title?.includes('Taglista')));

    if (botMsg) {
      await botMsg.edit({ embeds: [embed] });
    } else {
      await channel.send({ embeds: [embed] });
    }
  } catch (err: any) {
    console.error('[Factions] Failed to update Discord roster embed:', err.message);
  }
}

// ========================================================
// 11. SETUP DEFAULT FACTION APPLICATION CHANNEL EMBED (`🏴・frakció-kérelem`)
// ========================================================
export async function setupFactionApplicationEmbed(guild: Guild): Promise<{ success: boolean; message: string; channelId?: string }> {
  try {
    let applyChannel = guild.channels.cache.find(
      c => c.name.includes('frakció-kérelem') || c.name.includes('frakcio-kerelem') || c.name.includes('frakcio-igenyles')
    ) as TextChannel;

    if (!applyChannel) {
      const cat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && (c.name.includes('INFORMÁCIÓ') || c.name.includes('ÜGYINTÉZÉS') || c.name.includes('KÖZÖSSÉG')));
      applyChannel = await guild.channels.create({
        name: '🏴・frakció-kérelem',
        type: ChannelType.GuildText,
        parent: cat ? cat.id : undefined,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
            deny: [PermissionsBitField.Flags.SendMessages]
          }
        ]
      });
    }

    const appUrl = process.env.APP_URL || 'https://ais-pre-npv3ldtvhtd2gpmxdtnmyt-84545439565.europe-west2.run.app';

    // Embed strictly as specified in the prompt:
    const embed = new EmbedBuilder()
      .setTitle('🏴 Frakció létrehozása')
      .setDescription(
        `Szeretnél saját frakciót alapítani a szerveren?\n\n` +
        `A frakciókérelem elküldése előtt olvasd el a frakciószabályzatot és készítsd elő a frakciód alapadatait.\n\n` +
        `**A jelentkezéshez szükséged lesz többek között:**\n` +
        `• Frakciónév\n` +
        `• Frakciótípus\n` +
        `• Frakciótörténet\n` +
        `• Vezetők\n` +
        `• Induló tagok\n` +
        `• RP-terv\n` +
        `• Frakció megjelenése\n` +
        `• Logó vagy referenciafotók\n` +
        `• Tervezett HQ\n` +
        `• Rangrendszer`
      )
      .setColor('#f59e0b')
      .setFooter({ text: 'Nexus Horizon RP • Hivatalos Frakció Rendszer' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('📝 Frakciókérelem indítása')
        .setStyle(ButtonStyle.Link)
        .setURL(`${appUrl}`),
      new ButtonBuilder()
        .setCustomId('fac_gang_open_rules')
        .setLabel('📜 Szabályzat Megtekintése')
        .setStyle(ButtonStyle.Secondary)
    );

    await applyChannel.send({ embeds: [embed], components: [row] });

    return {
      success: true,
      message: `A frakciókérelem embed sikeresen közzétéve a #${applyChannel.name} csatornában!`,
      channelId: applyChannel.id
    };
  } catch (err: any) {
    return { success: false, message: `Hiba a csatorna beállításakor: ${err.message}` };
  }
}
