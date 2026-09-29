import { Client, TextChannel, EmbedBuilder, ActivityType } from 'discord.js';

interface FivemPlayer {
  endpoint?: string;
  id: number;
  identifiers?: string[];
  name: string;
  ping?: number;
}

interface FivemDynamic {
  hostname?: string;
  clients?: number;
  sv_maxclients?: number;
}

const FIVEM_IP = (process.env.FIVEM_SERVER_IP && process.env.FIVEM_SERVER_IP !== '127.0.0.1' && process.env.FIVEM_SERVER_IP !== '84.1.54.175') ? process.env.FIVEM_SERVER_IP : '84.1.49.111';
let detectedWorkingPort = process.env.FIVEM_SERVER_PORT || '30120';
const FIVEM_CFX_CODE = process.env.FIVEM_CFX_CODE || process.env.CFX_CODE || '';

let statusMessageId: string | null = null;
let lastPlayerCount = -1;
let currentFivemStatus: any = null;
let lastOnlineState: boolean | null = null;

export function getFivemStatus() {
  if (!currentFivemStatus) {
    fetchFivemStatus().catch(() => {});
  }
  return currentFivemStatus || { 
    online: false, 
    clients: 0, 
    max_clients: 48, 
    hostname: 'Nexus Horizon RP', 
    players: [],
    ip: FIVEM_IP,
    port: detectedWorkingPort
  };
}

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 CitizenFX/1',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7'
};

export async function fetchFivemStatus() {
  try {
    // 1. Try Direct FiveM JSON Endpoints on configured port, then fallback port
    const primaryPort = process.env.FIVEM_SERVER_PORT || '30120';
    const fallbackPort = primaryPort === '30120' ? '40120' : '30120';
    const candidatePorts = [primaryPort, fallbackPort];

    for (const port of candidatePorts) {
      const infoUrl = `http://${FIVEM_IP}:${port}/info.json`;
      const dynamicUrl = `http://${FIVEM_IP}:${port}/dynamic.json`;
      const playersUrl = `http://${FIVEM_IP}:${port}/players.json`;

      let info: any = null;
      let dynamic: any = null;
      let players: FivemPlayer[] = [];

      try {
        const infoRes = await fetch(infoUrl, { signal: AbortSignal.timeout(3000), headers: REQUEST_HEADERS });
        if (infoRes.ok) {
          info = await infoRes.json();
        }
      } catch (e) {}

      try {
        const dynRes = await fetch(dynamicUrl, { signal: AbortSignal.timeout(2500), headers: REQUEST_HEADERS });
        if (dynRes.ok) {
          dynamic = await dynRes.json();
        }
      } catch (e) {}

      try {
        const playersRes = await fetch(playersUrl, { signal: AbortSignal.timeout(2500), headers: REQUEST_HEADERS });
        if (playersRes.ok) {
          players = await playersRes.json();
        }
      } catch (e) {}

      if (info || dynamic || players.length > 0) {
        detectedWorkingPort = port;
        const rawHostname = dynamic?.hostname || info?.vars?.sv_projectName || info?.vars?.hostname || 'NexusState RP';
        const cleanHostname = rawHostname.replace(/\^[0-9~]/g, '').trim();
        const maxClients = parseInt(dynamic?.sv_maxclients || info?.vars?.sv_maxClients || '48', 10);
        const clientCount = typeof dynamic?.clients === 'number' ? dynamic.clients : players.length;

        const status = {
          online: true,
          clients: clientCount,
          max_clients: isNaN(maxClients) ? 48 : maxClients,
          hostname: cleanHostname,
          players: Array.isArray(players) ? players : [],
          ip: FIVEM_IP,
          port: detectedWorkingPort,
          lastUpdated: new Date().toISOString()
        };

        if (lastOnlineState !== true) {
          console.log(`[FiveM] Szerver elérhető (Online): ${cleanHostname} (${status.clients}/${status.max_clients}) @ ${FIVEM_IP}:${detectedWorkingPort}`);
          lastOnlineState = true;
        }

        currentFivemStatus = status;
        return status;
      }
    }

    // 2. If Direct Endpoints failed and CFX code is provided, try CFX Frontend API
    if (FIVEM_CFX_CODE) {
      try {
        const cfxRes = await fetch(`https://servers-frontend.fivem.net/api/servers/single/${FIVEM_CFX_CODE}`, {
          signal: AbortSignal.timeout(6000),
          headers: REQUEST_HEADERS
        });
        if (cfxRes.ok) {
          const cfxData = await cfxRes.json();
          const serverData = cfxData.Data || {};
          const cleanHostname = (serverData.hostname || 'Nexus Horizon RP').replace(/\^[0-9~]/g, '').trim();
          
          const status = {
            online: true,
            clients: serverData.clients || 0,
            max_clients: serverData.sv_maxclients || 64,
            hostname: cleanHostname,
            players: serverData.players || [],
            ip: FIVEM_IP,
            port: detectedWorkingPort,
            cfx: FIVEM_CFX_CODE,
            lastUpdated: new Date().toISOString()
          };

          if (lastOnlineState !== true) {
            console.log(`[FiveM] Szerver elérhető CFX API-n keresztül: ${cleanHostname}`);
            lastOnlineState = true;
          }

          currentFivemStatus = status;
          return status;
        }
      } catch (cfxErr) {}
    }

    // 3. If offline
    if (lastOnlineState !== false) {
      console.log(`[FiveM] Szerver jelenleg offline vagy karbantartás alatt áll (${FIVEM_IP}:${detectedWorkingPort}).`);
      lastOnlineState = false;
    }

    const offlineStatus = { 
      online: false, 
      clients: 0, 
      max_clients: 64, 
      hostname: 'Nexus Horizon RP (Offline / Karbantartás)', 
      players: [],
      ip: FIVEM_IP,
      port: detectedWorkingPort,
      lastUpdated: new Date().toISOString()
    };
    currentFivemStatus = offlineStatus;
    return offlineStatus;

  } catch (error: any) {
    if (lastOnlineState !== false) {
      console.log(`[FiveM] Szerver státusz lekérdezési értesítés: ${error.message || 'Offline'}`);
      lastOnlineState = false;
    }
    const offlineStatus = {
      online: false,
      clients: 0,
      max_clients: 64,
      hostname: 'Nexus Horizon RP',
      players: [],
      ip: FIVEM_IP,
      port: detectedWorkingPort,
      lastUpdated: new Date().toISOString()
    };
    currentFivemStatus = offlineStatus;
    return offlineStatus;
  }
}

