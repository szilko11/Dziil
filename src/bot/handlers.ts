import { 
  PermissionsBitField, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  ChannelType, 
  AttachmentBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle,
  Interaction,
  TextChannel
} from 'discord.js';
import { Warn, PermConfig } from '../types';
import { communityStructure, staffLogStructure } from './constants';
import { relayDiscordToFivem } from './chatRelay';
import { 
  approveAndProvisionFaction, 
  rejectFactionApplication, 
  submitFactionApplication,
  getFactionApplicationById,
  createInterviewChannel,
  requestApplicationChanges,
  setupFactionApplicationEmbed,
  getFactionById
} from './factions';
import { handleDutyCommand, handleDutyStatsCommand } from './dutyTracker';
import { generateWhitelistPanelEmbed, startQuizForUser, handleQuizAnswer } from './whitelistQuiz';
import { 
  handleHistoryCommand, 
  handleDailyRewardCommand, 
  sendKillLogEmbed, 
  sendRobberyLogEmbed, 
  generateAndSendTicketTranscript 
} from './extraFeatures';
import { claimBoosterReward, createLinkCode, unlinkAccount, getLinkedAccount } from '../server/db';
import { setDedicatedLogGuild, sendDedicatedStaffLog, getDedicatedLogGuildId } from './logsRelay';
import { generateTicketTranscript } from './transcriptGenerator';
import { 
  generateDiscordRulesEmbeds, 
  generateServerRulesEmbeds, 
  handleRulesAcknowledgment, 
  getRulesAckCounts 
} from './rulesManager';
import { 
  generateCasesOverviewEmbed, 
  generateCaseDetailEmbed, 
  executeCaseOpening, 
  handleCoinflipDC, 
  CASES_CATALOG 
} from './cases';
import { handleGiveMoneyCommand } from './ownerCommands';
import { getUserBalance } from '../server/db';

// In-memory DBs (Same as server.ts had)
export const warningsDB = new Map<string, Warn[]>();
export const activeGiveaways = new Map<string, {
    prize: string;
    prizeType: 'money' | 'pp';
    prizeAmount: number;
    expiresAt: number;
    winnersSelect: number;
    participants: Set<string>;
    channelId: string;
}>();

export function canManageBot(member: any): boolean {
  if (!member) return false;
  if (member.permissions?.has(PermissionsBitField.Flags.Administrator)) return true;
  // Here you can add logic for "Bot Kezelő" role check if needed
  return false;
}

export async function handleMessage(message: any) {
  if (message.author.bot) return;

  const trimmed = message.content.trim();
  const lower = trimmed.toLowerCase();

  // Basic prefix commands requested by user
  if (lower === '!hello') {
    return await message.reply('Hello there!');
  }
  if (lower === '!ping') {
    const latency = message.client.ws.ping;
    return await message.reply(`Pong! (${latency > 0 ? latency : 15}ms)`);
  }
  if (lower === '!cases' || lower === '!ladak') {
    const userBal = await getUserBalance(message.author.id);
    const overview = await generateCasesOverviewEmbed(userBal);
    return await message.reply(overview);
  }
  if (lower === '!balance' || lower === '!egyenleg') {
    const bal = await getUserBalance(message.author.id);
    const embed = new EmbedBuilder()
      .setTitle(`💳 ${message.author.username} Egyenlege`)
      .setDescription(
        `🪙 **Discord Pénz (DC):** \`${(bal.discordCoins ?? 500).toLocaleString()} DC\` *(Ládanyitáshoz)*\n` +
        `💎 **Prémium Pont (PP):** \`${(bal.ppBalance ?? 0).toLocaleString()} PP\`\n` +
        `💵 **FiveM Készpénz:** \`$${(bal.balance ?? 0).toLocaleString()}\`\n\n` +
        `💡 *Használd a \`/cases\` parancsot a CS:GO stílusú ládanyitáshoz vagy a \`/daily\` parancsot a napi ingyen ajándékért!*`
      )
      .setColor('#f59e0b')
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();
    return await message.reply({ embeds: [embed] });
  }

  // Chat Relay (Mirror)
  await relayDiscordToFivem(message);

  // Move verify button down in rules channels
  if (!message.author.bot && message.channel && message.channel.name && (message.channel.name.includes('szabályzat') || message.channel.name.includes('rules'))) {
    try {
      const messages = await message.channel.messages.fetch({ limit: 50 });
      const botRuleMessage = messages.find((m: any) => 
        m.author.id === message.client.user?.id && 
        m.components.some((c: any) => c.components?.some((button: any) => button.customId === 'verify_rules'))
      );
      
      if (botRuleMessage) {
        // We delete the old button message
        await botRuleMessage.delete().catch(() => {});
        // And send it at the bottom
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('verify_rules').setLabel('Szabályzatot elolvastam').setStyle(ButtonStyle.Success).setEmoji('✅')
        );
        await message.channel.send({ 
          content: 'Kattints az alábbi gombra, ha megértetted és elfogadod a szabályzatot:', 
          components: [row] 
        });
      }
    } catch (e) {
      console.error('Failed to move verify button:', e);
    }
  }

  // Swear word detection
  const badWords = ['kurva', 'bazdmeg', 'geci', 'fasz', 'cigány', 'buzi', 'ribanc', 'köcsög', 'anyád'];
  const contentTokens = message.content.toLowerCase().split(/\s+/);
  
  const hasBadWord = contentTokens.some((token: string) => 
      badWords.some(bw => token.includes(bw))
  );

  if (hasBadWord) {
      if (message.deletable) {
          try {
             await message.delete();
          } catch (e) { console.error('Could not delete bad word message:', e); }
      }
      
      const warnMsg = await message.channel.send({
          content: `<@${message.author.id}> ⚠️ **Figyelmeztetés!** Kérjük, mellőzd a trágár szavakat a szerveren!`
      });
      
      setTimeout(() => {
          if (warnMsg && warnMsg.deletable) {
              warnMsg.delete().catch(() => {});
          }
      }, 5000);

      // Add to warningsDB
      const warn: Warn = { 
          id: Math.random().toString(36).substr(2, 9), 
          reason: 'Auto-Mod: Trágár beszéd', 
          date: new Date(), 
          moderator: 'Nexus AutoMod' 
      };
      const current = warningsDB.get(message.author.id) || [];
      warningsDB.set(message.author.id, [...current, warn]);
  }
}

