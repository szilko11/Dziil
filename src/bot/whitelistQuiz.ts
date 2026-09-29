import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  Client, 
  TextChannel,
  GuildMember
} from 'discord.js';
import { WhitelistQuestion, WhitelistResult } from '../types';
import { saveWhitelistResult } from '../server/db';

export const RP_QUESTIONS: WhitelistQuestion[] = [
  {
    id: 'q1',
    question: 'Mit jelent a PowerGaming (PG)?',
    options: [
      'Olyan cselekedet végrehajtása, ami a valóságban lehetetlen, vagy rákényszerítése másra',
      'Valós pénzért játékon belüli tárgyak vásárlása más játékostól',
      'Rendőrök elől való menekülés nagy sebességgel',
      'Fegyver elővétele felszólítás nélkül'
    ],
    correctIndex: 0,
    explanation: 'A PowerGaming olyan cselekedet, ami a valóságban lehetetlen (pl. 200 km/h-s ütközés után sértetlenül kiszállni és tovább futni), vagy a másik játékos döntési lehetőségének elvétele.',
    category: 'Fogalmak'
  },
  {
    id: 'q2',
    question: 'Mit jelent a MetaGaming (MG)?',
    options: [
      'Játékon belüli hangos zenelejátszás mikrofonon keresztül',
      'Játékon kívüli (OOC/Discord/Stream) információk felhasználása IC a karaktered javára',
      'Több karakter egyidejű létrehozása és irányítása',
      'Autó lopása forgalmas helyről fényes nappal'
    ],
    correctIndex: 1,
    explanation: 'A MetaGaming a játékon kívülről (pl. Discord hívás, Twitch stream) szerzett infók felhasználása In-Character.',
    category: 'Fogalmak'
  },
  {
    id: 'q3',
    question: 'Mit jelent a DeathMatch (DM)?',
    options: [
      'Versenyzés más játékosokkal pénzért',
      'Játékos megölése vagy bántalmazása megfelelő és nyomós RP indok nélkül',
      'Párbaj az illegális bokszklubban engedéllyel',
      'Rendőrautó megrongálása menekülés közben'
    ],
    correctIndex: 1,
    explanation: 'A DeathMatch (DM) más játékosok ok nélküli, megalapozott előzmény-RP hiányában történő megölése.',
    category: 'Fogalmak'
  },
  {
    id: 'q4',
    question: 'Mit jelent a FearRP (Félelem RP)?',
    options: [
      'A sötét helyektől való félelem a játékban',
      'A karakterednek úgy kell féltenie az életét fegyveres fenyegetés alatt, mint a valóságban',
      'A rendőröktől való azonnali menekülés kötelezettsége',
      'Nem szabad bandaterületre menni egyedül'
    ],
    correctIndex: 1,
    explanation: 'Ha valaki fegyvert fog rád vagy túlerőben van, köteles vagy a karaktered életét félteni és engedelmeskedni.',
    category: 'RP Alapok'
  },
  {
    id: 'q5',
    question: 'Mi a New Life Rule (NLR) szabály lényege halál után?',
    options: [
      'Törölni kell a karaktert a szerverről',
      'Halálod után elfelejted az azt közvetlenül megelőző eseményeket, és tilos visszamenni a halál helyszínére',
      'Nem csatlakozhatsz újra a szerverhez 24 órán át',
      'Minden vagyonod automatikusan átkerül a mentősökhöz'
    ],
    correctIndex: 1,
    explanation: 'Halál után (Respawn kórházban) a karakter elfelejti a halálát okozó szituációt, és tilos azonnal bosszút állni (RevengeKill tilalom).',
    category: 'Szabályzat'
  },
  {
    id: 'q6',
    question: 'Mi a különbség az IC (In Character) és az OOC (Out of Character) között?',
    options: [
      'Nincs különbség, mindkettő játék',
      'IC a kitalált karaktered világa és cselekedetei; OOC a te valós éned és játékos mivoltod',
      'IC a rendőrségi rádió, OOC a mentős rádió',
      'IC a szöveges chat, OOC a hangos beszéd'
    ],
    correctIndex: 1,
    explanation: 'IC a karaktered szemszöge és élete; OOC a te valós személyed. A kettőt soha nem szabad összekeverni!',
    category: 'RP Alapok'
  },
  {
    id: 'q7',
    question: 'Mit jelent a ForceRP?',
    options: [
      'Erőszakos frakció indítása a szerveren',
      'Saját akaratod és RP cselekményed ráerőltetése a másik játékosra esélyadás nélkül',
      'Rendőrségi bilincs használata felszólításra',
      'Fegyver vásárlása feketepiacon'
    ],
    correctIndex: 1,
    explanation: 'ForceRP: pl. /me lelövi és a feje szétrobban, meghal (anélkül, hogy a másiknak lehetősége lenne reagálni /do paranccsal).',
    category: 'Fogalmak'
  },
  {
    id: 'q8',
    question: 'Mire szolgál a /me és a /do parancs?',
    options: [
      '/me cselekvés leírására, /do történések, látható körülmények és állapotok leírására szolgál',
      '/me a privát üzenet, /do a globális hirdetés',
      '/me a mentők hívása, /do a rendőrség hívása',
      '/me a pénzküldés, /do a járműkulcs átadása'
    ],
    correctIndex: 0,
    explanation: '/me a karaktered által végzett láthatatlan cselekvés; a /do a körülmények, állapotok objektív leírása.',
    category: 'RP Alapok'
  }
];

