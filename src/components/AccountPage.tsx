import React, { useEffect, useState } from 'react';
import {
  Link2,
  Unlink,
  Copy,
  Check,
  Coins,
  Wallet,
  ShieldCheck,
  Gamepad2,
  Clock,
  RefreshCw,
  ShoppingBag,
  History,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AccountPageProps {
  auth: any;
  balance: any;
  setActiveTab: (tab: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ auth, balance, setActiveTab }) => {
  const [linkStatus, setLinkStatus] = useState<any>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [pendingCode, setPendingCode] = useState<{ code: string; expiresAt: number } | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [requesting, setRequesting] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const authHeaders = () => {
    const token = localStorage.getItem('nexus_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchLinkStatus = async () => {
    try {
      const res = await fetch('/api/link/status', { headers: authHeaders() });
      const data = await res.json();
      setLinkStatus(data);
    } catch (e) {
      setLinkStatus({ linked: false });
    } finally {
      setLoadingLink(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/shop/history', { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (e) {}
  };

  useEffect(() => {
    if (auth?.authenticated) {
      fetchLinkStatus();
      fetchHistory();
    } else {
      setLoadingLink(false);
    }
  }, [auth?.authenticated]);

  useEffect(() => {
    if (!pendingCode) return;
    const interval = setInterval(() => {
      const remaining = pendingCode.expiresAt - Date.now();
      if (remaining <= 0) {
        setPendingCode(null);
        setCountdown('');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingCode]);

  const handleRequestCode = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/link/request', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setPendingCode({ code: data.code, expiresAt: data.expiresAt });
      } else {
        toast.error(data.error || 'Hiba történt a kód igénylése közben.');
      }
    } catch (e) {
      toast.error('Hiba történt a kód igénylése közben.');
    } finally {
      setRequesting(false);
    }
  };

  const handleCopyCode = () => {
    if (!pendingCode) return;
    navigator.clipboard.writeText(`/verify ${pendingCode.code}`);
    setCopied(true);
    toast.success('Parancs vágólapra másolva!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch('/api/link/unlink', { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        toast.success('A fiók leválasztva a FiveM karakterről.');
        fetchLinkStatus();
      }
    } catch (e) {
      toast.error('Hiba történt a leválasztás közben.');
    } finally {
      setUnlinking(false);
    }
  };

  if (!auth?.authenticated) {
    return (
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-2xl font-black uppercase text-white">Jelentkezz be a Fiókom megtekintéséhez</h1>
        <p className="text-slate-400 text-sm">A Discord fiókoddal való bejelentkezés után itt kezelheted az egyenlegedet és a FiveM összekötést.</p>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-800 pb-8">
        {auth.user?.avatar ? (
          <img
            src={`https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png`}
            alt={auth.user.username}
            className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 text-cyan-400 font-black text-2xl flex items-center justify-center border-2 border-cyan-500/30">
            {auth.user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <div className="space-y-1">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5">
            Fiókom
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {auth.user?.username}
          </h1>
          <p className="text-slate-500 text-xs font-mono">Discord ID: {auth.user?.id}</p>
        </div>
      </div>

      {/* Balances Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="horizon-card p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Játékbeli Egyenleg</div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">${(balance?.balance || 0).toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Wallet size={22} />
          </div>
        </div>
        <div className="horizon-card p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">PP Pontok</div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">{(balance?.ppBalance || 0).toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <Coins size={22} />
          </div>
        </div>
        <div className="horizon-card p-6 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Discord Pénz (DC)</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{(balance?.discordCoins ?? 500).toLocaleString()} DC</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Account Linking Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <Gamepad2 size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
              Discord ↔ FiveM Összekötés
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Kösd össze a Discord fiókodat a karaktereddel, hogy a PP pontjaid és a vásárlásaid ténylegesen a szerveren landoljanak.
            </p>
          </div>
        </div>

        {loadingLink ? (
          <div className="relative flex items-center gap-2 text-slate-500 text-xs">
            <RefreshCw size={14} className="animate-spin" /> Betöltés...
          </div>
        ) : linkStatus?.linked ? (
          <div className="relative p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check size={20} />
              </div>
              <div>
                <div className="text-sm font-black text-white">Összekötve: {linkStatus.fivemName}</div>
                <div className="text-[11px] text-slate-500 font-mono">Azonosító: {linkStatus.fivemIdentifierMasked}</div>
              </div>
            </div>
            <Button
              onClick={handleUnlink}
              disabled={unlinking}
              variant="outline"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold h-10 rounded-xl gap-2"
            >
              <Unlink size={14} /> Leválasztás
            </Button>
          </div>
        ) : (
          <div className="relative space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Nincs összekötve FiveM karakter. Enélkül a boost jutalmak, napi jutalmak és webshop vásárlások PP pontja <strong>csak a Discord egyenlegeden</strong> jelenik meg, nem a karaktereden.
              </p>
            </div>

            {pendingCode ? (
              <div className="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/25 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Lépj be a szerverre és írd be:</span>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock size={11} /> {countdown}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 font-mono text-cyan-300 text-lg font-black tracking-widest hover:border-cyan-500/40 transition"
                >
                  /verify {pendingCode.code}
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-slate-500" />}
                </button>
                <p className="text-[11px] text-slate-500">
                  A kód 10 percig érvényes. Ha lejár, kérj egy újat.
                </p>
              </div>
            ) : (
              <Button
                onClick={handleRequestCode}
                disabled={requesting}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider h-12 px-6 rounded-xl gap-2"
              >
                <Link2 size={16} />
                {requesting ? 'Kód generálása...' : 'Összekötő Kód Igénylése'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">Vásárlási Előzmények</h2>
              <p className="text-xs sm:text-sm text-slate-400">Az utolsó 10 webshop vásárlásod.</p>
            </div>
          </div>
          <Button
            onClick={() => setActiveTab('shop')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold h-10 rounded-xl gap-2 hidden sm:flex"
          >
            <ShoppingBag size={14} /> Webshop <ArrowRight size={14} />
          </Button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-600 space-y-2">
            <Sparkles className="mx-auto opacity-30" size={28} />
            <p className="text-xs font-bold uppercase tracking-widest">Még nincs vásárlásod</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((h, i) => (
              <div key={h.id || i} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
                <div>
                  <div className="text-xs font-bold text-white">{h.itemName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{h.synced ? '✅ Karakteren jóváírva' : '⏳ Feldolgozás alatt'}</div>
                </div>
                <div className="text-sm font-black text-cyan-400 font-mono">-{h.pricePP?.toLocaleString()} PP</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
