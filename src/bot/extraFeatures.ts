import { 
  Client, 
  EmbedBuilder, 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  TextChannel, 
  VoiceChannel, 
  ChannelType, 
  GuildMember,
  AttachmentBuilder
} from 'discord.js';
import discordTranscripts from 'discord-html-transcripts';
import { 
  getPlayerHistory, 
  addPlayerHistory, 
  claimDailyReward, 
  claimBoosterReward, 
  logKillEvent, 
  logRobberyEvent, 
  getActiveAdminDuties,
  updateUserBalance,
  getUserBalance
} from '../server/db';
import { getFivemStatus } from './fivem';
import { sendDedicatedStaffLog } from './logsRelay';
import { KillLogRecord, RobberyLogRecord } from '../types';

// Weapon metadata with representative high quality weapon renders
export const WEAPON_ASSETS: Record<string, { name: string; image: string }> = {
  'WEAPON_PISTOL': { name: 'Pisztoly (Combat Pistol)', image: 'https://img.icons8.com/color/96/gun.png' },
  'WEAPON_COMBATPISTOL': { name: 'Combat Pistol', image: 'https://img.icons8.com/color/96/gun.png' },
  'WEAPON_APPISTOL': { name: 'AP Pisztoly (Automata)', image: 'https://img.icons8.com/color/96/gun.png' },
  'WEAPON_SMG': { name: 'SMG (Géppisztoly)', image: 'https://img.icons8.com/fluency/96/machine-gun.png' },
  'WEAPON_MICROSMG': { name: 'Micro SMG (Uzi)', image: 'https://img.icons8.com/fluency/96/machine-gun.png' },
  'WEAPON_ASSAULTRIFLE': { name: 'AK-47 Rohampuska', image: 'https://img.icons8.com/fluency/96/ak-47.png' },
  'WEAPON_CARBINERIFLE': { name: 'M4A1 Karabély', image: 'https://img.icons8.com/fluency/96/ak-47.png' },
  'WEAPON_PUMPSHOTGUN': { name: 'Pump Shotgun', image: 'https://img.icons8.com/fluency/96/shotgun.png' },
  'WEAPON_SNIPERRIFLE': { name: 'Mesterlövész Puska', image: 'https://img.icons8.com/color/96/sniper-rifle.png' },
  'WEAPON_KNIFE': { name: 'Kés / Tőr', image: 'https://img.icons8.com/fluency/96/dagger.png' },
  'WEAPON_BAT': { name: 'Baseball Ütő', image: 'https://img.icons8.com/fluency/96/baseball-bat.png' },
  'WEAPON_UNARMED': { name: 'Puszta Kéz (Verekedés)', image: 'https://img.icons8.com/fluency/96/punching.png' }
};

// 1. JÁTÉKOS ELŐZMÉNYEK (/history)
export async function handleHistoryCommand(interaction: ChatInputCommandInteraction) {
  const targetId = interaction.options.get('id')?.value as string | undefined;
  const targetDiscord = interaction.options.getUser('discord');
  const targetIdentifier = interaction.options.get('identifier')?.value as string | undefined;

  if (!targetId && !targetDiscord && !targetIdentifier) {
    return interaction.reply({ content: '❌ Kérlek adj meg legalább egy azonosítót (ID, Discord vagy Identifier)!', ephemeral: true });
  }

  const records = await getPlayerHistory({
    id: targetId,
    discordId: targetDiscord?.id,
    identifier: targetIdentifier
  });

  const queryLabel = targetDiscord ? targetDiscord.tag : (targetId ? `ID: ${targetId}` : `Identifier: ${targetIdentifier}`);

  if (records.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle(`📜 Játékos Előzmények • ${queryLabel}`)
      .setDescription('✅ **Tiszta előélet!** Nem található rögzített kitiltás, jail vagy figyelmeztetés ehhez a játékoshoz.')
      .setColor('#10b981')
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📜 Játékos Előzmények • ${queryLabel}`)
    .setDescription(`Összesen **${records.length}** db bejegyzés található a nyilvántartásban:`)
    .setColor('#f59e0b')
    .setTimestamp();

  records.slice(0, 15).forEach((rec, i) => {
    const typeEmoji = rec.type === 'ban' ? '🔨 [BAN]' : rec.type === 'jail' ? '⛓️ [JAIL]' : rec.type === 'kick' ? '👢 [KICK]' : '⚠️ [WARN]';
    const dur = rec.durationMinutes ? ` (${rec.durationMinutes} perc)` : '';
    embed.addFields({
      name: `${i + 1}. ${typeEmoji} ${rec.reason}${dur}`,
      value: `📅 Dátum: \`${rec.createdAt.split('T')[0]}\` • Admin: **${rec.adminName}** • Állapot: ${rec.active ? '🔴 Aktív' : '🟢 Lejárt'}`
    });
  });

  return interaction.reply({ embeds: [embed] });
}

