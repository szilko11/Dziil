import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  CommandInteraction,
  ButtonInteraction,
  User
} from 'discord.js';
import { CaseDefinition, CaseDropItem, ItemRarity } from '../types';
import { getUserBalance, updateUserBalance, creditFivemCash, creditFivemPP } from '../server/db';

export const RARITY_CONFIG: Record<ItemRarity, { label: string; color: string; emoji: string }> = {
  common: { label: 'Közönséges (Mil-Spec)', color: '#4b69ff', emoji: '🟦' },
  rare: { label: 'Ritka (Restricted)', color: '#8847ff', emoji: '🟪' },
  classified: { label: 'Kiemelkedő (Classified)', color: '#d32ce6', emoji: '💗' },
  covert: { label: 'Titkos (Covert)', color: '#eb4b4b', emoji: '🟥' },
  special: { label: '★ Rendkívül Ritka (Kés / Arany)', color: '#ffd700', emoji: '🟨' }
};

export const CASES_CATALOG: CaseDefinition[] = [
  {
    id: 'bronze',
    name: 'Kezdő Bronz Láda',
    description: 'Belépő szintű láda kezdő pénzjutalmakkal és klasszikus fegyverekkel.',
    price: 100,
    icon: '📦',
    color: '#cd7f32',
    bannerImage: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
    items: [
      {
        id: 'b_1',
        name: 'P250 | Sand Dune',
        category: 'Pisztoly',
        rarity: 'common',
        rarityLabel: 'Közönséges',
        rarityColor: '#4b69ff',
        icon: '🔫',
        type: 'discordCoins',
        rewardAmount: 60,
        displayValue: '60 Discord Pénz',
        weight: 45
      },
      {
        id: 'b_2',
        name: 'Kezdő Készpénz Csomag',
        category: 'Készpénz',
        rarity: 'common',
        rarityLabel: 'Közönséges',
        rarityColor: '#4b69ff',
        icon: '💵',
        type: 'money',
        rewardAmount: 10000,
        displayValue: '$10,000 FiveM Készpénz',
        weight: 35
      },
      {
        id: 'b_3',
        name: 'AK-47 | Safari Mesh',
        category: 'Gépkarabély',
        rarity: 'rare',
        rarityLabel: 'Ritka',
        rarityColor: '#8847ff',
        icon: '🎯',
        type: 'discordCoins',
        rewardAmount: 180,
        displayValue: '180 Discord Pénz',
        weight: 12
      },
      {
        id: 'b_4',
        name: 'Városi Készpénz Köteg',
        category: 'Készpénz',
        rarity: 'classified',
        rarityLabel: 'Kiemelkedő',
        rarityColor: '#d32ce6',
        icon: '💰',
        type: 'money',
        rewardAmount: 50000,
        displayValue: '$50,000 FiveM Készpénz',
        weight: 6
      },
      {
        id: 'b_5',
        name: 'M4A4 | Griffin',
        category: 'Gépkarabély',
        rarity: 'covert',
        rarityLabel: 'Titkos',
        rarityColor: '#eb4b4b',
        icon: '🔥',
        type: 'pp',
        rewardAmount: 100,
        displayValue: '100 Prémium Pont (PP)',
        weight: 1.8
      },
      {
        id: 'b_6',
        name: '★ Gut Knife | Rust Coat',
        category: 'Különleges Kés',
        rarity: 'special',
        rarityLabel: '★ Különleges',
        rarityColor: '#ffd700',
        icon: '🔪',
        type: 'pp',
        rewardAmount: 300,
        displayValue: '300 PP + $250,000 FiveM Készpénz',
        weight: 0.2
      }
    ]
  },
  {
    id: 'silver',
    name: 'Fegyver & Bűnözés Ezüst Láda',
    description: 'Nagyobb tétek, minőségi skin-ek és komolyabb pénzjutalmak.',
    price: 250,
    icon: '💼',
    color: '#94a3b8',
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    items: [
      {
        id: 's_1',
        name: 'Glock-18 | Water Elemental',
        category: 'Pisztoly',
        rarity: 'common',
        rarityLabel: 'Közönséges',
        rarityColor: '#4b69ff',
        icon: '🔫',
        type: 'discordCoins',
        rewardAmount: 160,
        displayValue: '160 Discord Pénz',
        weight: 42
      },
      {
        id: 's_2',
        name: 'Kereskedői Tőke',
        category: 'Készpénz',
        rarity: 'common',
        rarityLabel: 'Közönséges',
        rarityColor: '#4b69ff',
        icon: '💵',
        type: 'money',
        rewardAmount: 35000,
        displayValue: '$35,000 FiveM Készpénz',
        weight: 33
      },
      {
        id: 's_3',
        name: 'Desert Eagle | Conspiracy',
        category: 'Nehéz Pisztoly',
        rarity: 'rare',
        rarityLabel: 'Ritka',
        rarityColor: '#8847ff',
        icon: '🦅',
        type: 'discordCoins',
        rewardAmount: 400,
        displayValue: '400 Discord Pénz',
        weight: 15
      },
      {
        id: 's_4',
        name: 'AWP | Atheris',
        category: 'Mesterlövész',
        rarity: 'classified',
        rarityLabel: 'Kiemelkedő',
        rarityColor: '#d32ce6',
        icon: '🐍',
        type: 'money',
        rewardAmount: 120000,
        displayValue: '$120,000 FiveM Készpénz',
        weight: 7
      },
      {
        id: 's_5',
        name: 'AK-47 | Redline',
        category: 'Gépkarabély',
        rarity: 'covert',
        rarityLabel: 'Titkos',
        rarityColor: '#eb4b4b',
        icon: '🔴',
        type: 'pp',
        rewardAmount: 250,
        displayValue: '250 Prémium Pont (PP)',
        weight: 2.3
      },
      {
        id: 's_6',
        name: '★ Flip Knife | Slaughter',
        category: 'Különleges Kés',
        rarity: 'special',
        rarityLabel: '★ Különleges',
        rarityColor: '#ffd700',
        icon: '🔪',
        type: 'pp',
        rewardAmount: 800,
        displayValue: '800 PP + $600,000 FiveM Készpénz',
        weight: 0.7
      }
    ]
  },
  {
    id: 'gold',
    name: 'Arany Prémium Láda',
    description: 'Prémium láda magas kifizetésekkel és ikonikus fegyverekkel.',
    price: 500,
    icon: '👑',
    color: '#fbbf24',
    bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    items: [
      {
        id: 'g_1',
        name: 'M4A1-S | Hyper Beast',
        category: 'Gépkarabély',
        rarity: 'rare',
        rarityLabel: 'Ritka',
        rarityColor: '#8847ff',
        icon: '👾',
        type: 'discordCoins',
        rewardAmount: 450,
        displayValue: '450 Discord Pénz',
        weight: 40
      },
      {
        id: 'g_2',
        name: 'Frakció Bankroll Csomag',
        category: 'Készpénz',
        rarity: 'rare',
        rarityLabel: 'Ritka',
        rarityColor: '#8847ff',
        icon: '🏦',
        type: 'money',
        rewardAmount: 150000,
        displayValue: '$150,000 FiveM Készpénz',
        weight: 32
      },
      {
        id: 'g_3',
        name: 'AK-47 | Vulcan',
        category: 'Gépkarabély',
        rarity: 'classified',
        rarityLabel: 'Kiemelkedő',
        rarityColor: '#d32ce6',
        icon: '⚡',
        type: 'discordCoins',
        rewardAmount: 900,
        displayValue: '900 Discord Pénz',
        weight: 18
      },
      {
        id: 'g_4',
        name: 'AWP | Asiimov',
        category: 'Mesterlövész',
        rarity: 'covert',
        rarityLabel: 'Titkos',
        rarityColor: '#eb4b4b',
        icon: '🤖',
        type: 'pp',
        rewardAmount: 500,
        displayValue: '500 Prémium Pont (PP)',
        weight: 8
      },
      {
        id: 'g_5',
        name: '★ M9 Bayonet | Doppler (Phase 2)',
        category: 'Különleges Kés',
        rarity: 'special',
        rarityLabel: '★ Különleges',
        rarityColor: '#ffd700',
        icon: '🔪',
        type: 'pp',
        rewardAmount: 2000,
        displayValue: '2,000 PP + $1,500,000 FiveM Készpénz',
        weight: 2
      }
    ]
  },
  {
    id: 'knife',
    name: 'Legendás Kés & Exkluzív Láda',
    description: 'A legritkább kések, luxus autók és hatalmas Prémium Pont csomagok.',
    price: 1000,
    icon: '✨',
    color: '#f43f5e',
    bannerImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    items: [
      {
        id: 'k_1',
        name: 'USP-S | Kill Confirmed',
        category: 'Pisztoly',
        rarity: 'classified',
        rarityLabel: 'Kiemelkedő',
        rarityColor: '#d32ce6',
        icon: '💀',
        type: 'discordCoins',
        rewardAmount: 850,
        displayValue: '850 Discord Pénz',
        weight: 45
      },
      {
        id: 'k_2',
        name: 'AK-47 | Bloodsport',
        category: 'Gépkarabély',
        rarity: 'covert',
        rarityLabel: 'Titkos',
        rarityColor: '#eb4b4b',
        icon: '🩸',
        type: 'pp',
        rewardAmount: 650,
        displayValue: '650 Prémium Pont (PP)',
        weight: 30
      },
      {
        id: 'k_3',
        name: 'AWP | Dragon Lore (Replica)',
        category: 'Mesterlövész',
        rarity: 'covert',
        rarityLabel: 'Titkos',
        rarityColor: '#eb4b4b',
        icon: '🐉',
        type: 'money',
        rewardAmount: 1000000,
        displayValue: '$1,000,000 FiveM Készpénz',
        weight: 18
      },
      {
        id: 'k_4',
        name: '★ Karambit | Case Hardened (Blue Gem)',
        category: 'Legendás Kés',
        rarity: 'special',
        rarityLabel: '★ Különleges',
        rarityColor: '#ffd700',
        icon: '💎',
        type: 'pp',
        rewardAmount: 4000,
        displayValue: '4,000 PP + $3,000,000 FiveM Készpénz',
        weight: 7
      }
    ]
  }
];

