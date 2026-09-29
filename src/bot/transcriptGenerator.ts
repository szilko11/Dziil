import { 
  TextChannel, 
  AttachmentBuilder, 
  Collection, 
  Message, 
  EmbedBuilder 
} from 'discord.js';

let discordTranscripts: any = null;
try {
  discordTranscripts = require('discord-html-transcripts');
} catch (e) {
  console.log('[Transcript] discord-html-transcripts module loaded via fallback');
}

/**
 * Escapes HTML entities to prevent XSS / render glitches
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a clean, modern, dark-themed HTML transcript for any Discord ticket channel.
 */
export async function generateTicketTranscript(
  channel: TextChannel,
  closerUser?: { id: string; tag: string; avatarURL?: () => string | null }
): Promise<AttachmentBuilder> {
  // 1. Try discord-html-transcripts first
  if (discordTranscripts && typeof discordTranscripts.createTranscript === 'function') {
    try {
      const transcript = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnType: 'attachment',
        filename: `transcript-${channel.name}.html`,
        saveImages: true,
        footerText: 'Nexus Horizon RP • Automata Ticket Archiváló Rendszer',
        poweredBy: false
      });
      if (transcript) {
        return transcript;
      }
    } catch (err) {
      console.warn('[Transcript] discord-html-transcripts failed, using custom standalone HTML generator:', err);
    }
  }

  // 2. Standalone custom styled HTML transcript generator
  try {
    const messages: Collection<string, Message> = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = Array.from(messages.values()).reverse();

    const guildName = channel.guild?.name || 'Nexus Horizon RP';
    const channelName = channel.name;
    const createdAt = new Date().toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });

    let messagesHtml = '';
    for (const msg of sortedMessages) {
      const author = msg.author;
      const avatarUrl = author.displayAvatarURL({ size: 64 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
      const timeStr = msg.createdAt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
      const dateStr = msg.createdAt.toLocaleDateString('hu-HU');
      const isBot = author.bot ? '<span class="bot-badge">BOT</span>' : '';
      const content = escapeHtml(msg.cleanContent || msg.content || '');

      let embedsHtml = '';
      if (msg.embeds && msg.embeds.length > 0) {
        for (const emb of msg.embeds) {
          const embTitle = emb.title ? `<div class="embed-title">${escapeHtml(emb.title)}</div>` : '';
          const embDesc = emb.description ? `<div class="embed-desc">${escapeHtml(emb.description).replace(/\n/g, '<br>')}</div>` : '';
          let fieldsHtml = '';
          if (emb.fields && emb.fields.length > 0) {
            fieldsHtml = '<div class="embed-fields">' + emb.fields.map(f => `
              <div class="embed-field">
                <div class="field-name">${escapeHtml(f.name)}</div>
                <div class="field-val">${escapeHtml(f.value).replace(/\n/g, '<br>')}</div>
              </div>
            `).join('') + '</div>';
          }
          const embColor = emb.hexColor || '#00E5FF';
          embedsHtml += `
            <div class="embed-box" style="border-left-color: ${embColor};">
              ${embTitle}
              ${embDesc}
              ${fieldsHtml}
            </div>
          `;
        }
      }

      let attachmentsHtml = '';
      if (msg.attachments && msg.attachments.size > 0) {
        attachmentsHtml = '<div class="attachments-box">' + Array.from(msg.attachments.values()).map(att => {
          const isImg = att.contentType?.startsWith('image/') || att.url.match(/\.(png|jpe?g|gif|webp)$/i);
          if (isImg) {
            return `<a href="${att.url}" target="_blank" rel="noreferrer"><img src="${att.url}" class="att-img" alt="Csatolmány" /></a>`;
          }
          return `<a href="${att.url}" target="_blank" class="att-link">📎 ${escapeHtml(att.name)} (${Math.round(att.size / 1024)} KB)</a>`;
        }).join('') + '</div>';
      }

      messagesHtml += `
        <div class="msg-row">
          <img src="${avatarUrl}" alt="${escapeHtml(author.username)}" class="avatar" />
          <div class="msg-content-wrapper">
            <div class="msg-header">
              <span class="author-name">${escapeHtml(author.username)}</span>
              ${isBot}
              <span class="timestamp">${dateStr} ${timeStr}</span>
            </div>
            ${content ? `<div class="msg-body">${content.replace(/\n/g, '<br>')}</div>` : ''}
            ${embedsHtml}
            ${attachmentsHtml}
          </div>
        </div>
      `;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket Átirat • ${escapeHtml(channelName)} • ${escapeHtml(guildName)}</title>
  <style>
    :root {
      --bg-main: #0f172a;
      --bg-card: #1e293b;
      --bg-hover: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #00E5FF;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .ticket-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      padding: 24px 32px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-title h1 {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-title p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .header-meta {
      text-align: right;
      font-size: 12px;
      color: var(--text-muted);
    }
    .header-badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(0, 229, 255, 0.1);
      color: var(--accent);
      border: 1px solid rgba(0, 229, 255, 0.3);
      border-radius: 6px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .messages-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .msg-row {
      display: flex;
      gap: 16px;
      padding: 10px 14px;
      border-radius: 8px;
      transition: background 0.15s ease;
    }
    .msg-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .msg-content-wrapper {
      flex: 1;
      min-width: 0;
    }
    .msg-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .author-name {
      font-weight: 600;
      font-size: 15px;
      color: #fff;
    }
    .bot-badge {
      background: #5865F2;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .timestamp {
      font-size: 12px;
      color: var(--text-muted);
    }
    .msg-body {
      font-size: 14px;
      color: #e2e8f0;
      word-break: break-word;
    }
    .embed-box {
      margin-top: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-left-width: 4px;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .embed-title {
      font-weight: 700;
      font-size: 14px;
      color: #fff;
      margin-bottom: 6px;
    }
    .embed-desc {
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .embed-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    .embed-field {
      background: rgba(255, 255, 255, 0.03);
      padding: 6px 10px;
      border-radius: 4px;
    }
    .field-name {
      font-weight: 600;
      font-size: 12px;
      color: var(--text-muted);
    }
    .field-val {
      font-size: 13px;
      color: #f1f5f9;
      margin-top: 2px;
    }
    .attachments-box {
      margin-top: 8px;
    }
    .att-img {
      max-width: 320px;
      max-height: 240px;
      border-radius: 8px;
      border: 1px solid var(--border);
      display: block;
      margin-top: 6px;
    }
    .att-link {
      display: inline-block;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--accent);
      text-decoration: none;
      font-size: 13px;
      margin-top: 4px;
    }
    .att-link:hover {
      text-decoration: underline;
    }
    .ticket-footer {
      background: #090d16;
      padding: 16px 32px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="ticket-header">
      <div class="header-title">
        <h1>🎫 ${escapeHtml(channelName)}</h1>
        <p>Szerver: <strong>${escapeHtml(guildName)}</strong> • Összes üzenet: <strong>${sortedMessages.length} db</strong></p>
      </div>
      <div class="header-meta">
        <div class="header-badge">🔒 LEZÁRT TICKET</div>
        <div>Archiválva: ${createdAt}</div>
        ${closerUser ? `<div>Lezárta: <strong>${escapeHtml(closerUser.tag)}</strong></div>` : ''}
      </div>
    </div>

    <div class="messages-container">
      ${messagesHtml || '<p style="color: #64748b; text-align: center; padding: 20px;">Nem találhatók üzenetek ebben a szobában.</p>'}
    </div>

    <div class="ticket-footer">
      <span>🛡️ Nexus Horizon RP • Automata Transcript Rendszer</span>
      <span>Generálva a Discord Bot által</span>
    </div>
  </div>
</body>
</html>`;

    const buffer = Buffer.from(fullHtml, 'utf-8');
    return new AttachmentBuilder(buffer, { name: `transcript-${channelName}.html` });
  } catch (finalErr) {
    console.error('[Transcript] Standalone generator error:', finalErr);
    const fallbackBuffer = Buffer.from(`<html><body><h1>Ticket Átirat: ${channel.name}</h1><p>Nem sikerült legenerálni az üzeneteket.</p></body></html>`, 'utf-8');
    return new AttachmentBuilder(fallbackBuffer, { name: `transcript-${channel.name}.html` });
  }
}
