import { Client, TextChannel, EmbedBuilder, Guild, MessageCreateOptions } from 'discord.js';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Specific Log channel mapping
export const LOG_CHANNELS: Record<string, string[]> = {
    'kill': ['💀┃kill-log', 'kill-log', 'halal-log', 'halálesetek'],
    'robbery': ['🚨┃rablás-log', 'rablas-log', 'buncselekmeny-log', 'rablások'],
    'duty': ['📋┃duty-log', 'duty-log', 'admin-duty', 'vezeto-log'],
    'admin': ['🔨┃admin-log', 'admin-log', 'staff-log', 'vezetőség'],
    'chat': ['💬┃chat-mirror', 'chat-mirror', 'in-game-chat'],
    'money': ['💰┃pénz-log', 'penz-log', 'tranzakciok', 'money-log'],
    'anticheat': ['🚨┃anticheat', 'anticheat-log', 'vedelem'],
    'connection': ['🔌┃csatlakozás-log', 'csatlakozas-log', 'join-leave'],
    'ticket': ['📦┃archivált-log', 'archivalt-log', 'ticket-archive', 'ticket-log', 'admin-log'],
    'transcript': ['📦┃archivált-log', 'archivalt-log', 'ticket-archive', 'ticket-log', 'admin-log'],
    'whitelist': ['🛡️┃whitelist-log', 'whitelist-log', 'tagfelvetel-log', 'admin-log']
};

// In-memory configured Log Guild ID
let dynamicLogGuildId: string | null = null;

export async function setDedicatedLogGuild(guildId: string, guildName?: string) {
    dynamicLogGuildId = guildId;
    try {
        const ref = doc(db, 'system_stats', 'staff_config');
        await setDoc(ref, {
            logGuildId: guildId,
            logGuildName: guildName || '',
            updatedAt: Date.now()
        }, { merge: true });
        console.log(`[StaffLog] Dedicated Log Guild configured & saved: ${guildId} (${guildName || 'Unknown'})`);
    } catch (err) {
        // Fallback to local memory config
    }
}

export async function initLogGuildSettings() {
    try {
        const ref = doc(db, 'system_stats', 'staff_config');
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            if (data.logGuildId) {
                dynamicLogGuildId = data.logGuildId;
                console.log(`[StaffLog] Loaded dedicated Log Guild from DB: ${dynamicLogGuildId}`);
            }
        }
    } catch (e) {
        console.log('[StaffLog] Using local environment log guild config');
    }
}

export function getDedicatedLogGuildId(): string | null {
    return dynamicLogGuildId || process.env.DISCORD_LOG_GUILD_ID || process.env.LOG_SERVER_ID || process.env.STAFF_GUILD_ID || null;
}

/**
 * Returns the guild(s) designated for server logs.
 * If LOG_GUILD_ID / DISCORD_LOG_SERVER_ID environment variable or /setup type:staff was set, returns that guild.
 * Otherwise, if the bot is in multiple guilds, it prioritizes guilds with 'log' or 'staff' in their name,
 * or routes to staff channels.
 */
export function getTargetLogGuilds(client: Client): Guild[] {
    const designatedLogGuildId = getDedicatedLogGuildId();
    
    if (designatedLogGuildId) {
        const guild = client.guilds.cache.get(designatedLogGuildId);
        if (guild) return [guild];
    }

    // Check if there is a distinct dedicated log guild
    const logGuilds = client.guilds.cache.filter(g => 
        g.name.toLowerCase().includes('log') || 
        g.name.toLowerCase().includes('staff') || 
        g.name.toLowerCase().includes('admin')
    );

    if (logGuilds.size > 0) {
        return Array.from(logGuilds.values());
    }

    // Fallback: send to all connected guilds having the proper log channel
    return Array.from(client.guilds.cache.values());
}

/**
 * Finds a matching log text channel within a guild by type or keywords
 */
export function findLogChannel(guild: Guild, type: string): TextChannel | null {
    const preferredNames = LOG_CHANNELS[type] || ['📊┃szerver-logok', 'szerver-logok', 'admin-log'];

    // 1. Try exact or included preferred names
    for (const name of preferredNames) {
        const chan = guild.channels.cache.find(c => 
            c.isTextBased() && (c.name.toLowerCase() === name.toLowerCase() || c.name.toLowerCase().includes(name.toLowerCase()))
        ) as TextChannel | undefined;
        if (chan) return chan;
    }

    // 2. Fallback to any admin-log or general log channel
    const fallback = guild.channels.cache.find(c => 
        c.isTextBased() && (c.name.includes('log') || c.name.includes('naplo') || c.name.includes('admin'))
    ) as TextChannel | undefined;

    return fallback || null;
}

/**
 * Dispatches an embed or message exclusively to the dedicated Staff / Server Log Discord channels
 */
export async function sendDedicatedStaffLog(client: Client, type: string, payload: MessageCreateOptions) {
    try {
        const targetGuilds = getTargetLogGuilds(client);

        for (const guild of targetGuilds) {
            const channel = findLogChannel(guild, type);
            if (channel) {
                await channel.send(payload);
            }
        }
    } catch (err: any) {
        console.error(`[StaffLog] Error sending ${type} log to staff server:`, err.message);
    }
}

/**
 * Relays generic logs from FiveM to the Staff/Log Discord server
 */
export async function relayFivemLog(client: Client, type: string, message: string, details?: any) {
    try {
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${type.toUpperCase()} NAPLÓ`)
            .setDescription(message)
            .setColor(type === 'anticheat' ? '#ef4444' : type === 'money' ? '#eab308' : '#64748b')
            .setTimestamp();

        if (details) {
            if (typeof details === 'object') {
                Object.entries(details).forEach(([key, value]) => {
                    embed.addFields({ name: key, value: String(value), inline: true });
                });
            } else {
                embed.addFields({ name: 'Részletek', value: String(details) });
            }
        }

        await sendDedicatedStaffLog(client, type, { embeds: [embed] });
    } catch (err: any) {
        console.error(`[LogRelay] Failed to relay ${type} log:`, err.message);
    }
}