export async function handleInteraction(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const publicCommands = [
        'ping', 'hello', 'otlet', 'status', 'userinfo', 'serverinfo', 'poll', 
        'report', 'whitelist', 'daily', 'claim_booster', 'link',
        'cases', 'ladak', 'opencase', 'ladanyitas', 'balance', 'egyenleg', 
        'coinflip_dc', 'give_money'
      ];
      if (!publicCommands.includes(interaction.commandName)) {
        if (!canManageBot(interaction.member)) {
          await interaction.reply({ 
            content: '❌ **Nincs jogosultságod!**\n\nA bot parancsainak használatához **Bot Kezelő** vagy **Adminisztrátor** rang szükséges.', 
            ephemeral: true 
          });
          return;
        }
      }

      // Handle Slash Commands
      switch (interaction.commandName) {
          case 'ping': {
            const latency = interaction.client.ws.ping;
            await interaction.reply(`Pong! (${latency > 0 ? latency : 15}ms)`); 
            break;
          }
          case 'hello': await interaction.reply('Hello there!'); break;
          case 'cases':
          case 'ladak': {
            const userBal = await getUserBalance(interaction.user.id);
            const overview = await generateCasesOverviewEmbed(userBal);
            await interaction.reply(overview);
            break;
          }
          case 'opencase':
          case 'ladanyitas': {
            const caseId = (interaction.options.get('case_id')?.value || interaction.options.get('lada')?.value || 'bronze') as string;
            await executeCaseOpening(interaction, caseId);
            break;
          }
          case 'balance':
          case 'egyenleg': {
            const targetUser = interaction.options.getUser('felhasznalo') || interaction.user;
            const bal = await getUserBalance(targetUser.id);
            const isSelf = targetUser.id === interaction.user.id;
            const embed = new EmbedBuilder()
              .setTitle(`💳 ${targetUser.username} Egyenlege`)
              .setDescription(
                `🪙 **Discord Pénz (DC):** \`${(bal.discordCoins ?? 500).toLocaleString()} DC\` *(Ládanyitáshoz & Szerencsejátékhoz)*\n` +
                `💎 **Prémium Pont (PP):** \`${(bal.ppBalance ?? 0).toLocaleString()} PP\`\n` +
                `💵 **FiveM Készpénz:** \`$${(bal.balance ?? 0).toLocaleString()}\`\n\n` +
                (isSelf ? `💡 *Próbáld ki a CS:GO ládanyitást a \`/cases\` paranccsal vagy a napi ajándékot a \`/daily\` paranccsal!*` : '')
              )
              .setColor('#f59e0b')
              .setThumbnail(targetUser.displayAvatarURL())
              .setFooter({ text: 'Nexus Horizon RP • Egyenleg' })
              .setTimestamp();
            
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder().setCustomId('view_all_cases').setLabel('🎰 Ládanyitás (/cases)').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId('claim_daily_btn').setLabel('🎁 Napi Ajándék (/daily)').setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({ embeds: [embed], components: isSelf ? [row] : [] });
            break;
          }
          case 'coinflip_dc': {
            const amount = Number(interaction.options.get('osszeg')?.value || interaction.options.get('amount')?.value || 50);
            const choice = (interaction.options.get('tipp')?.value || interaction.options.get('choice')?.value || 'fej') as 'fej' | 'iras';
            await handleCoinflipDC(interaction, amount, choice);
            break;
          }
          case 'give_money': {
            await handleGiveMoneyCommand(interaction);
            break;
          }
          case 'otlet': {
              const text = interaction.options.get('leiras')?.value as string;
              const guild = interaction.guild;
              const member = interaction.member as any;

              // Check if member has Polgár or Citizen role
              const hasPolgar = member?.roles?.cache?.some((r: any) => 
                  r.name.includes('Polgár') || 
                  r.name.toLowerCase().includes('polgár') || 
                  r.name.toLowerCase().includes('polgar') ||
                  r.name.toLowerCase().includes('whitelist') ||
                  r.name.toLowerCase().includes('staff') ||
                  r.name.toLowerCase().includes('admin') ||
                  r.permissions?.has(PermissionsBitField.Flags.Administrator)
              );

              if (!hasPolgar) {
                  const wlChannel = guild?.channels.cache.find(c => c.name.includes('whitelist') || c.name.includes('kvíz'));
                  const wlMention = wlChannel ? `<#${wlChannel.id}>` : '`🛡️┃whitelist-kvíz`';
                  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                      new ButtonBuilder().setCustomId('start_whitelist_quiz').setLabel('📋 Whitelist Kvíz Kitöltése').setStyle(ButtonStyle.Success).setEmoji('✨')
                  );
                  const embed = new EmbedBuilder()
                      .setTitle('🔒 Hiányzó Polgár Rang')
                      .setDescription(
                          `❌ **Az ötlet beküldéséhez és az ötlet doboz használatához \`Polgár\` rang szükséges!**\n\n` +
                          `📌 **Mit kell tenned, hogy megkapd a rangot?**\n` +
                          `1. Olvasd el a szabályzatot a \`📖┃szerver-szabályzat\` és \`📜┃discord-szabályzat\` szobákban.\n` +
                          `2. Kattints a szabályzat alján lévő gombra a szabályzat elfogadásához.\n` +
                          `3. Töltsd ki a Whitelist Kvízt a ${wlMention} csatornában vagy az alábbi zöld gombbal!\n\n` +
                          `✨ *A sikeres teszt után azonnal megkapod a Polgár rangot és korlátlanul írhatsz az ötletek közé!*`
                      )
                      .setColor('#ef4444');

                  return await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
              }

              const channel = guild?.channels.cache.find(c => c.name.includes('ötletek') || c.name.includes('szerver-ötletek')) as any;
              
              if (!channel) return interaction.reply({ content: '❌ Nem található az ötletek csatorna (`💡┃szerver-ötletek` vagy `💡┃ötletek`).', ephemeral: true });

              const embed = new EmbedBuilder()
                  .setTitle('💡 Új Közösségi Ötlet')
                  .setDescription(text)
                  .setColor('#facc15')
                  .setAuthor({ name: interaction.user.tag || interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                  .setFooter({ text: 'Nexus Horizon RP • Ötlet Doboz' })
                  .setTimestamp();

              const msg = await channel.send({ embeds: [embed] });
              await msg.react('👍').catch(() => {});
              await msg.react('👎').catch(() => {});

              await interaction.reply({ content: `✅ Az ötletedet sikeresen beküldtük a(z) <#${channel.id}> csatornába! Köszönjük a hozzájárulásodat!`, ephemeral: true });
              break;
          }
          case 'clear': {
              const amount = interaction.options.get('amount')?.value as number;
              if (amount < 1 || amount > 100) return interaction.reply({ content: '1 és 100 között adj meg számot!', ephemeral: true });
              await (interaction.channel as any).bulkDelete(amount);
              await interaction.reply({ content: `✅ Sikeresen törölve ${amount} üzenet.`, ephemeral: true });
              break;
          }
          case 'warn': {
              const user = interaction.options.getUser('user');
              const reason = interaction.options.get('reason')?.value as string;
              if (!user) return;
              const warn: Warn = { id: Math.random().toString(36).substr(2, 9), reason, date: new Date(), moderator: interaction.user.tag };
              const current = warningsDB.get(user.id) || [];
              warningsDB.set(user.id, [...current, warn]);
              
              const embed = new EmbedBuilder()
                  .setTitle('⚠️ Figyelmeztetés')
                  .setColor('#FFA500')
                  .addFields(
                      { name: 'Felhasználó', value: `<@${user.id}>`, inline: true },
                      { name: 'Moderátor', value: interaction.user.tag, inline: true },
                      { name: 'Indok', value: reason }
                  )
                  .setTimestamp();
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'sorsolas': {
              const prize = interaction.options.get('prize')?.value as string;
              const duration = interaction.options.get('duration')?.value as number;
              const winners = (interaction.options.get('winners')?.value as number) || 1;
              const description = (interaction.options.get('description')?.value as string) || 'Nincs leírás.';
              
              const eventChannel = interaction.guild?.channels.cache.find(c => c.name === '🎁┃eventek-nyeremények') as any;
              const chatChannel = interaction.guild?.channels.cache.find(c => c.name === '💬┃beszélgetés') as any;

              if (!eventChannel) {
                  return interaction.reply({ content: '❌ Nem található a "🎁┃eventek-nyeremények" csatorna.', ephemeral: true });
              }

              const endAt = new Date(Date.now() + duration * 60000);

              const embed = new EmbedBuilder()
                  .setTitle('🎉 NYEREMÉNYJÁTÉK')
                  .setDescription(`**Leírás:** ${description}\n**Nyeremény:** ${prize}\n**Nyertesek száma:** ${winners}\n**Vége:** <t:${Math.floor(endAt.getTime() / 1000)}:R>`)
                  .setColor('#5865F2')
                  .setFooter({ text: 'Kattints a gombra a jelentkezéshez!' });

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder().setCustomId('join_giveaway').setLabel('Jelentkezés').setStyle(ButtonStyle.Primary).setEmoji('🎁')
              );

              const msg = await eventChannel.send({ embeds: [embed], components: [row] });
              activeGiveaways.set(msg.id, {
                  prize,
                  prizeType: 'money', // Placeholder, functionality to be expanded
                  prizeAmount: 0,
                  expiresAt: endAt.getTime(),
                  winnersSelect: winners,
                  participants: new Set<string>(),
                  channelId: eventChannel.id
              });

              if (chatChannel) {
                  const notifyEmbed = new EmbedBuilder()
                    .setTitle('🎁 Új NYEREMÉNYJÁTÉK indult!')
                    .setDescription(`Egy új nyereményjáték érhető el! Nyeremény: **${prize}**\n\n[Kattints ide a jelentkezéshez!](https://discord.com/channels/${interaction.guild?.id}/${eventChannel.id}/${msg.id})`)
                    .setColor('#FF9900');
                  
                  await chatChannel.send({ content: '@everyone', embeds: [notifyEmbed] });
              }

              await interaction.reply({ content: `✅ A nyereményjáték sikeresen elindítva a <#${eventChannel.id}> csatornában!`, ephemeral: true });

              setTimeout(async () => {
                   const giveaway = activeGiveaways.get(msg.id);
                   if (!giveaway) return;
                   
                   const participants = Array.from(giveaway.participants);
                   if (participants.length === 0) {
                       await eventChannel.send(`😔 A **${prize}** nyereményjáték lejárt, de senki sem jelentkezett.`);
                   } else {
                       // Shuffle and pick winners
                       const shuffled = participants.sort(() => 0.5 - Math.random());
                       const winnersList = shuffled.slice(0, giveaway.winnersSelect);
                       
                       const winnerMentions = winnersList.map(id => `<@${id}>`).join(', ');
                       
                       await eventChannel.send(`🎉 A **${prize}** nyereményjáték véget ért! Nyertes(ek): ${winnerMentions} \nGratulálunk!`);
                   }
                   activeGiveaways.delete(msg.id);
                   
                   // Disable button
                   const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId('join_giveaway').setLabel('Lezárult').setStyle(ButtonStyle.Secondary).setEmoji('🔒').setDisabled(true)
                   );
                   await msg.edit({ components: [disabledRow] });
              }, duration * 60000);
              break;
          }
          // ... other commands logic to be simplified for now or copied ...
          case 'userinfo': {
              const targetUser = interaction.options.getUser('user') || interaction.user;
              const targetMember = interaction.guild?.members.cache.get(targetUser.id);
              
              const embed = new EmbedBuilder()
                  .setTitle(`ℹ️ ${targetUser.tag} információi`)
                  .setThumbnail(targetUser.displayAvatarURL())
                  .setColor('#0099ff')
                  .addFields(
                      { name: 'Azonosító (ID)', value: `\`${targetUser.id}\``, inline: true },
                      { name: 'Fiók Létrehozva', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                      { name: 'Szerverhez Csatlakozás', value: targetMember?.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Ismeretlen', inline: true },
                      { name: 'Szerepkörök', value: targetMember?.roles.cache.filter((r: any) => r.name !== '@everyone').map((r: any) => `<@&${r.id}>`).join(', ') || 'Nincsenek' }
                  );
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'serverinfo': {
              const guild = interaction.guild;
              if (!guild) return await interaction.reply({ content: '❌ Ez a parancs csak szerveren használható.', ephemeral: true });
              
              const owner = await guild.fetchOwner();
              const embed = new EmbedBuilder()
                  .setTitle(`📊 ${guild.name} | Szerver Információk`)
                  .setThumbnail(guild.iconURL() || '')
                  .setColor('#0099ff')
                  .addFields(
                      { name: 'Tulajdonos', value: `<@${owner.id}>`, inline: true },
                      { name: 'Létrehozva', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                      { name: 'Tagok', value: `\`${guild.memberCount}\``, inline: true },
                      { name: 'Csatornák', value: `\`${guild.channels.cache.size}\``, inline: true },
                      { name: 'Szerepkörök száma', value: `\`${guild.roles.cache.size}\``, inline: true }
                  );
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'timeout': {
              const targetUser = interaction.options.getUser('user');
              const duration = interaction.options.get('duration')?.value as number;
              const reason = interaction.options.get('reason')?.value as string || 'Nincs indok megadva';
              
              if (!targetUser) return await interaction.reply({ content: '❌ Felhasználó nem található.', ephemeral: true });
              
              const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
              if (!member) return await interaction.reply({ content: '❌ Ez a felhasználó nincs a szerveren.', ephemeral: true });
              
              try {
                  await member.timeout(duration * 60 * 1000, reason);
                  const embed = new EmbedBuilder()
                      .setTitle('🔇 Felhasználó Némítva (Timeout)')
                      .setDescription(`**Felhasználó:** <@${targetUser.id}>\n**Időtartam:** \`${duration} perc\`\n**Indok:** ${reason}`)
                      .setColor('#FF9900')
                      .setFooter({ text: `Végrehajtva: ${interaction.user.tag}` });
                  await interaction.reply({ embeds: [embed] });
              } catch (e) {
                  await interaction.reply({ content: '❌ Nincs jogosultságom némítani ezt a felhasználót (lehet, hogy nagyobb a rangja mint nekem).', ephemeral: true });
              }
              break;
          }
          case 'lock': {
              const channel = interaction.channel as any;
              try {
                  await channel.permissionOverwrites.edit(interaction.guild?.roles.everyone, { SendMessages: false });
                  await interaction.reply("🔒 A csatorna **lezárva**.");
              } catch (e) {
                  await interaction.reply({ content: "❌ Hiba a lezárás során.", ephemeral: true });
              }
              break;
          }
          case 'unlock': {
              const channel = interaction.channel as any;
              try {
                  await channel.permissionOverwrites.edit(interaction.guild?.roles.everyone, { SendMessages: true });
                  await interaction.reply("🔓 A csatorna **feloldva**.");
              } catch (e) {
                  await interaction.reply({ content: "❌ Hiba a feloldás során.", ephemeral: true });
              }
              break;
          }
          case 'announce': {
              const channelToAnnounce = interaction.options.getChannel('channel') as any;
              const title = interaction.options.get('title')?.value as string;
              const message = interaction.options.get('message')?.value as string;
              
              const embed = new EmbedBuilder()
                  .setTitle(`📢 ${title}`)
                  .setDescription(message)
                  .setColor('#00AAFF')
                  .setTimestamp();
                  
              try {
                  await channelToAnnounce.send({ embeds: [embed] });
                  await interaction.reply({ content: `✅ Közlemény sikeresen elküldve a(z) <#${channelToAnnounce.id}> csatornára!`, ephemeral: true });
              } catch(e) {
                  await interaction.reply({ content: '❌ Nincs jogom abba a csatornába írni.', ephemeral: true });
              }
              break;
          }
          case 'status': {
              const embed = new EmbedBuilder()
                  .setTitle('📊 Szerver Státusz')
                  .setColor('#00FF00')
                  .addFields(
                      { name: 'Késleltetés', value: `\`${interaction.client.ws.ping}ms\``, inline: true },
                      { name: 'Szerverek', value: `\`${interaction.client.guilds.cache.size}\``, inline: true }
                  );
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'ban': {
              const id = interaction.options.get('id')?.value as number;
              const reason = interaction.options.get('reason')?.value as string;
              
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: '❌ Nincs jogosultságod ehhez a parancshoz.', ephemeral: true });
                  return;
              }

              await interaction.deferReply({ ephemeral: false });
              try {
                  const command = `nexus_ban ${id} "${reason}"`;
                  const { fivemRcon } = require('./rcon');
                  const response = await fivemRcon(
                      process.env.FIVEM_SERVER_IP || '84.1.49.111', 
                      parseInt(process.env.FIVEM_RCON_PORT || '30120'), 
                      (process.env.FIVEM_RCON_PASSWORD || '').trim(), 
                      command
                  );
                  
                  const embed = new EmbedBuilder()
                      .setTitle('🔨 Játékos Kitiltva')
                      .setDescription(`A **${id}** ID-jű játékos ki lett tiltva a szerverről.\n**Indok:** ${reason}`)
                      .setColor('#FF0000')
                      .setFooter({ text: `Moderátor: ${interaction.user.tag}` })
                      .setTimestamp();
                      
                  await interaction.editReply({ embeds: [embed] });
              } catch (e: any) {
                  await interaction.editReply(`❌ Hiba történt a kitiltás során: ${e.message}`);
              }
              break;
          }
          case 'ticket_add': {
              const targetUser = interaction.options.getUser('user');
              const channel = interaction.channel as any;
              
              if (!channel || channel.type !== ChannelType.GuildText || !channel.name.includes('ticket')) {
                  return await interaction.reply({ content: '❌ Ez a parancs csak egy ticket csatornában használható.', ephemeral: true });
              }
              if (!targetUser) return await interaction.reply({ content: '❌ Nincs megadva felhasználó.', ephemeral: true });
              
              try {
                  await channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                  await interaction.reply(`✅ <@${targetUser.id}> sikeresen hozzá lett adva a tickethez!`);
              } catch (e) {
                  await interaction.reply({ content: '❌ Hiba történt a hozzáadás során.', ephemeral: true });
              }
              break;
          }
          case 'ticket_remove': {
              const targetUser = interaction.options.getUser('user');
              const channel = interaction.channel as any;
              
              if (!channel || channel.type !== ChannelType.GuildText || !channel.name.includes('ticket')) {
                  return await interaction.reply({ content: '❌ Ez a parancs csak egy ticket csatornában használható.', ephemeral: true });
              }
              if (!targetUser) return await interaction.reply({ content: '❌ Nincs megadva felhasználó.', ephemeral: true });
              
              try {
                  await channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: false });
                  await interaction.reply(`✅ <@${targetUser.id}> el lett távolítva a ticketből.`);
              } catch (e) {
                  await interaction.reply({ content: '❌ Hiba történt az eltávolítás során.', ephemeral: true });
              }
              break;
          }
          case 'transcript': {
              const channel = interaction.channel as any;
              if (!channel || channel.type !== ChannelType.GuildText) return;
              
              await interaction.deferReply({ ephemeral: true });
              try {
                  const discordTranscripts = require('discord-html-transcripts');
                  const transcript = await discordTranscripts.createTranscript(channel, {
                      limit: -1,
                      returnType: 'attachment',
                      filename: `${channel.name}-transcript.html`,
                      saveImages: true,
                      poweredBy: false
                  });
                  
                  let logChannel = interaction.guild?.channels.cache.find(c => c.name.includes('log'));
                  if (!logChannel) {
                      logChannel = await interaction.guild?.channels.create({ name: 'admin-log', type: ChannelType.GuildText });
                  }
                  
                  if (logChannel) {
                      (logChannel as any).send({
                          content: `📄 Kézzel generált transcript: **${channel.name}**\nIdőpont: <t:${Math.floor(Date.now() / 1000)}:f>\nKezdeményező: ${interaction.user}`,
                          files: [transcript]
                      });
                  }
                  await interaction.editReply(`✅ Transcript sikeresen legenerálva és elküldve a(z) <#${logChannel?.id}> csatornába!`);
              } catch (e) {
                  await interaction.editReply('❌ Hiba történt a transcript generálása közben.');
                  console.error(e);
              }
              break;
          }
          case 'slowmode': {
              const seconds = interaction.options.get('seconds')?.value as number;
              const channel = interaction.channel as any;
              try {
                  await channel.setRateLimitPerUser(seconds);
                  if (seconds === 0) {
                      await interaction.reply('✅ Lassított mód kikapcsolva ezen a csatornán.');
                  } else {
                      await interaction.reply(`✅ Lassított mód beállítva: **${seconds}** másodperc.`);
                  }
              } catch (e) {
                  await interaction.reply({ content: '❌ Hiba történt a lassított mód beállítása során.', ephemeral: true });
              }
              break;
          }
          case 'nuke': {
              const channel = interaction.channel as any;
              try {
                  await interaction.reply('💥 Csatorna megsemmisítése folyamatban (Nuke)...');
                  const position = channel.position;
                  const newChannel = await channel.clone();
                  await newChannel.setPosition(position);
                  await channel.delete();
                  await newChannel.send('https://i.giphy.com/media/XUFPGrX5Zis6Y/giphy.webp'); // Nuke gif
                  await newChannel.send('✅ A csatorna sikeresen újra lett hozva.');
              } catch (e) {
                  const replt = interaction.deferred ? interaction.editReply : interaction.reply.bind(interaction);
                  await replt({ content: '❌ Szükséges jogosultság hiányzik a nuke végrehajtásához.', ephemeral: true });
              }
              break;
          }
          case 'role': {
              const targetUser = interaction.options.getUser('user');
              const role = interaction.options.get('role')?.role;
              
              if (!targetUser || !role) return await interaction.reply({ content: '❌ Hiányzó paraméterek.', ephemeral: true });
              
              const member = interaction.guild?.members.cache.get(targetUser.id);
              if (!member) return await interaction.reply({ content: '❌ A felhasználó nem található.', ephemeral: true });
              
              try {
                  if (member.roles.cache.has(role.id)) {
                      await member.roles.remove(role.id as string);
                      await interaction.reply(`✅ <@${targetUser.id}> sikeresen elvesztette a **${role.name}** szerepkört!`);
                  } else {
                      await member.roles.add(role.id as string);
                      await interaction.reply(`✅ <@${targetUser.id}> sikeresen megkapta a **${role.name}** szerepkört!`);
                  }
              } catch (e) {
                  await interaction.reply({ content: '❌ Hiba a szerepkör módosításakor. (Lehet, hogy a bot rangja lejjebb van?)', ephemeral: true });
              }
              break;
          }
          case 'avatar': {
              const targetUser = interaction.options.getUser('user') || interaction.user;
              const embed = new EmbedBuilder()
                  .setTitle(`🖼️ ${targetUser.tag} profilképe`)
                  .setImage(targetUser.displayAvatarURL({ size: 1024, extension: 'png' }))
                  .setColor('#0099ff');
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'coinflip': {
              const result = Math.random() < 0.5 ? 'Fej' : 'Írás';
              const embed = new EmbedBuilder()
                  .setTitle('🪙 Érmedobás')
                  .setDescription(`Az eredmény: **${result}**!`)
                  .setColor(result === 'Fej' ? '#FFD700' : '#C0C0C0');
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'dice': {
              const result = Math.floor(Math.random() * 6) + 1;
              const embed = new EmbedBuilder()
                  .setTitle('🎲 Kockadobás')
                  .setDescription(`A dobott szám: **${result}**!`)
                  .setColor('#E74C3C');
              await interaction.reply({ embeds: [embed] });
              break;
          }
          case 'poll': {
              const question = interaction.options.get('question')?.value as string;
              const opt1 = interaction.options.get('option1')?.value as string;
              const opt2 = interaction.options.get('option2')?.value as string;
              
              const embed = new EmbedBuilder()
                  .setTitle('📊 Új Szavazás')
                  .setDescription(`**${question}**\n\n1️⃣ ${opt1}\n2️⃣ ${opt2}`)
                  .setColor('#3498DB')
                  .setFooter({ text: `Szavazás indítója: ${interaction.user.tag}` });
                  
              const msg = await (interaction.channel as any).send({ embeds: [embed] });
              await msg.react('1️⃣');
              await msg.react('2️⃣');
              
              await interaction.reply({ content: '✅ Szavazás sikeresen elindítva!', ephemeral: true });
              break;
          }
          case 'report': {
              const subject = interaction.options.get('subject')?.value as string;
              const description = interaction.options.get('description')?.value as string;
              
              const adminChannel = interaction.guild?.channels.cache.find(c => c.name.includes('admin') || c.name.includes('log'));
              
              const embed = new EmbedBuilder()
                  .setTitle('🚨 Új Bejelentés!')
                  .setColor('#E74C3C')
                  .addFields(
                      { name: 'Bejelentő', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                      { name: 'Téma / Játékos neve', value: subject, inline: true },
                      { name: 'Leírás', value: description }
                  )
                  .setTimestamp();

              if (adminChannel) {
                  await (adminChannel as any).send({ embeds: [embed] });
                  await interaction.reply({ content: '✅ Sikeresen továbbítottuk a bejelentésedet az adminok felé!', ephemeral: true });
              } else {
                  await interaction.reply({ content: '❌ Nem található admin csatorna a jelentés továbbításához.', ephemeral: true });
              }
              break;
          }
          case 'duty': {
              return await handleDutyCommand(interaction);
          }
          case 'dutystats': {
              return await handleDutyStatsCommand(interaction);
          }
          case 'whitelist_panel': {
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: '❌ Nincs jogosultságod a Whitelist panel kiküldéséhez!', ephemeral: true });
                  return;
              }
              const panelData = generateWhitelistPanelEmbed();
              await interaction.reply({ embeds: panelData.embeds, components: panelData.components });
              break;
          }
          case 'whitelist': {
              return await startQuizForUser(interaction);
          }
          case 'history': {
              return await handleHistoryCommand(interaction);
          }
          case 'daily': {
              return await handleDailyRewardCommand(interaction);
          }
          case 'claim_booster': {
              const member = interaction.member as any;
              
              // Ellenőrizzük, hogy tényleg boostolta-e a szervert a Discord API szerint
              if (!member?.premiumSince) {
                  await interaction.reply({ 
                      content: `❌ **Nem vagy Server Booster!**\nCsak azok a felhasználók válthatják be ezt a jutalmat, akik aktuálisan boostolják a Discord szervert.`, 
                      ephemeral: true 
                  });
                  return;
              }

              const bRes = await claimBoosterReward(interaction.user.id, interaction.user.tag);
              
              if (bRes.alreadyClaimed) {
                  await interaction.reply({ 
                      content: `⏳ **Már beváltottad a Booster jutalmadat!**\nEzt a jutalmat csak egyszer lehet átvenni fiókonként.`, 
                      ephemeral: true 
                  });
                  return;
              }

              if (bRes.success) {
                  let syncMsg = bRes.fivemSynced 
                      ? `\n✅ **A jutalom azonnal jóváírva a játékban a következő karakternek:** \`${bRes.fivemName || 'Ismeretlen'}\`` 
                      : `\n⚠️ A PP az egyenlegedre került, de jelenleg nem vagy FiveM-hez kötve, vagy a szerver nem elérhető.`;
                  
                  await interaction.reply({ 
                      content: `💎 **Köszönjük a szervertámogatást!** Sikeresen jóváírtunk **+5,000 PP**-t!${syncMsg}`, 
                      ephemeral: true 
                  });
              } else {
                  await interaction.reply({ content: `❌ Hiba történt a jóváírás során.`, ephemeral: true });
              }
              break;
          }
          case 'link': {
              try {
                  await interaction.deferReply({ ephemeral: true });
                  const discordTag = interaction.user.tag || interaction.user.username || interaction.user.globalName || 'Discord Felhasználó';
                  const code = await createLinkCode(interaction.user.id, discordTag);
                  const embed = new EmbedBuilder()
                      .setTitle('🔗 Összekötő Kódod')
                      .setDescription(
                          `Lépj be a FiveM szerverre, majd írd be a chatbe:\n\n\`/verify ${code.code}\`\n\n` +
                          `⏱️ A kód **10 percig** érvényes.`
                      )
                      .setColor('#06b6d4');
                  if (interaction.deferred) {
                      await interaction.editReply({ embeds: [embed] });
                  } else if (!interaction.replied) {
                      await interaction.reply({ embeds: [embed], ephemeral: true });
                  }
              } catch (e) {
                  console.error('[Bot] /link error:', e);
                  if (interaction.deferred) {
                      await interaction.editReply({ content: '❌ Hiba történt a kód generálása közben. Próbáld újra!' });
                  } else if (!interaction.replied) {
                      await interaction.reply({ content: '❌ Hiba történt a kód generálása közben. Próbáld újra!', ephemeral: true });
                  }
              }
              break;
          }
          case 'testkill': {
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: '❌ Nincs jogosultságod a teszteléshez!', ephemeral: true });
                  return;
              }
              await sendKillLogEmbed(interaction.client, {
                  killerId: 12,
                  killerName: 'Alex Vance',
                  victimId: 45,
                  victimName: 'Marcus Miller',
                  weapon: 'WEAPON_COMBATPISTOL',
                  distance: 18.4,
                  bodyPart: 'Fejlövés (Headshot)',
                  location: 'Legion Square'
              });
              await interaction.reply({ content: '✅ Teszt Kill Log sikeresen elküldve a staff log szobába!', ephemeral: true });
              break;
          }
          case 'testrobbery': {
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: '❌ Nincs jogosultságod a teszteléshez!', ephemeral: true });
                  return;
              }
              await sendRobberyLogEmbed(interaction.client, {
                  robberyType: 'vangelico',
                  locationName: 'Portola Drive - Vangelico Ékszerbolt',
                  robbers: ['Marcus_Miller (ID: 45)', 'Dave_King (ID: 19)'],
                  lootEstimated: '$120,000 értékű ékszer',
                  policeAlerted: true
              });
              await interaction.reply({ content: '✅ Teszt Rablási Riasztás elküldve a log szobába!', ephemeral: true });
              break;
          }
          case 'kick': {
              const id = interaction.options.get('id')?.value as number;
              const reason = interaction.options.get('reason')?.value as string;
              
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: '❌ Nincs jogosultságod ehhez a parancshoz.', ephemeral: true });
                  return;
              }

              await interaction.deferReply({ ephemeral: false });
              try {
                  const command = `clientkick ${id} "${reason}"`;
                  const { fivemRcon } = require('./rcon');
                  const response = await fivemRcon(
                      process.env.FIVEM_SERVER_IP || '84.1.49.111', 
                      parseInt(process.env.FIVEM_RCON_PORT || '30120'), 
                      (process.env.FIVEM_RCON_PASSWORD || '').trim(), 
                      command
                  );
                  
                  const embed = new EmbedBuilder()
                      .setTitle('👢 Játékos Kirúgva')
                      .setDescription(`A **${id}** ID-jű játékos ki lett rúgva a szerverről.\n**Indok:** ${reason}`)
                      .setColor('#FFA500')
                      .setFooter({ text: `Moderátor: ${interaction.user.tag}` })
                      .setTimestamp();
                      
                  await interaction.editReply({ embeds: [embed] });
              } catch (e: any) {
                  await interaction.editReply(`❌ Hiba történt a kirúgás során: ${e.message}`);
              }
              break;
          }
          case 'ticket_setup': {
              if (!canManageBot(interaction.member)) {
                  await interaction.reply({ content: "Nincs jogod használni ezt a parancsot! (Csak Adminisztrátoroknak)", ephemeral: true });
                  return;
              }
              const embed = new EmbedBuilder()
                  .setTitle('🎫 Hibajegy / Ügyintézés Nyitása')
                  .setDescription('Kérjük válaszd ki a lentebbi gombok közül az ügyedhez leginkább illő kategóriát!\n\n🕒 Kérünk, légy türelemmel, miután megnyitottad a ticketet, egy adminisztrátor hamarosan foglalkozik vele.\n🔒 **Privát:** A megnyitott ticketet csak te és a vezetőség látja!')
                  .setColor('#2b2d31')
                  .setImage('https://i.imgur.com/2s4R13X.png') // just a placeholder banner or line
                  .setFooter({ text: 'Nexus RP • Suppport' })
                  .setTimestamp();
              
              const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder().setCustomId('ticket_admin').setLabel('Adminisztrátori Segítség').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                  new ButtonBuilder().setCustomId('ticket_bug').setLabel('Hiba Bejelentés').setStyle(ButtonStyle.Danger).setEmoji('🐛'),
                  new ButtonBuilder().setCustomId('ticket_donate').setLabel('Támogatás / PP').setStyle(ButtonStyle.Success).setEmoji('💎')
              );
              const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder().setCustomId('ticket_general').setLabel('Általános Kérdés').setStyle(ButtonStyle.Secondary).setEmoji('❓'),
                  new ButtonBuilder().setCustomId('ticket_other').setLabel('Egyéb Ügy').setStyle(ButtonStyle.Secondary).setEmoji('💡')
              );

              await (interaction.channel as any).send({ embeds: [embed], components: [row1, row2] });
              await interaction.reply({ content: '✅ Ticket panel sikeresen elküldve!', ephemeral: true });
              break;
          }
          case 'setup': {
      if (!interaction.guild) {
        await interaction.reply("Ez a parancs csak szerveren használható.");
        return;
      }
      if (!canManageBot(interaction.member)) {
        await interaction.reply({ content: "Nincs jogod használni ezt a parancsot! (Csak Adminisztrátoroknak)", ephemeral: true });
        return;
      }

       const setupType = (interaction.options as any).getString('type');
       const structure = setupType === 'staff' ? staffLogStructure : communityStructure;

       await interaction.reply(`⏳ A **${setupType === 'staff' ? 'Staff & Log' : 'Közösségi'}** szerver felépítése elkezdődött. Csatold be az öveket! Ez eltarthat egy-két percig.`);

       if (setupType === 'staff' && interaction.guild) {
         setDedicatedLogGuild(interaction.guild.id);
       }

      try {
        const guild = interaction.guild;
        
        // 1. Create Roles
        const defaultRoles = [
          { name: '👑 Tulajdonos', color: '#ff0000', permissions: [PermissionsBitField.Flags.Administrator] },
          { name: '🛠️ Admin', color: '#ff8800', permissions: [PermissionsBitField.Flags.Administrator] },
          { name: '🛡️ Staff', color: '#00ff00', permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
          { name: '💎 Booster', color: '#f47fff', permissions: [] },
          { name: '📢 Frissítés Ping', color: '#38bdf8', permissions: [] },
          { name: '🎉 Event Ping', color: '#34d399', permissions: [] },
          { name: '🎁 Nyereményjáték Ping', color: '#fbbf24', permissions: [] },
          { name: '👥 Polgár', color: '#aab8c2', permissions: [] }
        ];

        const createdRoles: Record<string, any> = {};
        for (const roleData of defaultRoles) {
          let existingRole = guild.roles.cache.find(r => r.name === roleData.name);
          if (!existingRole) {
            existingRole = await guild.roles.create({
              name: roleData.name,
              color: roleData.color as any,
              permissions: roleData.permissions,
              reason: 'Nexus Setup'
            });
          }
          createdRoles[roleData.name] = existingRole;
        }

        // 2. Delete old channels
        const oldChannels = guild.channels.cache.filter((c: any) => c.id !== interaction.channelId);
        for (const [id, channel] of oldChannels) {
            try { await channel.delete(); } catch (e) {}
        }

        // 3. Setup staff permission overrides
        const everyoneRole = guild.roles.everyone;
        
        const getPerms = (permType?: PermConfig) => {
            const basePerms: any[] = [];
            if (!permType) return basePerms;

            const staffRoles = [
              createdRoles['🛡️ Staff']?.id, 
              createdRoles['🛠️ Admin']?.id, 
              createdRoles['👑 Tulajdonos']?.id
            ].filter(Boolean);

            if (permType === 'READ_ONLY') {
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.SendMessages] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.SendMessages] }));
            } else if (permType === 'CITIZEN_WRITE') {
                // Non-citizens (@everyone) can only read, Citizens / Polgár & Staff can write!
                const polgarRoleId = createdRoles['👥 Polgár']?.id || guild.roles.cache.find(r => r.name.toLowerCase().includes('polgár') || r.name.toLowerCase().includes('polgar'))?.id;
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.SendMessages], allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] });
                if (polgarRoleId) {
                    basePerms.push({ id: polgarRoleId, allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks] });
                }
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages] }));
            } else if (permType === 'STAFF_ONLY_TEXT') {
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.ViewChannel] }));
            } else if (permType === 'STAFF_ONLY_VOICE') {
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] }));
            } else if (permType === 'ADMIN_PULL_VOICE') {
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.Connect], allow: [PermissionsBitField.Flags.ViewChannel] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.MoveMembers] }));
            } else if (permType === 'STATS_VOICE') {
                // Everyone can see the live stat, nobody (except staff) can actually join/talk in it
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.SendMessages] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.Connect] }));
            } else if (permType === 'BOOSTER_ONLY') {
                const boosterRoleId = createdRoles['💎 Booster']?.id;
                basePerms.push({ id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] });
                if (boosterRoleId) basePerms.push({ id: boosterRoleId, allow: [PermissionsBitField.Flags.ViewChannel] });
                staffRoles.forEach(id => basePerms.push({ id, allow: [PermissionsBitField.Flags.ViewChannel] }));
            }
            return basePerms;
        };

        // 4. Create new structure
        for (const catData of structure) {
          const catPerms = getPerms(catData.perm);
          
          const category = await guild.channels.create({
            name: catData.category,
            type: ChannelType.GuildCategory,
            permissionOverwrites: catPerms.length > 0 ? catPerms : undefined
          });

          for (const chData of catData.channels) {
            const chPerms = getPerms(chData.perm);
            const channel = await guild.channels.create({
              name: chData.name,
              type: chData.type as any,
              parent: category.id,
              topic: chData.type === ChannelType.GuildText ? chData.topic : undefined,
              permissionOverwrites: chPerms.length > 0 ? chPerms : undefined
            });

            if (chData.panel) {
                // Post Panel
                if (chData.panel === 'whitelist') {
                    const panelData = generateWhitelistPanelEmbed();
                    await channel.send(panelData);
                } else if (chData.panel === 'ticket') {
                    const embed = new EmbedBuilder()
                        .setTitle('🎫 Ügyfélszolgálat / Ticket nyitás')
                        .setDescription('Kérjük, csak akkor nyiss ticketet, ha tényleg segítségre van szükséged! A felesleges ticket nyitás szankciót vonhat maga után.')
                        .setColor('#2b2d31')
                        .setFooter({ text: 'Nexus RP • Support' });
                    
                    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('ticket_tech').setLabel('Technikai probléma').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                        new ButtonBuilder().setCustomId('ticket_report').setLabel('Játékos jelentése').setStyle(ButtonStyle.Danger).setEmoji('👤'),
                        new ButtonBuilder().setCustomId('ticket_donate').setLabel('Támogatás / vásárlás').setStyle(ButtonStyle.Success).setEmoji('💰')
                    );
                    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('ticket_other').setLabel('Egyéb ügy').setStyle(ButtonStyle.Secondary).setEmoji('🧾')
                    );
                    await channel.send({ embeds: [embed], components: [row1, row2] });
                } else if (chData.panel === 'faq') {
                    const embedHeader = new EmbedBuilder()
                        .setTitle('📜 GYIK - Gyakran Ismételt Kérdések')
                        .setDescription('Üdvözlünk a segédletben! Itt megtalálod a leggyakrabban felmerülő kérdésekre a válaszokat. Kérjük, mielőtt ticketet nyitnál, nézd át ezeket!')
                        .setColor('#ffcc00')
                        .setThumbnail('https://i.imgur.com/8Q9V5R6.png'); // Question mark icon placeholder

                    const faqContent1 = new EmbedBuilder()
                        .setTitle('🎮 Csatlakozás és Technikai dolgok')
                        .addFields(
                            { name: '❓ Hogyan tudok csatlakozni a szerverre?', value: 'A csatlakozáshoz szükséged van a **FiveM** kliensre. Indítás után válaszd a `Connect` fület és másold be az IP címet (megtalálod az `#ip-cím` szobában), vagy keress rá a "Nexus Horizon RP" névre.' },
                            { name: '🔌 Mi a szerver IP címe?', value: 'A szerver IP címe: `nexus.fivem.hu` (példa). Mindig ellenőrizd az `#ip-cím` szobát az aktuális adatokért.' },
                            { name: '🎙️ Szükséges-e külső voice program?', value: 'Szerverünk a FiveM beépített (Mumble) voice rendszerét használja, így nem kell külön TeamSpeak-et vagy egyéb programot letöltened.' }
                        )
                        .setColor('#3498db');

                    const faqContent2 = new EmbedBuilder()
                        .setTitle('🏢 Karakter és Játékmenet')
                        .addFields(
                            { name: '🪪 Kell-e regisztrálnom a játékhoz?', value: 'Igen, az első belépésnél egy karakterregisztrációs felület fogad, ahol meg kell adnod a karaktered adatait és háttértörténetét.' },
                            { name: '💼 Hogyan lehetek munkavállaló?', value: 'Vannak alapmunkák a Városházán (📍 blip), amiket bárki felvehet. Ha frakcióba (Rendőrség, OMSZ) szeretnél menni, keresd a `#frakció-jelentkezés` szobát.' },
                            { name: '🏠 Hogyan vehetek házat vagy garázst?', value: 'Az In-Game ingatlanos NPC-knél vagy játékosoktól tudsz ingatlant vásárolni, ha rendelkezel a megfelelő összeggel.' }
                        )
                        .setColor('#2ecc71');

                    const faqContent3 = new EmbedBuilder()
                        .setTitle('💰 Támogatás és Prémium (PP)')
                        .addFields(
                            { name: '💎 Mi az a PP és mire jó?', value: 'A PP (Prémium Pont) egy virtuális fizetőeszköz, amivel exkluzív autókat, skineket vagy egyéb extrákat vásárolhatsz. Ezzel támogatod a szerver fenntartását is.' },
                            { name: '💳 Hogyan tudok PP-t vásárolni?', value: 'Nyiss egy ticketet a `#ticket-nyitás` szobában a "Támogatás" kategóriában, és a vezetőség segít a folyamatban.' }
                        )
                        .setColor('#c27c0e');

                    const faqContent4 = new EmbedBuilder()
                        .setTitle('🛠️ Adminisztráció és Segítség')
                        .addFields(
                            { name: '🚨 Hogyan hívhatok admint a játékban?', value: 'Használd a `/report [leírás]` parancsot. Kérjük, pontosan írd le, miben kérsz segítséget!' },
                            { name: '🐛 Találtam egy bugot, hol jelenthetem?', value: 'Kérjük, használd a `#hibabejelentés` csatornát ide a Discordon, részletes leírással és ha lehet, képi bizonyítékkal.' },
                            { name: '⚖️ Hol tehetek panaszt egy játékosra?', value: 'Ha RP szabálytalanság történt, nyiss egy ticketet vagy használd a `#panasz-bejelentés` szobát.' }
                        )
                        .setFooter({ text: 'Nexus RP • Ha nem találtad meg a választ, nyiss egy ticketet!' })
                        .setColor('#e74c3c');

                    await channel.send({ embeds: [embedHeader, faqContent1, faqContent2, faqContent3, faqContent4] });
                } else if (chData.panel === 'support_info') {
                    const embed = new EmbedBuilder()
                        .setTitle('📑 Support ügyintézés menete')
                        .setDescription('**Hogyan kérj segítséget?**\n• Fogalmazd meg egyértelműen és érthetően a problémádat.\n• Próbálj meg minél több információt megadni rögtön az elején.\n\n**Mit írj le?**\n• Mi történt pontosan?\n• Mikor történt?\n• Kik érintettek az ügyben?\n\n**Bizonyítékok (Kép/Videó)**\n• Játékos jelentése vagy RP szituáció esetén **kötelező** a képi vagy videós bizonyíték.\n• Bizonyíték nélkül a bejelentést nem tudjuk elbírálni.\n\n**Válaszidő**\n• Türelmedet kérjük, a vezetőség a szabadidejében adminisztrál. A válaszidő pár perctől akár 24 óráig is terjedhet.\n\n**Döntéshozatal**\n• A Staff (Admin) döntése az ügyben végleges. Kérünk téged, hogy tartsd tiszteletben a döntést.')
                        .setColor('#5a82af');
                    await channel.send({ embeds: [embed] });
                } else if (chData.panel === 'report') {
                    const embed = new EmbedBuilder()
                        .setTitle('⚖️ Panasz bejelentése')
                        .setDescription('Itt tehetsz panaszt egy játékostársadra, frakcióra vagy hibás RP szituációra. Felhívjuk figyelmed, hogy bizonyíték nélkül nem tudunk eljárni!')
                        .setColor('#2b2d31');
                    
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('report_staff').setLabel('Staff panasz').setStyle(ButtonStyle.Danger).setEmoji('👮'),
                        new ButtonBuilder().setCustomId('report_player').setLabel('Játékos panasz').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                        new ButtonBuilder().setCustomId('report_faction').setLabel('Frakció panasz').setStyle(ButtonStyle.Primary).setEmoji('🏢'),
                        new ButtonBuilder().setCustomId('report_rp').setLabel('RP szituáció panasz').setStyle(ButtonStyle.Secondary).setEmoji('🚗')
                    );
                    await channel.send({ embeds: [embed], components: [row] });
                } else if (chData.panel === 'start_guide') {
                    const rulesDiscordChannel = guild.channels.cache.find(c => c.name.includes('discord-szabályzat'));
                    const rulesServerChannel = guild.channels.cache.find(c => c.name.includes('szerver-szabályzat'));
                    const ticketChannel = guild.channels.cache.find(c => c.name.includes('ticket'));
                    const factionChannel = guild.channels.cache.find(c => c.name.includes('frakció-jelentkezés'));

                    const embed1 = new EmbedBuilder()
                        .setTitle('🧭 Kezdés Menete - Üdvözlünk a Nexus Horizon RP-n!')
                        .setDescription('Üdvözlünk a **Nexus Horizon RP** szerverén! Kérjük, olvasd el az alábbi útmutatót, hogy megismerd az alapokat és gördülékenyen indulhass el a roleplay világában.')
                        .setImage('https://images.unsplash.com/photo-1580659325419-7256247c72f1?auto=format&fit=crop&q=80&w=1200') // Los Angeles / City Skyline
                        .setColor('#ff9900');
                        
                    const embed2 = new EmbedBuilder()
                        .setTitle('📚 1. Lépés: Szabályzat megismerése')
                        .setDescription(`Mielőtt bármit is csinálnál, **kötelező** elolvasnod és megértened az alapszabályokat. Ezek ismerete nélkülözhetetlen a szerveren való játékhoz.\n\n🌐 Discord Szabályzat: ${rulesDiscordChannel ? `<#${rulesDiscordChannel.id}>` : '#discord-szabályzat'}\n📖 Szerver Szabályzat: ${rulesServerChannel ? `<#${rulesServerChannel.id}>` : '#szerver-szabályzat'}`)
                        .setImage('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=1200') // Law / Rules
                        .setColor('#3498db');
                        
                    const embed3 = new EmbedBuilder()
                        .setTitle('🪪 2. Lépés: Karakter Regisztráció')
                        .setDescription(`A játék elkezdéséhez szükséged van egy karakterre. Nyisd meg a ${ticketChannel ? `<#${ticketChannel.id}>` : '**ticket-nyitás**'} csatornát, és kérj egy karakterlapot az adminoktól, vagy kövesd a regisztrációs utasításokat a dedikált csatornában.`)
                        .setImage('https://images.unsplash.com/photo-1531259254848-18e0018a16db?auto=format&fit=crop&q=80&w=1200') // Identification / Profile
                        .setColor('#2ecc71');
                        
                    const embed4 = new EmbedBuilder()
                        .setTitle('💸 3. Lépés: Munkavállalás és Pénzkeresés')
                        .setDescription('Az induláshoz pénzre lesz szükséged. Több alapmunka közül is választhatsz a városban (Városházán vagy a megfelelő blipnél tudod őket felvenni):\n\n⛏️ **Bányász:** Nehéz fizikai munka, de stabil jövedelem. Keresd a térképen a csákány ikont.\n📦 **Áruszállító:** Furikázz a városban és szállíts ki csomagokat a megadott címekre.\n🗑️ **Szemétszállító:** Tartsd tisztán a várost barátaiddal közösen és kapj érte jutalmat!\n\n*(A térképen 📍 ikonok jelzik a felvehető munkákat a Városháza környékén)*')
                        .setImage('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1200') // Work / Truck
                        .setColor('#f1c40f');
                        
                    const embed5 = new EmbedBuilder()
                        .setTitle('🏢 4. Lépés: Frakcióba való belépés')
                        .setDescription(`Ha már megismerkedtél a várossal, csatlakozhatsz különböző legális vagy illegális frakciókhoz (Rendőrség, Mentősök, Szerelők vagy Bandák).\n\nKeresd a ${factionChannel ? `<#${factionChannel.id}>` : '**frakció-jelentkezés**'} csatornát a Discordunkon, vagy jelentkezz In-Game (IC) a frakciók vezetőinél!`)
                        .setImage('https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?auto=format&fit=crop&q=80&w=1200') // Police Car
                        .setColor('#9b59b6');
                        
                    await channel.send({ embeds: [embed1, embed2, embed3, embed4, embed5] });
                } else if (chData.panel === 'business') {
                    const embed = new EmbedBuilder()
                        .setTitle('💼 Vállalkozás igénylés')
                        .setDescription('Itt lehet új céget, boltot, éttermet, klubot, műhelyt vagy egyedi RP vállalkozást kérni a szerveren.')
                        .setColor('#2b2d31');
                    
                    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('bus_shop').setLabel('Bolt igénylés').setStyle(ButtonStyle.Primary).setEmoji('🏪'),
                        new ButtonBuilder().setCustomId('bus_res').setLabel('Étterem / kávézó').setStyle(ButtonStyle.Primary).setEmoji('🍔'),
                        new ButtonBuilder().setCustomId('bus_srv').setLabel('Szolgáltatás/műhely').setStyle(ButtonStyle.Primary).setEmoji('🔧')
                    );
                    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('bus_club').setLabel('Klub / szórakozóhely').setStyle(ButtonStyle.Secondary).setEmoji('🎭'),
                        new ButtonBuilder().setCustomId('bus_custom').setLabel('Egyedi vállalkozás').setStyle(ButtonStyle.Secondary).setEmoji('✍️')
                    );
                    await channel.send({ embeds: [embed], components: [row1, row2] });
                } else if (chData.panel === 'guide_k9') {
                    const embedHeader = new EmbedBuilder()
                        .setTitle('🔐 K9 Rendszer - Játékos Útmutató')
                        .setDescription('A K9 egy professzionális rendvédelmi rendszer. Ez az útmutató segít megérteni a saját kutyád kezelését és a kapcsolódó szabályokat.')
                        .setImage('https://cdn.discordapp.com/attachments/1498975511676981250/1501123509043335300/file_00000000cdfc720a967510d865e72a9d.png?ex=69faedb6&is=69f99c36&hm=deecca72436153b7f680ae89a56f388e4c6414fa936ff4432ef4ee5b350fea80&')
                        .setColor('#0047AB');

                    const embedLogistics = new EmbedBuilder()
                        .setTitle('👮 Jogosultságok és Gazda-szerep')
                        .addFields(
                            { name: '🚔 Rendvédelmi jogosultság', value: 'A rendszert CSAK rendvédelmi frakciótagok (Police, Sheriff, stb.) használhatják munkaköri eszközként.' },
                            { name: '🐕 Kizárólagos irányítás', value: 'Minden kutya csak a saját gazdájának fogad szót. Más játékos K9-ének nem tudsz parancsot adni, és más sem tudja a tiedet irányítani vagy hazaküldeni.' }
                        )
                        .setColor('#1e40af');

                    const embedRules = new EmbedBuilder()
                        .setTitle('⚠️ Fontos RP Szabályok és Figyelmeztetések')
                        .addFields(
                            { name: '🛡️ Területvédelem', value: 'Ha a K9 területvédelmi módban van és jelez (ugat/morog), ne menj a közelébe! Amennyiben figyelmen kívül hagyod a figyelmeztetést és a kutya megtámad, az a te felelősséged.' },
                            { name: '🚫 "Hecből" lövés tilalma', value: 'Szigorúan tilos a K9 kutyákat szórakozásból, indokolatlanul le lőni vagy bántalmazni. Ez súlyos szabályszegésnek minősül.' },
                            { name: '⚖️ RP hűség', value: 'A K9 nem egy gép, hanem egy élőlény az RP-ben. Kezeld tisztelettel és csak indokolt esetben használj kényszerítő parancsokat (támadás, őrzés).' }
                        )
                        .setColor('#ef4444');

                    const embedFunctions = new EmbedBuilder()
                        .setTitle('⚙️ Elérhető Funkciók')
                        .addFields(
                            { name: '🏠 Alapok', value: '• Behívás / Hazaküldés\n• Követés / Maradás\n• Ülés / Fekvés', inline: true },
                            { name: '🚗 Bevetés', value: '• Járműbe be/ki\n• Újraélesztés\n• K9 kamera', inline: true },
                            { name: '⚔️ Kényszerítés', value: '• Támadás / Védj meg mód\n• Területvédelem\n• Bilincselt személy őrzése\n• Kábítószer-keresés', inline: false }
                        )
                        .setColor('#1d4ed8');

                    const embedKeys = new EmbedBuilder()
                        .setTitle('🎮 Vezérlés és Testreszabás')
                        .setDescription('A K9 rendszert billentyűkkel is irányíthatod a gyorsabb reakció érdekében.')
                        .addFields(
                            { name: '⌨️ Alap kiosztás', value: '`R` - Ide hívás | `K` - Követés | `L` - Haza | `H` - Támadás\n`P` - Védés | `U` - Maradás | `Y` - Jármű | `B` - Kamera', inline: false },
                            { name: '⚙️ Testreszabás', value: 'A játék beállításaiban (Settings -> Key Bindings -> FiveM) a gombkiosztást tetszőlegesen átállíthatod a saját igényeidnek megfelelően.' }
                        )
                        .setFooter({ text: 'Nexus RP • K9 Player Guide' })
                        .setColor('#2563eb');

                    await channel.send({ embeds: [embedHeader, embedLogistics, embedRules, embedFunctions, embedKeys] });
                } else if (chData.panel === 'guide_pet') {
                    const embedHeader = new EmbedBuilder()
                        .setTitle('🐾 Pet Rendszer - Hobby Állatok')
                        .setDescription('A szerveren lehetőség van saját háziállatok tartására. Ezeket az állatokat a játékosok saját szórakoztatásukra és RP-színűbbé tételére használhatják.')
                        .setImage('https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=1200') // Happy Golden Retriever
                        .setColor('#92400e');

                    const embedLogistics = new EmbedBuilder()
                        .setTitle('🏠 Kedvenced Tartása')
                        .addFields(
                            { name: '🛒 Beszerzés', value: 'Hobby állatokat az állatkereskedésekben vagy speciális eseményeken szerezhetsz be.' },
                            { name: '🥩 Gondozás', value: 'Figyelj oda az állatod igényeire! Ha nem kap elég figyelmet vagy élelmet, az állat állapota romolhat.' },
                            { name: '🚫 Korlátozások', value: 'A hobby állatok **nem** rendelkeznek rendőrségi képzettséggel. Nem tudnak kábítószert keresni vagy lebilincselt személyt őrizni.' }
                        )
                        .setColor('#b45309');

                    const embedFunctions = new EmbedBuilder()
                        .setTitle('🐕 Alap Funkciók')
                        .setDescription('A hobby állatok az alábbi alapvető parancsokat ismerik:')
                        .addFields(
                            { name: '🏃 Mozgás', value: '• Hívás ide / Hazaküldés\n• Követés / Maradj helyben', inline: true },
                            { name: '🎭 Trükkök', value: '• Ülj le / Feküdj le\n• Ugatás / Hangadás', inline: true },
                            { name: '⚔️ Védelem', value: '• Támadás (csak indokolt esetben!)\n• Védj meg mód', inline: false }
                        )
                        .setColor('#d97706');

                    const embedKeys = new EmbedBuilder()
                        .setTitle('🎮 Gyorsbillentyűk')
                        .addFields(
                            { name: '⌨️ Billentyűk', value: '`R` - Ide hívás\n`K` - Követés ki/be\n`L` - Hazaküldés\n`H` - Támadás\n`P` - Védés\n`U` - Helyben maradás' }
                        )
                        .setColor('#f59e0b');

                    const embedDifference = new EmbedBuilder()
                        .setTitle('⚠️ K9 vs Pet Különbségek')
                        .setDescription('Fontos tudni, hogy mi az, amit egy civil Pet **nem tud** csinálni:')
                        .addFields(
                            { name: '❌ Tiltott funkciók civil állatoknak', value: '• Kábítószer keresés (`/k9drugsearch`) - **NINCS**\n• Bilincselt személy őrzése (`/k9guardcuffed`) - **NINCS**\n• Terület átvizsgálása (`/k9search`) - **NINCS**\n• K9 kamera elérése - **NINCS**' }
                        )
                        .setFooter({ text: 'Nexus RP • Pet System Guide' })
                        .setColor('#fbbf24');

                    await channel.send({ embeds: [embedHeader, embedLogistics, embedFunctions, embedKeys, embedDifference] });
                } else if (chData.panel === 'faction') {
                    const embedHeader = new EmbedBuilder()
                        .setTitle('🏢 NEXUS HORIZON RP • FRAKCIÓ ÉS BANDA KÖZPONT')
                        .setDescription('Üdvözlünk a **Nexus Horizon RP** hivatalos frakció és szervezeti felületén!\n\nItt nyújthatsz be kérelmet új **Banda / Maffia / Illegális szervezet** alapítására, vagy jelentkezhetsz a város meglévő **Legális Frakcióiba** (LSPD, EMS, Szerelőtelep).')
                        .setColor('#f59e0b')
                        .addFields(
                            { 
                                name: '📜 KÖTELEZŐ SZABÁLYZAT & FELTÉTELEK', 
                                value: 'A jelentkezési lap kitöltése **kizárólag a Frakció Szabályzat elolvasása és interaktív elfogadása (Igen / Nem) után** válik elérhetővé!' 
                            },
                            {
                                name: '📋 JELENTKEZÉS LÉPÉSEI',
                                value: '1️⃣ Válaszd ki az alapítani kívánt szervezetet vagy frakciót alább.\n2️⃣ Olvasd el a felugró részletes szabályzatot, majd kattints az **[✅ Igen, elfogadom]** gombra.\n3️⃣ Töltsd ki az űrlapot a tervezett RP koncepciódról.\n4️⃣ A rendszer automatikusan megnyitja a privát bírálati csatornát a vezetőséggel!'
                            }
                        )
                        .setFooter({ text: 'Nexus Horizon RP • Frakció & Banda Rendszer' })
                        .setTimestamp();
                    
                    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('fac_web_portal').setLabel('🌐 Webes Jelentkezési Lap (Ajánlott)').setStyle(ButtonStyle.Success).setEmoji('🌐'),
                        new ButtonBuilder().setCustomId('fac_gang_open_rules').setLabel('Banda / Frakció Alapítás (Discord)').setStyle(ButtonStyle.Primary).setEmoji('👑')
                    );
                    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('fac_legal_open_rules').setLabel('Legális Frakció Jelentkezés').setStyle(ButtonStyle.Secondary).setEmoji('🚓'),
                        new ButtonBuilder().setCustomId('fac_faq_btn').setLabel('Gyakran Ismételt Kérdések (GYIK)').setStyle(ButtonStyle.Secondary).setEmoji('💡')
                    );
                    await channel.send({ embeds: [embedHeader], components: [row1, row2] });
                } else if (chData.panel === 'character') {
                    const embed = new EmbedBuilder()
                        .setTitle('🪪 Karakter regisztráció')
                        .setDescription('Minden új lakónak kötelező kitöltenie a karakterlapot a beilleszkedéshez.')
                        .setColor('#2b2d31');
                    
                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('char_register').setLabel('Karakterlap kitöltése').setStyle(ButtonStyle.Success).setEmoji('📝')
                    );
                    await channel.send({ embeds: [embed], components: [row] });
                } else if (chData.panel === 'rules_discord') {
                    const { discordCount } = await getRulesAckCounts();
                    const panelData = generateDiscordRulesEmbeds(discordCount);
                    await channel.send(panelData);
                } else if (chData.panel === 'rules_server') {
                    const { serverCount } = await getRulesAckCounts();
                    const panelData = generateServerRulesEmbeds(serverCount);
                    await channel.send(panelData);
                } else if (chData.panel === 'link_account') {
                    const embed = new EmbedBuilder()
                        .setTitle('🔗 Discord ↔ FiveM Fiók Összekötés')
                        .setDescription(
                            'Kösd össze a Discord fiókodat a FiveM karaktereddel, hogy a jutalmaid ténylegesen a szerveren landoljanak!\n\n' +
                            '**Miért fontos?**\n' +
                            '💎 Amikor boostolod a szervert, a +5,000 PP jutalom automatikusan a karaktereden is jóváíródik\n' +
                            '🎁 A napi jutalom (`/daily`) és a webshop vásárlásaid szintén a karaktereden landolnak\n\n' +
                            '**Hogyan működik?**\n' +
                            '1️⃣ Kattints a **"Kód Igénylése"** gombra\n' +
                            '2️⃣ Lépj be a FiveM szerverre\n' +
                            '3️⃣ Írd be a chatbe: `/verify <kód>`\n' +
                            '4️⃣ Kész! A fiókjaid mostantól össze vannak kötve'
                        )
                        .setColor('#06b6d4')
                        .setFooter({ text: 'Nexus Horizon RP • Fiók Összekötés' });

                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('request_link_code').setLabel('Kód Igénylése').setStyle(ButtonStyle.Primary).setEmoji('🔗'),
                        new ButtonBuilder().setCustomId('unlink_fivem_account').setLabel('Fiók Leválasztása').setStyle(ButtonStyle.Secondary).setEmoji('🔓')
                    );
                    await channel.send({ embeds: [embed], components: [row] });
                } else if (chData.panel === 'welcome') {
                    const embed = new EmbedBuilder()
                        .setTitle('👋 Üdvözlünk a Nexus Horizon RP Discordján!')
                        .setDescription(
                            'Örülünk, hogy csatlakoztál! Mielőtt belevágnál, kövesd az alábbi lépéseket:\n\n' +
                            '**1️⃣ Olvasd el a szabályzatot** — 📖 `#szerver-szabályzat` és 📜 `#discord-szabályzat`\n' +
                            '**2️⃣ Igényelj Whitelistet** — 🛡️ `#whitelist-kvíz`\n' +
                            '**3️⃣ Válaszd ki az értesítéseidet** — 🔔 `#értesítés-szerepek`\n' +
                            '**4️⃣ Csatlakozz a szerverhez** — 🟢 `#szerver-státusz`\n\n' +
                            'Ha bármiben elakadnál, nyiss egy ticketet a 🎫 `#ticket-nyitás` csatornában — a staff csapat szívesen segít!'
                        )
                        .setColor('#06b6d4')
                        .setFooter({ text: 'Nexus Horizon RP • Jó szórakozást kívánunk!' })
                        .setTimestamp();
                    await channel.send({ embeds: [embed] });
                } else if (chData.panel === 'selfroles') {
                    const embed = new EmbedBuilder()
                        .setTitle('🔔 Válaszd ki, miről szeretnél értesítést kapni!')
                        .setDescription(
                            'Kattints a lenti gombokra, hogy fel- vagy levedd magadról az adott szerepkört. Bármikor módosíthatod.\n\n' +
                            '📢 **Frissítés Ping** — szerver frissítések, patch note-ok\n' +
                            '🎉 **Event Ping** — közösségi eventek, RP alkalmak\n' +
                            '🎁 **Nyereményjáték Ping** — giveaway-k és nyeremények'
                        )
                        .setColor('#8b5cf6')
                        .setFooter({ text: 'Nexus Horizon RP • Önkiszolgáló szerepek' });

                    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('selfrole_update').setLabel('Frissítés Ping').setStyle(ButtonStyle.Primary).setEmoji('📢'),
                        new ButtonBuilder().setCustomId('selfrole_event').setLabel('Event Ping').setStyle(ButtonStyle.Success).setEmoji('🎉'),
                        new ButtonBuilder().setCustomId('selfrole_giveaway').setLabel('Nyereményjáték Ping').setStyle(ButtonStyle.Secondary).setEmoji('🎁')
                    );
                    await channel.send({ embeds: [embed], components: [row] });
                } else if (chData.panel === 'booster_info') {
                    const embed = new EmbedBuilder()
                        .setTitle('💎 Köszönjük, hogy boostolod a szervert!')
                        .setDescription(
                            'Ez a csatorna kizárólag a **Nexus Horizon RP**-t Nitro Boosttal támogató tagoknak elérhető.\n\n' +
                            '🎁 **Amit kapsz:**\n' +
                            '• +5,000 Prémium Pont automatikusan jóváírva\n' +
                            '• Egyedi 💎 Booster rang és szín a Discordon\n' +
                            '• Exkluzív, gyorsított ticket elbírálás\n' +
                            '• Ez a privát csatorna a többi boosterrel való csevegéshez\n\n' +
                            'A boost lejártával vagy visszavonásával a jogosultságok automatikusan megszűnnek.'
                        )
                        .setColor('#f47fff')
                        .setFooter({ text: 'Nexus Horizon RP • Booster Zóna' });
                    await channel.send({ embeds: [embed] });
                } else if (chData.panel === 'polls') {
                    const embed = new EmbedBuilder()
                        .setTitle('🗳️ Közösségi Szavazások')
                        .setDescription(
                            'Itt indít a vezetőség időszakos szavazásokat a szerver jövőjéről — új rendszerek, események vagy egyensúlyi módosítások kapcsán.\n\n' +
                            'Használd a Discord natív szavazás (Poll) funkcióját, vagy reagálj emojikkal a kiírt kérdésekre. Minden vélemény számít!'
                        )
                        .setColor('#22d3ee')
                        .setFooter({ text: 'Nexus Horizon RP • A közösség hangja' });
                    await channel.send({ embeds: [embed] });
                }

            }
          }
        }

        if (setupType === 'staff') {
          const staffChat = guild.channels.cache.find((c: any) => c.name.includes('staff-csevegő') || c.name.includes('staff-chat')) as any;
          if (staffChat && staffChat.send) {
            const staffEmbed = new EmbedBuilder()
              .setTitle('🛡️ Nexus Staff & Log Rendszer Sikeresen Telepítve')
              .setDescription('Ez a szerver kijelölésre került a **Nexus Horizon RP** hivatalos Staff & Log központjának!\nA bot mostantól az összes in-game eseményt és adminisztrátori naplózást valós időben ide továbbítja.')
              .addFields([
                { name: '⚔️ Esemény & Bűnözés Logok', value: '• `💀┃kill-log`: Gyilkosságok, halálesetek, fegyver & távolság adatok\n• `🚨┃rablás-log`: Bank, ékszerbolt, bolt rablási riasztások & képek\n• `📦┃item-és-drop-log`: Item eldobások és felvételek\n• `🚗┃jármű-lopás-log`: Autólopások, lefoglalások', inline: false },
                { name: '🔨 Adminisztráció & Fegyelmi', value: '• `🔨┃admin-log`: Kick, Ban, Jail és RCON műveletek\n• `⚠️┃figyelmeztetések`: Automata és admin figyelmeztetések\n• `🛡️┃whitelist-log`: Sikeres és sikertelen Whitelist kvízek\n• `📋┃duty-log`: Admin szolgálati idők és heti összefoglalók', inline: false },
                { name: '💰 Gazdaság, Rendszer & Biztonság', value: '• `💰┃pénz-log`: Nagyobb összegű utalások, széf- és bankmozgások\n• `🚨┃anticheat`: Gyanús játékos mozgások & riasztások\n• `🔌┃csatlakozás-log`: Játékos belépések, kilépések és crash-ek\n• `💬┃chat-mirror`: Teljes in-game chat tükrözése', inline: false },
                { name: '⚡ Gyors Staff Parancsok', value: '`/duty` - Szolgálatba lépés/leadás\n`/dutystats` - Heti szolgálati idő statisztika\n`/history` - Játékos előélet (Ban, Warn, Jail)\n`/transcript` - Ticket archiválás HTML formátumban', inline: false }
              ])
              .setColor('#5865F2')
              .setFooter({ text: 'Nexus Horizon RP • Staff & Log Központ' })
              .setTimestamp();
            await staffChat.send({ embeds: [staffEmbed] }).catch(() => {});
          }
          await interaction.followUp("✅ **A Staff & Log szerver felépítése sikeresen befejeződött!**\n\nMinden log szoba létrehozva, a jogosultságok kizárólag a Staff/Admin szerepkörök számára lettek beállítva. A bot mostantól az összes in-game logot ide továbbítja.");
        } else {
          await interaction.followUp("✅ **A Közösségi szerver felépítése és a felugró információs panelek sikeresen létrehozva!**");
        }
        
        // Trigger a status update manually now that we made the channel
        const { fetchFivemStatus } = await import('./fivem.ts');
        const status = await fetchFivemStatus();
        if (guild) {
             const channel = guild.channels.cache.find(c => c.name.includes('szerver') && c.name.includes('tusz')) as any;
             if (channel) {
                 const { EmbedBuilder } = await import('discord.js');
                 const embed = new EmbedBuilder()
                    .setTitle('🌐 Szerver Státusz')
                    .setColor(status?.online ? '#00FF00' : '#FF0000')
                    .setTimestamp();
                 if (status?.online) {
                    embed.setDescription('A szerver jelenleg **Elérhető** és minden szolgáltatás zavartalanul működik.')
                         .addFields(
                           { name: '👥 Játékosok', value: `${status.clients} / ${status.max_clients}`, inline: true },
                           { name: '🔌 Csatlakozás', value: `\`connect ${process.env.FIVEM_SERVER_IP || '84.1.49.111'}:${status?.port || process.env.FIVEM_SERVER_PORT || '30120'}\``, inline: true }
                         );
                 } else {
                    embed.setDescription('A szerver jelenleg **Offline** karbantartás miatt.\nKérünk, légy türelemmel, a vezetőség dolgozik rajta!')
                         .addFields({ name: '🔌 Csatlakozás', value: `\`connect ${process.env.FIVEM_SERVER_IP || '84.1.49.111'}:${process.env.FIVEM_SERVER_PORT || '30120'}\``, inline: true });
                 }
                 await channel.send({ embeds: [embed] }).catch(() => {});
             }
        }
        
      } catch (err: any) {
        console.error("Setup error:", err);
        await interaction.followUp("❌ Hiba történt a csatornák létrehozása közben: " + err.message);
      }
      break;
          }
      }
    }

    if (interaction.isButton()) {
        const { customId } = interaction;
        
        // Whitelist quiz start
        if (customId === 'start_whitelist_quiz') {
            return await startQuizForUser(interaction);
        }

        // Whitelist quiz answer
        if (customId.startsWith('quiz_ans_')) {
            const optIdx = parseInt(customId.replace('quiz_ans_', ''));
            return await handleQuizAnswer(interaction, optIdx);
        }

        // Daily reward button
        if (customId === 'claim_daily_btn') {
            return await handleDailyRewardCommand(interaction);
        }

        // CS:GO Case opening buttons
        if (customId.startsWith('open_case_')) {
            const caseId = customId.replace('open_case_', '');
            return await executeCaseOpening(interaction, caseId);
        }

        if (customId === 'view_all_cases') {
            const userBal = await getUserBalance(interaction.user.id);
            const overview = await generateCasesOverviewEmbed(userBal);
            if (interaction.replied || interaction.deferred) {
                return await interaction.followUp({ ...overview, ephemeral: true });
            } else {
                return await interaction.reply({ ...overview, ephemeral: true });
            }
        }

        if (customId === 'check_my_balance') {
            const bal = await getUserBalance(interaction.user.id);
            const embed = new EmbedBuilder()
              .setTitle(`💳 ${interaction.user.username} Egyenlege`)
              .setDescription(
                `🪙 **Discord Pénz (DC):** \`${(bal.discordCoins ?? 500).toLocaleString()} DC\`\n` +
                `💎 **Prémium Pont (PP):** \`${(bal.ppBalance ?? 0).toLocaleString()} PP\`\n` +
                `💵 **FiveM Készpénz:** \`$${(bal.balance ?? 0).toLocaleString()}\`\n\n` +
                `💡 *Használd a fenti gombokat a ládanyitáshoz!*`
              )
              .setColor('#f59e0b')
              .setThumbnail(interaction.user.displayAvatarURL())
              .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Toggle admin duty button
        if (customId === 'toggle_duty_btn') {
            return await handleDutyCommand(interaction);
        }

        if (customId === 'join_giveaway') {
            const giveaway = activeGiveaways.get(interaction.message.id);
            if (!giveaway) {
                return interaction.reply({ content: '❌ Ez a sorsolás már nem aktív vagy lejárt.', ephemeral: true });
            }

            if (Date.now() > giveaway.expiresAt) {
                return interaction.reply({ content: '⏰ Ez a sorsolás már véget ért!', ephemeral: true });
            }

            if (giveaway.participants.has(interaction.user.id)) {
                return interaction.reply({ content: 'ℹ️ Már jelentkeztél erre a sorsolásra!', ephemeral: true });
            }

            giveaway.participants.add(interaction.user.id);
            await interaction.reply({ content: '✅ Sikeresen jelentkeztél! Sok sikert!', ephemeral: true });

            // Update participant count in embed
            try {
                const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                // Find or set the participant count field
                const fields = [...interaction.message.embeds[0].fields];
                const pIndex = fields.findIndex(f => f.name.includes('Jelentkezők'));
                if (pIndex !== -1) {
                    fields[pIndex] = { name: '👥 Jelentkezők', value: `**${giveaway.participants.size}** fő`, inline: true };
                } else {
                    fields.push({ name: '👥 Jelentkezők', value: `**${giveaway.participants.size}** fő`, inline: true });
                }
                embed.setFields(fields);
                await interaction.message.edit({ embeds: [embed] });
            } catch (e) {
                console.error('Failed to update giveaway embed:', e);
            }
            return;
        }

        if (customId.startsWith('vote_')) {
            const [action] = customId.split('_').slice(1);
            const embed = interaction.message.embeds[0];
            if (!embed) return;

            const newEmbed = EmbedBuilder.from(embed as any);
            let upvotes = 0;
            let downvotes = 0;

            embed.fields.forEach(f => {
                if (f.name.includes('👍')) upvotes = parseInt(f.value) || 0;
                if (f.name.includes('👎')) downvotes = parseInt(f.value) || 0;
            });

            if (action === 'up') upvotes++;
            if (action === 'down') downvotes++;

            newEmbed.setFields([
                { name: '👍 Támogatom', value: `**${upvotes}** szavazat`, inline: true },
                { name: '👎 Elutasítom', value: `**${downvotes}** szavazat`, inline: true }
            ]);

            await interaction.update({ embeds: [newEmbed] });
        }

        if (customId === 'ack_rules_discord') {
            await handleRulesAcknowledgment(interaction as any, 'discord');
            return;
        }

        if (customId === 'ack_rules_server') {
            await handleRulesAcknowledgment(interaction as any, 'server');
            return;
        }

        if (customId === 'verify_rules') {
            await handleRulesAcknowledgment(interaction as any, 'server');
            return;
        }

        if (customId === 'selfrole_update' || customId === 'selfrole_event' || customId === 'selfrole_giveaway') {
            const roleMap: Record<string, string> = {
                selfrole_update: '📢 Frissítés Ping',
                selfrole_event: '🎉 Event Ping',
                selfrole_giveaway: '🎁 Nyereményjáték Ping'
            };
            const roleName = roleMap[customId];
            const guild = interaction.guild;
            const member = interaction.member as any;

            if (!guild || !member) {
                await interaction.reply({ content: '❌ Ez a gomb csak szerveren belül használható.', ephemeral: true });
                return;
            }

            try {
                let role = guild.roles.cache.find((r: any) => r.name === roleName);
                if (!role) {
                    role = await guild.roles.create({ name: roleName, mentionable: true, reason: 'Önkiszolgáló értesítés szerep' });
                }

                const hasRole = member.roles.cache.has(role.id);
                if (hasRole) {
                    await member.roles.remove(role);
                    await interaction.reply({ content: `🔕 Levetted magadról a(z) **${roleName}** szerepkört. Mostantól nem kapsz erre pinget.`, ephemeral: true });
                } else {
                    await member.roles.add(role);
                    await interaction.reply({ content: `🔔 Felvetted a(z) **${roleName}** szerepkört. Mostantól értesítést kapsz róla!`, ephemeral: true });
                }
            } catch (e) {
                await interaction.reply({ content: '❌ Hiba történt a szerepkör kezelése közben. Kérjük, jelezd a stafnak.', ephemeral: true });
            }
            return;
        }

        if (customId === 'request_link_code') {
            try {
                await interaction.deferReply({ ephemeral: true });
                const userTag = interaction.user.tag || interaction.user.username || interaction.user.globalName || 'Felhasználó';
                const codeResult = await createLinkCode(interaction.user.id, userTag);
                const embed = new EmbedBuilder()
                    .setTitle('🔗 Összekötő Kódod')
                    .setDescription(
                        `Lépj be a FiveM szerverre, majd írd be a chatbe:\n\n\`/verify ${codeResult.code}\`\n\n` +
                        `⏱️ A kód **10 percig** érvényes.`
                    )
                    .setColor('#06b6d4');
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } catch (e) {
                console.error('[Bot] request_link_code error:', e);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Hiba történt a kód generálása közben. Kérjük próbáld újra!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Hiba történt a kód generálása közben. Kérjük próbáld újra!', ephemeral: true });
                    }
                } catch {}
            }
            return;
        }

        if (customId === 'unlink_fivem_account') {
            try {
                const linked = await getLinkedAccount(interaction.user.id);
                if (!linked) {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'ℹ️ Jelenleg nincs összekötött FiveM karaktered.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'ℹ️ Jelenleg nincs összekötött FiveM karaktered.', ephemeral: true });
                    }
                    return;
                }
                await unlinkAccount(interaction.user.id);
                const successMsg = `🔓 A(z) **${linked.fivemName}** karakter sikeresen leválasztva a Discord fiókodról.`;
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: successMsg, ephemeral: true });
                } else {
                    await interaction.reply({ content: successMsg, ephemeral: true });
                }
            } catch (e) {
                console.error('[Bot] unlink_fivem_account error:', e);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ Hiba történt a leválasztás közben.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ Hiba történt a leválasztás közben.', ephemeral: true });
                    }
                } catch {}
            }
            return;
        }

        if (customId === 'fac_gang_open_rules' || customId === 'fac_rules_view' || customId === 'fac_gang_apply') {
            const embed = new EmbedBuilder()
                .setTitle('👑 NEXUS STATE RP • BANDA & FRAKCIÓ SZABÁLYZAT')
                .setDescription('Kérjük, hogy a jelentkezési lap kitöltése előtt figyelmesen olvasd végig az alábbi feltételeket!\n\n**A jelentkezési lap kizárólag az [✅ Igen, Elolvastam és Elfogadom] gombra kattintva nyitható meg!**')
                .setColor('#f59e0b')
                .addFields(
                    { 
                        name: '1️⃣ Létszám és Csapat Követelmények', 
                        value: '• Új banda / frakció alapításához legalább **3-5 aktív fő** szükséges.\n• A vezetőknek megbízható játékosoknak kell lenniük (tiszta vagy enyhe UCP előélet).\n• Minden tagnak ismernie kell az alapvető RP szabályokat (DM, NonRP, PG, MG tilalom).' 
                    },
                    { 
                        name: '2️⃣ Szerepjáték (RP) Minőség & Célok', 
                        value: '• A szerver nem a folyamatos DM-ről és lövöldözésről szól!\n• A bandáknak rendelkezniük kell életszerű RP koncepcióval (pl. terület felügyelet, feketepiac, szórakozóhelyek, védelmi pénzek, illegális versenyek).' 
                    },
                    { 
                        name: '3️⃣ Leaderi Felelősségvállalás', 
                        value: '• A frakció vezetője teljes felelősséggel tartozik a tagjai viselkedéséért.\n• Súlyos szabályszegések vagy ismétlődő NonRP esetén a frakció figyelmeztetést (Warn) vagy feloszlatást kaphat.' 
                    },
                    { 
                        name: '4️⃣ Bázis (HQ), Garázs és Széf', 
                        value: '• Sikeres szóbeli egyeztetés után a vezetőség biztosítja az in-game jogokat, frakció garázst és széfet.\n• Egyedi HQ mapping a vezetőséggel egyeztetve kérhető.' 
                    },
                    { 
                        name: '⚖️ NYILATKOZAT ÉS DÖNTÉS', 
                        value: '**Elolvastad és elfogadod a fenti szabályzatot és követelményeket?**' 
                    }
                )
                .setFooter({ text: 'A lap megnyitásához kötelező az elfogadás!' })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('fac_gang_accept_modal').setLabel('Igen, Elolvastam és Elfogadom').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('fac_gang_decline').setLabel('Nem fogadom el').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }

        if (customId === 'fac_legal_open_rules' || customId === 'fac_legal_apply') {
            const embed = new EmbedBuilder()
                .setTitle('🚓 NEXUS STATE RP • LEGÁLIS FRAKCIÓ SZABÁLYZAT')
                .setDescription('Üdvözlünk a legális hivatások (Rendőrség / Mentőszolgálat / Szerelőtelep) felvételi tájékoztatóján!\n\n**A jelentkezés megkezdéséhez kötelező a feltételek elfogadása.**')
                .setColor('#3b82f6')
                .addFields(
                    { 
                        name: '1️⃣ Alapvető Követelmények', 
                        value: '• Érett, felnőtt gondolkodás és megfelelő RP tapasztalat.\n• IC büntetlen előélet (Rendőrség / Mentők esetén).\n• Megfelelő heti aktivitás a szerveren és a frakcióban.' 
                    },
                    { 
                        name: '2️⃣ Hivatás és Etika', 
                        value: '• A legális frakciók a város rendjét és működését biztosítják. Tilos a hatalommal való visszaélés és az indokolatlan fegyverhasználat.\n• Rádiókódok és hivatali protokollok betartása kötelező.' 
                    },
                    { 
                        name: '⚖️ NYILATKOZAT ÉS DÖNTÉS', 
                        value: '**Elolvastad és elfogadod a legális frakciók működési elveit?**' 
                    }
                )
                .setFooter({ text: 'A jelentkezési űrlap megnyitásához kattints az Igen gombra!' })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('fac_legal_accept_modal').setLabel('Igen, Elolvastam és Elfogadom').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('fac_legal_decline').setLabel('Nem fogadom el').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            return;
        }

        if (customId === 'fac_gang_decline' || customId === 'fac_legal_decline') {
            const embed = new EmbedBuilder()
                .setTitle('❌ Szabályzat Nem Lett Elfogadva')
                .setDescription('A **Nexus Horizon RP** szabályzata és frakció követelményei kötelező érvényűek minden játékosra és szervezetre.\n\n⚠️ **A jelentkezési lap nem tölthető ki a szabályzat elfogadása nélkül.**\n\nAmennyiben meggondolnád magad, a Frakció Központban bármikor újra megnyithatod a szabályzatot és elfogadhatod a feltételeket!')
                .setColor('#ef4444');
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (customId === 'fac_faq_btn') {
            const embed = new EmbedBuilder()
                .setTitle('💡 Frakció & Banda Alapítás - Gyakran Ismételt Kérdések')
                .setDescription('Minden fontos információ a frakciók létrehozásáról és a felvételi folyamatról:')
                .setColor('#3b82f6')
                .addFields(
                    { name: '🕒 Mennyi idő az elbírálás?', value: 'A vezetőség általában **24-48 órán belül** átnézi a jelentkezést a megnyílt privát ticketben.' },
                    { name: '🗣️ Lesz szóbeli meghallgatás?', value: 'Igen! A lap elfogadása után a vezetőség behívja a Leadert és a helyettest egy rövid Discord megbeszélésre a Vezetőségi Váróba.' },
                    { name: '💰 Kerül pénzbe a frakció alapítás?', value: 'Nem, a frakció alapítás teljesen ingyenes, a minőségi szerepjáték és az aktivitás a döntő szempont!' },
                    { name: '🏢 Kapunk egyedi mappingot és széffel ellátott HQ-t?', value: 'Igen! A szóbeli jóváhagyást követően a maperek és fejlesztők beállítják az egyedi frakció spawn-t, garázst és széfet.' }
                )
                .setFooter({ text: 'Nexus Horizon RP • Vezetőség' });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (customId === 'fac_web_portal') {
            const appUrl = process.env.APP_URL || 'https://ais-pre-npv3ldtvhtd2gpmxdtnmyt-84545439565.europe-west2.run.app';
            const embed = new EmbedBuilder()
                .setTitle('🌐 NEXUS HORIZON RP • WEBES FRAKCIÓ JELENTKEZÉS')
                .setDescription('A leggyorsabb és legrészletesebb módon a hivatalos weboldalunkon nyújthatod be a frakció / banda alapítási kérelmedet!')
                .setColor('#10b981')
                .addFields(
                    {
                        name: '✨ Miért érdemes a weboldalon kitölteni?',
                        value: '• Átlátható, modern űrlap részletes leírási lehetőségekkel\n• Szabályzat hitelesítés és egyedi frakció színválasztás\n• **Azonnali automatikus Discord szobagenerálás a jóváhagyás után!**'
                    },
                    {
                        name: '🔗 Közvetlen Hivatkozás',
                        value: `Kattints az alábbi gombra vagy nyisd meg a böngésződben:\n👉 **[Frakció Igénylési Portál](${appUrl})**`
                    }
                )
                .setFooter({ text: 'Nexus Horizon RP • Online Jelentkezési Rendszer' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // ==========================================
        // FACTION SYSTEM INTERACTION BUTTONS
        // ==========================================

        // View full application details
        if (customId.startsWith('fac_view_details:')) {
            const appId = customId.split(':')[1];
            const app = getFactionApplicationById(appId);
            if (!app) {
                await interaction.reply({ content: '❌ A kérelem nem található az adatbázisban.', ephemeral: true });
                return;
            }

            const appEmbed = new EmbedBuilder()
                .setTitle(`📋 Frakció Kérelem Részletei • ${app.faction.fullName}`)
                .setDescription(
                    `**Frakciónév:** ${app.faction.fullName} (\`[${app.faction.tag}]\`)\n` +
                    `**Típus:** ${app.faction.type.toUpperCase()}\n` +
                    `**Vezető IC:** ${app.applicant.fivemCharacterName} (${app.applicant.discordTag})\n` +
                    `**Alvezér IC:** ${app.faction.coLeaderIC || 'Nincs megadva'}\n` +
                    `**Heti aktivitás:** ${app.applicant.weeklyHours} óra | **Életkor:** ${app.applicant.age} év\n` +
                    `**Státusz:** ${app.status.toUpperCase()}\n\n` +
                    `**📖 Háttértörténet:**\n${app.lore.backstory}\n\n` +
                    `**🎯 RP Terv & Tevékenységek:**\n${app.rpPlan.rpVision}\n\n` +
                    `**👥 Induló Tagok:**\n` +
                    app.members.map(m => `• **${m.fivemName}** (\`${m.discordTag}\`) - *${m.plannedRank}*`).join('\n')
                )
                .setColor(app.faction.primaryColor as any || '#f59e0b')
                .setFooter({ text: `Kérelem ID: ${app.id} • Nexus Horizon RP` })
                .setTimestamp();

            await interaction.reply({ embeds: [appEmbed], ephemeral: true });
            return;
        }

        // Open interview room
        if (customId.startsWith('fac_interview_room:')) {
            if (!canManageBot(interaction.member)) {
                await interaction.reply({ content: '❌ Csak a vezetőség indíthat interjú szobát!', ephemeral: true });
                return;
            }

            const appId = customId.split(':')[1];
            await interaction.deferReply({ ephemeral: true });

            const result = await createInterviewChannel(
                interaction.client,
                interaction.guildId || '',
                appId,
                interaction.user
            );

            await interaction.editReply({ content: result.message });
            return;
        }

        // Request changes (opens modal)
        if (customId.startsWith('fac_request_changes:')) {
            if (!canManageBot(interaction.member)) {
                await interaction.reply({ content: '❌ Csak a vezetőség kérhet módosítást a kérelmen!', ephemeral: true });
                return;
            }

            const appId = customId.split(':')[1];
            const modal = new ModalBuilder()
                .setCustomId(`modalfac_changes:${appId}`)
                .setTitle('Módosítás Kérése');

            const reasonInput = new TextInputBuilder()
                .setCustomId('changes_reason')
                .setLabel('Kért Módosítások & Javítandó Pontok')
                .setPlaceholder('Írd le, hogy a jelentkezőnek miben kell pontosítania vagy kiegészítenie a lapot...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
            await interaction.showModal(modal);
            return;
        }

        // Approve & Provision Faction
        if (customId.startsWith('fac_approve_confirm:') || customId.startsWith('fac_approve_create:')) {
            if (!canManageBot(interaction.member)) {
                await interaction.reply({ content: '❌ Csak a vezetőség és adminisztrátorok hagyhatják jóvá a frakciót és hozhatnak létre szobákat!', ephemeral: true });
                return;
            }

            const appId = customId.split(':')[1];
            await interaction.deferReply({ ephemeral: false });

            const result = await approveAndProvisionFaction(
                interaction.client,
                interaction.guildId || '',
                appId,
                interaction.user
            );

            if (result.success) {
                await interaction.editReply({
                    content: `🎉 **SIKERES JÓVÁHAGYÁS ÉS DISCORD GENERÁLÁS!**\n${result.message}`
                });
            } else {
                await interaction.editReply({
                    content: `⚠️ ${result.message}`
                });
            }
            return;
        }

        // Reject faction modal prompt
        if (customId.startsWith('fac_reject_prompt:') || customId.startsWith('fac_reject_app:')) {
            if (!canManageBot(interaction.member)) {
                await interaction.reply({ content: '❌ Csak a vezetőség utasíthatja el a kérelmet!', ephemeral: true });
                return;
            }

            const appId = customId.split(':')[1];
            const modal = new ModalBuilder()
                .setCustomId(`modalfac_reject:${appId}`)
                .setTitle('Frakciókérelem Elutasítása');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reject_reason')
                .setLabel('Elutasítás Hivatalos Indoka')
                .setPlaceholder('Add meg az elutasítás pontos okát...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
            await interaction.showModal(modal);
            return;
        }

        // Event RSVP button handler
        if (customId.startsWith('event_rsvp:')) {
            const [, rsvpType, eventId] = customId.split(':');
            const userId = interaction.user.id;
            const userTag = interaction.user.tag;

            await interaction.reply({
                content: `✅ Köszönjük! A visszajelzésedet (${rsvpType === 'yes' ? 'Részt veszek' : rsvpType === 'no' ? 'Nem veszek részt' : 'Még nem tudom'}) rögzítettük az eseményhez.`,
                ephemeral: true
            });
            return;
        }

        // Rules modal/embed opener
        if (customId === 'fac_gang_open_rules') {
            const rulesEmbed = new EmbedBuilder()
                .setTitle('📜 Frakció Szabályzat és Követelmények')
                .setDescription(
                    `**1. Létszám:** Új frakció alapításához minimum 3-5 aktív tag szükséges.\n` +
                    `**2. Leaderi felelősség:** A frakció vezetője teljes felelősséget vállal a tagjai magatartásáért.\n` +
                    `**3. RP minőség:** Tilos az indokolatlan lövöldözés (DM), a PowerGaming (PG) és a MetaGaming (MG).\n` +
                    `**4. Titoktartás:** A belső frakció információk OOC kiadása szigorúan tilos.\n\n` +
                    `További részletekért nyisd meg a webes felületet és töltsd ki a hivatalos igénylőlapot!`
                )
                .setColor('#f59e0b')
                .setTimestamp();

            await interaction.reply({ embeds: [rulesEmbed], ephemeral: true });
            return;
        }

        if (customId === 'fac_accept_btn' || customId === 'fac_reject_btn') {
            if (!canManageBot(interaction.member)) {
                await interaction.reply({ content: '❌ Csak a vezetőség és adminisztrátorok bírálhatják el a kérelmet!', ephemeral: true });
                return;
            }

            const channel = interaction.channel as any;
            const isAccept = customId === 'fac_accept_btn';

            const statusText = isAccept 
                ? '🟢 **ELFOGADVA!** Kérjük, a Leader fáradjon fel a Vezetőségi Váróba a szóbeli egyeztetésre!' 
                : '🔴 **ELUTASÍTVA** a vezetőség által.';
            const embedColor = isAccept ? '#10b981' : '#ef4444';

            try {
                const oldEmbed = interaction.message.embeds[0];
                if (oldEmbed) {
                    const newEmbed = EmbedBuilder.from(oldEmbed)
                        .setColor(embedColor)
                        .addFields(
                            { name: '⚖️ Bírálati Döntés', value: `${statusText}\n**Bíráló:** ${interaction.user} (${interaction.user.tag})` }
                        );
                    
                    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket Lezárása').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                    );
                    await interaction.update({ embeds: [newEmbed], components: [disabledRow] });
                } else {
                    await interaction.reply({ content: `✅ Döntés rögzítve: ${statusText}` });
                }

                if (isAccept) {
                    await channel.send({ content: `🎉 **GRATULÁLUNK!** A vezetőség elfogadta a frakció alapítási kérelmet! Kérjük vegyétek fel a kapcsolatot a vezetőséggel szóbeli egyeztetés céljából a Discord váróban.` });
                } else {
                    await channel.send({ content: `❌ **Értesítés:** A frakció alapítási kérelem elutasításra került a vezetőség által.` });
                }
            } catch (e) {
                console.error('Error updating faction ticket status:', e);
            }
            return;
        }

        if (customId === 'close_ticket') {
             const channel = interaction.channel as any;
             if (channel && 'delete' in channel) {
                 await interaction.reply({ content: '🔒 **Ticket lezárása & HTML átirat generálása folyamatban (5 másodperc)...**', ephemeral: false });

                 try {
                     // 1. Generate automated styled HTML transcript
                     const transcript = await generateTicketTranscript(channel, interaction.user);
                     
                     const transcriptEmbed = new EmbedBuilder()
                         .setTitle(`🔒 TICKET LEZÁRVA & ARCHIVÁLVA`)
                         .setDescription(`A(z) **#${channel.name}** csatorna sikeresen lezárásra és archiválásra került.`)
                         .setColor('#10b981')
                         .addFields(
                             { name: '📁 Csatorna neve', value: `\`${channel.name}\``, inline: true },
                             { name: '👤 Lezárta', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                             { name: '🌐 Forrás Szerver', value: interaction.guild?.name || 'Nexus State RP', inline: true },
                             { name: '🕒 Időpont', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false }
                         )
                         .setFooter({ text: 'Nexus Horizon RP • Automata HTML Ticket Transcript' })
                         .setTimestamp();

                     // 2. Dispatch to designated Staff / Log server
                     await sendDedicatedStaffLog(interaction.client, 'transcript', {
                         embeds: [transcriptEmbed],
                         files: [transcript]
                     });

                     // 3. Fallback: also send to local guild log channel if no dedicated staff server or different
                     const designatedId = getDedicatedLogGuildId();
                     if (!designatedId || designatedId !== interaction.guildId) {
                         const localLogChan = interaction.guild?.channels.cache.find(c => 
                             c.isTextBased() && (c.name.includes('archivált') || c.name.includes('ticket-log') || c.name.includes('admin-log') || c.name.includes('szerver-log'))
                         ) as any;
                         if (localLogChan && localLogChan.send) {
                             await localLogChan.send({
                                 embeds: [transcriptEmbed],
                                 files: [transcript]
                             }).catch(() => {});
                         }
                     }
                 } catch (e) {
                     console.error('[Ticket] Failed to generate/send transcript on ticket close:', e);
                 }

                 setTimeout(() => {
                     channel.delete().catch(() => {});
                 }, 5000);
             }
             return;
        }

        if (customId.startsWith('ticket_') || customId.startsWith('report_') || customId.startsWith('bus_') || customId.startsWith('fac_') || customId === 'char_register') {
            
            const actionType = customId;
            let title = 'Ügyintézés';
            let customIdPrefix = 'modalticket_';
            const components: ActionRowBuilder<TextInputBuilder>[] = [];
            
            const createInput = (id: string, label: string, placeholder?: string, style: TextInputStyle = TextInputStyle.Short) => {
                const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true);
                if (placeholder) {
                    input.setPlaceholder(placeholder);
                }
                return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
            };

            // Ticket Types
            if (customId === 'ticket_tech') { title = 'Technikai Probléma'; components.push(createInput('desc', 'Leírás', 'Pl. Nem tudok beülni a kocsiba, kidob a szerver stb.', TextInputStyle.Paragraph)); }
            else if (customId === 'ticket_report') { title = 'Játékos Jelentése'; components.push(createInput('name', 'Játékos neve', 'Pl. Ismeretlen / Kiss Pista'), createInput('desc', 'Mi történt?', 'Röviden írd le a szituációt.', TextInputStyle.Paragraph)); }
            else if (customId === 'ticket_donate') { title = 'Támogatás / Vásárlás'; components.push(createInput('desc', 'Mit szeretnél vásárolni/támogatni?', 'Pl. PP vásárlás 5000 Ft értékben.', TextInputStyle.Paragraph)); }
            else if (customId === 'ticket_other') { title = 'Egyéb Ügy'; components.push(createInput('desc', 'Részletek', 'Írd le, miben segíthetünk.', TextInputStyle.Paragraph)); }
            
            // Report Types
            else if (customId.startsWith('report_')) {
                customIdPrefix = 'modalreport_';
                title = 'Panasz';
                components.push(
                    createInput('target', 'Panaszolt neve (ha van)', 'Pl. Kovács Géza / 122-es ID'),
                    createInput('what', 'Mi történt?', 'Részletezd az esetet...', TextInputStyle.Paragraph),
                    createInput('when', 'Mikor történt?', 'Pl. Ma délután 15:30 körül'),
                    createInput('evidence', 'Bizonyíték link', 'Pl. YouTube, Imgur vagy stremable link'),
                    createInput('request', 'Mit szeretnél kérni?', 'Mit gondolsz, mi lenne a jogos szankció?', TextInputStyle.Paragraph)
                );
            }
            
            // Business Types
            else if (customId.startsWith('bus_')) {
                customIdPrefix = 'modalbus_';
                title = 'Vállalkozás Igénylés';
                components.push(
                    createInput('name', 'Vállalkozás neve', 'Pl. Burger Shot'),
                    createInput('owner', 'Tulajdonos Discord/IC név', 'Pl. Pista#1234 / Nagy Pista'),
                    createInput('type', 'Vállalkozás típusa', 'Pl. Étterem, Autószerelő'),
                    createInput('bg', 'Rövid RP háttér', 'A vállalkozás múltja, hogyan jött létre...', TextInputStyle.Paragraph),
                    createInput('features', 'Milyen funkciókat szeretne?', 'Pl. Egyedi belső interior, frakció széf...', TextInputStyle.Paragraph)
                );
            }
            
            // Faction Types
            else if (customId === 'fac_gang_apply' || customId === 'fac_illegal' || customId === 'fac_gang_accept_modal') {
                customIdPrefix = 'modalfac_';
                title = 'Banda / Frakció Jelentkezési Lap';
                components.push(
                    createInput('gang_name', '1. Banda / Frakció neve', 'pl. Los Santos Kings'),
                    createInput('leader_info', '2. Vezető IC neve és Discord neve', 'pl. John_Doe | john#1234'),
                    createInput('story_goal', '3. Banda háttérsztori / célja (RP terv)', 'Rövid leírás, mit csinálnátok, milyen RP-t terveztek...', TextInputStyle.Paragraph),
                    createInput('members_time', '4. Kezdő létszám & szerver játékidő', 'pl. 5 fő, átlag 200 óra játékidő'),
                    createInput('rules_accept', '5. Szabályzatot elolvastad és elfogadod?', 'Igen, elolvastam és elfogadom')
                );
            }
            else if (customId === 'fac_legal_accept_modal' || customId.startsWith('fac_')) {
                customIdPrefix = 'modalfac_';
                title = 'Legális Frakció Jelentkezés';
                components.push(
                    createInput('name', '1. Karakter teljes neve és életkora (IC)', 'pl. Thomas Adams (28 éves)'),
                    createInput('faction', '2. Melyik frakcióba jelentkezel?', 'pl. Rendőrség (LSPD) / Mentők (EMS) / Szerelő'),
                    createInput('ooc', '3. Discord neved és életkorod (OOC)', 'pl. tomas#1234 (19 éves)'),
                    createInput('exp', '4. Korábbi RP és frakció tapasztalat', 'Írd le az eddigi tapasztalataidat...', TextInputStyle.Paragraph),
                    createInput('reason', '5. Miért téged válasszunk?', 'Erősségeid, aktivitásod a szerveren...', TextInputStyle.Paragraph)
                );
            }
            
            // Character
            else if (customId === 'char_register') {
                customIdPrefix = 'modalchar_';
                title = 'Karakterlap';
                components.push(
                    createInput('name', 'Karakter teljes neve', 'Pl. Thomas Minton'),
                    createInput('age', 'Születési év / életkor', 'Pl. 1995 (29 éves)'),
                    createInput('bg', 'Karakter háttértörténete', 'Gyermekkora, szülei, hogyan került a városba...', TextInputStyle.Paragraph),
                    createInput('goal', 'Munkája/célja a városban', 'Pl. Szeretne gazdag lenni, bandákat alapítani...', TextInputStyle.Paragraph),
                    createInput('illegal', 'Van-e illegális múltja?', 'Pl. Nincs / Igen, bankrablásért ült.')
                );
            }

            const modal = new ModalBuilder().setCustomId(`${customIdPrefix}${actionType}`).setTitle((title.length > 45 ? title.substring(0, 45) : title));
            components.forEach(c => modal.addComponents(c));
            
            await interaction.showModal(modal);
            return;
        }
    }

    if (interaction.isModalSubmit()) {
        const { customId } = interaction;

        // Faction Changes Modal Submit
        if (customId.startsWith('modalfac_changes:')) {
            const appId = customId.split(':')[1];
            const reason = interaction.fields.getTextInputValue('changes_reason') || 'Kérjük, pontosítsd a frakciókérelmet!';
            await interaction.deferReply({ ephemeral: true });

            const result = await requestApplicationChanges(
                interaction.client,
                interaction.guildId || '',
                appId,
                interaction.user,
                reason
            );

            await interaction.editReply({ content: `✅ ${result.message}` });
            return;
        }

        // Faction Reject Modal Submit
        if (customId.startsWith('modalfac_reject:')) {
            const appId = customId.split(':')[1];
            const reason = interaction.fields.getTextInputValue('reject_reason') || 'A vezetőség elbírálása alapján elutasítva.';
            await interaction.deferReply({ ephemeral: true });

            const result = await rejectFactionApplication(
                interaction.client,
                interaction.guildId || '',
                appId,
                interaction.user,
                reason
            );

            await interaction.editReply({ content: `🔴 ${result.message}` });
            return;
        }

        if (customId.startsWith('modal')) {
            const prefix = customId.split('_')[0]; // modalticket, modalreport, modalbus, modalfac, modalchar
            const action = customId.substring(prefix.length + 1); // everything after modal[type]_
            const guild = interaction.guild;
            if (!guild) return;

            let fieldsStr = '';
            interaction.fields.fields.forEach((field: any) => {
                fieldsStr += `**${field.customId}**: ${field.value}\n`;
            });
            
            await interaction.reply({ content: '⏳ Ticket létrehozása folyamatban...', ephemeral: true });
            
            const ticketCount = Math.floor(Math.random() * 9000) + 1000;
            const channelName = `ticket-${ticketCount}`;
            
            try {
                // 1. Find or Use target category
                let parentId = (interaction.channel as any)?.parentId;
                const ticketCategory = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('AKTÍV ÜGYINTÉZÉS'));
                if (ticketCategory) {
                    parentId = ticketCategory.id;
                }
                
                // 2. Set strict private permissions
                const overwrites: any[] = [
                    { 
                        id: guild.roles.everyone.id, 
                        deny: [PermissionsBitField.Flags.ViewChannel] 
                    },
                    { 
                        id: interaction.user.id, 
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, 
                            PermissionsBitField.Flags.SendMessages, 
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.EmbedLinks
                        ] 
                    }
                ];
                
                // Allow Staff/Admin roles to see the ticket
                guild.roles.cache.forEach(role => {
                    const name = role.name.toLowerCase();
                    if (name.includes('admin') || name.includes('staff') || name.includes('tulajdonos') || name.includes('vezetőség') || name.includes('moderátor')) {
                        overwrites.push({
                            id: role.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.ManageMessages
                            ]
                        });
                    }
                });

                // Determine custom channel name
                let finalChannelName = channelName;
                const isGangApp = action === 'fac_gang_apply' || action === 'fac_illegal' || action === 'fac_gang_accept_modal';
                const isLegalApp = prefix === 'modalfac' && !isGangApp;

                const getModalVal = (id: string) => {
                    try {
                        return interaction.fields.getTextInputValue(id);
                    } catch {
                        return (interaction.fields.fields.get(id) as any)?.value || '';
                    }
                };

                if (isGangApp) {
                    const gangNameField = getModalVal('gang_name');
                    const sanitizedGang = gangNameField.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
                    finalChannelName = sanitizedGang ? `banda-${sanitizedGang}` : `banda-${ticketCount}`;
                } else if (isLegalApp) {
                    finalChannelName = `frakció-${ticketCount}`;
                }

                const channel = await guild.channels.create({
                    name: finalChannelName,
                    type: ChannelType.GuildText,
                    parent: parentId,
                    permissionOverwrites: overwrites
                });
                
                let readableAction = action.toUpperCase();
                if (prefix === 'modalticket') readableAction = 'TICKET: ' + action.toUpperCase();
                if (prefix === 'modalreport') readableAction = 'PANASZ: ' + action.toUpperCase();
                if (prefix === 'modalbus') readableAction = 'VÁLLALKOZÁS: ' + action.toUpperCase();
                if (prefix === 'modalfac') readableAction = isGangApp ? 'BANDA ALAPÍTÁS' : 'LEGÁLIS FRAKCIÓ';
                if (prefix === 'modalchar') readableAction = 'KARAKTER: ' + action.toUpperCase();

                let embed: EmbedBuilder;
                let componentsRow: ActionRowBuilder<ButtonBuilder>;

                if (isGangApp) {
                    const gangNameVal = getModalVal('gang_name') || 'N/A';
                    const leaderVal = getModalVal('leader_info') || 'N/A';
                    const storyVal = getModalVal('story_goal') || 'N/A';
                    const membersVal = getModalVal('members_time') || 'N/A';
                    const rulesVal = getModalVal('rules_accept') || 'N/A';

                    // Register application
                    const appRecord = await submitFactionApplication(interaction.client, {
                        factionName: gangNameVal,
                        factionType: 'gang',
                        leaderIC: leaderVal.split('|')[0]?.trim() || leaderVal,
                        leaderDiscord: interaction.user.tag,
                        leaderDiscordId: interaction.user.id,
                        membersCount: membersVal,
                        backstory: storyVal,
                        rpPlan: storyVal,
                        rulesAccepted: true,
                        source: 'discord',
                        channelId: channel.id,
                        guildId: guild.id
                    });

                    embed = new EmbedBuilder()
                        .setTitle(`👑 Új Banda / Frakció Alapítási Kérelem`)
                        .setDescription(`Üdv <@${interaction.user.id}>!\nA frakció alapítási kérelmed sikeresen beérkezett a vezetőséghez.\nKérjük, légy türelemmel, amíg az illetékes vezetők áttekintik a részleteket!`)
                        .setColor('#f59e0b')
                        .addFields([
                            { name: '🏴‍☠️ 1. Banda / Frakció Neve', value: gangNameVal, inline: true },
                            { name: '👤 2. Vezető Adatai (IC & DC)', value: `${leaderVal} (<@${interaction.user.id}>)`, inline: true },
                            { name: '👥 4. Kezdő Létszám & Játékidő', value: membersVal, inline: true },
                            { name: '📜 5. Szabályzat Elfogadása', value: `✅ ${rulesVal}`, inline: false },
                            { name: '📖 3. Háttértörténet & Tervezett RP Célok', value: storyVal.length > 1024 ? storyVal.slice(0, 1020) + '...' : storyVal, inline: false },
                            { name: '⚖️ Státusz', value: '🟡 **Elbírálás alatt** *(A vezetőség döntésére vár)*', inline: false }
                        ])
                        .setFooter({ text: `Azonosító: ${appRecord.id} • Nexus Horizon RP` })
                        .setTimestamp();

                    componentsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId(`fac_approve_create:${appRecord.id}`).setLabel('Elfogadás & Szobák Létrehozása').setStyle(ButtonStyle.Success).setEmoji('✅'),
                        new ButtonBuilder().setCustomId(`fac_reject_app:${appRecord.id}`).setLabel('Elutasítás').setStyle(ButtonStyle.Danger).setEmoji('❌'),
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket Lezárása').setStyle(ButtonStyle.Secondary).setEmoji('🔒')
                    );
                } else if (isLegalApp) {
                    const charNameVal = getModalVal('name') || 'N/A';
                    const facVal = getModalVal('faction') || 'N/A';
                    const oocVal = getModalVal('ooc') || 'N/A';
                    const expVal = getModalVal('exp') || 'N/A';
                    const reasonVal = getModalVal('reason') || 'N/A';

                    embed = new EmbedBuilder()
                        .setTitle(`🚓 Új Legális Frakció Jelentkezés`)
                        .setDescription(`Üdv <@${interaction.user.id}>!\nA jelentkezésed rögzítésre került. Az érintett frakció vezetősége hamarosan felveszi veled a kapcsolatot.`)
                        .setColor('#3b82f6')
                        .addFields([
                            { name: '👤 1. Karakter Neve & Életkora', value: charNameVal, inline: true },
                            { name: '🏢 2. Választott Frakció', value: facVal, inline: true },
                            { name: '🌐 3. Discord & OOC Életkor', value: oocVal, inline: true },
                            { name: '💼 4. Korábbi RP Tapasztalat', value: expVal.length > 1024 ? expVal.slice(0, 1020) + '...' : expVal, inline: false },
                            { name: '🎯 5. Miért jelentkezel?', value: reasonVal.length > 1024 ? reasonVal.slice(0, 1020) + '...' : reasonVal, inline: false },
                            { name: '⚖️ Státusz', value: '🟡 **Elbírálás alatt** *(Frakcióvezető áttekintésére vár)*', inline: false }
                        ])
                        .setFooter({ text: 'Nexus Horizon RP • Legális Frakció Jelentkezés' })
                        .setTimestamp();

                    componentsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('fac_accept_btn').setLabel('Felvétel (Meghallgatás)').setStyle(ButtonStyle.Success).setEmoji('✅'),
                        new ButtonBuilder().setCustomId('fac_reject_btn').setLabel('Elutasítás').setStyle(ButtonStyle.Danger).setEmoji('❌'),
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Ticket Lezárása').setStyle(ButtonStyle.Secondary).setEmoji('🔒')
                    );
                } else {
                    embed = new EmbedBuilder()
                        .setTitle(`📝 Új beadvány: ${readableAction}`)
                        .setDescription(`Üdv <@${interaction.user.id}>!\nA vezetőség hamarosan átnézi a kérelmedet / beadványodat.\n\n**Részletek:**\n${fieldsStr}`)
                        .setColor('#5865F2')
                        .setTimestamp();
                        
                    componentsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Lezárás').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                    );
                }
                
                await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [componentsRow] });
                await interaction.editReply({ content: `✅ Jelentkezési lap sikeresen benyújtva! Létrehozott csatorna: <#${channel.id}>` });

                // --- STAFF LOG NOTIFICATION ---
                // Try to find the log channel on ALL guilds (to catch the staff one)
                try {
                    const client = interaction.client;
                    const logEmbed = new EmbedBuilder()
                        .setTitle(`🎟️ Új Ticket Nyitva!`)
                        .setDescription(`Egy játékos ticketet nyitott a közösségi szerveren.`)
                        .addFields([
                            { name: 'Felhasználó', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                            { name: 'Típus', value: readableAction, inline: true },
                            { name: 'Csatorna', value: `[#${channel.name}](https://discord.com/channels/${guild.id}/${channel.id})`, inline: true }
                        ])
                        .setColor('#ffaa00')
                        .setTimestamp();

                    client.guilds.cache.forEach(async (g) => {
                        const logChannel = g.channels.cache.find(c => c.name.includes('aktív-ticket') || c.name.includes('szerver-log') || c.name.includes('archivált') || c.name === 'admin-log') as any;
                        if (logChannel && logChannel.send) {
                            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                        }
                    });
                } catch (logErr) {
                    console.error('[Bot] Failed to send ticket log to staff server:', logErr);
                }
            } catch (e: any) {
                await interaction.editReply({ content: `❌ Hiba a Ticket létrehozásakor: ${e.message}` });
            }
        }
    }
}