// Active Quiz sessions: userId -> { questionIndex, answers, score, startedAt, lastActive }
export const activeQuizSessions = new Map<string, {
  currentIndex: number;
  score: number;
  total: number;
  questions: WhitelistQuestion[];
  userAnswers: number[];
  startedAt: number;
  lastActive: number;
}>();

// Clean up stale sessions older than 2 hours
function cleanupStaleSessions() {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [userId, session] of activeQuizSessions.entries()) {
    if (session.lastActive < twoHoursAgo) {
      activeQuizSessions.delete(userId);
    }
  }
}

export function generateWhitelistPanelEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ NEXUS HORIZON RP • AUTOMATA WHITELIST KVÍZ')
    .setDescription(
      'Üdvözlünk a **Nexus Horizon RolePlay** szerverén!\n\n' +
      'A szerverhez való csatlakozáshoz és a teljes jogú **Polgár (Whitelist)** rang azonnali megszerzéséhez töltsd ki az alábbi 8 kérdéses alapvető szabályzati tesztet.\n\n' +
      '📋 **Tudnivalók & Követelmények:**\n' +
      '• **8 kérdés** alapvető RP fogalmakról (PG, MG, DM, FearRP, NLR, /me & /do)\n' +
      '• Legalább **75%-os** eredmény (minimum 6 helyes válasz)\n' +
      '• ⏱️ **Nincs időkorlát:** Olvasd el a kérdéseket és a válaszokat nyugodtan!\n' +
      '• ✅ **Azonnali jóváhagyás:** Sikeres kitöltés esetén a bot azonnal kiosztja a Polgár rangot.\n\n' +
      'Kattints az alábbi gombra a teszt megkezdéséhez!'
    )
    .setColor('#00E5FF')
    .setThumbnail('https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=150&auto=format&fit=crop&q=60')
    .setFooter({ text: 'Nexus Horizon RP • Automata Whitelist Rendszer' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('start_whitelist_quiz')
      .setLabel('📋 Whitelist Kvíz Indítása')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✨')
  );

  return { embeds: [embed], components: [row] };
}

export async function startQuizForUser(interaction: ButtonInteraction | ChatInputCommandInteraction) {
  cleanupStaleSessions();
  const userId = interaction.user.id;

  // Shuffle questions for fair assessment
  const shuffledQuestions = [...RP_QUESTIONS].sort(() => 0.5 - Math.random());

  activeQuizSessions.set(userId, {
    currentIndex: 0,
    score: 0,
    total: shuffledQuestions.length,
    questions: shuffledQuestions,
    userAnswers: [],
    startedAt: Date.now(),
    lastActive: Date.now()
  });

  return sendCurrentQuestion(interaction, userId, true);
}

