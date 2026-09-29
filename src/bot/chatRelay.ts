import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { fivemRcon } from './rcon';

const FIVEM_IP = process.env.FIVEM_SERVER_IP || '84.1.49.111';
const FIVEM_RCON_PORT = parseInt(process.env.FIVEM_RCON_PORT || '30120');
const FIVEM_RCON = (process.env.FIVEM_RCON_PASSWORD || '').trim();

const COMMUNITY_RELAY_CHANNEL = '💬┃szerver-chat';
const STAFF_RELAY_CHANNEL = '💬┃chat-mirror';

/**
 * Sends a message from Discord to FiveM chat
 */
export async function relayDiscordToFivem(message: any) {
    if (message.author.bot) return;
    
    // Relay from either community szerver-chat or staff chat-mirror
    if (message.channel.name !== COMMUNITY_RELAY_CHANNEL && message.channel.name !== STAFF_RELAY_CHANNEL) return;

    if (!FIVEM_RCON) {
        console.error('[ChatRelay] RCON password not set, cannot relay Discord -> FiveM');
        return;
    }

    try {
        const author = message.member?.displayName || message.author.username;
        const isAdmin = message.channel.name === STAFF_RELAY_CHANNEL;
        const prefix = isAdmin ? '[D-Admin]' : '[Discord]';
        const content = message.content.replace(/"/g, "'");
        
        // Using say command or custom broadcast
        const command = `say ^5${prefix} ${author}: ^0${content}`;
        
        await fivemRcon(FIVEM_IP, FIVEM_RCON_PORT, FIVEM_RCON, command);
    } catch (err: any) {
        console.error('[ChatRelay] Failed to relay to FiveM:', err.message);
    }
}

/**
 * Sends a message from FiveM to Discord Chat Mirror (on all matching channels)
 */
export async function relayFivemToDiscord(client: Client, author: string, content: string) {
    try {
        client.guilds.cache.forEach(async (guild) => {
            const channel = guild.channels.cache.find(c => 
                c.name === COMMUNITY_RELAY_CHANNEL || 
                c.name === STAFF_RELAY_CHANNEL
            ) as TextChannel;

            if (!channel) return;

            const isStaffServer = channel.name === STAFF_RELAY_CHANNEL;

            const embed = new EmbedBuilder()
                .setAuthor({ name: author, iconURL: 'https://i.imgur.com/vHqY7Zp.png' })
                .setDescription(content)
                .setColor(isStaffServer ? '#ff8800' : '#5865F2')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        });
    } catch (err: any) {
        console.error('[ChatRelay] Failed to relay to Discord:', err.message);
    }
}
