import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Users, 
  Sparkles, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  FolderPlus,
  Radio,
  FileText,
  MapPin,
  Send,
  Trash2,
  AlertTriangle,
  Lock,
  Unlock,
  Archive,
  Layers,
  MessageSquare,
  HelpCircle,
  Eye,
  FileCode
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { FivemScriptExport } from './FivemScriptExport';

interface FactionAdminManagementProps {
  auth?: any;
}

export const FactionAdminManagement: React.FC<FactionAdminManagementProps> = ({ auth }) => {
  const [adminTab, setAdminTab] = useState<'applications' | 'active_factions' | 'discord_embed' | 'fivem_sync'>('applications');
  const [applications, setApplications] = useState<any[]>([]);
  const [activeFactions, setActiveFactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<any | null>(null);

  // Embed setup state
  const [deployingEmbed, setDeployingEmbed] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, facsRes] = await Promise.all([
        fetch('/api/factions/applications'),
        fetch('/api/factions/active')
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData);
      }
      if (facsRes.ok) {
        const facsData = await facsRes.json();
        setActiveFactions(facsData);
      }
    } catch (err) {
      console.error('Failed to load admin faction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (appId: string, factionName: string) => {
    if (!confirm(`Biztosan jóváhagyod a(z) "${factionName}" frakciót és automatikusan legenerálod a Discord kategóriát, szobákat és szerepköröket?`)) {
      return;
    }

    setProcessingId(appId);
    try {
      const res = await fetch('/api/factions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Hiba a jóváhagyáskor');
      }

      toast.success(`🎉 SIKER! A(z) ${factionName} Discord szobái és rangjai létrejöttek!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Nem sikerült legenerálni a szobákat');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string, factionName: string) => {
    const reason = prompt(`Add meg az elutasítás indokát a(z) "${factionName}" frakcióhoz:`, 'A kérelem nem felel meg a szerver RP elvárásainak');
    if (reason === null) return;

    setProcessingId(appId);
    try {
      const res = await fetch('/api/factions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, reason })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Hiba az elutasításkor');
      }

      toast.info(`A(z) ${factionName} kérelem elutasítva.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Hiba az elutasítás során');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestChanges = async (appId: string, factionName: string) => {
    const reason = prompt(`Milyen javításokat vagy kiegészítéseket kérsz a(z) "${factionName}" laphoz?`);
    if (!reason) return;

    try {
      const res = await fetch('/api/factions/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.info('Módosítási kérelem elküldve a jelentkezőnek!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartInterview = async (appId: string) => {
    try {
      const res = await fetch('/api/factions/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.success(data.message || 'Interjú szoba sikeresen létrehozva a Discordon!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Active faction administrative actions
  const handleWarnFaction = async (factionId: string, name: string) => {
    const reason = prompt(`Add meg a figyelmeztetés (Warn) okát (${name}):`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/factions/${factionId}/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.warning(`Figyelmeztetés rögzítve és elküldve Discordra (${name})`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSuspendFaction = async (factionId: string, name: string) => {
    const reason = prompt(`Felfüggesztés indoka (${name}):`, 'Szabálytalanság kivizsgálás alatt');
    if (!reason) return;

    try {
      const res = await fetch(`/api/factions/${factionId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.info(`Frakció felfüggesztve és zárolva (${name})`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnsuspendFaction = async (factionId: string, name: string) => {
    try {
      const res = await fetch(`/api/factions/${factionId}/unsuspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.success(`Frakció feloldva (${name})`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDisbandFaction = async (factionId: string, name: string) => {
    if (!confirm(`BIZTOSAN FELOSZLATOD a(z) "${name}" frakciót? A rangok és szobák archiválásra kerülnek!`)) return;

    const reason = prompt('Feloszlatás hivatalos indoka:', 'Vezetőségi döntés');
    if (!reason) return;

    try {
      const res = await fetch(`/api/factions/${factionId}/disband`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      toast.error(`Frakció feloszlatva (${name})`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Deploy Discord Application Embed
  const handleDeployEmbed = async () => {
    setDeployingEmbed(true);
    try {
      const res = await fetch('/api/factions/setup-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a küldéskor');

      toast.success('🏴・frakció-kérelem csatorna és beágyazott üzenet sikeresen létrehozva a Discordon!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeployingEmbed(false);
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.factionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.leaderIC?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.leaderDiscord?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2 italic">
            <Crown className="text-amber-400" />
            Vezetőségi Frakció Menedzsment
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Kérelmek bírálata, automatikus Discord szobagenerálás, frakció felügyelet és FiveM szinkronizáció.
          </p>
        </div>

        <Button 
          onClick={fetchData} 
          variant="outline" 
          size="sm" 
          disabled={loading}
          className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 rounded-xl"
        >
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </Button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'applications', label: '📋 Kérelmek Bírálata', count: applications.filter(a => a.status === 'pending').length },
          { id: 'active_factions', label: '🛡️ Aktív Frakciók Felügyelete', count: activeFactions.length },
          { id: 'discord_embed', label: '🏴 Discord Embed Telepítése' },
          { id: 'fivem_sync', label: '💻 FiveM LUA Script Export' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              adminTab === tab.id
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-950/60 border border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                adminTab === tab.id ? 'bg-black/20 text-black' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: APPLICATIONS */}
      {adminTab === 'applications' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Keresés név, leader vagy Discord szerint..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 rounded-xl text-white text-xs h-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                <Button
                  key={status}
                  size="sm"
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-xl text-xs capitalize ${
                    filterStatus === status 
                      ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold' 
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white'
                  }`}
                >
                  {status === 'all' && 'Összes'}
                  {status === 'pending' && '🟡 Függőben'}
                  {status === 'approved' && '🟢 Elfogadva'}
                  {status === 'rejected' && '🔴 Elutasítva'}
                </Button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          {loading && applications.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-sm animate-pulse">
              Kérelmek betöltése...
            </div>
          ) : filteredApps.length === 0 ? (
            <Card className="bg-zinc-950/40 border-zinc-800/80 p-12 text-center rounded-2xl">
              <FolderPlus className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300">Nincs megjeleníthető frakció kérelem</h3>
              <p className="text-zinc-500 text-xs mt-1">
                {searchTerm ? 'Nincs a keresési feltételeknek megfelelő kérelem.' : 'Jelenleg nincs beérkezett kérelem ebben a kategóriában.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredApps.map(app => {
                const isProcessing = processingId === app.id;
                return (
                  <Card 
                    key={app.id}
                    className={`bg-zinc-950/80 border transition-all rounded-3xl overflow-hidden shadow-xl ${
                      app.status === 'approved' 
                        ? 'border-emerald-500/30' 
                        : app.status === 'rejected' 
                        ? 'border-red-500/20 opacity-75' 
                        : 'border-amber-500/30'
                    }`}
                  >
                    <div className="p-6 space-y-4">
                      {/* Header info */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border border-white/10 shadow-lg"
                            style={{ backgroundColor: `${app.color || app.faction?.primaryColor || '#f59e0b'}25`, color: app.color || app.faction?.primaryColor || '#f59e0b' }}
                          >
                            <Crown size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                                {app.factionName || app.faction?.fullName}
                              </h3>
                              <Badge className="text-[10px] uppercase font-bold border-zinc-800 bg-zinc-900 text-zinc-300">
                                {app.factionType || app.faction?.type}
                              </Badge>
                              <Badge className={`text-[10px] uppercase font-black ${
                                app.status === 'approved' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : app.status === 'rejected' 
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              }`}>
                                {app.status === 'approved' ? '🟢 Jóváhagyva & Szobák Kész' : app.status === 'rejected' ? '🔴 Elutasítva' : '🟡 Elbírálásra vár'}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                              <span>Beküldve: {new Date(app.createdAt).toLocaleString('hu-HU')}</span>
                              <span>•</span>
                              <span>Forrás: <b className="text-zinc-400 uppercase font-mono">{app.source || 'web'}</b></span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {app.status === 'pending' && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleApprove(app.id, app.factionName || app.faction?.fullName)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20"
                            >
                              <CheckCircle2 size={14} className="mr-1.5" />
                              {isProcessing ? 'Szobák generálása...' : 'Jóváhagyás & Szobák Létrehozása'}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartInterview(app.id)}
                              className="border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 font-bold text-xs rounded-xl"
                            >
                              <MessageSquare size={14} className="mr-1.5" />
                              Interjú Szoba
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestChanges(app.id, app.factionName || app.faction?.fullName)}
                              className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-400 font-bold text-xs rounded-xl"
                            >
                              Javítás Kérése
                            </Button>

                            <Button
                              size="sm"
                              disabled={isProcessing}
                              variant="outline"
                              onClick={() => handleReject(app.id, app.factionName || app.faction?.fullName)}
                              className="border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl"
                            >
                              <XCircle size={14} className="mr-1.5" />
                              Elutasítás
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Grid details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                          <span className="text-zinc-500 block uppercase font-bold text-[10px]">Leader (IC & DC)</span>
                          <span className="text-white font-bold">{app.leaderIC || app.applicant?.fivemCharacterName}</span>
                          <span className="text-indigo-400 block text-[11px] font-mono">{app.leaderDiscord || app.applicant?.discordTag}</span>
                        </div>

                        <div className="p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                          <span className="text-zinc-500 block uppercase font-bold text-[10px]">Alvezér / Helyettes</span>
                          <span className="text-zinc-300 font-medium">{app.coLeader || app.faction?.coLeaderIC || 'Nincs megadva'}</span>
                        </div>

                        <div className="p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                          <span className="text-zinc-500 block uppercase font-bold text-[10px]">Létszám & Terület</span>
                          <span className="text-zinc-300 font-medium">{app.membersCount || app.members?.length || 5} fő</span>
                          <span className="text-emerald-400 block text-[11px]">{app.hqLocation || app.appearance?.hqVision || 'HQ kijelölésre vár'}</span>
                        </div>

                        <div className="p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                          <span className="text-zinc-500 block uppercase font-bold text-[10px]">Szabályzat Elfogadva</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Hitelesítve ({new Date(app.rulesAcceptedAt || app.createdAt).toLocaleDateString('hu-HU')})
                          </span>
                        </div>
                      </div>

                      {/* Backstory & RP plan */}
                      <div className="space-y-2 text-xs">
                        <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/60">
                          <span className="text-amber-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                            📖 Háttértörténet & Alapítás:
                          </span>
                          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{app.backstory || app.lore?.backstory}</p>
                        </div>

                        {(app.rpPlan || app.rpPlan?.rpVision) && (
                          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/60">
                            <span className="text-indigo-400 font-bold uppercase tracking-wider block text-[10px] mb-1">
                              🎯 Tervezett Szerepjáték és Tevékenységek:
                            </span>
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                              {typeof app.rpPlan === 'string' ? app.rpPlan : app.rpPlan?.rpVision}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE FACTIONS MANAGEMENT */}
      {adminTab === 'active_factions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 italic">
              <Crown className="text-amber-400" />
              Szerveren Működő Frakciók ({activeFactions.length})
            </h3>
          </div>

          {activeFactions.length === 0 ? (
            <Card className="bg-zinc-950/50 border-zinc-800 p-12 text-center rounded-3xl">
              <Crown className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-xs">Még nincs jóváhagyott aktív frakció az adatbázisban.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeFactions.map(fac => (
                <Card key={fac.id} className="bg-zinc-950/80 border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border border-white/10"
                        style={{ backgroundColor: `${fac.color || '#f59e0b'}25`, color: fac.color || '#f59e0b' }}
                      >
                        <Crown size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          {fac.name} <span className="text-amber-400 text-xs">[{fac.tag}]</span>
                        </h4>
                        <span className="text-xs text-zinc-400">Leader: <b className="text-white">{fac.leaderIC}</b> ({fac.leaderDiscord})</span>
                      </div>
                    </div>

                    <Badge className={`text-[10px] font-bold uppercase ${
                      fac.status === 'active' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {fac.status === 'active' ? '🟢 Aktív' : '🔴 Zárolva'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Taglétszám</span>
                      <b className="text-white text-sm">{fac.members?.length || 0} fő</b>
                    </div>
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Figyelmeztetések</span>
                      <b className={`text-sm ${fac.warnings > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{fac.warnings || 0} / 3 Warn</b>
                    </div>
                    <div className="p-2.5 bg-zinc-900/50 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Típus</span>
                      <b className="text-zinc-300 uppercase text-xs">{fac.type}</b>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWarnFaction(fac.id, fac.name)}
                      className="border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs rounded-xl h-8"
                    >
                      <AlertTriangle size={12} className="mr-1" /> Warn
                    </Button>

                    {fac.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendFaction(fac.id, fac.name)}
                        className="border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-400 text-xs rounded-xl h-8"
                      >
                        <Lock size={12} className="mr-1" /> Felfüggesztés
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnsuspendFaction(fac.id, fac.name)}
                        className="border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded-xl h-8"
                      >
                        <Unlock size={12} className="mr-1" /> Feloldás
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisbandFaction(fac.id, fac.name)}
                      className="border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs rounded-xl h-8 ml-auto"
                    >
                      <Trash2 size={12} className="mr-1" /> Feloszlatás
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISCORD EMBED DEPLOYMENT */}
      {adminTab === 'discord_embed' && (
        <Card className="bg-zinc-950/80 border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto text-amber-400 shadow-xl">
              <Crown size={32} />
            </div>
            <h3 className="text-2xl font-black uppercase text-white italic">
              Discord Frakciókérelem Csatorna Telepítése
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Létrehozza a <span className="text-amber-400 font-mono">🏴・frakció-kérelem</span> Discord szobát a beágyazott infópanellel és a közvetlen webes igénylés gombbal.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3 text-xs text-zinc-300">
            <div className="font-bold text-white uppercase flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" /> A generált embed tartalma:
            </div>
            <ul className="space-y-1.5 text-zinc-400 list-disc list-inside">
              <li><b>Cím:</b> 🏴 Frakció létrehozása</li>
              <li><b>Leírás:</b> Frakciókövetelmények, szabályzat tájékoztató</li>
              <li><b>Gomb:</b> 👉 <b>[Frakció Kérelem Kitöltése]</b> (megnyitja a webes űrlapot vagy privát tájékoztatót)</li>
            </ul>
          </div>

          <Button
            onClick={handleDeployEmbed}
            disabled={deployingEmbed}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black uppercase text-xs rounded-2xl h-14 shadow-xl shadow-amber-500/20"
          >
            {deployingEmbed ? 'Telepítés a Discordra...' : '🏴 Csatorna & Embed Létrehozása a Discord Szerveren'}
          </Button>
        </Card>
      )}

      {/* TAB 4: FIVEM SYNC */}
      {adminTab === 'fivem_sync' && (
        <FivemScriptExport />
      )}
    </div>
  );
};
