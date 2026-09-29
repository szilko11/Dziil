import 'dotenv/config'; // .env fájl betöltése - KÖTELEZŐ az RCON jelszóhoz!
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { startBot, getBotStatus, currentClient } from './src/bot/client.ts';
import { handleInteraction, handleMessage } from './src/bot/handlers.ts';
import { setupRoutes } from './src/server/routes.ts';
import { authenticateToken, DISCORD_CONFIG } from './src/server/auth.ts';
import { REST, Routes, PermissionsBitField } from 'discord.js';

const currentFilename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : (typeof __filename !== 'undefined' ? __filename : '');
const currentDirname = currentFilename ? path.dirname(currentFilename) : process.cwd();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Settings persistence
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
let botSettings = { allowedRoles: [] as string[] };
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    botSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (e) { console.error("Error loading settings:", e); }
}
const saveSettings = () => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(botSettings, null, 2));

async function start() {
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(authenticateToken);

  // Bot initialization logic with Slash Command registration
  const onReady = async (client: any) => {
    const commands = [
      { name: 'hello', description: 'Bot köszönés' },
      { name: 'ping', description: 'Késleltetés mérése' },
      { name: 'status', description: 'Szerver állapot' },
      { 
        name: 'otlet', 
        description: 'Ötlet beküldése',
        options: [{ name: 'leiras', description: 'Az ötleted leírása', type: 3, required: true }]
      },
      {
        name: 'clear',
        description: 'Üzenetek törlése',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [{ name: 'amount', description: 'Mennyiség', type: 4, required: true }]
      },
      {
        name: 'warn',
        description: 'Figyelmeztetés',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'user', description: 'Felhasználó', type: 6, required: true },
            { name: 'reason', description: 'Indok', type: 3, required: true }
        ]
      },
      {
        name: 'sorsolas',
        description: 'Nyereményjáték indítása',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'prize', description: 'Nyeremény', type: 3, required: true },
            { name: 'duration', description: 'Időtartam (perc)', type: 4, required: true },
            { name: 'description', description: 'Nyereményjáték leírása', type: 3, required: false },
            { name: 'winners', description: 'Nyertesek száma', type: 4, required: false }
        ]
      },
      {
        name: 'ban',
        description: 'Játékos kitiltása a szerverről',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'id', description: 'Játékos FiveM azonosítója (ID)', type: 4, required: true },
            { name: 'reason', description: 'Kitiltás indoka', type: 3, required: true }
        ]
      },
      {
        name: 'kick',
        description: 'Játékos kirúgása a szerverről',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'id', description: 'Játékos FiveM azonosítója (ID)', type: 4, required: true },
            { name: 'reason', description: 'Kirúgás indoka', type: 3, required: true }
        ]
      },
      {
        name: 'userinfo',
        description: 'Felhasználó információinak lekérése',
        options: [{ name: 'user', description: 'Felhasználó', type: 6, required: false }]
      },
      {
        name: 'serverinfo',
        description: 'Discord szerver információk'
      },
      {
        name: 'timeout',
        description: 'Felhasználó némítása (timeout) a Discord szerveren',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'user', description: 'Felhasználó', type: 6, required: true },
            { name: 'duration', description: 'Időtartam percben', type: 4, required: true },
            { name: 'reason', description: 'Indok', type: 3, required: false }
        ]
      },
      {
        name: 'lock',
        description: 'Jelenlegi csatorna lezárása',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'unlock',
        description: 'Jelenlegi csatorna feloldása',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'announce',
        description: 'Közlemény küldése egy csatornára Embed formájában',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'channel', description: 'Célcsatorna', type: 7, required: true },
            { name: 'title', description: 'Közlemény címe', type: 3, required: true },
            { name: 'message', description: 'Közlemény szövege', type: 3, required: true }
        ]
      },
      {
        name: 'setup',
        description: 'Nexus RP szerver felépítése',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
          {
            name: 'type',
            description: 'MELYIK szervert építsem fel?',
            type: 3,
            required: true,
            choices: [
              { name: 'Közösségi Szerver (Játékosoknak)', value: 'community' },
              { name: 'Log & Staff Szerver (Vezetőségnek)', value: 'staff' }
            ]
          }
        ]
      },
      {
        name: 'ticket_setup',
        description: 'Ticket nyitó panel elküldése (Admin)',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
      },
      {
        name: 'ticket_add',
        description: 'Felhasználó hozzáadása a jelenlegi tickethez',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [{ name: 'user', description: 'Felhasználó (Játékos, Frakció leader stb.)', type: 6, required: true }]
      },
      {
        name: 'ticket_remove',
        description: 'Felhasználó eltávolítása a jelenlegi ticketből',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [{ name: 'user', description: 'Felhasználó', type: 6, required: true }]
      },
      {
        name: 'transcript',
        description: 'Ticket beszélgetés lementése (HTML) és elküldése egy log csatornába',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'slowmode',
        description: 'Lassított mód (slowmode) beállítása a csatornán',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [{ name: 'seconds', description: 'Lassítás másodpercben (0 = kikapcsolás)', type: 4, required: true }]
      },
      {
        name: 'nuke',
        description: 'Jelenlegi csatorna törlése és újrahozása (üzenetek törlése)',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'role',
        description: 'Szerepkör hozzáadása/elvétele',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'user', description: 'Felhasználó', type: 6, required: true },
            { name: 'role', description: 'Szerepkör', type: 8, required: true }
        ]
      },
      {
        name: 'avatar',
        description: 'Egy felhasználó profilképének megjelenítése',
        options: [{ name: 'user', description: 'Felhasználó', type: 6, required: false }]
      },
      {
        name: 'coinflip',
        description: 'Fej vagy írás'
      },
      {
        name: 'dice',
        description: 'Kockadobás (1-6)'
      },
      {
        name: 'poll',
        description: 'Szavazás indítása',
        options: [
            { name: 'question', description: 'A szavazás kérdése', type: 3, required: true },
            { name: 'option1', description: '1. opció', type: 3, required: true },
            { name: 'option2', description: '2. opció', type: 3, required: true }
        ]
      },
      {
        name: 'report',
        description: 'Játékos vagy hiba jelentése az adminoknak',
        options: [
            { name: 'subject', description: 'A probléma / játékos neve', type: 3, required: true },
            { name: 'description', description: 'Leírás', type: 3, required: true }
        ]
      },
      {
        name: 'duty',
        description: 'Admin szolgálatba lépés vagy leadás (Duty Tracker)',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'dutystats',
        description: 'Admin heti szolgálati idő statisztika lekérése',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'user', description: 'Staff tag lekérdezése (opcionális)', type: 6, required: false }
        ]
      },
      {
        name: 'whitelist_panel',
        description: 'Interaktív Whitelist & Szabályzat Kvíz panel kiküldése',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'whitelist',
        description: 'Interaktív Whitelist & Szabályzat Kvíz kitöltése a Polgár rangért'
      },
      {
        name: 'history',
        description: 'Játékos kitiltási, figyelmeztetési és jail előzményeinek lekérése',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            { name: 'id', description: 'Játékos FiveM azonosítója (ID)', type: 4, required: false },
            { name: 'discord', description: 'Discord felhasználó', type: 6, required: false },
            { name: 'identifier', description: 'Steam / License azonosító', type: 3, required: false }
        ]
      },
      {
        name: 'daily',
        description: 'Napi ingyenes ajándék és prémium bónusz beváltása (24 óránként)'
      },
      {
        name: 'claim_booster',
        description: 'Discord Server Booster jutalom igénylése (+5000 PP & VIP rang)'
      },
      {
        name: 'link',
        description: 'Discord fiók összekötése a FiveM karakterrel (/verify)'
      },
      {
        name: 'cases',
        description: '🎰 CS:GO2 stílusú ládanyitás és ládák megtekintése (Discord Pénz)'
      },
      {
        name: 'ladak',
        description: '🎰 CS:GO2 stílusú ládanyitás és ládák megtekintése'
      },
      {
        name: 'opencase',
        description: '📦 Láda kinyitása Discord Pénzből (DC)',
        options: [
          {
            name: 'case_id',
            description: 'Válaszd ki a ládát amit ki szeretnél nyitni',
            type: 3,
            required: true,
            choices: [
              { name: '📦 Kezdő Bronz Láda (100 DC)', value: 'bronze' },
              { name: '💼 Fegyver & Bűnözés Ezüst Láda (250 DC)', value: 'silver' },
              { name: '👑 Arany Prémium Láda (500 DC)', value: 'gold' },
              { name: '✨ Legendás Kés & Exkluzív Láda (1000 DC)', value: 'knife' }
            ]
          }
        ]
      },
      {
        name: 'balance',
        description: '💳 Saját Discord Pénz (DC), PP és FiveM egyenleg megtekintése',
        options: [
          { name: 'felhasznalo', description: 'Más játékos egyenlegének megtekintése (opcionális)', type: 6, required: false }
        ]
      },
      {
        name: 'egyenleg',
        description: '💳 Egyenleg megtekintése (Discord Pénz, PP, FiveM Készpénz)',
        options: [
          { name: 'felhasznalo', description: 'Más játékos egyenlegének megtekintése (opcionális)', type: 6, required: false }
        ]
      },
      {
        name: 'coinflip_dc',
        description: '🪙 Duplázó szerencsejáték Discord Pénzzel (Fej vagy Írás)',
        options: [
          { name: 'osszeg', description: 'Megtett tét összege Discord Pénzben (pl. 50)', type: 4, required: true },
          { 
            name: 'tipp', 
            description: 'A tipped (Fej vagy Írás)', 
            type: 3, 
            required: true,
            choices: [
              { name: 'Fej', value: 'fej' },
              { name: 'Írás', value: 'iras' }
            ] 
          }
        ]
      },
      {
        name: 'give_money',
        description: '👑 Pénz és Prémium Pont jóváírása tagnak vagy mindenkinek (Tulajdonos)',
        options: [
          {
            name: 'cel',
            description: 'Kinek szeretnéd adni?',
            type: 3,
            required: true,
            choices: [
              { name: '👤 Egyetlen konkrét felhasználónak', value: 'user' },
              { name: '👥 MINDENKINEK a szerveren (Give to all)', value: 'everyone' }
            ]
          },
          {
            name: 'tipus',
            description: 'Fizetőeszköz típusa',
            type: 3,
            required: true,
            choices: [
              { name: '🪙 Discord Pénz (DC - Ládanyitáshoz)', value: 'discord_coins' },
              { name: '💎 Prémium Pont (PP)', value: 'pp' },
              { name: '💵 FiveM Játékbeli Készpénz', value: 'cash' }
            ]
          },
          {
            name: 'osszeg',
            description: 'A jóváírandó összeg (szám)',
            type: 4,
            required: true
          },
          {
            name: 'felhasznalo',
            description: 'Célszemély (csak ha egyetlen felhasználónak adsz)',
            type: 6,
            required: false
          }
        ]
      },
      {
        name: 'testkill',
        description: 'Haláleset / Kill log küldése a staff log szobába (Admin)',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      },
      {
        name: 'testrobbery',
        description: 'Rablási esemény és rendőrségi riasztás szimulálása (Admin)',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
      }
    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_CONFIG.BOT_TOKEN);
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('[Bot] Slash commands globally registered.');
      
      // Register immediately to all active guilds for instantaneous 0s sync
      for (const guild of client.guilds.cache.values()) {
        try {
          await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands });
          console.log(`[Bot] Slash commands instantly synced to guild: ${guild.name} (${guild.id})`);
        } catch (e) {
          console.error(`[Bot] Could not sync guild commands for ${guild.id}:`, e);
        }
      }
    } catch (error) { console.error('[Bot] Error registering commands:', error); }
  };

  // Setup API Routes
  setupRoutes(app, {
    botStatus: getBotStatus,
    currentClient: () => currentClient, // Lazy getter for current client
    botSettings,
    saveSettings,
    startBot: (token: string) => startBot(token, onReady, handleInteraction, handleMessage)
  });

  // Development/Production Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    // Auto-start bot gracefully if token is configured
    try {
      if (DISCORD_CONFIG && DISCORD_CONFIG.BOT_TOKEN) {
        startBot(DISCORD_CONFIG.BOT_TOKEN, onReady, handleInteraction, handleMessage);
      }
    } catch (botErr) {
      console.error('[Bot] Startup notice:', botErr);
    }
  });
}

// Mobile & phone environment crash protection
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Server Warning] Unhandled Promise Rejection (Prevented Crash):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server Warning] Uncaught Exception (Prevented Crash):', err);
});

start().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
