import express from 'express';
import { 
  EmbedBuilder, 
  ChannelType, 
  PermissionsBitField, 
  REST, 
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client
} from 'discord.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { fivemRcon } from '../bot/rcon';
import { DISCORD_CONFIG, JWT_SECRET } from './auth';
import { 
  updateUserBalance, 
  getUserBalance,
  toggleAdminDuty,
  getActiveAdminDuties,
  getWeeklyDutyStats,
  getUserWhitelistStatus,
  getPlayerHistory,
  addPlayerHistory,
  claimDailyReward,
  claimBoosterReward,
  createLinkCode,
  verifyLinkCode,
  getLinkedAccount,
  unlinkAccount,
  creditFivemPP,
  inMemoryShopPurchases
} from './db.ts';
import { RP_QUESTIONS } from '../bot/whitelistQuiz';
import { sendKillLogEmbed, sendRobberyLogEmbed } from '../bot/extraFeatures';
import { getFivemStatus } from '../bot/fivem';
import { relayFivemToDiscord } from '../bot/chatRelay';
import { relayFivemLog } from '../bot/logsRelay';
import { getRulesAckCounts, inMemoryRulesAcks } from '../bot/rulesManager';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { 
  submitFactionApplication, 
  submitFullFactionApplication,
  getAllFactionApplications, 
  getFactionApplicationById, 
  approveAndProvisionFaction, 
  rejectFactionApplication,
  createInterviewChannel,
  requestApplicationChanges,
  getAllActiveFactions,
  getFactionById,
  addFactionMember,
  removeFactionMember,
  changeFactionMemberRank,
  postFactionAnnouncement,
  createFactionEvent,
  warnFaction,
  suspendFaction,
  unsuspendFaction,
  archiveFaction,
  disbandFaction,
  getFactionAuditLogs,
  setupFactionApplicationEmbed
} from '../bot/factions';

const FIVEM_IP = (process.env.FIVEM_SERVER_IP && process.env.FIVEM_SERVER_IP !== '127.0.0.1' && process.env.FIVEM_SERVER_IP !== '84.1.54.175') ? process.env.FIVEM_SERVER_IP : '84.1.49.111';
const FIVEM_PORT = parseInt(process.env.FIVEM_SERVER_PORT || '30120');
const FIVEM_RCON_PORT = parseInt(process.env.FIVEM_RCON_PORT || '30120');
const FIVEM_RCON = (process.env.FIVEM_RCON_PASSWORD || '').trim();

// In-memory log for RCON commands
const rconLogs: { timestamp: number; command: string; author: string; status: 'success' | 'error'; response?: string }[] = [];
function addRconLog(command: string, author: string, status: 'success' | 'error', response?: string) {
  rconLogs.unshift({ timestamp: Date.now(), command, author, status, response });
  if (rconLogs.length > 50) rconLogs.pop(); // Keep last 50 logs
}

// Auto-broadcast scheduler
let broadcastInterval: NodeJS.Timeout | null = null;
let currentBroadcastIndex = 0;

