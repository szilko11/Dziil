import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  runTransaction, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import fs from 'fs';
import path from 'path';
import { 
  AdminDutyRecord, 
  WhitelistResult, 
  PlayerHistoryRecord, 
  KillLogRecord, 
  RobberyLogRecord, 
  DailyRewardClaim 
} from '../types';

export const getDb = () => db;

// In-memory fallbacks for speed & offline tolerance
export const inMemoryDuties = new Map<string, AdminDutyRecord>();
export const inMemoryPlayerHistory: PlayerHistoryRecord[] = [];
export const inMemoryDailyClaims = new Map<string, { lastClaimedAt: number; streak: number }>();
export const inMemoryWhitelists = new Map<string, WhitelistResult>();
export const inMemoryBalances = new Map<string, { balance: number; ppBalance: number; discordCoins: number }>();
export const inMemoryLinkCodes = new Map<string, { discordId: string; discordTag: string; code: string; expiresAt: number }>();
export const inMemoryLinkedAccounts = new Map<string, { discordId: string; discordTag: string; fivemIdentifier: string; fivemName: string; linkedAt: number }>();
export const inMemoryKillLogs: KillLogRecord[] = [];
export const inMemoryRobberyLogs: RobberyLogRecord[] = [];
export const inMemoryShopPurchases: any[] = [];

// Local file storage persistence
const DB_STORAGE_FILE = path.join(process.cwd(), 'database_storage.json');

function loadLocalStore() {
  try {
    if (fs.existsSync(DB_STORAGE_FILE)) {
      const raw = fs.readFileSync(DB_STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.balances) Object.entries(data.balances).forEach(([k, v]) => inMemoryBalances.set(k, v as any));
      if (data.dailyClaims) Object.entries(data.dailyClaims).forEach(([k, v]) => inMemoryDailyClaims.set(k, v as any));
      if (data.whitelists) Object.entries(data.whitelists).forEach(([k, v]) => inMemoryWhitelists.set(k, v as any));
      if (data.linkedAccounts) Object.entries(data.linkedAccounts).forEach(([k, v]) => inMemoryLinkedAccounts.set(k, v as any));
      if (data.duties) Object.entries(data.duties).forEach(([k, v]) => inMemoryDuties.set(k, v as any));
      if (Array.isArray(data.playerHistory)) inMemoryPlayerHistory.push(...data.playerHistory);
      if (Array.isArray(data.killLogs)) inMemoryKillLogs.push(...data.killLogs);
      if (Array.isArray(data.robberyLogs)) inMemoryRobberyLogs.push(...data.robberyLogs);
      if (Array.isArray(data.shopPurchases)) inMemoryShopPurchases.push(...data.shopPurchases);
    }
  } catch (e) {}
}

let saveTimeout: NodeJS.Timeout | null = null;
function persistLocalStore() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const data = {
        balances: Object.fromEntries(inMemoryBalances),
        dailyClaims: Object.fromEntries(inMemoryDailyClaims),
        whitelists: Object.fromEntries(inMemoryWhitelists),
        linkedAccounts: Object.fromEntries(inMemoryLinkedAccounts),
        duties: Object.fromEntries(inMemoryDuties),
        playerHistory: inMemoryPlayerHistory.slice(0, 100),
        killLogs: inMemoryKillLogs.slice(0, 100),
        robberyLogs: inMemoryRobberyLogs.slice(0, 100),
        shopPurchases: inMemoryShopPurchases.slice(0, 100),
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(DB_STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {}
  }, 500);
}

// Load on initialization
loadLocalStore();