// 2. RABLÁSI & KILL LOGOK KÉPPEL
export async function sendKillLogEmbed(client: Client, killData: Omit<KillLogRecord, 'id' | 'timestamp'>) {
  const record = await logKillEvent(killData);
  const weaponInfo = WEAPON_ASSETS[killData.weapon] || { name: killData.weapon || 'Ismeretlen fegyver', image: 'https://img.icons8.com/color/96/gun.png' };

  const embed = new EmbedBuilder()
    .setTitle('💀 KILL LOG • HALÁLESET RÖGZÍTVE')
    .setDescription(
      `**Gyilkos:** **${killData.killerName}** (ID: \`${killData.killerId ?? 'N/A'}\`)\n` +
      `**Áldozat:** **${killData.victimName}** (ID: \`${killData.victimId}\`)\n` +
      `**Fegyver:** **${weaponInfo.name}**\n` +
      `**Távolság:** \`${killData.distance.toFixed(1)} méter\`\n` +
      `**Találat helye:** \`${killData.bodyPart}\`\n` +
      (killData.location ? `**Helyszín:** \`${killData.location}\`\n` : '')
    )
    .setColor('#dc2626')
    .setThumbnail(weaponInfo.image)
    .setFooter({ text: 'Nexus Horizon RP • Szerver Log Rendszer' })
    .setTimestamp();

  // Send exclusively to Staff / Log Discord Server
  await sendDedicatedStaffLog(client, 'kill', { embeds: [embed] });

  return record;
}

export async function sendRobberyLogEmbed(client: Client, robberyData: Omit<RobberyLogRecord, 'id' | 'timestamp'>) {
  const record = await logRobberyEvent(robberyData);

  const robberyTitles: Record<string, string> = {
    'store': '🏪 BOLTRABLÁS FOLYAMATBAN',
    'vangelico': '💎 VANGELICO ÉKSZERBOLT RABLÁS',
    'fleeca': '🏦 FLEECA BANKRABLÁS',
    'pacific': '🏛️ PACIFIC STANDARD KÖZPONTI BANKRABLÁS',
    'armored_truck': '🚚 PÉNZSZÁLLÍTÓ KOCSI TÁMADÁS',
    'house': '🏠 LAKÁSBETÖRÉS & RABLÁS'
  };

  const title = robberyTitles[robberyData.robberyType] || '🚨 RABLÁS ESEMÉNY';

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `**Helyszín:** **${robberyData.locationName}**\n` +
      `**Elkövetők:** ${robberyData.robbers.join(', ') || 'Ismeretlen maszkos személyek'}\n` +
      `**Becsült zsákmány:** \`${robberyData.lootEstimated || '$50,000 - $150,000'}\`\n` +
      `**Rendőrségi riasztás:** ${robberyData.policeAlerted ? '🟢 **Kiküldve az LSPD/BCSO egységeknek**' : '🔴 Nincs riasztás'}\n\n` +
      `*A rendőri erők azonnal vonuljanak a megadott koordinátákra!*`
    )
    .setColor('#f97316')
    .setImage('https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=60')
    .setFooter({ text: 'Nexus Horizon RP • MDC & Szerver Log Rendszer' })
    .setTimestamp();

  // Send exclusively to Staff / Log Discord Server
  await sendDedicatedStaffLog(client, 'robbery', { embeds: [embed] });

  return record;
}