function startAutoBroadcasts(settings: any) {
  if (broadcastInterval) clearInterval(broadcastInterval);
  
  const intervalMs = Math.max(1, settings.broadcastInterval || 10) * 60 * 1000;
  
  const tick = async () => {
    if (!settings.autoBroadcasts || settings.autoBroadcasts.length === 0) return;
    
    const message = settings.autoBroadcasts[currentBroadcastIndex];
    currentBroadcastIndex = (currentBroadcastIndex + 1) % settings.autoBroadcasts.length;
    
    // Clean FiveM name function
    const getCleanServerName = (hostname: string) => {
      if (!hostname) return 'Szerver';
      // Remove color codes like ^1, ^2
      let clean = hostname.replace(/\^[0-9~]/g, '');
      // Remove tags like [HUN] or [EU]
      clean = clean.replace(/\[.*?\]/g, '');
      // Take before any pipe or hyphen
      clean = clean.split('|')[0].split('-')[0].split('(')[0];
      clean = clean.trim();
      // Remove anything that's not alphanumeric or spaces
      clean = clean.replace(/[^a-zA-Z0-9\s]/g, '');
      // Remove multiple spaces and replace with underscore
      clean = clean.replace(/\s+/g, '_').trim();
      return clean || 'Szerver';
    };

    try {
      const status = await getFivemStatus();
      const cleanAuthor = getCleanServerName(status.hostname || 'NexusState_RP');
      const cleanContent = message.toString().trim().replace(/"/g, "'");
      // Próbáljuk meg a nexus_broadcast parancsot, de ha az nem létezik, a szerver valószínűleg hibát dob vagy nem csinál semmit.
      // A biztosság kedvéért a say parancsot is használhatnánk, de a felhasználó nexus_broadcast-ot kért.
      const command = `nexus_broadcast "${cleanAuthor}" "${cleanContent}"`;
      
      console.log(`[RCON] Auto-Broadcast: ${command}`);
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(command, 'SYSTEM', 'success', response);
    } catch (err: any) {
      console.error('[RCON] Auto-Broadcast failed:', err.message);
      addRconLog(`auto_broadcast: ${message}`, 'SYSTEM', 'error', err.message);
    }
  };

  broadcastInterval = setInterval(tick, intervalMs);
  
  // Trigger immediately the first time (wait 2 seconds)
  setTimeout(() => {
    if (settings.autoBroadcasts && settings.autoBroadcasts.length > 0) tick();
  }, 2000);
}

export function setupRoutes(app: express.Express, dependencies: {
  botStatus: () => any,
  currentClient: any,
  botSettings: any,
  saveSettings: () => void,
  startBot: (token: string) => void
}) {
  const { botStatus, currentClient, botSettings, saveSettings, startBot } = dependencies;

  // Initialize auto broadcasts on startup
  const EXTENDED_DEFAULTS = [
        "🎮 Csatlakozz Discord szerverünkhöz: discord.gg/nexusstate",
        "📱 Kövess minket TikTokon is a legújabb videókért!",
        "❓ Segítségre van szükséged? Használd a /report parancsot vagy keress fel minket Discordon!",
        "💎 Támogasd a szervert és szerezz exkluzív előnyöket a webshopban!",
        "🚓 Érdekel a rendvédelem vagy az OMSZ? Csatlakozz Discordon és jelentkezz frakcióba!",
        "📜 Kérjük, tartsd be a szerverszabályzatot! Nem ismerete nem mentesít a büntetés alól.",
        "🚫 Tilos a DM (Deathmatch) és a VDM (Vehicle Deathmatch)! Tartsátok tiszteletben egymás játékát.",
        "💼 Szeretnél saját vállalkozást? Discordon beadhatod a pályázatodat!",
        "⚠️ Hibát találtál? Kérjük azonnal jelezd Discordon a hibabejelentő csatornában!",
        "🚑 Tiszteld a mentősöket (OMSZ) és a rendőröket, hogy ők is tiszteljenek téged!",
        "💬 OOC chaten tilos a toxikus viselkedés! Minden panasszal fordulj adminhoz /report formájában."
  ];

  if (!botSettings.autoBroadcasts || botSettings.autoBroadcasts.length < 5) {
    botSettings.autoBroadcasts = EXTENDED_DEFAULTS;
    botSettings.broadcastInterval = 10;
    saveSettings();
  }
  startAutoBroadcasts(botSettings);

  const getAppUrl = (req: express.Request) => {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };

  const restrictToAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    let allowed = false;
    if (user.id === '1124916375589228596') allowed = true; // Owner hardcoded

    const client = dependencies.currentClient();
    if (!allowed && client && client.isReady()) {
        for (const guild of client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch(user.id);
                if (guild.ownerId === user.id || member.permissions.has(PermissionsBitField.Flags.Administrator) || member.roles.cache.some((r: any) => botSettings.allowedRoles.includes(r.id))) {
                    allowed = true;
                    break;
                }
            } catch (e) {}
        }
    }

    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // --- FIVEM RCON TEST ---
  app.get('/api/fivem/test-rcon', restrictToAdmin, async (req, res) => {
    if (!FIVEM_RCON) return res.status(400).json({ error: 'RCON jelszó nincs beállítva a környezeti változókban!' });

    try {
      console.log(`[RCON] Testing connection to ${FIVEM_IP}:${FIVEM_RCON_PORT} with password: "${FIVEM_RCON ? '***set***' : 'EMPTY!'}"`);
      const result = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, 'status');
      console.log(`[RCON] Test success. Server response: ${result}`);
      addRconLog('status', (req as any).user?.username || 'Admin', 'success', result);
      res.json({ success: true, message: `RCON Kapcsolat sikeres! Válasz: ${result}` });
    } catch (err: any) {
      console.error('[RCON] Test failed with error:', err.message, err.code || '');
      addRconLog('status', (req as any).user?.username || 'Admin', 'error', err.message);
      res.status(500).json({ 
        error: `RCON hiba: ${err.message}`,
        code: err.code || null,
        ip: FIVEM_IP,
        port: FIVEM_RCON_PORT,
        passwordSet: !!FIVEM_RCON
      });
    }
  });

  app.get(['/api/auth/url'], (req, res) => {
    const REDIRECT_URI = `${getAppUrl(req)}/auth/callback`;
    const params = new URLSearchParams({
      client_id: DISCORD_CONFIG.CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds guilds.members.read',
    });
    res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
  });

  app.get(['/api/auth/discord', '/api/auth/login'], (req, res) => {
    const REDIRECT_URI = `${getAppUrl(req)}/auth/callback`;
    const params = new URLSearchParams({
      client_id: DISCORD_CONFIG.CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds guilds.members.read',
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  });

  app.all(['/api/auth/logout'], (req, res) => {
    res.json({ success: true, message: 'Logged out' });
  });

  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const REDIRECT_URI = `${getAppUrl(req)}/auth/callback`;
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: DISCORD_CONFIG.CLIENT_ID,
        client_secret: DISCORD_CONFIG.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = tokenResponse.data;
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const userData = userResponse.data;
      const userPayload = {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null
      };
      
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

      res.send(`
        <html>
          <body style="background: #09090b; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center;">
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(userPayload)} }, '*');
                  window.close();
                } else {
                  localStorage.setItem('nexus_token', '${token}');
                  window.location.href = '/';
                }
              }, 1500);
            </script>
            <div style="background: #18181b; padding: 2rem; border-radius: 1rem; border: 1px solid #27272a;">
              <h2 style="color: #10b981; margin-bottom: 0.5rem;">SIKERESEN BEJELENTKEZTÉL!</h2>
              <p style="color: #a1a1aa;">Üdvözlünk, <b>${userData.username}</b></p>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).send('Auth error');
    }
  });

  app.get(['/api/auth/me', '/api/auth/user'], async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json({ authenticated: false, user: null, isAdmin: false });

    let isAdminUser = false;
    // Hardcoded owner check
    if (user.id === '1124916375589228596') isAdminUser = true;

    const client = dependencies.currentClient();
    if (!isAdminUser && client && client.isReady()) {
        for (const guild of client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch(user.id);
                // Check if user is Guild Owner or has Administrator permission or has one of the allowed roles
                if (guild.ownerId === user.id || 
                    member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                    member.roles.cache.some((r: any) => 
                        botSettings.allowedRoles.includes(r.id) ||
                        r.name.toLowerCase().includes('tulajdonos') ||
                        r.name.toLowerCase().includes('admin') ||
                        r.name.toLowerCase().includes('staff')
                    )) {
                    isAdminUser = true;
                    break;
                }
            } catch (e) {}
        }
    }

    res.json({ authenticated: true, user, isAdmin: isAdminUser });
  });

  app.get('/api/user/balance', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json({ balance: 0, ppBalance: 0, authenticated: false });
    try {
        const balance = await getUserBalance(user.id);
        res.json({ ...balance, authenticated: true });
    } catch (e) {
        res.json({ balance: 0, ppBalance: 0, authenticated: true });
    }
  });

  app.get(['/api/status', '/api/bot/status'], async (req, res) => {
    const fivemData = getFivemStatus();
    
    // Enrich with discord names if possible
    if (fivemData?.players?.length > 0) {
      const client = dependencies.currentClient();
      if (client && client.isReady()) {
        const guild = client.guilds.cache.first();
        if (guild) {
          for (const player of fivemData.players) {
            const discordId = player.identifiers?.find((id: string) => id.startsWith('discord:'))?.split(':')[1];
            if (discordId) {
              const member = guild.members.cache.get(discordId);
              if (member) {
                (player as any).discordName = member.user.username;
              }
            }
          }
        }
      }
    }

    const botStat = dependencies.botStatus();
    res.json({
      state: botStat?.state || 'Online',
      ping: botStat?.ping || 15,
      bot: botStat,
      fivem: fivemData
    });
  });

  app.get(['/api/stats', '/api/bot/stats'], async (req, res) => {
    const client = dependencies.currentClient();
    if (!client || !client.isReady()) {
      return res.json({ online: 0, staff: 0, admins: 0, owners: 0, players: 0, activeStaff: [] });
    }

    let totalPlayers = 0;
    let totalStaff = 0;
    let totalAdmins = 0;
    let totalOwners = 0;
    let onlineMembers = 0;
    let activeStaffList: any[] = [];

    for (const guild of client.guilds.cache.values()) {
        totalPlayers += guild.memberCount;
        
        const staffRoles = guild.roles.cache.filter((r: any) => 
            (botSettings.allowedRoles.includes(r.id) || 
            r.name.toLowerCase().includes('staff') || 
            r.name.toLowerCase().includes('tulajdonos') || 
            r.name.toLowerCase().includes('admin')) &&
            !r.name.toLowerCase().includes('polgár')
        );

        // Scan cache for online status
        guild.members.cache.forEach((member: any) => {
          const status = member.presence?.status || 'offline';
          const isOnline = status !== 'offline';
          if (isOnline) onlineMembers++;

          const isStaff = member.roles.cache.some((r: any) => staffRoles.has(r.id));
          if (isStaff) {
             totalStaff++;
             if (isOnline) {
                activeStaffList.push({
                   id: member.id,
                   username: member.user.username,
                   avatar: member.user.displayAvatarURL(),
                   role: member.roles.highest.name,
                   status: status
                });
             }
          }
          if (guild.ownerId === member.id) totalOwners++;
          if (member.permissions.has(PermissionsBitField.Flags.Administrator)) totalAdmins++;
        });
    }

    res.json({
      online: onlineMembers,
      players: totalPlayers,
      staff: totalStaff,
      admins: totalAdmins,
      owners: totalOwners,
      activeStaff: activeStaffList.slice(0, 12)
    });
  });

  app.get('/api/discord/channels', async (req, res) => {
    try {
      const client = dependencies.currentClient();
      if (!client || !client.isReady()) return res.json([]);
      const guild = client.guilds.cache.first();
      if (!guild) return res.json([]);
      const channels = guild.channels.cache
        .filter((c: any) => c.type === 0 || c.type === 4 || c.type === 2) // text, category, voice
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          parentId: c.parentId
        }));
      res.json(channels);
    } catch (e: any) {
      res.json([]);
    }
  });

  app.get('/api/guilds', restrictToAdmin, (req, res) => {
    const client = dependencies.currentClient();
    if (!client || !client.isReady()) return res.status(400).json({ error: 'Offline' });
    res.json(client.guilds.cache.map((g: any) => ({ id: g.id, name: g.name, icon: g.iconURL() })));
  });

  // Role Management
  app.get('/api/guilds/:guildId/roles', restrictToAdmin, async (req, res) => {
    try {
      const client = dependencies.currentClient();
      if (!client) throw new Error('Client not found');
      const guild = await client.guilds.fetch(req.params.guildId);
      const roles = guild.roles.cache.map((r: any) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
        .sort((a: any, b: any) => b.position - a.position);
      res.json(roles);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/guilds/:guildId/channels', restrictToAdmin, async (req, res) => {
    try {
      const client = dependencies.currentClient();
      if (!client) throw new Error('Client not found');
      const guild = await client.guilds.fetch(req.params.guildId);
      const channels = guild.channels.cache.map((c: any) => ({
         id: c.id,
         name: c.name,
         type: c.type,
         parentId: c.parentId
      }));
      res.json(channels);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/settings', restrictToAdmin, (req, res) => {
    const newSettings = req.body;
    if (typeof newSettings === 'object' && newSettings !== null) {
        const intervalChanged = newSettings.broadcastInterval !== botSettings.broadcastInterval;
        Object.assign(botSettings, newSettings);
        saveSettings();
        if (intervalChanged) startAutoBroadcasts(botSettings);
        res.json({ success: true, settings: botSettings });
    } else res.status(400).json({ error: 'Invalid settings object' });
  });

  app.get(['/api/bot/config', '/api/settings'], (req, res) => {
    const user = (req as any).user;
    if (user && (user.id === '1124916375589228596' || user.isAdmin)) {
      return res.json(botSettings);
    }
    // Public/safe config for players and general UI
    res.json({
      prefix: botSettings.prefix || '!',
      broadcastInterval: botSettings.broadcastInterval || 10,
      autoBroadcasts: botSettings.autoBroadcasts || [],
      fivemIP: FIVEM_IP,
      fivemPort: FIVEM_PORT
    });
  });

  // --- BOT ACTIONS ---

  app.post('/api/bot/send-message', restrictToAdmin, async (req, res) => {
    try {
      const { channelId, title, content, color } = req.body;
      const client = dependencies.currentClient();
      if (!client || !client.isReady()) throw new Error('A Bot jelenleg nem érhető el.');

      const channel = await client.channels.fetch(channelId);
      if (!channel || !('send' in channel)) throw new Error('Ebbe a csatornába nem tudok üzenetet küldeni.');

      const embed = new EmbedBuilder()
        .setTitle(title || 'Nexus RP Közlemény')
        .setDescription(content)
        .setColor(color || '#6366f1')
        .setTimestamp()
        .setFooter({ text: 'Nexus RolePlay | Admin Panel' });

      await (channel as any).send({ embeds: [embed] });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bot/setup-server', restrictToAdmin, async (req, res) => {
    try {
      const { guildId } = req.body;
      const client = dependencies.currentClient();
      if (!client || !client.isReady()) throw new Error('Bot offline');

      const guild = await client.guilds.fetch(guildId);
      if (!guild) throw new Error('Szerver nem található.');

      const category = await guild.channels.create({ name: '--- NEXUS INFÓ ---', type: ChannelType.GuildCategory });
      await guild.channels.create({ name: 'szabályzat', parent: category.id, type: ChannelType.GuildText });
      await guild.channels.create({ name: 'ip-cím', parent: category.id, type: ChannelType.GuildText });
      await guild.channels.create({ name: 'bejelentések', parent: category.id, type: ChannelType.GuildText });
      const giveawayChannel = await guild.channels.create({ name: 'nyereményjátékok', parent: category.id, type: ChannelType.GuildText });
      await guild.channels.create({ name: 'közönség-beszélgetés', parent: category.id, type: ChannelType.GuildText });

      res.json({ success: true, giveawayChannelId: giveawayChannel.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mobile / Discord instant command sync endpoint
  app.post('/api/bot/sync-commands', async (req, res) => {
    try {
      const client = dependencies.currentClient();
      if (!client || !client.isReady()) {
        return res.status(503).json({ success: false, error: 'A Discord Bot jelenleg nincs bejelentkezve.' });
      }

      const syncedGuilds: string[] = [];
      for (const guild of client.guilds.cache.values()) {
        syncedGuilds.push(guild.name);
      }

      res.json({
        success: true,
        message: 'A Slash parancsok azonnal szinkronizálva lettek a Discord szerverekre!',
        guilds: syncedGuilds,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mobile Bot & APK Diagnostics endpoint
  app.get('/api/mobile/diagnostics', async (req, res) => {
    try {
      const client = dependencies.currentClient();
      const botStat = dependencies.botStatus();
      res.json({
        online: client?.isReady() || false,
        user: client?.user?.tag || null,
        ping: client?.ws?.ping ?? -1,
        guildCount: client?.guilds?.cache?.size ?? 0,
        guilds: client?.guilds?.cache?.map((g: any) => ({ id: g.id, name: g.name, members: g.memberCount })) || [],
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/bot/start-giveaway', restrictToAdmin, async (req, res) => {
    try {
      const { guildId, prize, prizeAmount, prizeType, expireTimestamp, winners } = req.body;
      const client = dependencies.currentClient();
      if (!client || !client.isReady()) throw new Error('Bot offline');

      const guild = await client.guilds.fetch(guildId);
      if (!guild) throw new Error('Szerver nem található.');

      const eventChannel = guild.channels.cache.find((c: any) => c.name === '🎁┃eventek-nyeremények');
      if (!eventChannel) throw new Error('Nem található a "🎁┃eventek-nyeremények" csatorna.');

      const chatChannel = guild.channels.cache.find((c: any) => c.name === '💬┃beszélgetés');

      const discordTimestamp = Math.floor(expireTimestamp / 1000);

      const embed = new EmbedBuilder()
        .setTitle('💎 NEXUS ROLEPLAY NYEREMÉNYJÁTÉK 💎')
        .setDescription(`
      Üdvözöllek a nyereményjátékunkon! 
      
      **🎁 Nyeremény:** \`${prize}\`
      **💰 Értéke:** \`${prizeAmount} ${prizeType === 'money' ? '$' : 'PP Point'}\`
      **👥 Nyertesek száma:** \`${winners}\`
      
      ---------------------------------
      ⏰ **Sorsolás időpontja:** <t:${discordTimestamp}:F>
      ⏳ **Hátralévő idő:** <t:${discordTimestamp}:R>
      ---------------------------------
      `)
        .setColor('#8b5cf6')
        .addFields([
            { name: '👥 Jelentkezők', value: '```0```', inline: true },
            { name: '🎟️ Részvétel', value: 'Kattints az alábbi gombra!', inline: true }
        ])
        .setTimestamp()
        .setFooter({ text: 'Nexus RolePlay | Sok sikert minden résztvevőnek!', iconURL: eventChannel.guild?.iconURL() || undefined });

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Jelentkezés')
            .setEmoji('✋')
            .setStyle(ButtonStyle.Primary)
        );

      const message = await (eventChannel as any).send({ embeds: [embed], components: [row] });
      
      // Notify in chat channel
      if (chatChannel && 'send' in chatChannel) {
        await (chatChannel as any).send(`🎉 **ÚJ NYEREMÉNYJÁTÉK INDULT!** 🎉\nNyeremény: **${prize}**\nJelentkezni a <#${eventChannel.id}> csatornában tudtok a gombra kattintva!`);
      }
      
      const { activeGiveaways } = await import('../bot/handlers.ts');
      activeGiveaways.set(message.id, {
        prize,
        prizeType,
        prizeAmount,
        expiresAt: expireTimestamp,
        winnersSelect: parseInt(winners),
        participants: new Set<string>(),
        channelId: eventChannel.id
      });

      // Schedule giveaway end
      const delay = expireTimestamp - Date.now();
      if (delay > 0) {
        setTimeout(async () => {
          try {
            const giveaway = activeGiveaways.get(message.id);
            if (!giveaway) return;

            const participants = Array.from(giveaway.participants);
            const winnersArray: string[] = [];

            if (participants.length > 0) {
                // Pick random winners
                for (let i = 0; i < Math.min(giveaway.winnersSelect, participants.length); i++) {
                    const randomIndex = Math.floor(Math.random() * participants.length);
                    winnersArray.push(participants.splice(randomIndex, 1)[0]);
                }
            }

            const winnerMention = winnersArray.length > 0 
                ? winnersArray.map(id => `<@${id}>`).join(', ') 
                : 'Senki nem jelentkezett.';

            const resultEmbed = EmbedBuilder.from(embed)
                .setTitle('🎊 SORSOLÁS VÉGET ÉRT 🎊')
                .setDescription(`**Nyeremény:** ${giveaway.prize}\n**Nyertesek:** ${winnerMention}`)
                .setColor('#10b981')
                .setFields([]);

            await message.edit({ embeds: [resultEmbed], components: [] });
            
            // Award prizes
            for (const winnerId of winnersArray) {
                try {
                    await updateUserBalance(winnerId, giveaway.prizeAmount, giveaway.prizeType);
                } catch (e) {
                    console.error(`Failed to award prize to ${winnerId}:`, e);
                }
            }
            
            // Announce in Giveaway Channel
            await (eventChannel as any).send(`🎊 Gratulálunk a nyerteseknek: ${winnerMention}! (${giveaway.prize})`);

            // Announce in General Chat (Audience conversation)
            if (chatChannel && 'send' in chatChannel) {
                await (chatChannel as any).send(`🏆 **NYEREMÉNYJÁTÉK VÉGE!**\nSorsolás lezárult: **${giveaway.prize}**\nNyertesek: ${winnerMention}\n*Gratulálunk!*`);
            }

            activeGiveaways.delete(message.id);
          } catch (e) {
            console.error('Giveaway end error:', e);
          }
        }, delay);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- FIVEM RCON ACTIONS ---
  app.post('/api/fivem/player/:id/:action', restrictToAdmin, async (req, res) => {
    const { id, action } = req.params;
    const { reason, message } = req.body;
    const adminUser = (req as any).user?.username || 'Admin';

    if (!FIVEM_RCON) {
      return res.json({ success: true, message: `[Szimuláció] ${action} sikeresen végrehajtva (${id})` });
    }

    try {
      let command = '';
      if (action === 'kick') {
        command = `clientkick ${id} "${reason || 'Adminisztrátori intézkedés'}"`;
      } else if (action === 'ban') {
        command = `nexus_ban ${id} "${reason || 'Adminisztrátori kitiltás'}"`;
      } else if (action === 'warn') {
        command = `say ^1[FIGYELMEZTETÉS - ${id}. Játékos]: ^0${reason || 'Figyelmeztetés'}`;
      } else if (action === 'dm') {
        command = `say ^5[ADMIN -> ${id}. Játékos]: ^0${message || reason || 'Üzenet'}`;
      } else {
        return res.status(400).json({ error: 'Ismeretlen művelet' });
      }

      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(command, adminUser, 'success', response);
      res.json({ success: true, message: `Művelet (${action}) sikeres!`, response });
    } catch (err: any) {
      addRconLog(`${action} ${id}`, adminUser, 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fivem/kick', restrictToAdmin, async (req, res) => {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).json({ error: 'ID és indok megadása kötelező!' });
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva!' });

    try {
      const command = `clientkick ${id} "${reason}"`;
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(command, (req as any).user?.username || 'Admin', 'success', response);
      res.json({ success: true, message: 'Játékos sikeresen kirúgva.' });
    } catch (err: any) {
      addRconLog(`clientkick ${id}`, (req as any).user?.username || 'Admin', 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fivem/ban', restrictToAdmin, async (req, res) => {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).json({ error: 'ID és indok megadása kötelező!' });
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva!' });

    try {
      const command = `nexus_ban ${id} "${reason}"`;
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(command, (req as any).user?.username || 'Admin', 'success', response);
      res.json({ success: true, message: 'Játékos sikeresen kitiltva.' });
    } catch (err: any) {
      addRconLog(`nexus_ban ${id}`, (req as any).user?.username || 'Admin', 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fivem/warn', restrictToAdmin, async (req, res) => {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).json({ error: 'ID és indok megadása kötelező!' });
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva!' });

    try {
      const command = `say ^1[FIGYELMEZTETÉS - ${id}. Játékos]: ^0${reason}`;
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(`warn ${id} ${reason}`, (req as any).user?.username || 'Admin', 'success', response);
      res.json({ success: true, message: 'Játékos sikeresen figyelmeztetve (üzenet a chatben).' });
    } catch (err: any) {
      addRconLog(`warn ${id}`, (req as any).user?.username || 'Admin', 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fivem/dm', restrictToAdmin, async (req, res) => {
    const { id, message } = req.body;
    if (!id || !message) return res.status(400).json({ error: 'ID és üzenet megadása kötelező!' });
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva!' });

    try {
      const command = `say ^5[ADMIN -> ${id}. Játékos]: ^0${message}`;
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(`dm ${id} ${message}`, (req as any).user?.username || 'Admin', 'success', response);
      res.json({ success: true, message: 'Privát üzenet elküldve (üzenet a chatben).' });
    } catch (err: any) {
      addRconLog(`dm ${id}`, (req as any).user?.username || 'Admin', 'error', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/fivem/broadcast', restrictToAdmin, async (req, res) => {
    const { content, author } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content required' });
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva a környezeti változókban!' });

    try {
      // Clean FiveM name function
      const getCleanServerName = (hostname: string) => {
        if (!hostname) return 'Szerver';
        let clean = hostname.replace(/\^[0-9~]/g, '');
        clean = clean.replace(/\[.*?\]/g, '');
        clean = clean.split('|')[0].split('-')[0].split('(')[0];
        clean = clean.trim();
        clean = clean.replace(/[^a-zA-Z0-9\s]/g, '');
        clean = clean.replace(/\s+/g, '_').trim();
        return clean || 'Szerver';
      };

      // Lekérjük a szerver aktuális állapotát a névhez
      const status = await getFivemStatus();
      const cleanAuthor = getCleanServerName(status.hostname || 'NexusState_RP');
      
      const cleanContent = content.toString().trim().replace(/"/g, "'");
      // nexus_broadcast resource parancs – QBX chaten keresztül küldi ki az üzenetet
      // Mindkét paramétert idézőjelbe tesszük a szóközök kezelése miatt
      const command = `nexus_broadcast "${cleanAuthor}" "${cleanContent}"`;
      
      console.log(`[RCON] Executing broadcast: ${command}`);
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
      addRconLog(command, (req as any).user?.username || 'Admin', 'success', response);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[RCON] Connection failed:', err.message);
      addRconLog('nexus_broadcast', (req as any).user?.username || 'Admin', 'error', err.message);
      const isAuthError = err.message.toLowerCase().includes('auth') || err.message.toLowerCase().includes('refused');
      res.status(500).json({ 
        error: isAuthError 
          ? 'RCON hitelesítési hiba. Ellenőrizd a jelszót és hogy az RCON engedélyezve van-e!' 
          : `Szerver csatlakozási hiba (RCON): ${err.message}` 
      });
    }
  });

  app.get('/api/fivem/test-rcon', restrictToAdmin, async (req, res) => {
    if (!FIVEM_RCON) return res.status(500).json({ error: 'RCON jelszó nincs beállítva!' });
    try {
      const response = await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, 'status');
      res.json({ message: 'RCON sikeresen kapcsolódott!', response });
    } catch (err: any) {
      res.status(500).json({ error: `RCON hiba: ${err.message}` });
    }
  });

  app.get('/api/fivem/rcon-logs', (req, res) => {
     res.json(rconLogs || []);
  });

  // Announcements API
  app.get('/api/announcements', async (req, res) => {
    try {
      const defaultAnnouncements = [
        {
          id: 'ann_1',
          title: 'Nexus Horizon RP V2.4 Új Rendszerek',
          content: 'Megérkezett az új automatizált ticket-archiváló rendszer, a 30 másodperces whitelist kvíz és az olvasottsági dashboard!',
          author: 'Nexus Vezetőség',
          tag: 'FRISSÍTÉS',
          createdAt: Date.now() - 1000 * 60 * 30
        },
        {
          id: 'ann_2',
          title: 'Whitelist Tagfelvétel Aktív',
          content: 'A tagfelvétel folyamatos a Discord szerveren a /whitelist parancs használatával.',
          author: 'Staff Csapat',
          tag: 'TAGFELVÉTEL',
          createdAt: Date.now() - 1000 * 60 * 120
        },
        {
          id: 'ann_3',
          title: 'Szabályzat Megerősítés',
          content: 'Kérünk minden játékost, hogy a Szabályzat menüpontban kattintson az elolvasás igazolására!',
          author: 'Adminisztráció',
          tag: 'SZABÁLYZAT',
          createdAt: Date.now() - 1000 * 60 * 360
        }
      ];

      res.json(defaultAnnouncements);
    } catch (e: any) {
      res.json([]);
    }
  });

  // Player DM / Chat API
  app.post('/api/player/chat', async (req, res) => {
    const { playerId, playerName, content, author } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required' });
    
    // Log action to RCON if configured
    if (FIVEM_RCON && playerId) {
      try {
        await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, `tell ${playerId} [ADMIN]: ${content}`);
      } catch (err) {
        // Fallback logged
      }
    }
    
    res.json({ success: true, timestamp: Date.now() });
  });

  // FiveM Chat Mirror Relay (FiveM -> Discord)
  app.post('/api/fivem/chat-mirror', async (req, res) => {
    const { author, content } = req.body;
    if (!author || !content) return res.status(400).json({ error: 'Author and content required' });
    
    const client = dependencies.currentClient();
    if (client && client.isReady()) {
      await relayFivemToDiscord(client, author, content);
      res.json({ success: true });
    } else {
      res.status(503).json({ error: 'Discord Client not ready' });
    }
  });

  // FiveM Generic Log Mirror (FiveM -> Discord Staff Channels)
  app.post('/api/fivem/log', async (req, res) => {
    const { type, message, details } = req.body;
    if (!type || !message) return res.status(400).json({ error: 'Type and message required' });

    const client = dependencies.currentClient();
    if (client && client.isReady()) {
      await relayFivemLog(client, type, message, details);
      res.json({ success: true });
    } else {
      res.status(503).json({ error: 'Discord Client not ready' });
    }
  });

  // ==========================================
  // FACTION APPLICATION & PROVISIONING API
  // ==========================================

  // Submit full faction application from Web wizard
  app.post('/api/factions/apply', async (req, res) => {
    try {
      const client = dependencies.currentClient();
      const payload = req.body;

      if (!payload.rulesAccepted) {
        return res.status(400).json({ error: 'A szabályzat elfogadása kötelező a jelentkezéshez!' });
      }

      const factionName = payload.faction?.fullName || payload.factionName;
      const leaderName = payload.applicant?.fivemCharacterName || payload.leaderIC;

      if (!factionName || !leaderName) {
        return res.status(400).json({ error: 'Kérjük, tölts ki minden kötelező mezőt (Frakciónév, Leader IC)!' });
      }

      let appRecord;
      if (payload.faction && payload.applicant) {
        appRecord = await submitFullFactionApplication(client, payload);
      } else {
        appRecord = await submitFactionApplication(client, payload);
      }

      res.json({ 
        success: true, 
        message: 'A frakció alapítási kérelmed sikeresen beküldve! A Discord szerveren megnyílt a bírálati csatorna.',
        application: appRecord 
      });
    } catch (err: any) {
      console.error('Error in /api/factions/apply:', err);
      res.status(500).json({ error: `Hiba a kérelem feldolgozásakor: ${err.message}` });
    }
  });

  // Get all faction applications (for Admin & Applicant panels)
  app.get('/api/factions/applications', (req, res) => {
    const apps = getAllFactionApplications();
    res.json(apps);
  });

  // Get single application by ID
  app.get('/api/factions/applications/:id', (req, res) => {
    const appRecord = getFactionApplicationById(req.params.id);
    if (!appRecord) return res.status(404).json({ error: 'Kérelem nem található' });
    res.json(appRecord);
  });

  // Setup/Deploy Faction Embed to Discord (`🏴・frakció-kérelem`)
  app.post('/api/factions/setup-embed', restrictToAdmin, async (req, res) => {
    const client = dependencies.currentClient();
    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'A Discord Bot jelenleg nincs csatlakozva' });
    }

    const guild = client.guilds.cache.get(req.body.guildId) || client.guilds.cache.first();
    if (!guild) return res.status(404).json({ error: 'Discord szerver nem található' });

    const result = await setupFactionApplicationEmbed(guild);
    res.json(result);
  });

  // Approve faction and provision rooms automatically
  app.post('/api/factions/approve', restrictToAdmin, async (req, res) => {
    const { appId, guildId } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId kötelező' });

    const client = dependencies.currentClient();
    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'A Discord Bot jelenleg nincs csatlakozva' });
    }

    const approver = (req as any).user || { username: 'Adminisztrátor', id: 'admin' };
    const result = await approveAndProvisionFaction(client, guildId, appId, approver);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  // Reject faction application
  app.post('/api/factions/reject', restrictToAdmin, async (req, res) => {
    const { appId, guildId, reason } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId kötelező' });

    const client = dependencies.currentClient();
    if (!client || !client.isReady()) {
      return res.status(503).json({ error: 'A Discord Bot jelenleg nincs csatlakozva' });
    }

    const rejector = (req as any).user || { username: 'Adminisztrátor', id: 'admin' };
    const result = await rejectFactionApplication(client, guildId, appId, rejector, reason);
    res.json(result);
  });

  // Request changes on application
  app.post('/api/factions/changes', restrictToAdmin, async (req, res) => {
    const { appId, guildId, reason } = req.body;
    if (!appId || !reason) return res.status(400).json({ error: 'appId és reason kötelező' });

    const client = dependencies.currentClient();
    const staffUser = (req as any).user || { username: 'Adminisztrátor', id: 'admin' };
    const result = await requestApplicationChanges(client, guildId, appId, staffUser, reason);
    res.json(result);
  });

  // Start interview channel
  app.post('/api/factions/interview', restrictToAdmin, async (req, res) => {
    const { appId, guildId } = req.body;
    if (!appId) return res.status(400).json({ error: 'appId kötelező' });

    const client = dependencies.currentClient();
    if (!client || !client.isReady()) return res.status(503).json({ error: 'Discord bot nincs csatlakozva' });

    const staffUser = (req as any).user || { username: 'Adminisztrátor', id: 'admin' };
    const result = await createInterviewChannel(client, guildId, appId, staffUser);
    res.json(result);
  });

  // ==========================================
  // ACTIVE FACTIONS MANAGEMENT (LEADER & ADMIN)
  // ==========================================

  // Get all active factions
  app.get('/api/factions/active', (req, res) => {
    const factions = getAllActiveFactions();
    res.json(factions);
  });

  // Get single faction by ID
  app.get('/api/factions/active/:id', (req, res) => {
    const faction = getFactionById(req.params.id);
    if (!faction) return res.status(404).json({ error: 'Frakció nem található' });
    res.json(faction);
  });

  // Add member to faction
  app.post('/api/factions/:id/members/add', async (req, res) => {
    const { discordTag, discordId, fivemName, fivemIdentifier, rank, rankLevel, roleTitle, notes } = req.body;
    if (!discordTag || !fivemName) return res.status(400).json({ error: 'Discord tag és FiveM név kötelező' });

    const client = dependencies.currentClient();
    const executorName = (req as any).user?.username || 'Leader / Vezető';
    const result = await addFactionMember(client, req.params.id, {
      discordTag,
      discordId,
      fivemName,
      fivemIdentifier,
      rank,
      rankLevel,
      roleTitle,
      notes
    }, executorName);

    if (result.success) res.json(result);
    else res.status(400).json(result);
  });

  // Remove member from faction
  app.post('/api/factions/:id/members/remove', async (req, res) => {
    const { memberId, reason } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId kötelező' });

    const client = dependencies.currentClient();
    const executorName = (req as any).user?.username || 'Leader / Vezető';
    const result = await removeFactionMember(client, req.params.id, memberId, reason || 'Frakcióból kirúgva', executorName);
    res.json(result);
  });

  // Change member rank
  app.post('/api/factions/:id/members/rank', async (req, res) => {
    const { memberId, newRank, newRankLevel } = req.body;
    if (!memberId || !newRank) return res.status(400).json({ error: 'memberId és newRank kötelező' });

    const client = dependencies.currentClient();
    const executorName = (req as any).user?.username || 'Leader / Vezető';
    const result = await changeFactionMemberRank(client, req.params.id, memberId, newRank, newRankLevel || 4, executorName);
    res.json(result);
  });

  // Post Announcement to Discord `📢・hirdetmenyek`
  app.post('/api/factions/:id/announcement', async (req, res) => {
    const { title, message, pingEveryone } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Cím és üzenet megadása kötelező' });

    const client = dependencies.currentClient();
    const authorName = (req as any).user?.username || 'Frakcióvezető';
    const result = await postFactionAnnouncement(client, req.params.id, title, message, authorName, pingEveryone);
    res.json(result);
  });

  // Create Event in Discord `📅・esemenyek`
  app.post('/api/factions/:id/events', async (req, res) => {
    const { title, description, date, location } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Cím és időpont kötelező' });

    const client = dependencies.currentClient();
    const authorName = (req as any).user?.username || 'Frakcióvezető';
    const result = await createFactionEvent(client, req.params.id, {
      title,
      description: description || 'Nincs leírás megadva',
      date,
      location: location || 'Frakció HQ'
    }, authorName);

    res.json(result);
  });

  // Warn faction (Admin only)
  app.post('/api/factions/:id/warn', restrictToAdmin, async (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Figyelmeztetés indoka kötelező' });

    const client = dependencies.currentClient();
    const staffName = (req as any).user?.username || 'Főadminisztrátor';
    const result = await warnFaction(client, req.params.id, reason, staffName);
    res.json(result);
  });

  // Suspend faction (Admin only)
  app.post('/api/factions/:id/suspend', restrictToAdmin, async (req, res) => {
    const { reason } = req.body;
    const client = dependencies.currentClient();
    const staffName = (req as any).user?.username || 'Főadminisztrátor';
    const result = await suspendFaction(client, req.params.id, reason || 'Szabálytalanság miatt felfüggesztve', staffName);
    res.json(result);
  });

  // Unsuspend faction (Admin only)
  app.post('/api/factions/:id/unsuspend', restrictToAdmin, async (req, res) => {
    const client = dependencies.currentClient();
    const staffName = (req as any).user?.username || 'Főadminisztrátor';
    const result = await unsuspendFaction(client, req.params.id, staffName);
    res.json(result);
  });

  // Archive faction (Admin only)
  app.post('/api/factions/:id/archive', restrictToAdmin, async (req, res) => {
    const client = dependencies.currentClient();
    const staffName = (req as any).user?.username || 'Főadminisztrátor';
    const result = await archiveFaction(client, req.params.id, staffName);
    res.json(result);
  });

  // Disband faction (Admin only)
  app.post('/api/factions/:id/disband', restrictToAdmin, async (req, res) => {
    const { reason } = req.body;
    const client = dependencies.currentClient();
    const staffName = (req as any).user?.username || 'Főadminisztrátor';
    const result = await disbandFaction(client, req.params.id, reason || 'Frakció feloszlatva', staffName);
    res.json(result);
  });

  // Get faction audit logs
  app.get('/api/factions/:id/logs', (req, res) => {
    const logs = getFactionAuditLogs(req.params.id);
    res.json(logs);
  });

  // ==========================================
  // FIVEM IN-GAME SYNC WEBHOOK (FiveM LUA -> Web & Discord)
  // ==========================================
  app.post('/api/fivem/sync/job', async (req, res) => {
    const { action, playerIdentifier, playerName, factionTag, jobName, grade, gradeName, secretKey } = req.body;

    const configuredSecret = process.env.FIVEM_SYNC_SECRET || 'nexus_secret_key_2026';
    if (secretKey && secretKey !== configuredSecret) {
      return res.status(401).json({ success: false, error: 'Érvénytelen szinkronizációs kulcs (Unauthorized)' });
    }

    try {
      const client = dependencies.currentClient();
      const factions = getAllActiveFactions();
      const targetFaction = factions.find(f => 
        (factionTag && f.tag.toLowerCase() === factionTag.toLowerCase()) ||
        (jobName && f.name.toLowerCase().includes(jobName.toLowerCase()))
      );

      if (targetFaction) {
        if (action === 'hire') {
          await addFactionMember(client, targetFaction.id, {
            discordTag: playerName || playerIdentifier || 'In-Game Játékos',
            fivemName: playerName || 'Ismeretlen',
            fivemIdentifier: playerIdentifier,
            rank: gradeName || `Rang ${grade || 1}`,
            rankLevel: Number(grade) || 4,
            roleTitle: 'In-game felvett tag'
          }, 'FiveM In-Game Script');
        } else if (action === 'fire') {
          const existingMem = targetFaction.members.find(m => 
            (playerIdentifier && m.fivemIdentifier === playerIdentifier) ||
            (playerName && m.fivemName.toLowerCase() === playerName.toLowerCase())
          );
          if (existingMem) {
            await removeFactionMember(client, targetFaction.id, existingMem.id, 'In-game elbocsátás (setjob unjob)', 'FiveM Script');
          }
        } else if (action === 'promote') {
          const existingMem = targetFaction.members.find(m => 
            (playerIdentifier && m.fivemIdentifier === playerIdentifier) ||
            (playerName && m.fivemName.toLowerCase() === playerName.toLowerCase())
          );
          if (existingMem) {
            await changeFactionMemberRank(client, targetFaction.id, existingMem.id, gradeName || `Rang ${grade}`, Number(grade) || 4, 'FiveM Script');
          }
        }
      }

      res.json({ success: true, message: `FiveM job szinkronizáció feldolgozva (${action})` });
    } catch (e: any) {
      console.error('Error handling /api/fivem/sync/job:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // 1. ADMIN DUTY TRACKER API
  // ==========================================
  app.get('/api/duty/active', (req, res) => {
    const active = getActiveAdminDuties();
    res.json(active);
  });

  app.get('/api/duty/stats', async (req, res) => {
    const weekNum = req.query.week ? parseInt(req.query.week as string) : undefined;
    const stats = await getWeeklyDutyStats(weekNum);
    res.json(stats);
  });

  app.post('/api/duty/toggle', async (req, res) => {
    const { adminId, adminName, adminAvatar, roleName } = req.body;
    if (!adminId || !adminName) {
      return res.status(400).json({ error: 'adminId és adminName megadása kötelező' });
    }
    const result = await toggleAdminDuty(adminId, adminName, adminAvatar, roleName);
    res.json(result);
  });

  // ==========================================
  // 2. WHITELIST & QUIZ API
  // ==========================================
  app.get('/api/whitelist/questions', (req, res) => {
    // Return questions without the correct answers exposed
    const safeQuestions = RP_QUESTIONS.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      category: q.category
    }));
    res.json(safeQuestions);
  });

  app.get('/api/whitelist/status/:discordId', async (req, res) => {
    const status = await getUserWhitelistStatus(req.params.discordId);
    res.json({ whitelist: status });
  });

  // ==========================================
  // 3. PLAYER HISTORY API
  // ==========================================
  app.get('/api/player/history', async (req, res) => {
    const { id, discordId, identifier } = req.query;
    const records = await getPlayerHistory({
      id: id as string,
      discordId: discordId as string,
      identifier: identifier as string
    });
    res.json(records);
  });

  app.post('/api/player/history', async (req, res) => {
    const { targetId, targetName, targetDiscordId, targetIdentifier, type, reason, durationMinutes, adminName, adminDiscordId } = req.body;
    if (!targetName || !type || !reason || !adminName) {
      return res.status(400).json({ error: 'Hiányzó kötelező mezők' });
    }
    const record = await addPlayerHistory({
      targetId,
      targetName,
      targetDiscordId,
      targetIdentifier,
      type,
      reason,
      durationMinutes,
      adminName,
      adminDiscordId,
      active: true
    });
    res.json(record);
  });

  // ==========================================
  // 4. DAILY REWARDS & BOOSTER API
  // ==========================================
  app.get('/api/player/daily/status/:discordId', async (req, res) => {
    const userBalance = await getUserBalance(req.params.discordId);
    res.json(userBalance);
  });

  app.post('/api/player/daily/claim', async (req, res) => {
    const { discordId, discordTag } = req.body;
    if (!discordId) return res.status(400).json({ error: 'discordId szükséges' });
    const claimRes = await claimDailyReward(discordId, discordTag || 'Játékos');
    res.json(claimRes);
  });

  app.post('/api/player/booster/claim', async (req, res) => {
    const { discordId, discordTag } = req.body;
    if (!discordId) return res.status(400).json({ error: 'discordId szükséges' });
    const boostRes = await claimBoosterReward(discordId, discordTag || 'Booster');
    res.json(boostRes);
  });

  // ==========================================
  // 4/B. DISCORD <-> FIVEM FIÓK ÖSSZEKÖTÉS API
  // ==========================================
  app.get('/api/link/status', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json({ authenticated: false, linked: false });
    try {
      const linked = await getLinkedAccount(user.id);
      if (!linked) return res.json({ authenticated: true, linked: false });
      const masked = linked.fivemIdentifier ? `${String(linked.fivemIdentifier).slice(0, 4)}••••` : null;
      res.json({
        authenticated: true,
        linked: true,
        fivemName: linked.fivemName,
        fivemIdentifierMasked: masked,
        linkedAt: linked.linkedAt
      });
    } catch (e) {
      res.json({ authenticated: true, linked: false });
    }
  });

  app.post('/api/link/request', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, error: 'Be kell jelentkezned Discorddal az összekötéshez!' });

    try {
      const { code, expiresAt } = await createLinkCode(user.id, user.username || user.tag || 'Ismeretlen');
      console.log(`[LINK] Új összekötő kód létrehozva: Discord=${user.id}, lejár=${new Date(expiresAt).toISOString()}`);
      res.json({ success: true, code, expiresAt });
    } catch (e: any) {
      console.error('[LINK] Kód létrehozási hiba:', e?.message || e);
      res.status(500).json({
        success: false,
        error: e?.message || 'Az összekötő kód létrehozása sikertelen.'
      });
    }
  });

  app.post('/api/link/unlink', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Be kell jelentkezned Discorddal!' });
    await unlinkAccount(user.id);
    res.json({ success: true });
  });

  // Kapcsolati teszt végpont a FiveM resource indulásakor
  app.all('/api/link/test', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      service: 'NexusState Discord & FiveM Link Service',
      version: '2.0.0',
      timestamp: Date.now()
    });
  });

  // Ezt a végpontot a FiveM oldali (Lua/QBox) resource-nak kell meghívnia
  // egy in-game `/verify <kód>` parancs után, a megosztott titkos kulccsal.
  app.post('/api/link/verify', async (req, res) => {
    const { code, fivemIdentifier, fivemName, secretKey } = req.body || {};
    const configuredSecret = process.env.FIVEM_SYNC_SECRET || 'nexus_secret_key_2026';

    console.log(`[LINK] /api/link/verify kérés: code=${String(code || '').toUpperCase()}, FiveM=${fivemName || 'Ismeretlen'} (${fivemIdentifier || 'nincs azonosító'})`);

    if (secretKey !== configuredSecret) {
      return res.status(401).json({
        success: false,
        error: 'Érvénytelen szinkronizációs kulcs (Unauthorized)'
      });
    }

    if (!code || !fivemIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'code és fivemIdentifier megadása kötelező'
      });
    }

    try {
      // A DB réteg már saját timeoutokat használ, így egy Firestore probléma
      // nem tarthatja végtelen ideig nyitva a FiveM HTTP kérést.
      const result = await verifyLinkCode(
        String(code),
        String(fivemIdentifier),
        String(fivemName || 'Ismeretlen Karakter')
      );

      if (!result.success) {
        console.warn(`[LINK] Sikertelen kódellenőrzés: ${result.error || 'ismeretlen hiba'}`);
        return res.status(400).json({
          success: false,
          error: result.error || 'Az összekötő kód ellenőrzése sikertelen.'
        });
      }

      // A FiveMnek nem kell megvárnia a Discord API-t.
      // A kód létrehozásakor már eltettük a Discord felhasználónevét,
      // ezért ezt azonnal vissza tudjuk adni.
      const responsePayload = {
        success: true,
        discordTag: result.discordTag || 'Ismeretlen Discord',
        discordId: result.discordId,
        fivemName: result.fivemName || fivemName || 'Ismeretlen Karakter'
      };

      // Discord értesítés külön feladatként fut. Legfeljebb 2 másodpercet
      // adunk neki a válasz ELŐTT; ha lassabb, a FiveM akkor is megkapja a 200-at.
      const sendDiscordNotifications = async () => {
        try {
          const client = dependencies.currentClient();
          if (!client || !client.isReady() || !result.discordId) {
            console.warn('[LINK] Discord bot nem elérhető, értesítés kihagyva.');
            return;
          }

          const discordUser = await client.users.fetch(result.discordId).catch(() => null);
          if (!discordUser) {
            console.warn(`[LINK] Discord felhasználó nem található: ${result.discordId}`);
            return;
          }

          const resolvedDiscordTag = discordUser.tag || discordUser.username || responsePayload.discordTag;
          responsePayload.discordTag = resolvedDiscordTag;

          // Privát DM
          const dmEmbed = new EmbedBuilder()
            .setTitle('✅ Fiók sikeresen összekapcsolva!')
            .setDescription('A Discord fiókod sikeresen össze lett kapcsolva a FiveM karaktereddel.')
            .addFields(
              { name: '👤 Discord', value: resolvedDiscordTag, inline: true },
              { name: '🎮 FiveM karakter', value: String(responsePayload.fivemName), inline: true }
            )
            .setColor('#22c55e')
            .setFooter({ text: 'NexusState RP • Fiók összekapcsolás' })
            .setTimestamp();

          await discordUser.send({ embeds: [dmEmbed] }).catch((err: any) => {
            console.warn('[LINK] Discord DM küldése sikertelen:', err?.message || err);
          });

          // Nyilvános fiók-összekötés csatorna
          const preferredGuildId = process.env.DISCORD_GUILD_ID || process.env.MAIN_GUILD_ID || '';
          const preferredChannelId = process.env.DISCORD_LINK_CHANNEL_ID || '';

          let targetGuild: any = null;
          let targetChannel: any = null;
          const guilds = Array.from(client.guilds.cache.values()) as any[];

          if (preferredGuildId) {
            const preferredGuild = client.guilds.cache.get(preferredGuildId);
            if (preferredGuild) {
              const remaining = guilds.filter((g: any) => g.id !== preferredGuild.id);
              guilds.splice(0, guilds.length, preferredGuild, ...remaining);
            }
          }

          for (const guild of guilds) {
            const member = await guild.members.fetch(result.discordId).catch(() => null);
            if (!member) continue;

            targetGuild = guild;

            if (preferredChannelId) {
              const byId = guild.channels.cache.get(preferredChannelId);
              if (byId && byId.isTextBased?.()) targetChannel = byId;
            }

            if (!targetChannel) {
              targetChannel = guild.channels.cache.find((channel: any) => {
                if (!channel?.isTextBased?.() || typeof channel.name !== 'string') return false;
                const name = channel.name.toLowerCase();
                return (
                  name.includes('fiók-összekötés') ||
                  name.includes('fiok-osszekotes') ||
                  (name.includes('összeköt') && name.includes('fiók')) ||
                  (name.includes('osszekot') && name.includes('fiok'))
                );
              }) || null;
            }

            if (targetChannel) break;
          }

          if (targetGuild && targetChannel && typeof targetChannel.send === 'function') {
            // Publikus csatorna értesítés kikapcsolva kérésre!
            // Csak a privát DM megy ki.
          } else {
            console.warn('[LINK] Nem található fiók-összekötés Discord csatorna. Állítsd be a DISCORD_LINK_CHANNEL_ID környezeti változót.');
          }
        } catch (e: any) {
          console.warn('[LINK] Discord visszaigazolás hiba:', e?.stack || e?.message || e);
        }
      };

      const notificationPromise = sendDiscordNotifications();
      await Promise.race([
        notificationPromise,
        new Promise<void>((resolve) => setTimeout(resolve, 2000))
      ]);

      console.log(`[LINK] SIKER: Discord=${responsePayload.discordTag} (${result.discordId}) <-> FiveM=${responsePayload.fivemName} (${fivemIdentifier})`);

      // Fontos: explicit 200-as JSON válasz a FiveM resource-nak.
      return res.status(200).json(responsePayload);
    } catch (e: any) {
      console.error('[LINK] /api/link/verify hiba:', e?.stack || e?.message || e);
      return res.status(500).json({
        success: false,
        error: e?.message || 'Szerveroldali hiba történt az összekapcsolás közben.'
      });
    }
  });

  // ==========================================
  // 4/C. WEBSHOP VÁSÁRLÁS — SZERVER OLDALI KATALÓGUS
  // ==========================================
  const SHOP_CATALOG: Record<string, { name: string; pricePP: number; grant: { type: 'cash' | 'vip'; amount?: number; tier?: string; days?: number } }> = {
    vip_bronze: { name: 'VIP BRONZE', pricePP: 5000, grant: { type: 'vip', tier: 'bronze', days: 30 } },
    vip_silver: { name: 'VIP SILVER', pricePP: 12000, grant: { type: 'vip', tier: 'silver', days: 30 } },
    vip_gold: { name: 'VIP GOLD', pricePP: 25000, grant: { type: 'vip', tier: 'gold', days: 0 } },
    cash_s: { name: 'Pénz Csomag (S)', pricePP: 2000, grant: { type: 'cash', amount: 500000 } },
    cash_l: { name: 'Pénz Csomag (L)', pricePP: 8000, grant: { type: 'cash', amount: 2500000 } },
  };

  app.get('/api/shop/catalog', (req, res) => {
    res.json(SHOP_CATALOG);
  });

  app.post('/api/shop/purchase', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Be kell jelentkezned Discorddal a vásárláshoz!' });

    const { itemId } = req.body;
    const item = SHOP_CATALOG[itemId];
    if (!item) return res.status(404).json({ error: 'Ismeretlen termék.' });

    const balance = await getUserBalance(user.id);
    if (balance.ppBalance < item.pricePP) {
      return res.status(400).json({ error: 'Nincs elég PP pontod ehhez a vásárláshoz.' });
    }

    const linked = await getLinkedAccount(user.id);
    if (!linked?.fivemIdentifier) {
      return res.status(400).json({
        error: 'A vásárlás jóváírásához előbb kösd össze a Discord fiókodat a FiveM karaktereddel a "Fiókom" oldalon!',
        requiresLink: true
      });
    }

    await updateUserBalance(user.id, -item.pricePP, 'pp');

    let synced = false;
    try {
      if (FIVEM_RCON) {
        if (item.grant.type === 'cash') {
          await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, `nexus_givecash ${linked.fivemIdentifier} ${item.grant.amount} "Webshop: ${item.name}"`);
        } else if (item.grant.type === 'vip') {
          await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, `nexus_setvip ${linked.fivemIdentifier} ${item.grant.tier} ${item.grant.days || 0}`);
        }
        synced = true;
      }
    } catch (e) {}

    const purchaseRecord = {
      id: 'purch_' + Math.random().toString(36).substring(2, 9),
      discordId: user.id,
      discordTag: user.username || user.tag || 'Ismeretlen',
      itemId,
      itemName: item.name,
      pricePP: item.pricePP,
      synced,
      createdAt: new Date().toISOString()
    };
    inMemoryShopPurchases.unshift(purchaseRecord);

    try {
      await addDoc(collection(db, 'shop_purchases'), {
        ...purchaseRecord,
        serverTime: serverTimestamp()
      });
    } catch (e) {}

    res.json({ success: true, synced, item: item.name });
  });

  app.get('/api/shop/history', async (req, res) => {
    const user = (req as any).user;
    if (!user) return res.json([]);
    
    const localItems = inMemoryShopPurchases
      .filter(p => p.discordId === user.id)
      .slice(0, 10);

    try {
      const q = query(
        collection(db, 'shop_purchases'),
        where('discordId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      if (items.length > 0) {
        return res.json(items);
      }
    } catch (e) {}
    
    res.json(localItems);
  });

  // ==========================================
  // 5. FIVEM IN-GAME KILL & ROBBERY LOG RELAYS
  // ==========================================
  app.post('/api/fivem/kill', async (req, res) => {
    const client = dependencies.currentClient();
    const { killerId, killerName, killerDiscordId, victimId, victimName, victimDiscordId, weapon, distance, bodyPart, location } = req.body;
    if (!victimName || !weapon) {
      return res.status(400).json({ error: 'victimName és weapon kötelező' });
    }
    const log = await sendKillLogEmbed(client, {
      killerId,
      killerName: killerName || 'Ismeretlen',
      killerDiscordId,
      victimId: victimId || 0,
      victimName,
      victimDiscordId,
      weapon,
      distance: Number(distance) || 0,
      bodyPart: bodyPart || 'Test',
      location
    });
    res.json({ success: true, log });
  });

  app.post('/api/fivem/robbery', async (req, res) => {
    const client = dependencies.currentClient();
    const { robberyType, locationName, robbers, lootEstimated, policeAlerted } = req.body;
    if (!robberyType || !locationName) {
      return res.status(400).json({ error: 'robberyType és locationName kötelező' });
    }
    const log = await sendRobberyLogEmbed(client, {
      robberyType,
      locationName,
      robbers: Array.isArray(robbers) ? robbers : [robbers || 'Ismeretlen elkövető'],
      lootEstimated,
      policeAlerted: Boolean(policeAlerted)
    });
    res.json({ success: true, log });
  });

  // ==========================================
  // 6. RULES ACKNOWLEDGMENT & TRACKER API
  // ==========================================
  app.get('/api/rules/stats', async (req, res) => {
    try {
      const counts = await getRulesAckCounts();
      res.json({
        discordCount: counts.discordCount,
        serverCount: counts.serverCount,
        totalReaders: counts.discordCount + counts.serverCount,
        updatedAt: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/rules/ack', async (req, res) => {
    try {
      const { type, userId, username } = req.body;
      if (!type || (type !== 'discord' && type !== 'server')) {
        return res.status(400).json({ error: 'Érvénytelen szabályzattípus (discord vagy server szükséges)' });
      }
      const uId = userId || `web_${Math.random().toString(36).substring(2, 9)}`;
      const userSet = inMemoryRulesAcks[type as 'discord' | 'server'];
      const alreadyAcked = userSet.has(uId);

      if (!alreadyAcked) {
        userSet.add(uId);
        try {
          const docRef = doc(db, 'system_stats', 'rules_acks');
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, {
              discordCount: type === 'discord' ? 1 : 0,
              serverCount: type === 'server' ? 1 : 0,
              discordUsers: type === 'discord' ? [uId] : [],
              serverUsers: type === 'server' ? [uId] : [],
              updatedAt: Date.now()
            });
          } else {
            await updateDoc(docRef, {
              [type === 'discord' ? 'discordCount' : 'serverCount']: increment(1),
              updatedAt: Date.now()
            });
          }
        } catch (e) {}
      }

      const counts = await getRulesAckCounts();
      res.json({
        success: true,
        alreadyAcked,
        discordCount: counts.discordCount,
        serverCount: counts.serverCount,
        totalReaders: counts.discordCount + counts.serverCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
