import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, GuildMember } from 'discord.js';
import { BotStatus } from '../types';
import { initFivemMonitor } from './fivem';
import { handleBoosterUpdate, updateLiveServerStatsChannels } from './extraFeatures';
import { sendWeeklyDutySummary } from './dutyTracker';
import { initLogGuildSettings } from './logsRelay';
import { initRulesAckManager } from './rulesManager';

export let botStatus: BotStatus = {
  state: 'Offline',
  user: null,
  error: null,
  ping: -1,
  guilds: []
};

export function getBotStatus() {
  return botStatus;
}

export let currentClient: Client | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let statsInterval: NodeJS.Timeout | null = null;
let lastWeeklySummaryCheckDay = -1;

export function setBotStatus(update: Partial<BotStatus>) {
  botStatus = { ...botStatus, ...update };
}

export function startBot(token: string, onReady: (client: Client) => void, onInteraction: (interaction: any) => void, onMessage?: (message: any) => void) {
  if (currentClient) {
    currentClient.destroy();
    if (pingInterval) clearInterval(pingInterval);
    if (statsInterval) clearInterval(statsInterval);
  }

  botStatus = {
    state: 'Connecting...',
    user: null,
    error: null,
    ping: -1,
    guilds: []
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent
    ],
  });
  
  currentClient = client;

  client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user?.tag}`);
    botStatus.state = 'Online';
    botStatus.user = client.user?.tag || 'Unknown';
    botStatus.error = null;
    botStatus.ping = client.ws.ping;
    
    // Refresh guilds list
    try {
        const fetchedGuilds = await client.guilds.fetch();
        botStatus.guilds = fetchedGuilds.map(g => g.name);
        console.log(`[Bot] Managed guilds: ${botStatus.guilds.join(', ')}`);
    } catch (err) {
        console.error('[Bot] Failed to fetch guilds list:', err);
        botStatus.guilds = client.guilds.cache.map(g => g.name);
    }
    
    // Fetch all members to populate cache for dashboard lookups
    try {
        client.guilds.cache.forEach(async (guild) => {
            await guild.members.fetch();
            console.log(`[Bot] Fetched ${guild.members.cache.size} members for ${guild.name}.`);
        });
    } catch (e) {
        console.error('[Bot] Failed to fetch members:', e);
    }
    
    initFivemMonitor(client);
    initLogGuildSettings().catch(() => {});
    initRulesAckManager().catch(() => {});

    // Start live server channel statistics updater
    statsInterval = setInterval(() => {
      if (client.isReady()) {
        updateLiveServerStatsChannels(client).catch(() => {});

        // Check for Sunday 20:00 weekly summary
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() === 20 && lastWeeklySummaryCheckDay !== now.getDate()) {
          lastWeeklySummaryCheckDay = now.getDate();
          sendWeeklyDutySummary(client).catch(() => {});
        }
      }
    }, 45000);
    
    onReady(client);
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      await onInteraction(interaction);
    } catch (error) {
      console.error('[Bot] Unhandled error during interaction handling:', error);
    }
  });

  // Server booster reward listener
  client.on('guildMemberUpdate', (oldMember, newMember) => {
    handleBoosterUpdate(oldMember as GuildMember, newMember as GuildMember).catch(err => {
      console.warn('[Booster] Error handling booster update:', err);
    });
  });

  client.on('voiceStateUpdate', async (oldState, newState) => {
      const channel = newState.channel;
      
      // Creating temporary room when joining generator channel
      const isGeneratorChannel = channel && (
         channel.name.includes('➕') && (
           channel.name.toLowerCase().includes('privát') || 
           channel.name.toLowerCase().includes('szoba') ||
           channel.name.toLowerCase().includes('frakció') ||
           channel.name.toLowerCase().includes('hangcsatorna')
         )
      );
      
      if (isGeneratorChannel && newState.member) {
          const guild = channel.guild;
          const memberName = newState.member.displayName || newState.member.user?.username || 'Vendég';
          const isFaction = channel.name.toLowerCase().includes('frakció');
          const newName = isFaction ? `🔊┃[Frakció] ${memberName}` : `🔊┃Privát - ${memberName}`;
          
          try {
              const newChannel = await guild.channels.create({
                  name: newName,
                  type: ChannelType.GuildVoice,
                  parent: channel.parent,
                  permissionOverwrites: [
                      {
                          id: guild.roles.everyone.id,
                          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                      },
                      {
                          id: newState.member!.id,
                          allow: [
                              PermissionFlagsBits.ManageChannels,
                              PermissionFlagsBits.MoveMembers,
                              PermissionFlagsBits.DeafenMembers,
                              PermissionFlagsBits.MuteMembers,
                              PermissionFlagsBits.Connect,
                              PermissionFlagsBits.Speak
                          ]
                      }
                  ]
              });
              
              // Only move if the member is still in voice
              if (newState.member?.voice?.channelId) {
                  await newState.setChannel(newChannel).catch(e => console.error('[Bot] Pushing to voice failed', e));
              }
          } catch (e) {
              console.error('[Bot] Error creating private room:', e);
          }
      }

      // Deleting empty temporary rooms
      if (
        oldState.channel && 
        oldState.channel.name.startsWith('🔊┃') && 
        (oldState.channel.name.includes('Privát') || oldState.channel.name.includes('privát') || oldState.channel.name.includes('Frakció')) && 
        oldState.channel.members.size === 0
      ) {
          try {
              await oldState.channel.delete();
          } catch (e) {
              console.error('[Bot] Error deleting temporary room:', e);
          }
      }
  });

  // Adding messageCreate listener for automod
  client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (onMessage) onMessage(message);
  });

  // Mobile and network drop resilience handlers
  client.on('error', (err) => {
    console.error('[Bot Socket Error]:', err);
    botStatus.error = err.message;
  });

  client.on('shardError', (err, shardId) => {
    console.error(`[Bot Shard ${shardId} Error]:`, err);
    botStatus.error = err.message;
  });

  client.on('shardDisconnect', (event, shardId) => {
    console.warn(`[Bot Shard ${shardId} Disconnected]:`, event);
    botStatus.state = 'Reconnecting...';
  });

  client.on('shardReconnecting', (shardId) => {
    console.log(`[Bot Shard ${shardId} Reconnecting...]`);
    botStatus.state = 'Reconnecting...';
  });

  client.on('shardResume', (shardId) => {
    console.log(`[Bot Shard ${shardId} Resumed connection successfully]`);
    botStatus.state = 'Online';
    botStatus.error = null;
  });

  pingInterval = setInterval(() => {
    if (client.isReady()) {
      botStatus.ping = client.ws.ping;
      botStatus.state = 'Online';
    }
  }, 10000);

  const attemptLogin = (retries = 5, delay = 5000) => {
    client.login(token).catch(err => {
      console.error(`[Bot] Login failed (remaining retries: ${retries}):`, err.message);
      botStatus.state = 'Error';
      botStatus.error = err.message;
      if (retries > 0) {
        setTimeout(() => attemptLogin(retries - 1, delay * 1.5), delay);
      }
    });
  };

  attemptLogin();

  return client;
}

