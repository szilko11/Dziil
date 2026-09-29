import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  ButtonInteraction, 
  GuildMember 
} from 'discord.js';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

// In-memory cache for fast responsive counter updates & fallbacks
export const inMemoryRulesAcks = {
  discord: new Set<string>(),
  server: new Set<string>()
};

export async function initRulesAckManager() {
  try {
    const docRef = doc(db, 'system_stats', 'rules_acks');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.discordUsers && Array.isArray(data.discordUsers)) {
        data.discordUsers.forEach((id: string) => inMemoryRulesAcks.discord.add(id));
      }
      if (data.serverUsers && Array.isArray(data.serverUsers)) {
        data.serverUsers.forEach((id: string) => inMemoryRulesAcks.server.add(id));
      }
      console.log(`[RulesManager] Loaded rules acks from Firestore: Discord=${inMemoryRulesAcks.discord.size}, Server=${inMemoryRulesAcks.server.size}`);
    }
  } catch (e) {
    console.log('[RulesManager] Initialized in-memory rules ack tracker');
  }
}

export async function getRulesAckCounts(): Promise<{ discordCount: number; serverCount: number }> {
  try {
    const docRef = doc(db, 'system_stats', 'rules_acks');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        discordCount: data.discordCount || inMemoryRulesAcks.discord.size || 0,
        serverCount: data.serverCount || inMemoryRulesAcks.server.size || 0
      };
    }
  } catch (e) {
    // offline / fallback to memory
  }
  return {
    discordCount: inMemoryRulesAcks.discord.size,
    serverCount: inMemoryRulesAcks.server.size
  };
}

