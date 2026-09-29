import { 
  CommandInteraction, 
  EmbedBuilder, 
  User, 
  GuildMember,
  PermissionsBitField
} from 'discord.js';
import { 
  getUserBalance, 
  updateUserBalance, 
  giveBalanceToAllUsers, 
  creditFivemPP, 
  creditFivemCash 
} from '../server/db';

function canManageBot(member: any): boolean {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  return false;
}

export async function handleGiveMoneyCommand(interaction: CommandInteraction) {
  const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
  const isAuthorizedAdmin = canManageBot(interaction.member as GuildMember);

  if (!isGuildOwner && !isAuthorizedAdmin) {
    return interaction.reply({
      content: '❌ **Nincs jogosultságod a parancs használatához!** Ezt a parancsot csak a szerver tulajdonosa vagy a vezetőség használhatja.',
      ephemeral: true
    });
  }

  const targetMode = interaction.options.get('cel')?.value as string; // 'user' | 'everyone'
  const currencyType = interaction.options.get('tipus')?.value as 'discord_coins' | 'pp' | 'cash';
  const amount = Number(interaction.options.get('osszeg')?.value);
  const targetUser = interaction.options.get('felhasznalo')?.user as User | undefined;

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({
      content: '❌ Érvénytelen összeg! Kérlek adj meg egy pozitív számot.',
      ephemeral: true
    });
  }

  const currencyLabels: Record<string, { label: string; unit: string; emoji: string }> = {
    discord_coins: { label: 'Discord Pénz', unit: 'DC', emoji: '🪙' },
    pp: { label: 'Prémium Pont', unit: 'PP', emoji: '💎' },
    cash: { label: 'FiveM Készpénz', unit: '$', emoji: '💵' }
  };

  const cInfo = currencyLabels[currencyType] || { label: 'Discord Pénz', unit: 'DC', emoji: '🪙' };

  // 1. Mindenkinek adás (Give to all)
  if (targetMode === 'everyone' || (!targetUser && targetMode === 'everyone')) {
    await interaction.deferReply();

    const dbType = currencyType === 'discord_coins' ? 'discordCoins' : currencyType === 'pp' ? 'pp' : 'money';
    const result = await giveBalanceToAllUsers(
      amount, 
      dbType, 
      `Tulajdonosi ajándék (${interaction.user.tag})`,
      interaction.client
    );

    const embed = new EmbedBuilder()
      .setTitle(`🎁 TULAJDONOSI AJÁNDÉK MINDENKINEK!`)
      .setDescription(
        `A szerver tulajdonosa, <@${interaction.user.id}> jóváírt minden regisztrált tagnak és játékosnak!\n\n` +
        `💰 **Jóváírt összeg fejenként:** **+${amount.toLocaleString()} ${cInfo.unit}** (${cInfo.label})\n` +
        `👥 **Érintett tagok száma:** **${result.count} játékos**\n\n` +
        `🎉 *Nyissátok meg a \`/cases\` parancsot és próbáljátok ki a CS:GO ládanyitást vagy nézzétek meg az \`/balance\` menüt!*`
      )
      .setColor('#f59e0b')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135715.png')
      .setFooter({ text: `Nexus Horizon RP • Vezetőségi Jóváírás • ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  // 2. Egyetlen konkrét felhasználónak adás
  if (!targetUser) {
    return interaction.reply({
      content: '❌ Nem választottál ki felhasználót! Kérlek válaszd ki a célszemélyt a `felhasznalo` mezőben.',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const prevBalance = await getUserBalance(targetUser.id);
  const dbType = currencyType === 'discord_coins' ? 'discordCoins' : currencyType === 'pp' ? 'pp' : 'money';
  
  await updateUserBalance(targetUser.id, amount, dbType);
  
  let syncNote = '';
  if (currencyType === 'pp') {
    const syncRes = await creditFivemPP(targetUser.id, amount, `Admin jóváírás: ${interaction.user.tag}`);
    if (syncRes.synced) {
      syncNote = `\n✅ **FiveM Játékbeli szinkronizáció:** Sikeres (\`${syncRes.fivemName}\`)`;
    }
  } else if (currencyType === 'cash') {
    const syncRes = await creditFivemCash(targetUser.id, amount, `Admin jóváírás: ${interaction.user.tag}`);
    if (syncRes.synced) {
      syncNote = `\n✅ **FiveM Játékbeli szinkronizáció:** Sikeres (\`${syncRes.fivemName}\`)`;
    }
  }

  const newBalance = await getUserBalance(targetUser.id);

  let prevVal = 0;
  let newVal = 0;
  if (currencyType === 'discord_coins') {
    prevVal = prevBalance.discordCoins ?? 500;
    newVal = newBalance.discordCoins ?? 500;
  } else if (currencyType === 'pp') {
    prevVal = prevBalance.ppBalance ?? 0;
    newVal = newBalance.ppBalance ?? 0;
  } else {
    prevVal = prevBalance.balance ?? 0;
    newVal = newBalance.balance ?? 0;
  }

  const embed = new EmbedBuilder()
    .setTitle(`✅ SIKERES PÉNZ / PP JÓVÁÍRÁS`)
    .setDescription(
      `Sikeresen jóváírtál **${amount.toLocaleString()} ${cInfo.unit}** összeget a kiválasztott tagnak!\n\n` +
      `👤 **Célszemély:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n` +
      `💳 **Fizetőeszköz:** **${cInfo.label}** (${cInfo.emoji})\n` +
      `➕ **Hozzáadott összeg:** **+${amount.toLocaleString()} ${cInfo.unit}**\n` +
      `📊 **Előző egyenleg:** \`${prevVal.toLocaleString()} ${cInfo.unit}\`\n` +
      `📈 **Új egyenleg:** \`${newVal.toLocaleString()} ${cInfo.unit}\`${syncNote}`
    )
    .setColor('#10b981')
    .setThumbnail(targetUser.displayAvatarURL())
    .setFooter({ text: `Végrehajtó: ${interaction.user.tag}` })
    .setTimestamp();

  return interaction.editReply({ embeds: [embed] });
}