// Random sorsolás súlyok alapján
export function rollCaseItem(caseDef: CaseDefinition): CaseDropItem {
  const totalWeight = caseDef.items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of caseDef.items) {
    if (random < item.weight) {
      return item;
    }
    random -= item.weight;
  }
  return caseDef.items[0];
}

// Ládák áttekintő Embed
export async function generateCasesOverviewEmbed(userBalance?: { discordCoins: number; ppBalance: number; balance: number }) {
  const embed = new EmbedBuilder()
    .setTitle('🎰 NEXUS CS:GO2 LÁDANYITÁS • KASZINÓ')
    .setDescription(
      `Nyiss ládákat a **Discord Pénzedből (DC)**, és nyerj valódi FiveM készpénzt, Prémium Pontot (PP) és ikonikus CS fegyvereket!\n\n` +
      (userBalance ? `💰 **A te egyenleged:** \`${userBalance.discordCoins.toLocaleString()} DC\` | \`${userBalance.ppBalance.toLocaleString()} PP\` | \`$${userBalance.balance.toLocaleString()}\`\n\n` : '') +
      `**Elérhető Ládák:**`
    )
    .setColor('#f59e0b')
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/8065/8065584.png')
    .setFooter({ text: 'Nexus Horizon RP • Szerencsejáték Rendszer' })
    .setTimestamp();

  for (const c of CASES_CATALOG) {
    const specialItem = c.items.find(i => i.rarity === 'special' || i.rarity === 'covert');
    embed.addFields({
      name: `${c.icon} ${c.name} — **${c.price} DC**`,
      value: `📖 *${c.description}*\n🌟 Fődíj esély: **${specialItem?.name || 'Titkos Fegyver'}** (${specialItem?.displayValue || ''})\nParancs: \`/opencase ${c.id}\``,
      inline: false
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('open_case_bronze').setLabel('Bronz (100 DC)').setStyle(ButtonStyle.Secondary).setEmoji('📦'),
    new ButtonBuilder().setCustomId('open_case_silver').setLabel('Ezüst (250 DC)').setStyle(ButtonStyle.Primary).setEmoji('💼'),
    new ButtonBuilder().setCustomId('open_case_gold').setLabel('Arany (500 DC)').setStyle(ButtonStyle.Success).setEmoji('👑'),
    new ButtonBuilder().setCustomId('open_case_knife').setLabel('Kés Láda (1000 DC)').setStyle(ButtonStyle.Danger).setEmoji('✨')
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('check_my_balance').setLabel('Egyenlegem').setStyle(ButtonStyle.Secondary).setEmoji('💳'),
    new ButtonBuilder().setCustomId('claim_daily_btn').setLabel('Napi Ajándék (/daily)').setStyle(ButtonStyle.Primary).setEmoji('🎁')
  );

  return { embeds: [embed], components: [row, row2] };
}

// Egy konkrét láda részletes tartalma
export function generateCaseDetailEmbed(caseDef: CaseDefinition) {
  const embed = new EmbedBuilder()
    .setTitle(`${caseDef.icon} ${caseDef.name} Tartalma`)
    .setDescription(`**Ár:** \`${caseDef.price} Discord Pénz (DC)\`\n\n${caseDef.description}\n\n**Megszerezhető Tárgyak és Esélyek:**`)
    .setColor(caseDef.color as any || '#f59e0b')
    .setTimestamp();

  const totalWeight = caseDef.items.reduce((acc, i) => acc + i.weight, 0);

  for (const item of caseDef.items) {
    const rarityInfo = RARITY_CONFIG[item.rarity];
    const percentage = ((item.weight / totalWeight) * 100).toFixed(1);
    embed.addFields({
      name: `${rarityInfo.emoji} ${item.name} (${item.category})`,
      value: `• Ritkaság: **${rarityInfo.label}**\n• Nyeremény: **${item.displayValue}**\n• Esély: \`~${percentage}%\``,
      inline: true
    });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`open_case_${caseDef.id}`).setLabel(`Kinyitás (${caseDef.price} DC)`).setStyle(ButtonStyle.Success).setEmoji('🔓'),
    new ButtonBuilder().setCustomId('view_all_cases').setLabel('Összes Láda').setStyle(ButtonStyle.Secondary).setEmoji('📋')
  );

  return { embeds: [embed], components: [row] };
}

// Láda kinyitás folyamata (Animáció és Jóváírás)
export async function executeCaseOpening(interaction: any, caseId: string) {
  const caseDef = CASES_CATALOG.find(c => c.id.toLowerCase() === caseId.toLowerCase());
  if (!caseDef) {
    const errorMsg = '❌ Nem található ilyen nevű láda! Elérhető ládák: `bronze`, `silver`, `gold`, `knife`';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg, components: [] });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
    return;
  }

  const user = interaction.user;
  const balance = await getUserBalance(user.id);

  if ((balance.discordCoins ?? 0) < caseDef.price) {
    const diff = caseDef.price - (balance.discordCoins ?? 0);
    const noMoneyMsg = `❌ **Nincs elég Discord Pénzed a nyitáshoz!**\n\n` +
      `Szükséges: \`${caseDef.price} DC\`\n` +
      `A te egyenleged: \`${(balance.discordCoins ?? 0).toLocaleString()} DC\`\n` +
      `Hiányzik: \`${diff.toLocaleString()} DC\`\n\n` +
      `💡 *Tipp: Kérd le a napi ingyen ajándékot a \`/daily\` paranccsal vagy nyerj pénzfeldobással a \`/coinflip_dc\` segítségével!*`;
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: noMoneyMsg, components: [] });
    } else {
      await interaction.reply({ content: noMoneyMsg, ephemeral: true });
    }
    return;
  }

  // Levonjuk a láda árát
  await updateUserBalance(user.id, -caseDef.price, 'discordCoins');

  // Animációs kezdeti állapot
  const spinEmbed = new EmbedBuilder()
    .setTitle(`📦 ${caseDef.name} felnyitása folyamatban...`)
    .setDescription(
      `🎲 **A szerencsekerék forog:**\n\n` +
      `⬛ 🟦 🟪 💗 🟥 🟨 ⬛\n\n` +
      `*Kérjük várj, a nyereményed generálása folyamatban van...*`
    )
    .setColor('#f59e0b');

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }
  await interaction.editReply({ embeds: [spinEmbed], components: [] });

  // Kis feszültségkeltő késleltetés
  await new Promise(r => setTimeout(r, 1800));

  // Kisorsoljuk az elemet
  const droppedItem = rollCaseItem(caseDef);
  const rarityInfo = RARITY_CONFIG[droppedItem.rarity];

  // Nyeremény jóváírása
  let inGameSyncText = '';
  if (droppedItem.type === 'discordCoins') {
    await updateUserBalance(user.id, droppedItem.rewardAmount, 'discordCoins');
  } else if (droppedItem.type === 'money') {
    await updateUserBalance(user.id, droppedItem.rewardAmount, 'money');
    const syncRes = await creditFivemCash(user.id, droppedItem.rewardAmount, `Ládanyitás: ${droppedItem.name}`);
    if (syncRes.synced) {
      inGameSyncText = `\n✅ **FiveM Játékban jóváírva:** \`${syncRes.fivemName}\` karakternek!`;
    }
  } else if (droppedItem.type === 'pp') {
    await updateUserBalance(user.id, droppedItem.rewardAmount, 'pp');
    const syncRes = await creditFivemPP(user.id, droppedItem.rewardAmount, `Ládanyitás: ${droppedItem.name}`);
    if (syncRes.synced) {
      inGameSyncText = `\n✅ **FiveM Játékban jóváírva:** \`${syncRes.fivemName}\` karakternek!`;
    }
    // Ha a speciális késhez járt pénz is
    if (droppedItem.rarity === 'special') {
      const extraCash = caseDef.id === 'knife' ? 3000000 : caseDef.id === 'gold' ? 1500000 : 250000;
      await updateUserBalance(user.id, extraCash, 'money');
      await creditFivemCash(user.id, extraCash, `★ Special Kés Bónusz: ${droppedItem.name}`).catch(() => {});
    }
  }

  const updatedBal = await getUserBalance(user.id);

  const resultEmbed = new EmbedBuilder()
    .setTitle(`${rarityInfo.emoji} SIKERES NYITÁS! — ${droppedItem.name}`)
    .setDescription(
      `Gratulálunk <@${user.id}>! A kinyitott **${caseDef.name}** a következő jutalmat adta:\n\n` +
      `🏷️ **Tárgy:** \`${droppedItem.name}\` (${droppedItem.category})\n` +
      `💎 **Ritkaság:** **${rarityInfo.label}**\n` +
      `🎁 **Nyeremény értéke:** **${droppedItem.displayValue}**${inGameSyncText}\n\n` +
      `──────────────────────────────\n` +
      `💳 **Új Egyenleged:** \`${updatedBal.discordCoins.toLocaleString()} DC\` | \`${updatedBal.ppBalance.toLocaleString()} PP\` | \`$${updatedBal.balance.toLocaleString()}\``
    )
    .setColor(rarityInfo.color as any || '#10b981')
    .setFooter({ text: `Nexus Horizon RP • Láda Nyitás (${caseDef.name})` })
    .setTimestamp();

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`open_case_${caseDef.id}`).setLabel(`Újra kinyitom (${caseDef.price} DC)`).setStyle(ButtonStyle.Success).setEmoji('🔄'),
    new ButtonBuilder().setCustomId('view_all_cases').setLabel('Összes Láda').setStyle(ButtonStyle.Secondary).setEmoji('📋')
  );

  await interaction.editReply({ embeds: [resultEmbed], components: [actionRow] });
}