// 3. SERVER BOOSTER JUTALMAK
export async function handleBoosterUpdate(oldMember: GuildMember, newMember: GuildMember) {
  // Check if member just started boosting
  const wasBoosting = Boolean(oldMember.premiumSince);
  const isBoosting = Boolean(newMember.premiumSince);

  // Keep the 💎 Booster role in sync with the actual Discord boost status
  try {
    const boosterRole = newMember.guild.roles.cache.find(r => r.name === '💎 Booster');
    if (boosterRole) {
      if (isBoosting && !newMember.roles.cache.has(boosterRole.id)) {
        await newMember.roles.add(boosterRole).catch(() => {});
      } else if (!isBoosting && newMember.roles.cache.has(boosterRole.id)) {
        await newMember.roles.remove(boosterRole).catch(() => {});
      }
    }
  } catch (e) {}

  if (!wasBoosting && isBoosting) {
    const user = newMember.user;
    const res = await claimBoosterReward(user.id, user.tag);

    const embed = new EmbedBuilder()
      .setTitle('💎 KÖSZÖNJÜK A DISCORD BOOSTER TÁMOGATÁST!')
      .setDescription(
        `🎉 Hatalmas köszönet <@${user.id}> játékosunknak, aki boostolta a **Nexus Horizon RP** Discord szerverét!\n\n` +
        `🎁 **Jóváírt Jutalmak:**\n` +
        `• 💎 **+5,000 Prémium Pont (PP)** automatikusan hozzáadva az egyenlegedhez!\n` +
        `• 👑 **Server Booster VIP** rang a Discordon és in-game előnyök!\n\n` +
        `*A prémium pontjaidat a webshopban vagy in-game tetszőlegesen elköltheted!*`
      )
      .setColor('#f43f5e')
      .setThumbnail(user.displayAvatarURL())
      .setImage('https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=60')
      .setFooter({ text: 'Nexus Horizon RP • Booster Rewards' })
      .setTimestamp();

    try {
      const announceChannel = newMember.guild.channels.cache.find(c => 
        c.name.includes('boost') || c.name.includes('koszonto') || c.name.includes('beszelgetes') || c.name.includes('chat')
      ) as TextChannel;
      if (announceChannel) {
        await announceChannel.send({ content: `<@${user.id}>`, embeds: [embed] });
      }
      // Send DM to user
      await user.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {}
  }
}

// 4. NAPI JUTALMAK (/daily)
export async function handleDailyRewardCommand(interaction: ChatInputCommandInteraction | ButtonInteraction) {
  const user = interaction.user;
  const claimRes = await claimDailyReward(user.id, user.tag);

  if (claimRes.alreadyClaimed) {
    const nextTimestampSec = Math.floor((claimRes.nextAvailableAt || Date.now() + 3600000) / 1000);
    const embed = new EmbedBuilder()
      .setTitle('⏳ NAPI JUTALOM MÁR BEVÁLTVA')
      .setDescription(
        `Ma már átvetted a napi jutalmadat!\n\n` +
        `Következő beváltás elérhető: <t:${nextTimestampSec}:R> (<t:${nextTimestampSec}:T>)\n\n` +
        `*Látogass vissza holnap a napi streak növeléséhez és még nagyobb bónuszokért!*`
      )
      .setColor('#6b7280')
      .setThumbnail('https://img.icons8.com/fluency/96/hourglass.png')
      .setTimestamp();

    if (interaction.isButton && interaction.isButton()) {
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  let rewardLabel = '';
  if (claimRes.rewardType === 'pp') {
    rewardLabel = `💎 **${claimRes.rewardAmount} PP** *(Nagyon ritka Prémium Pont!)*`;
  } else if (claimRes.rewardType === 'discordCoins') {
    rewardLabel = `🪙 **${claimRes.rewardAmount} Discord Pénz (DC)** *(Használd a \`/cases\` ládanyitáshoz!)*`;
  } else {
    rewardLabel = `💵 **$${claimRes.rewardAmount?.toLocaleString()} FiveM Készpénz**`;
  }
  const nextTimestampSec = Math.floor((claimRes.nextAvailableAt || Date.now() + 86400000) / 1000);
  
  let syncMessage = "";
  if (claimRes.rewardType === 'money' || claimRes.rewardType === 'pp') {
    if (claimRes.synced) {
      syncMessage = `\n✅ **A jutalom azonnal jóváírva a játékban a következő karakternek:** \`${claimRes.fivemName || 'Ismeretlen'}\``;
    } else {
      syncMessage = `\n⚠️ A jutalom az egyenlegedre került, de jelenleg nem vagy FiveM-hez kötve, vagy a szerver nem elérhető.`;
    }
  } else {
    syncMessage = `\n✅ **Discord Egyenlegedre jóváírva!** Nyiss meg egy ládát a \`/cases\` parancs segítségével!`;
  }

  const curBal = claimRes.currentBalance;
  const balText = curBal ? `\n\n💳 **Aktuális Egyenleged:** \`${(curBal.discordCoins ?? 500).toLocaleString()} DC\` | \`${(curBal.ppBalance ?? 0).toLocaleString()} PP\` | \`$${(curBal.balance ?? 0).toLocaleString()}\`` : '';

  const embed = new EmbedBuilder()
    .setTitle('🎁 NAPI JUTALOM SIKERESEN ÁTVÉVE!')
    .setDescription(
      `Gratulálunk, <@${user.id}>!\n\n` +
      `🎉 **Mai nyereményed:** ${rewardLabel}\n` +
      `🔥 **Napi Streak sorozat:** \`${claimRes.streak} nap\` (Minden nappal növekszik a bónusz!)` +
      syncMessage + balText + `\n\n` +
      `⏰ Következő beváltás: <t:${nextTimestampSec}:R>`
    )
    .setColor(claimRes.rewardType === 'pp' ? '#f43f5e' : claimRes.rewardType === 'discordCoins' ? '#f59e0b' : '#10b981')
    .setThumbnail('https://img.icons8.com/fluency/96/gift.png')
    .setFooter({ text: 'Nexus Horizon RP • Napi Ajándék Rendszer' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

// 5. AUTOMATIKUS HTML TRANSCRIPT GENERÁLÁS (Ticket bezárásakor és /transcript)
export async function generateAndSendTicketTranscript(channel: TextChannel, closerMember?: GuildMember, reason?: string) {
  try {
    // Generate styled HTML transcript
    const transcriptAttachment = await (discordTranscripts as any).createTranscript(channel, {
      limit: -1,
      returnType: 'attachment',
      filename: `${channel.name}-transcript.html`,
      saveImages: true,
      poweredBy: false
    });

    const embed = new EmbedBuilder()
      .setTitle(`📦 TICKET LEZÁRVA ÉS ARCHIVÁLVA • ${channel.name}`)
      .setDescription(
        `**Csatorna:** \`${channel.name}\`\n` +
        `**Lezárta:** ${closerMember ? `<@${closerMember.id}> (${closerMember.user.tag})` : 'Rendszer'}\n` +
        (reason ? `**Indok:** ${reason}\n` : '') +
        `**Időpont:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `*A teljes csevegési napló formázott HTML fájlként csatolva az alábbiakban.*`
      )
      .setColor('#6366f1')
      .setTimestamp();

    // 1. Send to server archive log channel on the Staff / Log Discord server
    await sendDedicatedStaffLog(channel.client, 'ticket', { embeds: [embed], files: [transcriptAttachment] });

    // 2. DM the ticket creator if identifiable from topic or channel permission
    try {
      const topic = channel.topic || '';
      const match = topic.match(/\d{17,20}/);
      const creatorId = match ? match[0] : null;

      if (creatorId) {
        const creator = await channel.guild.members.fetch(creatorId).catch(() => null);
        if (creator) {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`📦 Ticketed Lezárásra Került • Nexus Horizon RP`)
            .setDescription(
              `Kedves **${creator.user.username}**!\n\n` +
              `A(z) **${channel.name}** számú ügyfélszolgálati ticketed lezárásra került.\n` +
              (reason ? `**Lezárási indok:** ${reason}\n` : '') +
              `Mellékelten letöltheted a teljes beszélgetési naplót (.html formátumban).\n\n` +
              `Köszönjük, hogy megkerested a vezetőséget!`
            )
            .setColor('#10b981')
            .setTimestamp();

          await creator.send({ embeds: [dmEmbed], files: [transcriptAttachment] }).catch(() => {});
        }
      }
    } catch (e) {}

    return transcriptAttachment;
  } catch (err: any) {
    console.error('[Transcript] Error generating transcript:', err);
    return null;
  }
}

// 6. ÉLŐ SZERVERSTATISZTIKA CSATORNANEVEKBEN
let lastStatUpdate = 0;
export async function updateLiveServerStatsChannels(client: Client) {
  const now = Date.now();
  // Throttle to once every 60 seconds to avoid Discord rate limits
  if (now - lastStatUpdate < 55000) return;
  lastStatUpdate = now;

  if (!client.isReady()) return;

  const fivemData = getFivemStatus();
  const activeDuties = getActiveAdminDuties();

  const isOnline = fivemData.online;
  const playersCount = fivemData.clients || 0;
  const maxPlayers = fivemData.max_clients || 64;

  for (const guild of client.guilds.cache.values()) {
    try {
      const channels = guild.channels.cache;

      // 1. Players channel
      const playersChannel = channels.find(c => 
        c.type === ChannelType.GuildVoice && (c.name.includes('Játékosok:') || c.name.includes('Jatekosok:') || c.name.includes('Szerver:'))
      ) as VoiceChannel;

      const targetPlayersName = isOnline ? `🟢┃Játékosok: ${playersCount} / ${maxPlayers}` : `🔴┃Szerver: Karbantartás`;

      if (playersChannel && playersChannel.name !== targetPlayersName) {
        await playersChannel.setName(targetPlayersName).catch(() => {});
      }

      // 2. LSPD channel
      const lspdChannel = channels.find(c => 
        c.type === ChannelType.GuildVoice && (c.name.includes('LSPD:') || c.name.includes('Rendőrség:'))
      ) as VoiceChannel;
      const lspdCount = Math.max(1, Math.floor(playersCount * 0.2));
      const targetLspdName = `👮┃Szolgálatban LSPD: ${isOnline ? lspdCount : 0}`;
      if (lspdChannel && lspdChannel.name !== targetLspdName) {
        await lspdChannel.setName(targetLspdName).catch(() => {});
      }

      // 3. OMSZ channel
      const omszChannel = channels.find(c => 
        c.type === ChannelType.GuildVoice && (c.name.includes('OMSZ:') || c.name.includes('Mentők:'))
      ) as VoiceChannel;
      const omszCount = Math.max(1, Math.floor(playersCount * 0.1));
      const targetOmszName = `🚑┃Szolgálatban OMSZ: ${isOnline ? omszCount : 0}`;
      if (omszChannel && omszChannel.name !== targetOmszName) {
        await omszChannel.setName(targetOmszName).catch(() => {});
      }

      // 4. Staff Online channel
      const staffChannel = channels.find(c => 
        c.type === ChannelType.GuildVoice && (c.name.includes('Staff Duty-ban:') || c.name.includes('Staff:') || c.name.includes('Adminok:'))
      ) as VoiceChannel;
      const targetStaffName = `👑┃Staff Duty-ban: ${activeDuties.length}`;
      if (staffChannel && staffChannel.name !== targetStaffName) {
        await staffChannel.setName(targetStaffName).catch(() => {});
      }

      // 5. Discord member count channel
      const memberChannel = channels.find(c =>
        c.type === ChannelType.GuildVoice && (c.name.includes('Discord Tagok:') || c.name.includes('Tagok:'))
      ) as VoiceChannel;
      const targetMemberName = `👥┃Discord Tagok: ${guild.memberCount}`;
      if (memberChannel && memberChannel.name !== targetMemberName) {
        await memberChannel.setName(targetMemberName).catch(() => {});
      }

      // 6. Boost level channel
      const boostChannel = channels.find(c =>
        c.type === ChannelType.GuildVoice && c.name.includes('Boost Szint:')
      ) as VoiceChannel;
      const targetBoostName = `🚀┃Boost Szint: ${guild.premiumTier || 0} (${guild.premiumSubscriptionCount || 0} boost)`;
      if (boostChannel && boostChannel.name !== targetBoostName) {
        await boostChannel.setName(targetBoostName).catch(() => {});
      }

    } catch (err) {}
  }
}
