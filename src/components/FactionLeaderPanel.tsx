import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Bell, 
  Calendar, 
  Radio, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { FactionData, FactionMember } from '../types';

interface FactionLeaderPanelProps {
  auth?: any;
  currentFactionId?: string;
}

export const FactionLeaderPanel: React.FC<FactionLeaderPanelProps> = ({ auth, currentFactionId }) => {
  const [factions, setFactions] = useState<FactionData[]>([]);
  const [selectedFaction, setSelectedFaction] = useState<FactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'announcements' | 'events' | 'logs'>('members');

  // Form states for Leader actions
  const [newMemberDiscord, setNewMemberDiscord] = useState('');
  const [newMemberFivem, setNewMemberFivem] = useState('');
  const [newMemberRank, setNewMemberRank] = useState('Member');
  const [newMemberRole, setNewMemberRole] = useState('Teljes jogú tag');
  const [addingMember, setAddingMember] = useState(false);

  // Announcement state
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementPing, setAnnouncementPing] = useState(true);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);

  const fetchFactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/factions/active');
      if (res.ok) {
        const data: FactionData[] = await res.json();
        setFactions(data);
        if (data.length > 0) {
          if (currentFactionId) {
            const found = data.find(f => f.id === currentFactionId);
            setSelectedFaction(found || data[0]);
          } else {
            setSelectedFaction(data[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load active factions:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (factionId: string) => {
    try {
      const res = await fetch(`/api/factions/${factionId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to load faction logs:', e);
    }
  };

  useEffect(() => {
    fetchFactions();
  }, [currentFactionId]);

  useEffect(() => {
    if (selectedFaction) {
      fetchLogs(selectedFaction.id);
    }
  }, [selectedFaction?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaction) return;
    if (!newMemberDiscord.trim() || !newMemberFivem.trim()) {
      toast.error('Add meg a Discord és FiveM nevet!');
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`/api/factions/${selectedFaction.id}/members/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordTag: newMemberDiscord,
          fivemName: newMemberFivem,
          rank: newMemberRank,
          rankLevel: 4,
          roleTitle: newMemberRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a tag felvételekor');

      toast.success(`✅ ${newMemberFivem} sikeresen felvéve a frakcióba és megkapta a Discord rangot!`);
      setNewMemberDiscord('');
      setNewMemberFivem('');
      fetchFactions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedFaction) return;
    const reason = prompt(`Add meg a kirúgás indokát (${memberName}):`, 'Inaktivitás / Frakció szabályszegés');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/factions/${selectedFaction.id}/members/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, reason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba az elbocsátáskor');

      toast.info(`🔴 ${memberName} eltávolítva a frakcióból.`);
      fetchFactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaction) return;
    if (!announcementTitle.trim() || !announcementMsg.trim()) {
      toast.error('Cím és üzenet megadása kötelező!');
      return;
    }

    setSendingAnnouncement(true);
    try {
      const res = await fetch(`/api/factions/${selectedFaction.id}/announcement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle,
          message: announcementMsg,
          pingEveryone: announcementPing
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a hirdetmény küldésekor');

      toast.success('📢 Hirdetmény sikeresen elküldve a Discord csatornára!');
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      fetchLogs(selectedFaction.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaction) return;
    if (!eventTitle.trim() || !eventDate.trim()) {
      toast.error('Cím és időpont megadása kötelező!');
      return;
    }

    setCreatingEvent(true);
    try {
      const res = await fetch(`/api/factions/${selectedFaction.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          date: eventDate,
          location: eventLoc || 'Frakció Bázis'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba az esemény létrehozásakor');

      toast.success('📅 Frakció esemény sikeresen kiírva interaktív gombokkal a Discordra!');
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      setEventLoc('');
      fetchLogs(selectedFaction.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingEvent(false);
    }
  };

  if (loading && factions.length === 0) {
    return (
      <div className="py-24 text-center text-zinc-500 animate-pulse">
        Frakció adatok betöltése...
      </div>
    );
  }

  if (factions.length === 0) {
    return (
      <Card className="bg-zinc-950/70 border-zinc-800 p-12 text-center rounded-3xl max-w-xl mx-auto space-y-4">
        <Crown className="w-16 h-16 text-amber-500/50 mx-auto" />
        <h3 className="text-xl font-bold text-white">Jelenleg nincs aktív jóváhagyott frakció</h3>
        <p className="text-zinc-400 text-xs">
          A frakcióvezetői felülethez először be kell nyújtani egy frakciókérelmet, amit a vezetőség jóváhagy.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Selector & Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border border-white/10"
            style={{ backgroundColor: `${selectedFaction?.color || '#f59e0b'}20`, color: selectedFaction?.color || '#f59e0b' }}
          >
            <Crown size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">{selectedFaction?.name}</h2>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-mono font-bold uppercase">
                [{selectedFaction?.tag}]
              </Badge>
              <Badge className={`text-xs font-bold uppercase ${
                selectedFaction?.status === 'active' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {selectedFaction?.status === 'active' ? '🟢 Aktív' : '🔴 Felfüggesztve'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Leader: <b className="text-white">{selectedFaction?.leaderIC}</b> • Taglétszám: <b className="text-amber-400">{selectedFaction?.members?.length || 0} fő</b>
            </p>
          </div>
        </div>

        {/* Faction Switcher if multiple */}
        {factions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-bold uppercase">Váltás:</span>
            <select
              value={selectedFaction?.id}
              onChange={e => {
                const f = factions.find(item => item.id === e.target.value);
                if (f) setSelectedFaction(f);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
            >
              {factions.map(f => (
                <option key={f.id} value={f.id}>{f.name} [{f.tag}]</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'members', label: '👥 Tagkezelés & Roster', count: selectedFaction?.members?.length },
          { id: 'announcements', label: '📢 Discord Hirdetmény Küldés' },
          { id: 'events', label: '📅 Esemény Szervezés' },
          { id: 'logs', label: '📜 Frakció Audit Napló' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              activeTab === tab.id
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-950/60 border border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: MEMBERS ROSTER */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Member Form */}
          <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-3xl p-6 space-y-4 lg:col-span-1 h-fit">
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="text-lg font-black uppercase text-white flex items-center gap-2 italic">
                <UserPlus className="text-amber-400" size={18} />
                Új Tag Felvétele
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                A felvett tag automatikusan megkapja a Discord szerepkört és hozzáférést a belső csatornákhoz.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleAddMember} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">FiveM Karakternév (IC) *</label>
                <Input
                  placeholder="pl. Jack_Dawson"
                  value={newMemberFivem}
                  onChange={e => setNewMemberFivem(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-800 text-xs rounded-xl h-10 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Discord Név / ID *</label>
                <Input
                  placeholder="pl. jack#1234 vagy @jack"
                  value={newMemberDiscord}
                  onChange={e => setNewMemberDiscord(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-800 text-xs rounded-xl h-10 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Frakció Rang</label>
                <select
                  value={newMemberRank}
                  onChange={e => setNewMemberRank(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none"
                >
                  <option value="Co-Leader">Co-Leader (Alvezér)</option>
                  <option value="High Command">High Command (Tisztségviselő)</option>
                  <option value="Member">Member (Teljes Jogú Tag)</option>
                  <option value="Prospect">Prospect / Újonc (Próbaidős)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Szerepkör Megnevezés</label>
                <Input
                  placeholder="pl. Fegyvermester, Sofőr, Pénztáros"
                  value={newMemberRole}
                  onChange={e => setNewMemberRole(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-800 text-xs rounded-xl h-10 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={addingMember}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl h-11 shadow-lg shadow-amber-500/20"
              >
                {addingMember ? 'Felvétel folyamatban...' : 'Tag Hozzáadása & DC Rang Kiosztása'}
              </Button>
            </form>
          </Card>

          {/* Members Table */}
          <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-3xl p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-2 italic">
                  <Users className="text-amber-400" size={18} />
                  Frakció Taglista ({selectedFaction?.members?.length || 0} fő)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Aktív tagok jogosultságai, rangjai és rangmódosítás.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {selectedFaction?.members?.map((member, idx) => (
                <div 
                  key={member.id || idx}
                  className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-xs text-white">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {member.fivemName}
                        {member.rank?.includes('Leader') && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">LEADER</Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span className="text-indigo-400">{member.discordTag}</span>
                        <span>•</span>
                        <span className="text-zinc-500">Rang: <b>{member.rank}</b></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">
                      {member.roleTitle || 'Tag'}
                    </Badge>

                    {!member.rank?.includes('Leader') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id, member.fivemName)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 h-9 rounded-xl"
                        title="Tag kirúgása"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-xl font-black uppercase text-white flex items-center gap-2 italic">
              <Bell className="text-amber-400" />
              Discord Hirdetmény Küldése
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Az üzenet közvetlenül a(z) <span className="text-amber-400 font-mono">📢・hirdetmenyek</span> Discord csatornába kerül beágyazott üzenetként (Embed).
            </p>
          </div>

          <form onSubmit={handleSendAnnouncement} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-zinc-400">Hirdetmény Címe *</label>
              <Input
                placeholder="pl. Kötelező Frakciógyűlés Ma Este 20:00-kor!"
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                className="bg-zinc-900/60 border-zinc-800 rounded-xl h-11 text-white text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-zinc-400">Hirdetmény Részletes Tartalma *</label>
              <textarea
                rows={5}
                placeholder="Írd le a részleteket, megjelenési kötelezettséget, napirendi pontokat..."
                value={announcementMsg}
                onChange={e => setAnnouncementMsg(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-white text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
              <input
                type="checkbox"
                id="ping_everyone"
                checked={announcementPing}
                onChange={e => setAnnouncementPing(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-zinc-800 border-zinc-700 focus:ring-0"
              />
              <label htmlFor="ping_everyone" className="text-xs text-zinc-300 font-bold cursor-pointer">
                Frakció szerepkör / @everyone megemlítése a Discordon
              </label>
            </div>

            <Button
              type="submit"
              disabled={sendingAnnouncement}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl h-12 shadow-lg shadow-amber-500/20"
            >
              {sendingAnnouncement ? 'Küldés folyamatban...' : 'Hirdetmény Elküldése a Discordra'}
            </Button>
          </form>
        </Card>
      )}

      {/* TAB CONTENT 3: EVENTS */}
      {activeTab === 'events' && (
        <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div>
            <h3 className="text-xl font-black uppercase text-white flex items-center gap-2 italic">
              <Calendar className="text-amber-400" />
              Frakció Esemény Létrehozása
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Az esemény interaktív RSVP gombokkal (✅ Részt veszek / ❌ Nem / ❓ Kérdéses) kerül közzétételre a <span className="text-amber-400 font-mono">📅・esemenyek</span> csatornán.
            </p>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-zinc-400">Esemény Neve / Típusa *</label>
              <Input
                placeholder="pl. Területi Találkozó, Fegyverkonvoj, Autós Felvonulás"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                className="bg-zinc-900/60 border-zinc-800 rounded-xl h-11 text-white text-xs font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-400">Időpont (Dátum & Óra) *</label>
                <Input
                  placeholder="pl. 2026.10.15. 21:00"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-800 rounded-xl h-11 text-white text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-zinc-400">Helyszín (IC)</label>
                <Input
                  placeholder="pl. Frakció HQ / Sandy Shores hangár"
                  value={eventLoc}
                  onChange={e => setEventLoc(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-800 rounded-xl h-11 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-zinc-400">Esemény Részletes Leírása</label>
              <textarea
                rows={4}
                placeholder="Milyen előkészületek szükségesek? Milyen fegyverzet vagy jármű kötelező?"
                value={eventDesc}
                onChange={e => setEventDesc(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-white text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={creatingEvent}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl h-12 shadow-lg shadow-amber-500/20"
            >
              {creatingEvent ? 'Esemény mentése...' : 'Esemény Kiírása & RSVP Gombok Aktiválása'}
            </Button>
          </form>
        </Card>
      )}

      {/* TAB CONTENT 4: LOGS */}
      {activeTab === 'logs' && (
        <Card className="bg-zinc-950/80 border-zinc-800/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase text-white flex items-center gap-2 italic">
              <Clock className="text-amber-400" />
              Frakció Tevékenységi Napló (Audit Log)
            </h3>
            <Button size="sm" variant="outline" onClick={() => selectedFaction && fetchLogs(selectedFaction.id)} className="rounded-xl border-zinc-800 text-xs text-zinc-400">
              <RefreshCw size={12} className="mr-1" /> Frissítés
            </Button>
          </div>

          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Még nincsenek rögzített tevékenységek ehhez a frakcióhoz.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="text-white font-bold">{log.action}</div>
                    <div className="text-zinc-400 text-[11px]">{log.details}</div>
                  </div>
                  <div className="text-right text-zinc-500 text-[10px] font-mono">
                    <div>{log.executor}</div>
                    <div>{new Date(log.timestamp).toLocaleString('hu-HU')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
