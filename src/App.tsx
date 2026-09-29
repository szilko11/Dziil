import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  ShieldCheck, 
  LogOut, 
  Bot, 
  Activity, 
  Users, 
  Server, 
  Zap, 
  Bell, 
  Megaphone, 
  CheckCircle2, 
  AlertCircle, 
  Menu, 
  ChevronRight, 
  Send, 
  Ticket, 
  ShoppingBag, 
  ShieldAlert, 
  ExternalLink, 
  X, 
  MessageCircle, 
  Crown,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toaster, toast } from 'sonner';
import { Navbar } from './components/Navbar';
import { HeaderTicker } from './components/HeaderTicker';
import { LandingPage } from './components/LandingPage';
import { FactionHub } from './components/FactionHub';
import { FactionApplicationView } from './components/FactionApplicationView';
import { FactionLeaderPanel } from './components/FactionLeaderPanel';
import { FactionAdminManagement } from './components/FactionAdminManagement';
import { ShopPage } from './components/ShopPage';
import { RulesPage } from './components/RulesPage';
import { StaffPage } from './components/StaffPage';
import { AccountPage } from './components/AccountPage';
import { MobileApkModal } from './components/MobileApkModal';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [auth, setAuth] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [rconLogs, setRconLogs] = useState<any[]>([]);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [tickerTimer, setTickerTimer] = useState<any>(null);

  useEffect(() => {
    if (announcements.length > 0) {
      setTickerVisible(true);
      if (tickerTimer) clearTimeout(tickerTimer);
      const timer = setTimeout(() => {
        setTickerVisible(false);
      }, 30000);
      setTickerTimer(timer);
    }
  }, [announcements]);

  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [panelTab, setPanelTab] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);

  const [botConfig, setBotConfig] = useState<any>({
    prefix: '!',
    welcomeChannel: '',
    logChannel: '',
    giveawayChannel: '',
    roleAssign: '',
    broadcastInterval: 15,
    autoBroadcasts: [],
    fivemIP: '84.1.49.111',
    fivemPort: 30120,
    rconPassword: ''
  });

  // Safe API Fetching with token header and JSON validation
  const fetchGlobalData = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const safeFetch = async (url: string, defaultVal: any = null) => {
        try {
          const res = await fetch(url, { headers });
          if (!res.ok) return defaultVal;
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await res.json();
          }
          return defaultVal;
        } catch {
          return defaultVal;
        }
      };

      const [authData, statusData, configData, balanceData, statsData, announceData, rconData] = await Promise.all([
        safeFetch('/api/auth/user', { authenticated: false, user: null, isAdmin: false }),
        safeFetch('/api/bot/status', { state: 'Online', ping: 15, bot: null, fivem: null }),
        safeFetch('/api/bot/config', { prefix: '!', broadcastInterval: 15, autoBroadcasts: [], fivemIP: '84.1.49.111', fivemPort: 30120 }),
        safeFetch('/api/user/balance', { balance: 0, ppBalance: 0, authenticated: false }),
        safeFetch('/api/bot/stats', { online: 0, staff: 0, admins: 0, owners: 0, players: 0, activeStaff: [] }),
        safeFetch('/api/announcements', []),
        safeFetch('/api/fivem/rcon-logs', [])
      ]);

      if (authData) setAuth(authData);
      if (statusData) setStatus(statusData);
      if (configData) setBotConfig((prev: any) => ({ ...prev, ...configData }));
      if (balanceData) setBalance(balanceData);
      if (statsData) setStats(statsData);
      if (announceData && Array.isArray(announceData)) setAnnouncements(announceData);
      if (rconData && Array.isArray(rconData)) setRconLogs(rconData);

      if (authData?.authenticated) {
        const channelsData = await safeFetch('/api/discord/channels', []);
        if (channelsData) setChannels(channelsData);
      }
    } catch (e) {
      console.error("Error fetching data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 10000);

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          localStorage.setItem('nexus_token', event.data.token);
        }
        fetchGlobalData();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuth({ authenticated: false, user: null, isAdmin: false });
    toast.success('Sikeresen kijelentkeztél');
  };

  const handlePlayerActionDetailed = async (actionType: 'warn' | 'kick' | 'ban') => {
    if (!selectedPlayer) return;
    try {
      const res = await fetch(`/api/fivem/player/${selectedPlayer.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Adminisztrátori intézkedés a webes panelről' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Játékos ${actionType} sikeres!`);
        setIsPlayerModalOpen(false);
      } else {
        toast.error(`Művelet sikertelen: ${data.error || 'Ismeretlen hiba'}`);
      }
    } catch (err) {
      toast.error('Hiba történt a parancs küldése közben');
    }
  };

  const handleSendPlayerDM = async () => {
    if (!chatInput.trim() || !selectedPlayer) return;
    setSending(true);
    try {
      const res = await fetch('/api/player/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.id,
          playerName: selectedPlayer.name,
          author: auth?.user?.username || 'Admin',
          content: chatInput
        })
      });
      if (res.ok) {
        setChatInput('');
        toast.success('Üzenet elküldve a játékosnak!');
      } else {
        toast.error('Hiba az üzenet küldésekor');
      }
    } catch (e) {
      toast.error('Hiba az üzenet küldésekor');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full shadow-lg shadow-cyan-500/20" />
          <span className="text-cyan-400 font-mono text-xs font-bold tracking-widest uppercase">Nexus Horizon Core Betöltés...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950 flex flex-col justify-between">
      <Toaster position="top-right" theme="dark" />
      
      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        auth={auth} 
        status={status}
        balance={balance}
        onLogin={handleLogin} 
        onLogout={handleLogout}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Header Announcement Ticker */}
      <div className="pt-20">
        <HeaderTicker announcements={announcements} visible={tickerVisible} />
      </div>

      {/* Player Management Modal */}
      <AnimatePresence>
        {(isPlayerModalOpen && selectedPlayer) && (
          <div key="player-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              key="player-modal-bg"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsPlayerModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30 text-cyan-400 font-mono text-xl font-black">
                    {selectedPlayer.id}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase text-white tracking-tight">{selectedPlayer.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Játékos Adatlap & Kezelés</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsPlayerModalOpen(false)} className="rounded-xl hover:bg-slate-800 text-slate-400">
                  <X size={20} />
                </Button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-64 border-r border-slate-800 p-6 space-y-3 bg-slate-950/40">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Gyors Műveletek</div>
                  <Button 
                    onClick={() => handlePlayerActionDetailed('warn')}
                    className="w-full justify-start gap-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-bold h-11 rounded-xl text-xs uppercase"
                  >
                    <AlertCircle size={16} /> Figyelmeztetés
                  </Button>
                  <Button 
                    onClick={() => handlePlayerActionDetailed('kick')}
                    className="w-full justify-start gap-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold h-11 rounded-xl text-xs uppercase"
                  >
                    <ShieldAlert size={16} /> Kirúgás (Kick)
                  </Button>
                  <Button 
                    onClick={() => handlePlayerActionDetailed('ban')}
                    className="w-full justify-start gap-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold h-11 rounded-xl text-xs uppercase"
                  >
                    <ShieldAlert size={16} /> Kitiltás (Ban)
                  </Button>
                  <Separator className="bg-slate-800 my-4" />
                  <div className="space-y-3 p-4 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Késleltetés (Ping)</div>
                    <div className="text-lg font-mono font-bold text-white">{selectedPlayer.ping || 15}ms</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Azonosítók</div>
                    <div className="text-[9px] font-mono text-slate-400 break-all bg-slate-950 p-2 rounded-lg leading-relaxed max-h-24 overflow-y-auto">
                      {selectedPlayer.identifiers?.map((id: string) => <div key={id}>{id}</div>) || 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col h-[450px] md:h-auto">
                  <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                    <MessageCircle size={16} className="text-cyan-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">Közvetlen Üzenet (DM Log)</span>
                  </div>
                  <ScrollArea className="flex-1 p-5">
                    <div className="space-y-3">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((msg, i) => (
                          <div key={i} className={`flex flex-col ${msg.isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-3.5 rounded-2xl ${msg.isAdmin ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                              <p className="text-xs">{msg.content}</p>
                              <span className="text-[8px] opacity-60 mt-1 block font-mono">
                                {msg.author} • {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString() : 'Most'}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
                          <MessageSquare className="opacity-20" size={36} />
                          <p className="text-xs font-bold uppercase tracking-widest">Nincsenek korábbi üzenetek</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex gap-2">
                      <Input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendPlayerDM()}
                        placeholder="Üzenet küldése a játékosnak..." 
                        className="bg-slate-900 border-slate-800 h-11 rounded-xl text-xs text-slate-200"
                      />
                      <Button 
                        onClick={handleSendPlayerDM}
                        disabled={sending || !chatInput}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold w-11 h-11 rounded-xl p-0"
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            
            {activeTab === 'home' && (
              <LandingPage 
                stats={stats} 
                status={status} 
                announcements={announcements} 
                tickerVisible={tickerVisible} 
                setActiveTab={setActiveTab} 
                auth={auth} 
                onPlayerClick={(p: any) => {
                  setSelectedPlayer(p);
                  setIsPlayerModalOpen(true);
                }}
              />
            )}

            {activeTab === 'faction-hub' && (
              <FactionHub 
                auth={auth} 
                onNavigateHome={() => setActiveTab('home')} 
              />
            )}

            {activeTab === 'shop' && (
              <ShopPage balance={balance} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'account' && (
              <AccountPage auth={auth} balance={balance} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'rules' && (
              <RulesPage />
            )}

            {activeTab === 'staff' && (
              <StaffPage stats={stats} />
            )}

            {/* Admin Panel Tab */}
            {activeTab === 'admin' && auth?.isAdmin && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <ShieldCheck className="text-amber-400" size={28} />
                      Adminisztrációs Vezérlőpult
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm">Nexus Horizon bot és frakció kezelő panel</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setPanelTab('overview')}
                      variant={panelTab === 'overview' ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl text-xs font-bold uppercase"
                    >
                      Áttekintés
                    </Button>
                    <Button
                      onClick={() => setPanelTab('factions')}
                      variant={panelTab === 'factions' ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-xl text-xs font-bold uppercase"
                    >
                      Frakció Bírálat
                    </Button>
                  </div>
                </div>

                {panelTab === 'factions' ? (
                  <FactionAdminManagement auth={auth} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Bot Állapot</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-white">{status?.state || 'Online'}</div>
                        <div className="text-xs text-cyan-400 font-mono mt-1">Ping: {status?.ping || 0}ms</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">Szerver Tagok</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-white">{stats?.players || 0} fő</div>
                        <div className="text-xs text-slate-400 mt-1">Discord közösség létszám</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black text-slate-400 uppercase tracking-widest">FiveM Kliensek</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-black text-white">{status?.fivem?.clients || 0} / {status?.fivem?.max_clients || 64}</div>
                        <div className="text-xs text-emerald-400 font-mono mt-1">Szerver elérhető</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-xs space-y-2">
        <div className="font-bold text-slate-300 uppercase tracking-wider">
          Nexus Horizon Roleplay • FiveM Hungary
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <button 
            onClick={() => setIsApkModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-1 text-[11px]"
          >
            📱 Android APK Letöltés & Mobil Bot Útmutató
          </button>
        </div>
        <p className="text-slate-400 max-w-md mx-auto text-[11px]">
          Minden jog fenntartva. Nem áll kapcsolatban a Rockstar Games-szel vagy a Take-Two Interactive-val.
        </p>
      </footer>

      {/* Mobile & APK Installation & Diagnostics Modal */}
      <MobileApkModal 
        isOpen={isApkModalOpen} 
        onClose={() => setIsApkModalOpen(false)} 
        botStatus={status?.bot} 
      />
    </div>
  );
}