export async function sendCurrentQuestion(interaction: any, userId: string, isFirst: boolean = false) {
  try {
    const session = activeQuizSessions.get(userId);
    if (!session) {
      const expiredEmbed = new EmbedBuilder()
        .setTitle('ℹ️ Whitelist Kvíz Munkamenet')
        .setDescription('A teszt elindításához vagy folytatásához kattints az alábbi gombra!')
        .setColor('#5865F2');

      const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('start_whitelist_quiz')
          .setLabel('📋 Kvíz Indítása')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✨')
      );

      if (interaction.replied || interaction.deferred) {
        return await interaction.editReply({ embeds: [expiredEmbed], components: [startRow] }).catch(() => {});
      }
      return await interaction.reply({ embeds: [expiredEmbed], components: [startRow], ephemeral: true }).catch(() => {});
    }

    // Update last active timestamp
    session.lastActive = Date.now();

    const q = session.questions[session.currentIndex];
    const qNum = session.currentIndex + 1;
    const total = session.total;

    // Discord live countdown timestamp for 30 seconds from now
    const questionDeadlineUnix = Math.floor((Date.now() + 30 * 1000) / 1000);

    const letterEmojis = ['🇦', '🇧', '🇨', '🇩'];
    const letterNames = ['A', 'B', 'C', 'D'];

    const optionsFormatted = q.options.map((opt, idx) => {
      return `### ${letterEmojis[idx]} Opció [ ${letterNames[idx]} ]\n> **${opt}**`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ WHITELIST KVÍZ • KÉRDÉS [${qNum} / ${total}]`)
      .setDescription(
        `## 📋 ${q.question}\n\n` +
        `📂 **Kategória:** \`${q.category}\` • 📊 **Haladás:** \`${qNum}/${total}\` kérdés (${Math.round(((qNum - 1) / total) * 100)}%)\n` +
        `⏱️ **Kérdésre szánt idő:** <t:${questionDeadlineUnix}:R> *(30 másodperc áll rendelkezésre)*\n\n` +
        `───────────────────────────────────────\n\n` +
        `${optionsFormatted}\n\n` +
        `───────────────────────────────────────\n` +
        `👉 **Válaszd ki a helyes válasz betűjelét az alábbi gombokkal:**`
      )
      .setColor('#00E5FF')
      .setFooter({ text: `Nexus Horizon RP • Kérdés: ${qNum} / ${total} • Automata Értékelés` });

    // Buttons: 4 clear buttons with letter badges that fit on all screens
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('quiz_ans_0')
        .setLabel('A Válasz')
        .setEmoji('🇦')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('quiz_ans_1')
        .setLabel('B Válasz')
        .setEmoji('🇧')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('quiz_ans_2')
        .setLabel('C Válasz')
        .setEmoji('🇨')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('quiz_ans_3')
        .setLabel('D Válasz')
        .setEmoji('🇩')
        .setStyle(ButtonStyle.Primary)
    );

    const components = [buttonRow];

    if (isFirst) {
      if (interaction.replied || interaction.deferred) {
        return await interaction.editReply({ embeds: [embed], components }).catch((e: any) => console.error('[Quiz] EditReply error:', e));
      }
      return await interaction.reply({ embeds: [embed], components, ephemeral: true }).catch((e: any) => console.error('[Quiz] Reply error:', e));
    } else {
      if (interaction.replied || interaction.deferred) {
        return await interaction.editReply({ embeds: [embed], components }).catch((e: any) => console.error('[Quiz] EditReply update error:', e));
      }
      return await interaction.update({ embeds: [embed], components }).catch((e: any) => console.error('[Quiz] Update error:', e));
    }
  } catch (err) {
    console.error('[Quiz] sendCurrentQuestion error:', err);
  }
}