export function generateDiscordRulesEmbeds(count: number = 0) {
  const embed1 = new EmbedBuilder()
    .setTitle('📜 NEXUS HORIZON RP • DISCORD SZABÁLYZAT')
    .setDescription(
      'Üdvözlünk a **Nexus Horizon RolePlay** hivatalos Discord szerverén!\n\n' +
      'A közösségünk zavartalan működése és a kulturált társalgás érdekében kérjük, hogy az alábbi szabálypontokat maradéktalanul tartsd be. ' +
      'A szabályzat elolvasása és elfogadása kötelező minden tag számára!'
    )
    .setColor('#5865F2')
    .addFields(
      { 
        name: '1. 💬 Viselkedés, Tisztelet & Kultúra', 
        value: '• Szigorúan tilos a toxikus megnyilvánulás, faji, vallási vagy nemi megkülönböztetés, valamint mások szándékos zaklatása és minősítése.\n• *Szankció:* Figyelmeztetés ➔ Mute (1-12 óra) ➔ Kick ➔ Ban.' 
      },
      { 
        name: '2. 🚫 SPAM, Flood & Hirdetés Tilalom', 
        value: '• Tilos a felesleges üzenetáradat (flood), értelmetlen emojizás, valamint más Discord vagy FiveM szerverek hirdetése (privát üzenetben is!).\n• *Szankció:* Mute ➔ Azonnali örökös kitiltás hirdetésért.' 
      },
      { 
        name: '3. 🪪 Megfelelő Profil & Felhasználónév', 
        value: '• Tilos a pornográf, politikai, felkavaró profilkép. Megtévesztő neveket (pl. Admin, Bot, Tulaj) tilos használni.\n• *Szankció:* Név átállítása staff által ➔ Kick.' 
      },
      { 
        name: '4. 🎭 IC és OOC Szigorú Elkülönítése', 
        value: '• A Discord felülete alapvetően OOC (Out of Character). Szigorúan tilos a játékbeli sérelmekért a Discord chaten bosszút állni vagy veszekedni!\n• *Szankció:* Mute (3-24 óra).' 
      },
      { 
        name: '5. 💵 Valós Pénzes Kereskedelem (RMT) Tilalma', 
        value: '• Szigorúan tilos az in-game vagyon, jármű, cég vagy account valódi pénzért (Ft, Euró) való árusítása.\n• *Szankció:* Azonnali örökös kitiltás a teljes közösségből.' 
      }
    )
    .setFooter({ text: 'Nexus Horizon RP • Discord Szabályzat • A szabályok nem tudása nem mentesít a felelősség alól!' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ack_rules_discord')
      .setLabel(`Elolvastam és Elfogadom (✅ ${count})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
  );

  return { embeds: [embed1], components: [buttonRow] };
}

export function generateServerRulesEmbeds(count: number = 0) {
  const embed1 = new EmbedBuilder()
    .setTitle('📖 NEXUS HORIZON RP • SZERVER SZABÁLYZAT I. - ALAPFOGALMAK')
    .setDescription('A FiveM játékszerver legfontosabb alapszabályai. Ezen fogalmak ismerete kötelező a Whitelist vizsgához és a játékhoz!')
    .setColor('#E74C3C')
    .addFields(
      { 
        name: '1. 🎭 In Character (IC) & Out Of Character (OOC) & Mix', 
        value: '**IC (In Character):** A karaktered élete, cselekedetei a játékban.\n**OOC (Out of Character):** Minden, ami a való életben veled történik.\n**Keverés (Mix):** Szigorúan TILOS a két világot összevonni! Erre az OOC chat (`/b`) való.\n• *Szankció:* AdminJail (30-60 perc).' 
      },
      { 
        name: '2. 🧠 MetaGaming (MG)', 
        value: '**Szabály:** OOC információk (pl. Discord stream, barátod mondja privátban) felhasználása az IC játékban.\n• *Szankció:* AdminJail (90-180 perc).' 
      },
      { 
        name: '3. 🦸 PowerGaming (PG)', 
        value: '**Szabály:** Hősieskedés és fizikai képtelenségek végrehajtása (pl. 4 fegyveres fog rád fegyvert és te fegyvert rántasz).\n• *Szankció:* AdminJail (90-120 perc).' 
      },
      { 
        name: '4. ✍️ /me és /do parancsok & ForceRP tilalma', 
        value: '**`/me`:** A karakter olyan látható cselekedete, amit az animáció nem mutat (pl. `/me átnyújtja a személyit`).\n**`/do`:** Történések, láthatatlan állapotok leírása (pl. `/do a pulzusa stabil`). Tilos a /do-ban hazudni vagy másra kényszeríteni cselekedetet (ForceRP)!\n• *Szankció:* AdminJail (60-90 perc).' 
      }
    );

  const embed2 = new EmbedBuilder()
    .setTitle('📖 NEXUS HORIZON RP • SZERVER SZABÁLYZAT II. - CSELEKEDETEK & HARC')
    .setColor('#E74C3C')
    .addFields(
      { 
        name: '5. ⚔️ DeathMatch (DM) / RDM / VDM', 
        value: '**Szabály:** Minden támadásnak és gyilkosságnak nyomós IC indokkal kell rendelkeznie. Tilos indokolatlanul embert ölni (RDM) vagy járművel elütni/fegyverként használni azt (VDM).\n• *Szankció:* AdminJail (120-300 perc) vagy Ban.' 
      },
      { 
        name: '6. 😨 FearRP (Életféltés)', 
        value: '**Szabály:** A karaktered életét minden szituációban féltened kell! Ha fegyvert fognak rád vagy túlerővel állsz szemben, kötelező együttműködnöd a támadókkal.\n• *Szankció:* AdminJail (60-120 perc).' 
      },
      { 
        name: '7. 🚫 Combat-Log & RP Megtagadás', 
        value: '**Szabály:** Szigorúan tilos RP szituáció közben kilépni ("F8 Quit"), crasht színlelni vagy megtagadni a játékot.\n• *Szankció:* Kitiltás (1 hét - Örökös).' 
      },
      { 
        name: '8. 🚓 Copbaiting (Rendőrcsalogatás)', 
        value: '**Szabály:** Tilos a rendőrség vagy mentők indokolatlan, szándékos provokálása csak azért, hogy üldöztetést vagy lövöldözést generálj.\n• *Szankció:* AdminJail (90-150 perc).' 
      }
    );

  const embed3 = new EmbedBuilder()
    .setTitle('📖 NEXUS HORIZON RP • SZERVER SZABÁLYZAT III. - ÉLET, HALÁL & JÁTÉKMENET')
    .setColor('#E74C3C')
    .addFields(
      { 
        name: '9. 💀 Player Kill (PK) & Újraéledés (NLR)', 
        value: '**Szabály:** Ha a karaktered meghal és a kórházban éledsz újra, amnézia lép fel: NEM emlékezhetsz a halálod körülményeire és szigorúan tilos bosszút állni (Revenge Kill - RK).\n• *Szankció:* AdminJail (90-120 perc).' 
      },
      { 
        name: '10. 💰 Rablási & Átverési Korlátok', 
        value: '**Szabály:** Kezdő játékost vagy alapmunkát végző személyt rabolni tilos. Ingatlant, járművet és Prémium Pontot átverni szigorúan TILOS!\n• *Szankció:* AdminJail / Örökös Ban.' 
      },
      { 
        name: '11. 🛡️ Bugkihasználás & Harmadik Fél Szoftverek', 
        value: '**Szabály:** Bármilyen játékbeli hiba (duplikálás, falon átlátás) kihasználása vagy külső csalóprogram használata azonnali végleges kitiltást von maga után!\n• *Szankció:* Örökös kitiltás.' 
      }
    )
    .setFooter({ text: 'Nexus Horizon RP • Szerver Szabályzat • Olvasd el figyelmesen a Whitelist teszt előtt!' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ack_rules_server')
      .setLabel(`Elolvastam és Elfogadom (✅ ${count})`)
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
  );

  return { embeds: [embed1, embed2, embed3], components: [buttonRow] };
}

// User acknowledge handler for button click
export async function handleRulesAcknowledgment(
  interaction: ButtonInteraction,
  ruleType: 'discord' | 'server'
) {
  const userId = interaction.user.id;
  const userSet = inMemoryRulesAcks[ruleType];
  const alreadyAcked = userSet.has(userId);

  if (!alreadyAcked) {
    userSet.add(userId);
  }

  // Update in Firestore
  try {
    const docRef = doc(db, 'system_stats', 'rules_acks');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        discordCount: ruleType === 'discord' ? 1 : 0,
        serverCount: ruleType === 'server' ? 1 : 0,
        updatedAt: Date.now()
      });
    } else {
      if (!alreadyAcked) {
        await updateDoc(docRef, {
          [ruleType === 'discord' ? 'discordCount' : 'serverCount']: increment(1),
          updatedAt: Date.now()
        });
      }
    }
  } catch (e) {
    console.log('[RulesAck] Using memory count');
  }

  const { discordCount, serverCount } = await getRulesAckCounts();
  const currentCount = ruleType === 'discord' ? Math.max(discordCount, inMemoryRulesAcks.discord.size) : Math.max(serverCount, inMemoryRulesAcks.server.size);

  // Update the button counter live on the message
  try {
    const newButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ruleType === 'discord' ? 'ack_rules_discord' : 'ack_rules_server')
        .setLabel(`Elolvastam és Elfogadom (✅ ${currentCount})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    if (interaction.message) {
      await interaction.message.edit({ components: [newButtonRow] }).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to update message button counter:', e);
  }

  // Give Tag / Szabályzatot Elfogadta role if available
  const member = interaction.member as GuildMember;
  let roleGivenText = '';
  if (member && member.roles) {
    try {
      let tagRole = interaction.guild?.roles.cache.find(r => 
        r.name.toLowerCase().includes('szabályzat') ||
        r.name.toLowerCase().includes('tag') || 
        r.name.toLowerCase().includes('olvasó') ||
        r.name.toLowerCase().includes('tagok')
      );
      if (tagRole && !member.roles.cache.has(tagRole.id)) {
        await member.roles.add(tagRole).catch(() => {});
        roleGivenText = `\n🎖️ Megkaptad a **${tagRole.name}** rangot!`;
      }
    } catch (err) {}
  }

  const otherRuleType = ruleType === 'discord' ? 'Szerver Szabályzatot' : 'Discord Szabályzatot';
  const otherChannelName = ruleType === 'discord' ? '📖┃szerver-szabályzat' : '📜┃discord-szabályzat';

  const wlChannel = interaction.guild?.channels.cache.find(c => c.name.includes('whitelist') || c.name.includes('kvíz'));
  const wlChannelMention = wlChannel ? `<#${wlChannel.id}>` : '`🛡️┃whitelist-kvíz`';

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('start_whitelist_quiz')
      .setLabel('📋 Whitelist Kvíz Kitöltése (Polgár rangért)')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✨')
  );

  if (alreadyAcked) {
    const embed = new EmbedBuilder()
      .setTitle('ℹ️ Szabályzat Már Elfogadva')
      .setDescription(
        `✅ **Már korábban elfogadtad ezt a szabályzatot!**\n\n` +
        `📝 **Következő lépés:**\n` +
        `Kattints az alábbi **[📋 Whitelist Kvíz Kitöltése]** gombra vagy keresd fel a ${wlChannelMention} csatornát!\n\n` +
        `🏆 A kvíz sikeres kitöltése (legalább 75%) után azonnal megkapod a **Polgár** rangot, amivel írhatsz az ötlet dobozba és a közösségi csatornákba!`
      )
      .setColor('#38bdf8');

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎉 Szabályzat Sikeresen Elfogadva!')
    .setDescription(
      `Köszönjük! Sikeresen rögzítettük a szabályzat elfogadását.\n` +
      `👥 **Összesen már ${currentCount} játékos fogadta el.**${roleGivenText}\n\n` +
      `📌 *Ne felejtsd el elolvasni a **${otherRuleType}**-at is a \`${otherChannelName}\` szobában!*\n\n` +
      `───────────────────────────────────────\n` +
      `🚀 **Hogyan kapsz POLGÁR rangot és írási jogot?**\n` +
      `1️⃣ Kattints közvetlenül az alábbi zöld **[📋 Whitelist Kvíz Kitöltése]** gombra!\n` +
      `2️⃣ Válaszolj meg helyesen legalább 6 kérdést a 8-ból.\n` +
      `3️⃣ A bot **automatikusan kiosztja a Polgár rangot**, amivel hozzáférhetsz az ötlet dobozhoz (\`💡┃ötletek\`), az általános csevegőhöz és a játékszerverhez!`
    )
    .setColor('#10b981');

  return interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true
  });
}