// Helper for week number
export function getWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// 1. ADMIN DUTY TRACKER
export async function toggleAdminDuty(adminId: string, adminName: string, adminAvatar?: string, roleName?: string) {
  const existingActive = inMemoryDuties.get(adminId);
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];
  const weekNum = getWeekNumber();

  if (existingActive && existingActive.active) {
    // End duty
    const durationMinutes = Math.max(1, Math.round((now - existingActive.startTime) / 60000));
    existingActive.active = false;
    existingActive.endTime = now;
    existingActive.durationMinutes = durationMinutes;

    persistLocalStore();
    try {
      await addDoc(collection(db, 'admin_duty_logs'), {
        ...existingActive,
        createdAt: serverTimestamp()
      });
    } catch (e) {}
    inMemoryDuties.delete(adminId);
    persistLocalStore();
    return { active: false, durationMinutes, record: existingActive };
  } else {
    // Start duty
    const newDuty: AdminDutyRecord = {
      id: 'duty_' + Math.random().toString(36).substr(2, 9),
      adminId,
      adminName,
      adminAvatar,
      roleName: roleName || 'Adminisztrátor',
      startTime: now,
      active: true,
      date: todayStr,
      weekNumber: weekNum
    };
    inMemoryDuties.set(adminId, newDuty);
    persistLocalStore();
    return { active: true, record: newDuty };
  }
}

export function getActiveAdminDuties(): AdminDutyRecord[] {
  return Array.from(inMemoryDuties.values()).filter(d => d.active);
}

export async function getWeeklyDutyStats(weekNumber: number = getWeekNumber()) {
  const statsMap = new Map<string, { adminName: string; adminId: string; roleName: string; totalMinutes: number; sessionsCount: number }>();
  
  // Add in-memory active duties progress
  const now = Date.now();
  for (const duty of inMemoryDuties.values()) {
    if (duty.weekNumber === weekNumber) {
      const currentElapsed = Math.round((now - duty.startTime) / 60000);
      const existing = statsMap.get(duty.adminId) || { adminName: duty.adminName, adminId: duty.adminId, roleName: duty.roleName || 'Admin', totalMinutes: 0, sessionsCount: 0 };
      existing.totalMinutes += currentElapsed;
      existing.sessionsCount += 1;
      statsMap.set(duty.adminId, existing);
    }
  }

  // Load from Firestore
  try {
    const q = query(collection(db, 'admin_duty_logs'), where('weekNumber', '==', weekNumber));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as AdminDutyRecord;
      const existing = statsMap.get(data.adminId) || { adminName: data.adminName, adminId: data.adminId, roleName: data.roleName || 'Admin', totalMinutes: 0, sessionsCount: 0 };
      existing.totalMinutes += data.durationMinutes || 0;
      existing.sessionsCount += 1;
      statsMap.set(data.adminId, existing);
    });
  } catch (e) {}

  return Array.from(statsMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
}

// 2. WHITELIST QUIZ
export async function saveWhitelistResult(result: WhitelistResult) {
  inMemoryWhitelists.set(result.discordId, result);
  persistLocalStore();
  try {
    await setDoc(doc(db, 'whitelist_results', result.discordId), {
      ...result,
      updatedAt: serverTimestamp()
    });
  } catch (e) {}
}

export async function getUserWhitelistStatus(discordId: string): Promise<WhitelistResult | null> {
  if (inMemoryWhitelists.has(discordId)) {
    return inMemoryWhitelists.get(discordId)!;
  }
  try {
    const docSnap = await getDoc(doc(db, 'whitelist_results', discordId));
    if (docSnap.exists()) {
      const data = docSnap.data() as WhitelistResult;
      inMemoryWhitelists.set(discordId, data);
      return data;
    }
  } catch (e) {}
  return null;
}

// 3. PLAYER HISTORY
export async function addPlayerHistory(history: Omit<PlayerHistoryRecord, 'id' | 'createdAt'>) {
  const record: PlayerHistoryRecord = {
    ...history,
    id: 'hist_' + Math.random().toString(36).substr(2, 9),
    createdAt: new Date().toISOString()
  };
  inMemoryPlayerHistory.unshift(record);
  persistLocalStore();

  try {
    await addDoc(collection(db, 'player_history'), {
      ...record,
      serverTime: serverTimestamp()
    });
  } catch (e) {}
  return record;
}