export async function handleQuizAnswer(interaction: ButtonInteraction, optionIndex: number) {
  try {
    const userId = interaction.user.id;
    const session = activeQuizSessions.get(userId);
    if (!session) {
      const expiredEmbed = new EmbedBuilder()
        .setTitle('ℹ️ Munkamenet Lejárt')
        .setDescription('A teszt újrakezdéséhez kattints az alábbi gombra!')
        .setColor('#5865F2');

      const startRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('start_whitelist_quiz')
          .setLabel('🔄 Kvíz Újraindítása')
          .setStyle(ButtonStyle.Primary)
      );

      return await interaction.update({ embeds: [expiredEmbed], components: [startRow] }).catch(async () => {
        await interaction.reply({ embeds: [expiredEmbed], components: [startRow], ephemeral: true }).catch(() => {});
      });
    }

    session.lastActive = Date.now();
    const currentQ = session.questions[session.currentIndex];
    const isCorrect = (optionIndex === currentQ.correctIndex);
    if (isCorrect) {
      session.score += 1;
    }
    session.userAnswers.push(optionIndex);
    session.currentIndex += 1;

    // Check if finished
    if (session.currentIndex >= session.total) {
      const finalScore = session.score;
      const total = session.total;
      const percent = Math.round((finalScore / total) * 100);
      const passed = percent >= 75;

      activeQuizSessions.delete(userId);

      if (passed) {
        const successEmbed = new EmbedBuilder()
          .setTitle('🎉 GRATULÁLUNK! SIKERES WHITELIST VIZSGA!')
          .setDescription(
            `Sikeresen teljesítetted a szabályzati kvízt!\n\n` +
            `📊 **Elért pontszám:** \`${finalScore} / ${total}\` pont (**${percent}%**)\n` +
            `🏆 **Megszerzett rang:** \`Polgár (Whitelist)\`\n\n` +
            `Most már szabadon felcsatlakozhatsz a szerverre!\n` +
            `Jó játékot kíván a **Nexus Horizon RP** csapata!`
          )
          .setColor('#10b981')
          .setImage('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=60');

        // Respond IMMEDIATELY to prevent Discord 3s timeout
        await interaction.update({ embeds: [successEmbed], components: [] }).catch(() => {});

        // Process background database, role assignment and logging asynchronously
        (async () => {
          try {
            const resultRecord: WhitelistResult = {
              discordId: userId,
              discordTag: interaction.user.tag,
              score: finalScore,
              totalQuestions: total,
              passed,
              attemptedAt: new Date().toISOString()
            };
            await saveWhitelistResult(resultRecord).catch(() => {});

            // Assign Polgár / Whitelist role robustly
            const guild = interaction.guild;
            if (guild) {
              const member = await guild.members.fetch(userId).catch(() => null);
              if (member) {
                // Look for Polgár role specifically first, then Whitelist
                let polgarRole = guild.roles.cache.find(r => 
                  r.name.includes('Polgár') || 
                  r.name.toLowerCase().includes('polgár') ||
                  r.name.toLowerCase().includes('polgar')
                );

                // If not found, look for Whitelist or Tag
                if (!polgarRole) {
                  polgarRole = guild.roles.cache.find(r => 
                    r.name.toLowerCase().includes('whitelist') ||
                    r.name.toLowerCase().includes('tag')
                  );
                }

                // If still no role exists on the server, create the '👥 Polgár' role automatically
                if (!polgarRole) {
                  try {
                    polgarRole = await guild.roles.create({
                      name: '👥 Polgár',
                      color: '#aab8c2',
                      reason: 'Automata Whitelist kvíz teljesítése miatt létrehozott Polgár rang'
                    });
                  } catch (createErr) {
                    console.error('[Quiz] Could not auto-create Polgár role:', createErr);
                  }
                }

                if (polgarRole && !member.roles.cache.has(polgarRole.id)) {
                  await member.roles.add(polgarRole).catch((err) => {
                    console.error('[Quiz] Failed to add Polgár role to member:', err);
                  });
                }
              }
            }

            // Log to whitelist log channel
            const logChannel = interaction.guild?.channels.cache.find(c => 
              c.name.includes('whitelist-log') || c.name.includes('tagfelvetel') || c.name.includes('admin-log')
            ) as TextChannel;
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('✅ SIKERES WHITELIST VIZSGA')
                .setDescription(`🎉 <@${userId}> sikeresen kitöltötte a Whitelist kvízt!\n**Eredmény:** \`${finalScore}/${total}\` (${percent}%)\n**Státusz:** Polgár rang kiosztva.`)
                .setColor('#10b981')
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
          } catch (bgErr) {
            console.error('[Quiz] Background processing error:', bgErr);
          }
        })();

        return;
      } else {
        const failEmbed = new EmbedBuilder()
          .setTitle('❌ SIKERTELEN WHITELIST VIZSGA')
          .setDescription(
            `Sajnos nem érted el a szükséges 75%-os szintet.\n\n` +
            `📊 **Elért pontszám:** \`${finalScore} / ${total}\` pont (**${percent}%**)\n` +
            `📖 **Teendő:** Olvasd át újra a szabályzatot a szabályzat szobákban, majd próbáld meg újra!`
          )
          .setColor('#ef4444');

        const retryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('start_whitelist_quiz')
            .setLabel('🔄 Újrapróbálkozás')
            .setStyle(ButtonStyle.Primary)
        );

        // Respond IMMEDIATELY
        await interaction.update({ embeds: [failEmbed], components: [retryRow] }).catch(() => {});

        // Save result asynchronously
        const resultRecord: WhitelistResult = {
          discordId: userId,
          discordTag: interaction.user.tag,
          score: finalScore,
          totalQuestions: total,
          passed: false,
          attemptedAt: new Date().toISOString()
        };
        saveWhitelistResult(resultRecord).catch(() => {});
        return;
      }
    }

    // Next question - respond instantly
    return await sendCurrentQuestion(interaction, userId, false);
  } catch (err) {
    console.error('[Quiz] handleQuizAnswer error:', err);
  }
}