// Coinflip / Duplázó játék Discord Pénzzel
export async function handleCoinflipDC(interaction: CommandInteraction, amount: number, choice: 'fej' | 'iras') {
  if (amount < 10) {
    return interaction.reply({ content: '❌ A minimális tét 10 Discord Pénz!', ephemeral: true });
  }

  const user = interaction.user;
  const balance = await getUserBalance(user.id);

  if ((balance.discordCoins ?? 0) < amount) {
    return interaction.reply({
      content: `❌ Nincs elég Discord Pénzed ehhez a téthez! Jelenlegi egyenleged: \`${(balance.discordCoins ?? 0).toLocaleString()} DC\``,
      ephemeral: true
    });
  }

  // Levonjuk a tétet
  await updateUserBalance(user.id, -amount, 'discordCoins');

  const outcome: 'fej' | 'iras' = Math.random() < 0.5 ? 'fej' : 'iras';
  const won = outcome === choice;

  if (won) {
    const winAmount = amount * 2;
    await updateUserBalance(user.id, winAmount, 'discordCoins');
  }

  const updatedBal = await getUserBalance(user.id);

  const embed = new EmbedBuilder()
    .setTitle(won ? '🎉 NYERTÉL! (Pénzfeldobás)' : '😔 VESZTETTÉL! (Pénzfeldobás)')
    .setDescription(
      `🪙 **A feldobott érme:** **${outcome.toUpperCase()}**\n` +
      `🎯 **A te tipped:** **${choice.toUpperCase()}**\n\n` +
      (won 
        ? `✅ **Nyereményed:** **+${(amount * 2).toLocaleString()} DC** *(Tiszta haszon: +${amount.toLocaleString()} DC)*`
        : `❌ **Elvesztett tét:** **-${amount.toLocaleString()} DC**`
      ) + `\n\n💳 **Új Egyenleged:** \`${updatedBal.discordCoins.toLocaleString()} DC\``
    )
    .setColor(won ? '#10b981' : '#ef4444')
    .setFooter({ text: 'Nexus Horizon RP • Duplázó' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