export async function getPlayerHistory(target: { id?: string; discordId?: string; identifier?: string }) {
  const results: PlayerHistoryRecord[] = inMemoryPlayerHistory.filter(h => {
    if (target.id && h.targetId === String(target.id)) return true;
    if (target.discordId && h.targetDiscordId === target.discordId) return true;
    if (target.identifier && h.targetIdentifier?.toLowerCase().includes(target.identifier.toLowerCase())) return true;
    return false;
  });

  try {
    const q = query(collection(db, 'player_history'), orderBy('serverTime', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    snapshot.forEach(d => {
      const data = d.data() as PlayerHistoryRecord;
      if (
        (target.id && data.targetId === String(target.id)) ||
        (target.discordId && data.targetDiscordId === target.discordId) ||
        (target.identifier && data.targetIdentifier?.toLowerCase().includes(target.identifier.toLowerCase()))
      ) {
        if (!results.some(r => r.id === data.id)) {
          results.push(data);
        }
      }
    });
  } catch (e) {}

  return results;
}

// 4. DAILY REWARDS (24h cooldown)
export async function claimDailyReward(discordId: string, discordTag: string) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let userClaim = inMemoryDailyClaims.get(discordId);

  if (!userClaim) {
    try {
      const docSnap = await getDoc(doc(db, 'daily_claims', discordId));
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        userClaim = { lastClaimedAt: data.lastClaimedAt || 0, streak: data.streak || 0 };
        inMemoryDailyClaims.set(discordId, userClaim);
      }
    } catch (e) {}
  }

  if (userClaim && (now - userClaim.lastClaimedAt) < dayMs) {
    const remainingTime = dayMs - (now - userClaim.lastClaimedAt);
    return {
      success: false,
      alreadyClaimed: true,
      remainingTimeMs: remainingTime,
      nextAvailableAt: userClaim.lastClaimedAt + dayMs
    };
  }

  const streak = (userClaim && (now - userClaim.lastClaimedAt) < (dayMs * 2)) ? (userClaim.streak + 1) : 1;
  
  // Calculate reward: streak bonus
  // Probability: PP is very rare (8%), Discord Pénz (50%), FiveM Cash (42%)
  const roll = Math.random();
  let rewardType: 'pp' | 'money' | 'discordCoins' = 'discordCoins';
  let rewardAmount = 0;

  if (roll < 0.08) {
    // Nagyon ritka Prémium Pont (PP) - 8% esély, kis mennyiség (50 - 150 PP)
    rewardType = 'pp';
    rewardAmount = 50 + Math.min(streak * 10, 100);
  } else if (roll < 0.58) {
    // Discord Pénz (DC) a szerencsejátékhoz és ládanyitáshoz (50% esély, 100 - 350 DC)
    rewardType = 'discordCoins';
    rewardAmount = 100 + (streak * 25);
  } else {
    // Játékbeli készpénz (42% esély, $15,000 - $35,000)
    rewardType = 'money';
    rewardAmount = 15000 + (streak * 3000);
  }

  inMemoryDailyClaims.set(discordId, { lastClaimedAt: now, streak });
  persistLocalStore();

  // Update user balance in Firestore & memory
  let syncInfo: { synced: boolean; fivemName?: string; fivemIdentifier?: string } = { synced: false };
  try {
    if (rewardType === 'pp') {
      syncInfo = await creditFivemPP(discordId, rewardAmount, 'Napi jutalom (/daily)');
    } else if (rewardType === 'money') {
      syncInfo = await creditFivemCash(discordId, rewardAmount, 'Napi jutalom (/daily)');
    } else {
      await updateUserBalance(discordId, rewardAmount, 'discordCoins');
    }
    
    await setDoc(doc(db, 'daily_claims', discordId), {
      discordId,
      discordTag,
      lastClaimedAt: now,
      streak,
      lastRewardType: rewardType,
      lastRewardAmount: rewardAmount,
      updatedAt: serverTimestamp()
    });
  } catch (e) {}

  const currentBal = await getUserBalance(discordId);

  return {
    success: true,
    alreadyClaimed: false,
    streak,
    rewardType,
    rewardAmount,
    nextAvailableAt: now + dayMs,
    synced: syncInfo.synced,
    fivemName: syncInfo.fivemName,
    currentBalance: currentBal
  };
}

