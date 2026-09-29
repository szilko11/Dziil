import { 
  EmbedBuilder, 
  Client, 
  TextChannel, 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { toggleAdminDuty, getActiveAdminDuties, getWeeklyDutyStats, inMemoryDuties, getWeekNumber } from '../server/db';
import { canManageBot } from './handlers';
import { sendDedicatedStaffLog } from './logsRelay';

export async function handleDutyCommand(interaction: ChatInputCommandInteraction | ButtonInteraction) {
  const user = interaction.user;
  const member = interaction.member as any;

  if (!canManageBot(member)) {
    const errorMsg = '❌ **Nincs jogosultságod!** Csak adminisztrátorok és staff tagok léphetnek Admin Duty-ba.';
    if (interaction.isButton && interaction.isButton()) {
      return interaction.reply({ content: errorMsg, ephemeral: true });
    }
    return interaction.reply({ content: errorMsg, ephemeral: true });
  }

  const roleName = member?.roles?.highest?.name || 'Staff';
  const avatarUrl = user.displayAvatarURL();

  const res = await toggleAdminDuty(user.id, user.username, avatarUrl, roleName);

  if (res.active) {
    const embed = new EmbedBuilder()
      .setTitle('🟢 ADMIN SZOLGÁLATBA LÉPÉS')
      .setDescription(`**Staff tag:** <@${user.id}>\n**Rang:** \`${roleName}\`\n**Kezdés ideje:** <t:${Math.floor(Date.now() / 1000)}:T>\n\n*Jó munkát és kellemes ügyintézést kívánunk!*`)
      .setColor('#10b981')
      .setThumbnail(avatarUrl)
      .setTimestamp();

    // Log to Staff / Log Discord Server
    await sendDedicatedStaffLog(interaction.client, 'duty', { embeds: [embed] });

    return interaction.reply({ embeds: [embed] });
  } else {
    const durationMin = res.durationMinutes || 1;
    const hours = (durationMin / 60).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('🔴 ADMIN SZOLGÁLAT LEADÁS')
      .setDescription(
        `**Staff tag:** <@${user.id}>\n` +
        `**Rang:** \`${roleName}\`\n` +
        `**Szolgálati időtartam:** \`${durationMin} perc\` (~**${hours} óra**)\n` +
        `**Befejezés:** <t:${Math.floor(Date.now() / 1000)}:T>`
      )
      .setColor('#ef4444')
      .setThumbnail(avatarUrl)
      .setTimestamp();

    // Log to Staff / Log Discord Server
    await sendDedicatedStaffLog(interaction.client, 'duty', { embeds: [embed] });

    return interaction.reply({ embeds: [embed] });
  }
}

export async function handleDutyStatsCommand(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('user');
  const weekNum = getWeekNumber();
  const stats = await getWeeklyDutyStats(weekNum);

  if (targetUser) {
    const userStat = stats.find(s => s.adminId === targetUser.id);
    const activeDuty = inMemoryDuties.get(targetUser.id);
    const totalMin = userStat ? userStat.totalMinutes : 0;
    const hours = (totalMin / 60).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle(`📋 Admin Duty Statisztika • ${targetUser.username}`)
      .setDescription(
        `**Felhasználó:** <@${targetUser.id}>\n` +
        `**Jelenlegi állapot:** ${activeDuty ? '🟢 **Szolgálatban (Duty-ban)**' : '⚪ **Szolgálaton kívül**'}\n` +
        `**Heti szolgálati idő (W${weekNum}):** \`${totalMin} perc\` (~**${hours} óra**)\n` +
        `**Szolgálati munkamenetek száma:** \`${userStat?.sessionsCount || 0} alkalom\``
      )
      .setColor('#3b82f6')
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // Full leaderboard of duty
  const embed = new EmbedBuilder()
    .setTitle(`🏆 HETI ADMIN SZOLGÁLATI IDŐ RANGLISTA (W${weekNum})`)
    .setDescription(
      stats.length === 0 
        ? '*Még nincs rögzített szolgálati idő ezen a héten.*'
        : stats.map((s, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '▫️';
            const hours = (s.totalMinutes / 60).toFixed(1);
            return `${medal} **${s.adminName}** (${s.roleName}): \`${s.totalMinutes} perc\` (~**${hours} óra**) [${s.sessionsCount} session]`;
          }).join('\n')
    )
    .setColor('#f59e0b')
    .setFooter({ text: 'Nexus Horizon RP • Adminisztrációs Ellenőrző Rendszer' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}

export async function sendWeeklyDutySummary(client: Client) {
  const weekNum = getWeekNumber();
  const stats = await getWeeklyDutyStats(weekNum);

  const embed = new EmbedBuilder()
    .setTitle(`📊 NEXUS HORIZON RP • HETI ADMIN DUTY ÖSSZESÍTÉS (W${weekNum})`)
    .setDescription(
      'Az alábbiakban megtekinthető a staff csapat heti összesített adminisztrátori szolgálati ideje:\n\n' +
      (stats.length === 0 
        ? '*Nincs elérhető adat.*' 
        : stats.map((s, i) => {
            const h = (s.totalMinutes / 60).toFixed(1);
            const statusEmoji = s.totalMinutes >= 600 ? '⭐' : s.totalMinutes >= 300 ? '✅' : '⚠️';
            return `**${i + 1}.** ${statusEmoji} **${s.adminName}** — \`${s.totalMinutes} perc\` (**${h} óra**) (${s.sessionsCount} alkalom)`;
          }).join('\n'))
    )
    .setColor('#8b5cf6')
    .setFooter({ text: 'Vezetőségi Heti Zárójelentés' })
    .setTimestamp();

  await sendDedicatedStaffLog(client, 'duty', { embeds: [embed] });
}
