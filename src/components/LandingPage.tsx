import React, { useState } from 'react';
import { NexusLogo } from './NexusLogo';
import { 
  Crown, 
  Server, 
  ShoppingBag, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Users, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Car, 
  Building2, 
  Sparkles, 
  ArrowUpRight,
  Search,
  AlertCircle,
  MessageCircle,
  Hash,
  Mic,
  Ticket,
  Megaphone,
  Trophy,
  Gift,
  Bell,
  Zap,
  ClipboardList,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface LandingPageProps {
  stats: any;
  status: any;
  announcements: any[];
  tickerVisible: boolean;
  setActiveTab: (tab: string) => void;
  auth: any;
  onPlayerClick?: (player: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  stats,
  status,
  setActiveTab,
  auth,
  onPlayerClick
}) => {
  const [copied, setCopied] = useState(false);
  const [discordCopied, setDiscordCopied] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const discordInviteLink = 'https://discord.gg/nexushorizon';

  const handleCopyDiscordLink = () => {
    navigator.clipboard.writeText(discordInviteLink);
    setDiscordCopied(true);
    toast.success('Discord meghívó link másolva!', {
      description: discordInviteLink
    });
    setTimeout(() => setDiscordCopied(false), 2500);
  };

  const discordChannels = [
    { icon: Megaphone, name: 'bejelentesek', label: 'Bejelentések', desc: 'Frissítések, karbantartások, patch note-ok', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25' },
    { icon: Hash, name: 'altalanos-chat', label: 'Általános Chat', desc: 'Közösségi beszélgetés, OOC témák', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
    { icon: Ticket, name: 'support-ticket', label: 'Support Ticket', desc: '0-24 admin és fejlesztői segítségnyújtás', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
    { icon: Crown, name: 'frakcio-jelentkezes', label: 'Frakció Jelentkezés', desc: 'Automatikus kérelem és elbírálás', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
    { icon: Trophy, name: 'nyeremenyjatekok', label: 'Nyereményjátékok', desc: 'Heti giveaway-k és event díjak', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' },
    { icon: Mic, name: 'voice-lobby', label: 'Voice Lobby', desc: 'Szabad hangcsatornák szerepjátékon kívül', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
  ];

  const discordSteps = [
    { step: '01', icon: UserPlus, title: 'Csatlakozz a szerverhez', desc: 'Kattints a "Csatlakozás Discordra" gombra, és fogadd el a meghívót.' },
    { step: '02', icon: ClipboardList, title: 'Olvasd el a szabályzatot', desc: 'A #szabalyzat szobában igazold vissza, hogy elolvastad és elfogadod az irányelveket.' },
    { step: '03', icon: ShieldCheck, title: 'Igényelj Whitelistet', desc: 'Töltsd ki a rövid kvízt és RP bemutatkozást a whitelist megszerzéséhez.' },
    { step: '04', icon: Zap, title: 'Vágj bele a játékba', desc: 'Kapcsold be a mikrofont, csatlakozz a szerverhez, és kezdd el a történeted!' },
  ];

  const fivem = status?.fivem;
  const isFivemOnline = Boolean(fivem?.online);
  const playerCount = fivem?.clients || 0;
  const maxPlayers = fivem?.max_clients || 64;
  const playersList = fivem?.players || [];

  const handleCopyIp = () => {
    navigator.clipboard.writeText('connect play.nexushorizon.hu');
    setCopied(true);
    toast.success('Csatlakozási parancs másolva a vágólapra!', {
      description: 'F8 konzolba: connect play.nexushorizon.hu'
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredPlayers = playersList.filter((p: any) => 
    p.name?.toLowerCase().includes(playerSearch.toLowerCase()) ||
    String(p.id).includes(playerSearch)
  );

  return (
    <div className="space-y-24 pb-24">
      
      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 overflow-hidden text-center">
        {/* Glow Spheres */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-transparent blur-[140px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Central Logo & Live Pill */}
          <div className="flex flex-col items-center gap-4">
            <NexusLogo size="xl" />
            
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-full">
                ✨ ÚJ KORSZAK A SZEREPJÁTÉKBAN
              </Badge>
              {isFivemOnline ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SZERVER ONLINE • {playerCount}/{maxPlayers} JÁTÉKOS
                </Badge>
              ) : (
                <Badge className="bg-slate-800 text-slate-400 border border-slate-700 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  KARBANTARTÁS ALATT
                </Badge>
              )}
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white italic">
              NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">HORIZON</span> RP
            </h1>
            <p className="text-slate-300 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
              Csatlakozz Magyarország legmodernebb FiveM szerveréhez. Egyedi gazdasági modell, dinamikus legális és illegális karrierlehetőségek, és professzionális közösség.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={() => setActiveTab('faction-hub')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm sm:text-base uppercase tracking-wider h-14 px-8 rounded-2xl shadow-xl shadow-cyan-500/25 transition-all hover:scale-[1.02] flex items-center gap-2.5"
            >
              <Crown size={20} className="text-cyan-200" />
              Frakció Kérelem
            </Button>

            <Button
              size="lg"
              onClick={handleCopyIp}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 font-black text-sm sm:text-base uppercase tracking-wider h-14 px-8 rounded-2xl shadow-lg transition-all hover:scale-[1.02] flex items-center gap-2.5"
            >
              <Server size={18} className="text-cyan-400" />
              Csatlakozás
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setActiveTab('shop')}
              className="bg-slate-950/60 hover:bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/40 font-bold text-sm uppercase tracking-wider h-14 px-6 rounded-2xl"
            >
              <ShoppingBag size={18} className="mr-2 text-cyan-400" />
              Webshop
            </Button>
          </div>

          {/* Quick Connect IP Box */}
          <div className="pt-4 max-w-lg mx-auto">
            <div 
              onClick={handleCopyIp}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-xl group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition">
                  <Server size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">FiveM Szerver IP</div>
                  <div className="text-sm sm:text-base font-mono font-bold text-white tracking-wide">
                    play.nexushorizon.hu
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-bold group-hover:border-cyan-500/40 group-hover:text-cyan-300 transition">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Másolva!' : 'Másolás'}</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* METRICS & STATUS GRID */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* 1. FiveM Live Card */}
          <div className="horizon-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <Server size={22} />
              </div>
              <Badge className={isFivemOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}>
                {isFivemOnline ? 'ONLINE' : 'OFFLINE'}
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {playerCount} <span className="text-lg text-slate-500 font-normal">/ {maxPlayers}</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Aktív Játékosok
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (playerCount / maxPlayers) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Discord Members */}
          <div className="horizon-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Users size={22} />
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                DISCORD
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {stats?.players || 240} <span className="text-lg text-slate-500 font-normal">fő</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Közösségi Tagok
              </div>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{(stats?.admins || 0) + (stats?.staff || 4)} aktív staff tag</span>
            </div>
          </div>

          {/* 3. Factions & Gangs */}
          <div className="horizon-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <Crown size={22} />
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                SZERVEZETEK
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                12 <span className="text-lg text-slate-500 font-normal">frakció</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Legális & Illegális
              </div>
            </div>
            <div className="text-[11px] text-cyan-400 font-semibold cursor-pointer hover:underline" onClick={() => setActiveTab('faction-hub')}>
              Új frakció alapítása →
            </div>
          </div>

          {/* 4. Infrastructure & Tickrate */}
          <div className="horizon-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <Cpu size={22} />
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                ONESYNC INFINITY
              </Badge>
            </div>
            <div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                64 <span className="text-lg text-slate-500 font-normal">Tick</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Késleltetés-mentes
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              NVMe SSD & 10 Gbps Dedikált hálózat
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* FEATURE HIGHLIGHTS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
            SZERVER JELLEMZŐK
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Miért a Nexus Horizon RP?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Minden rendszert a folyamatos játékélményre és a minőségi szerepjátékra terveztünk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="horizon-card p-8 space-y-5 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Egyedi Los Santos & MLO-k
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Részletgazdag egyedi belsők, HQ-k a frakciók számára, kidolgozott garázsok és optimalizált textúrák a magas FPS érdekében.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="horizon-card p-8 space-y-5 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Car size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Egyedi Tuning & Járművek
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Több száz egyedi handlinggel ellátott jármű, professzionális szerelőtelepek és valósághű menetdinamika.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="horizon-card p-8 space-y-5 hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Crown size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Automatikus Frakció Rendszer
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Webes kérelem leadás, automatikus Discord szoba és rang kiosztás elfogadáskor, és azonnali FiveM SQL/LUA szinkronizáció.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* LIVE ONLINE PLAYERS SECTION */}
      {/* ========================================================================= */}
      {isFivemOnline && playersList.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Online Játékosok ({playersList.length})
              </h3>
              <p className="text-slate-400 text-xs">Jelenleg a Nexus Horizon szerverén tartózkodó lakosok</p>
            </div>

            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <Input
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Keresés név vagy ID alapján..."
                className="bg-slate-900/90 border-slate-800 pl-9 text-xs h-10 rounded-xl text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredPlayers.map((player: any) => (
              <div
                key={player.id}
                onClick={() => onPlayerClick && onPlayerClick(player)}
                className={`p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 hover:border-cyan-500/30 flex items-center justify-between transition ${
                  auth?.isAdmin ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-cyan-400 shrink-0 border border-slate-700">
                    {player.id}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-200 truncate">{player.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{player.ping || 15}ms ping</div>
                  </div>
                </div>
                {auth?.isAdmin && (
                  <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400 uppercase">
                    Kezelés
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* DISCORD COMMUNITY — RÉSZLETES SZEKCIÓ */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge className="bg-[#5865F2]/15 text-[#8b93f8] border border-[#5865F2]/40 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
            <MessageCircle size={12} className="inline mr-1.5 -mt-0.5" />
            DISCORD KÖZÖSSÉG
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            A Nexus Horizon szíve a Discordunkon dobog
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Whitelist, frakció jelentkezés, support ticket, nyereményjátékok és élő közösség — minden egy helyen.
          </p>
        </div>

        {/* Fő panel: Csatlakozás + statisztikák */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1d3d] via-slate-900 to-blue-950/60 border border-[#5865F2]/30 p-8 sm:p-12 space-y-10 shadow-2xl shadow-[#5865F2]/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[120px] pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-0" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Lépj be a Nexus Horizon Discordra!
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Értesülj a legújabb frissítésekről, vegyél részt nyereményjátékokban, kérj segítséget a support ticket rendszerben, vagy pályázz frakcióra — mindezt közvetlenül a Discord szerverünkön.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
              <a href={discordInviteLink} target="_blank" rel="noreferrer">
                <Button
                  size="lg"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-sm sm:text-base uppercase tracking-wider h-14 px-8 rounded-2xl shadow-xl shadow-[#5865F2]/25 flex items-center gap-2.5 transition-all hover:scale-[1.02]"
                >
                  <MessageCircle size={18} />
                  Csatlakozás Discordra
                  <ArrowUpRight size={18} />
                </Button>
              </a>
              <button
                onClick={handleCopyDiscordLink}
                className="flex items-center gap-2 text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition"
              >
                {discordCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {discordCopied ? 'Meghívó link másolva!' : discordInviteLink}
              </button>
            </div>
          </div>

          {/* Statisztikák */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-slate-700/50">
            {[
              { icon: Users, value: `${stats?.players || 240}+`, label: 'Tag' },
              { icon: Activity, value: `${(stats?.admins || 0) + (stats?.staff || 12)}`, label: 'Online Staff' },
              { icon: Ticket, value: '24/7', label: 'Support Ticket' },
              { icon: Gift, value: 'Heti', label: 'Nyereményjáték' },
            ].map((s, i) => (
              <div key={i} className="text-center space-y-1.5">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/30 flex items-center justify-center text-[#8b93f8]">
                  <s.icon size={18} />
                </div>
                <div className="text-lg sm:text-xl font-black text-white font-mono">{s.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Csatorna előnézet */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 justify-center md:justify-start">
            <Bell size={16} className="text-cyan-400" />
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-300">Mit találsz a szerveren?</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {discordChannels.map((ch, i) => (
              <div key={i} className="horizon-card p-5 flex items-start gap-3.5 hover:border-[#5865F2]/40 transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${ch.color}`}>
                  <ch.icon size={20} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                    <span className="text-slate-500 font-mono normal-case">#</span>{ch.name}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{ch.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Csatlakozási lépések */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 justify-center md:justify-start">
            <Zap size={16} className="text-cyan-400" />
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-300">Hogyan kezdj neki? — 4 lépésben</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {discordSteps.map((s, i) => (
              <div key={i} className="relative horizon-card p-5 space-y-3 overflow-hidden">
                <div className="absolute -top-2 -right-1 text-6xl font-black text-slate-800/80 select-none pointer-events-none">
                  {s.step}
                </div>
                <div className="relative w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                  <s.icon size={20} />
                </div>
                <div className="relative space-y-1">
                  <div className="text-xs font-black text-white uppercase tracking-wide">{s.title}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</div>
                </div>
                {i < discordSteps.length - 1 && (
                  <ChevronRight size={16} className="hidden lg:block absolute top-1/2 -right-6 -translate-y-1/2 text-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>

      </section>

    </div>
  );
};