// 5. SERVER BOOSTER REWARDS
export async function claimBoosterReward(discordId: string, discordTag: string) {
  const ppAmount = 5000;
  
  try {
    // 1) Ellenőrizzük, hogy már átvette-e (Firestore alapján)
    const docRef = doc(db, 'booster_rewards', discordId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: false, alreadyClaimed: true };
    }

    // 2) Ha nem vette még át, akkor odaadjuk neki a PP-t
    const syncRes = await creditFivemPP(discordId, ppAmount, 'Discord Booster jutalom');
    try {
      await setDoc(docRef, {
        discordId,
        discordTag,
        ppGranted: ppAmount,
        fivemSynced: syncRes.synced,
        rewardGrantedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {}
    return { success: true, ppGranted: ppAmount, fivemSynced: syncRes.synced, fivemName: syncRes.fivemName };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// 6. KILL & ROBBERY LOGS
export async function logKillEvent(killData: Omit<KillLogRecord, 'id' | 'timestamp'>) {
  const record: KillLogRecord = {
    ...killData,
    id: 'kill_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString()
  };
  inMemoryKillLogs.unshift(record);
  persistLocalStore();

  try {
    await addDoc(collection(db, 'kill_logs'), {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (e) {}
  return record;
}

export async function logRobberyEvent(robberyData: Omit<RobberyLogRecord, 'id' | 'timestamp'>) {
  const record: RobberyLogRecord = {
    ...robberyData,
    id: 'rob_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString()
  };
  inMemoryRobberyLogs.unshift(record);
  persistLocalStore();

  try {
    await addDoc(collection(db, 'robbery_logs'), {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (e) {}
  return record;
}

// Balance Helpers - Alapból 500 Discord Pénz jár minden játékosnak teszteléshez és kezdéshez!
export const DEFAULT_STARTING_DISCORD_COINS = 500;

export async function getUserBalance(discordId: string) {
    if (inMemoryBalances.has(discordId)) {
        const mem = inMemoryBalances.get(discordId)!;
        if (mem.discordCoins === undefined || isNaN(mem.discordCoins)) {
            mem.discordCoins = DEFAULT_STARTING_DISCORD_COINS;
            inMemoryBalances.set(discordId, mem);
        }
        return mem;
    }
    try {
        const userRef = doc(db, 'users', discordId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            const initial = { balance: 0, ppBalance: 0, discordCoins: DEFAULT_STARTING_DISCORD_COINS };
            inMemoryBalances.set(discordId, initial);
            try {
              await setDoc(userRef, { discordId, ...initial, createdAt: serverTimestamp() });
            } catch (e) {}
            return initial;
        }
        const data = userDoc.data();
        const res = { 
          balance: Number(data?.balance) || 0, 
          ppBalance: Number(data?.ppBalance) || 0,
          discordCoins: data?.discordCoins !== undefined ? Number(data.discordCoins) : DEFAULT_STARTING_DISCORD_COINS
        };
        inMemoryBalances.set(discordId, res);
        return res;
    } catch (error) {
        const fallback = inMemoryBalances.get(discordId) || { balance: 0, ppBalance: 0, discordCoins: DEFAULT_STARTING_DISCORD_COINS };
        return fallback;
    }
}

export async function updateUserBalance(discordId: string, amount: number, type: 'money' | 'pp' | 'discordCoins') {
    const current = await getUserBalance(discordId);
    if (type === 'money') {
        current.balance = Math.max(0, (current.balance || 0) + amount);
    } else if (type === 'pp') {
        current.ppBalance = Math.max(0, (current.ppBalance || 0) + amount);
    } else if (type === 'discordCoins') {
        current.discordCoins = Math.max(0, (current.discordCoins ?? DEFAULT_STARTING_DISCORD_COINS) + amount);
    }
    inMemoryBalances.set(discordId, current);
    persistLocalStore();

    const userRef = doc(db, 'users', discordId);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                transaction.set(userRef, {
                    discordId,
                    balance: type === 'money' ? Math.max(0, amount) : 0,
                    ppBalance: type === 'pp' ? Math.max(0, amount) : 0,
                    discordCoins: type === 'discordCoins' ? Math.max(0, DEFAULT_STARTING_DISCORD_COINS + amount) : DEFAULT_STARTING_DISCORD_COINS
                });
            } else {
                const data = userDoc.data();
                if (type === 'money') {
                    transaction.update(userRef, { balance: Math.max(0, (Number(data?.balance) || 0) + amount) });
                } else if (type === 'pp') {
                    transaction.update(userRef, { ppBalance: Math.max(0, (Number(data?.ppBalance) || 0) + amount) });
                } else if (type === 'discordCoins') {
                    const prevCoins = data?.discordCoins !== undefined ? Number(data.discordCoins) : DEFAULT_STARTING_DISCORD_COINS;
                    transaction.update(userRef, { discordCoins: Math.max(0, prevCoins + amount) });
                }
            }
        });
    } catch (error) {}
    return current;
}

// Tulajdonosi pénzosztás mindenkinek
export async function giveBalanceToAllUsers(
  amount: number, 
  type: 'discordCoins' | 'pp' | 'money', 
  reason: string,
  client?: any
): Promise<{ count: number; userIds: string[] }> {
  const targetedIds = new Set<string>();

  // 1. Gyűjtsük ki a Discord szerver(ek)ből a tagokat
  if (client && client.isReady()) {
    client.guilds.cache.forEach((g: any) => {
      g.members.cache.forEach((m: any) => {
        if (!m.user.bot) targetedIds.add(m.id);
      });
    });
  }

  // 2. InMemory és Firestore felhasználók hozzáadása
  for (const id of inMemoryBalances.keys()) {
    targetedIds.add(id);
  }

  const idList = Array.from(targetedIds);
  for (const id of idList) {
    try {
      await updateUserBalance(id, amount, type);
      if (type === 'pp') {
        await creditFivemPP(id, amount, reason).catch(() => {});
      } else if (type === 'money') {
        await creditFivemCash(id, amount, reason).catch(() => {});
      }
    } catch (e) {}
  }

  return { count: idList.length, userIds: idList };
}

// ==========================================
// 7. DISCORD <-> FIVEM FIÓK ÖSSZEKÖTÉS
// ==========================================

function generateLinkCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function withLinkTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            const timer = setTimeout(() => reject(new Error(`${label} timeout (${timeoutMs} ms)`)), timeoutMs);
            if (typeof (timer as any).unref === 'function') (timer as any).unref();
        })
    ]);
}

export async function createLinkCode(discordId: string, discordTag?: string) {
    const code = generateLinkCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const cleanTag = (discordTag || 'Felhasználó').trim();
    const payload = { discordId, discordTag: cleanTag, code, expiresAt };

    // 1) Azonnal eltesszük memóriába, így a válasz villámgyors.
    inMemoryLinkCodes.set(discordId, payload);

    // 2) Háttérben elküldjük a Firestore-nak, de nem blokkoljuk a folyamatot,
    // így elkerüljük az esetleges Firestore hálózati timeoutokat.
    Promise.all([
        setDoc(doc(db, 'link_codes', discordId), { ...payload, createdAt: serverTimestamp() }),
        setDoc(doc(db, 'link_codes_by_code', code), { ...payload, createdAt: serverTimestamp() })
    ]).catch((e: any) => {
        console.error('[LINK] A kód Firestore mentése a háttérben hibaüzenetet adott:', e?.message || e);
    });

    return { code, expiresAt };
}

export async function verifyLinkCode(code: string, fivemIdentifier: string, fivemName: string) {
    const normalized = String(code || '').trim().toUpperCase();
    let match: { discordId: string; discordTag: string } | null = null;

    if (!normalized) {
        return { success: false, error: 'Üres összekötő kód.' };
    }
    
    // Fejlesztői teszt mód: ha a kód TEST1234, mindig sikeres egy teszt fiókkal.
    if (normalized === 'TEST1234') {
        return {
            success: true,
            discordId: '123456789012345678', // Teszt Discord ID
            discordTag: 'TesztElek#0000',
            fivemName
        };
    }

    // 1) Azonos Cloud Run példány memóriája - azonnali.
    for (const [discordId, entry] of inMemoryLinkCodes.entries()) {
        if (entry.code === normalized && entry.expiresAt > Date.now()) {
            match = { discordId, discordTag: entry.discordTag };
            break;
        }
    }

    // 2) Új, közvetlen kód-index. Nincs query, ezért gyorsabb és megbízhatóbb.
    if (!match) {
        try {
            const codeSnap = await withLinkTimeout(
                getDoc(doc(db, 'link_codes_by_code', normalized)),
                5000,
                'Link kód Firestore lekérés'
            );
            if (codeSnap.exists()) {
                const data: any = codeSnap.data();
                if (data?.discordId && Number(data?.expiresAt || 0) > Date.now()) {
                    match = {
                        discordId: String(data.discordId),
                        discordTag: String(data.discordTag || 'Ismeretlen Discord')
                    };
                }
            }
        } catch (e: any) {
            console.warn('[LINK] Közvetlen kód-ellenőrzés hiba:', e?.message || e);
        }
    }

    // 3) Régi kódok kompatibilitása: a korábbi link_codes gyűjteményben keresünk.
    if (!match) {
        try {
            const q = query(collection(db, 'link_codes'), where('code', '==', normalized), limit(2));
            const snap = await withLinkTimeout(
                getDocs(q),
                5000,
                'Régi link kód Firestore query'
            );
            snap.forEach(d => {
                const data: any = d.data();
                if (!match && data?.discordId && Number(data?.expiresAt || 0) > Date.now()) {
                    match = {
                        discordId: String(data.discordId),
                        discordTag: String(data.discordTag || 'Ismeretlen Discord')
                    };
                }
            });
        } catch (e: any) {
            console.error('[LINK] Firestore kód-ellenőrzési hiba:', e?.message || e);
        }
    }

    if (!match) {
        return {
            success: false,
            error: 'Érvénytelen vagy lejárt összekötő kód. Kérj új kódot a weboldalon, majd 10 percen belül írd be a /verify paranccsal.'
        };
    }

    const linkedAccount = {
        discordId: match.discordId,
        discordTag: match.discordTag,
        fivemIdentifier,
        fivemName,
        linkedAt: Date.now()
    };

    // A memória azonnal frissül, hogy a HTTP válasz ne várjon egy újabb Firestore írásra.
    inMemoryLinkedAccounts.set(match.discordId, linkedAccount);
    inMemoryLinkCodes.delete(match.discordId);
    persistLocalStore();

    // A tartós mentést elindítjuk, de nem blokkoljuk vele a FiveM /verify választ.
    void withLinkTimeout(
        Promise.all([
            setDoc(doc(db, 'linked_accounts', match.discordId), {
                ...linkedAccount,
                linkedAt: serverTimestamp()
            }),
            deleteDoc(doc(db, 'link_codes', match.discordId)),
            deleteDoc(doc(db, 'link_codes_by_code', normalized))
        ]),
        8000,
        'Összekapcsolás Firestore mentés'
    ).then(() => {
        console.log(`[LINK] Tartós összekapcsolás mentve: Discord=${match!.discordId}, FiveM=${fivemName}`);
    }).catch((e: any) => {
        console.error('[LINK] Tartós összekapcsolás mentési hiba:', e?.message || e);
    });

    return {
        success: true,
        discordId: match.discordId,
        discordTag: match.discordTag,
        fivemName
    };
}

export async function getLinkedAccount(discordId: string) {
    const cached = inMemoryLinkedAccounts.get(discordId);
    if (cached) return cached;
    try {
        const snap = await getDoc(doc(db, 'linked_accounts', discordId));
        if (snap.exists()) {
            const data = snap.data() as any;
            inMemoryLinkedAccounts.set(discordId, data);
            return data;
        }
    } catch (e) {}
    return null;
}

export async function getLinkedAccountByIdentifier(identifier: string) {
    for (const acc of inMemoryLinkedAccounts.values()) {
        if (acc.fivemIdentifier === identifier) return acc;
    }
    try {
        const q = query(collection(db, 'linked_accounts'), where('fivemIdentifier', '==', identifier));
        const snap = await getDocs(q);
        let found: any = null;
        snap.forEach(d => { found = d.data(); });
        return found;
    } catch (e) {
        return null;
    }
}

export async function unlinkAccount(discordId: string) {
    inMemoryLinkedAccounts.delete(discordId);
    persistLocalStore();
    try {
        await deleteDoc(doc(db, 'linked_accounts', discordId));
    } catch (e) {}
    return { success: true };
}

// Egyenleget ír jóvá a Discord-oldali (webshop/daily/booster) egyenlegen,
// ÉS ha a fiók össze van kötve egy FiveM karakterrel, RCON-on keresztül
// ténylegesen jóváíratja azt a karakteren is (a FiveM resource oldalán
// egy `nexus_givepp <identifier> <összeg> <indoklás>` parancsnak kell léteznie).
export async function creditFivemCash(discordId: string, amount: number, reason: string) {
    await updateUserBalance(discordId, amount, 'money');

    const linked = await getLinkedAccount(discordId);
    if (!linked?.fivemIdentifier) {
        return { synced: false };
    }

    try {
        const { fivemRcon } = await import('../bot/rcon');
        const ip = process.env.FIVEM_SERVER_IP || '84.1.49.111';
        const rconPort = parseInt(process.env.FIVEM_RCON_PORT || '30120');
        const rconPass = (process.env.FIVEM_RCON_PASSWORD || '').trim();
        if (!rconPass) return { synced: false, fivemName: linked.fivemName, fivemIdentifier: linked.fivemIdentifier };

        const safeReason = reason.replace(/"/g, "'");
        await fivemRcon(ip, rconPort, rconPass, `nexus_givecash ${linked.fivemIdentifier} ${amount} "${safeReason}"`);
        return { synced: true, fivemIdentifier: linked.fivemIdentifier, fivemName: linked.fivemName };
    } catch (e) {
        return { synced: false, fivemName: linked.fivemName, fivemIdentifier: linked.fivemIdentifier };
    }
}

export async function creditFivemPP(discordId: string, amount: number, reason: string) {
    await updateUserBalance(discordId, amount, 'pp');

    const linked = await getLinkedAccount(discordId);
    if (!linked?.fivemIdentifier) {
        return { synced: false };
    }

    try {
        const { fivemRcon } = await import('../bot/rcon');
        const ip = process.env.FIVEM_SERVER_IP || '84.1.49.111';
        const rconPort = parseInt(process.env.FIVEM_RCON_PORT || '30120');
        const rconPass = (process.env.FIVEM_RCON_PASSWORD || '').trim();
        if (!rconPass) return { synced: false, fivemName: linked.fivemName, fivemIdentifier: linked.fivemIdentifier };

        const safeReason = reason.replace(/"/g, "'");
        await fivemRcon(ip, rconPort, rconPass, `nexus_givepp ${linked.fivemIdentifier} ${amount} "${safeReason}"`);
        return { synced: true, fivemIdentifier: linked.fivemIdentifier, fivemName: linked.fivemName };
    } catch (e) {
        return { synced: false, fivemName: linked.fivemName, fivemIdentifier: linked.fivemIdentifier };
    }
}