export async function initFivemMonitor(client: Client) {
  // Update once immediately with short delay to allow Discord connection to settle
  setTimeout(() => {
    updateStatus(client).catch(err => console.warn('[FiveM] Initial status update notice:', err.message));
  }, 3000);

  // Then update every 30 seconds
  setInterval(() => {
    updateStatus(client).catch(err => console.warn('[FiveM] Periodic status update notice:', err.message));
  }, 30000);
}

async function updateStatus(client: Client) {
  if (!client.isReady()) return;

  const status = await fetchFivemStatus();

  // Update bot presence
  try {
    if (status && status.online) {
      if (lastPlayerCount !== status.clients) {
        client.user?.setActivity(`${status.clients}/${status.max_clients} játékos | Nexus RP`, { type: ActivityType.Playing });
        lastPlayerCount = status.clients;
      }
    } else {
      if (lastPlayerCount !== -2) {
        client.user?.setActivity(`Karbantartás / Offline`, { type: ActivityType.Watching });
        lastPlayerCount = -2;
      }
    }
  } catch (e) {}

  // Update status channel for all guilds
  for (const guild of client.guilds.cache.values()) {
    try {
      let channel: TextChannel | undefined;
      
      // Search in cache
      channel = guild.channels.cache.find(c => 
        c.isTextBased() && (
          c.name.includes('szerver-státusz') || 
          c.name.includes('szerver-statusz') || 
          c.name.includes('szerver-status') ||
          (c.name.includes('szerver') && (c.name.includes('tusz') || c.name.includes('status')))
        )
      ) as TextChannel;
      
      if (!channel) {
        const fetchedChannels = await guild.channels.fetch();
        channel = fetchedChannels.find(c => 
          c && c.isTextBased() && (
            c.name.includes('szerver-státusz') || 
            c.name.includes('szerver-statusz') || 
            c.name.includes('szerver-status') ||
            (c.name.includes('szerver') && (c.name.includes('tusz') || c.name.includes('status')))
          )
        ) as TextChannel;
      }
      
      if (!channel) {
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(status?.online ? '🟢 NEXUS STATE RP • SZERVER STÁTUSZ' : '🔴 NEXUS STATE RP • KARBANTARTÁS / OFFLINE')
        .setColor(status?.online ? '#10b981' : '#ef4444')
        .setFooter({ text: 'Nexus RP • Élő Szerver Monitoring' })
        .setTimestamp();

      if (status?.online) {
        embed.setDescription('A szerver jelenleg **Elérhető** és minden játékszolgáltatás zavartalanul működik!')
             .addFields(
               { name: '👥 Aktív játékosok', value: `**${status.clients} / ${status.max_clients}** fő`, inline: true },
               { name: '🔌 F8 Csatlakozás', value: `\`connect ${FIVEM_IP}:${status.port || detectedWorkingPort}\``, inline: true }
             );
        
        if (status.players && status.players.length > 0) {
          const pList = status.players.slice(0, 15).map(p => `• **[ID: ${p.id}]** ${p.name}`).join('\n');
          const extra = status.players.length > 15 ? `\n*...és még ${status.players.length - 15} játékos a szerveren.*` : '';
          embed.addFields({ name: '🧑‍🤝‍🧑 Játékoslista', value: pList + extra, inline: false });
        } else {
          embed.addFields({ name: '🧑‍🤝‍🧑 Játékoslista', value: '*Nincs jelenleg játékos a szerveren.*', inline: false });
        }
      } else {
        embed.setDescription('A szerver jelenleg **Offline** vagy **Karbantartás** alatt áll.\nKérjük, légy türelemmel, a vezetőség és a fejlesztők dolgoznak a szerveren!')
             .addFields(
               { name: '🔌 F8 Csatlakozás', value: `\`connect ${FIVEM_IP}:${detectedWorkingPort}\``, inline: true },
               { name: '⏳ Állapot', value: '🔴 **Karbantartás / Fejlesztés**', inline: true }
             );
      }

      const messages = await channel.messages.fetch({ limit: 10 });
      const existingMsg = messages.find(m => m.author.id === client.user?.id);

      if (existingMsg) {
        await existingMsg.edit({ embeds: [embed] });
        statusMessageId = existingMsg.id;
      } else {
        const sent = await channel.send({ embeds: [embed] });
        statusMessageId = sent.id;
      }
    } catch (guildErr: any) {
      // Avoid uncaught error spam
    }
  }
}

