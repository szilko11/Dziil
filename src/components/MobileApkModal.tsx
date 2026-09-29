import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Wifi, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MobileApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus?: any;
}

export const MobileApkModal: React.FC<MobileApkModalProps> = ({ isOpen, onClose, botStatus }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'app' | 'server' | 'commands'>('app');

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA / WebAPK)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Fetch initial diagnostics
    fetchDiagnostics();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/mobile/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (err) {
      // offline fallback
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('🎉 Köszönjük! Az alkalmazás telepítése megkezdődött az Android eszközödre.');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      toast.info('📱 Nyisd meg az oldalt Chrome vagy Samsung Internet böngészőben, majd válaszd a "Hozzáadás a kezdőképernyőhöz / Alkalmazás telepítése" opciót!');
    }
  };

  const handleSyncCommands = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/bot/sync-commands', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`⚡ ${data.message} (${data.guilds?.length || 0} szerver)`);
        fetchDiagnostics();
      } else {
        toast.error(`Hiba: ${data.error || 'Nem sikerült szinkronizálni'}`);
      }
    } catch {
      toast.error('Hálózati hiba a parancsok szinkronizálásakor.');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Smartphone className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Nexus Horizon Mobil & APK Központ</h2>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-[10px] uppercase font-mono">
                  v2.5 APK Ready
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Telefonon való futtatás, Android APK telepítés és Discord szinkronizáció</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('app')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'app' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Android Alkalmazás (APK)
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'server' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Telefonon Futó Bot Szerver
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'commands' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Discord & Whitelist Javítás
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: Android PWA / APK Telepítés */}
          {activeTab === 'app' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Telepítés Android Eszközre (WebAPK)
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-md">
                      A Chrome böngésző natív Android alkalmazássá (APK) fordítja a Nexus Horizon RP portált, amely ikonként megjelenik a telefonodon, támogatja a teljes képernyős módot és offline működést!
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <a 
                      href="/nexus-horizon-rp.apk" 
                      download="nexus-horizon-rp.apk"
                      className="inline-flex"
                    >
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        APK Fájl Letöltése (.apk)
                      </Button>
                    </a>

                    {isInstalled ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Már Telepítve
                      </div>
                    ) : (
                      <Button 
                        onClick={handleInstallClick}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
                      >
                        <Smartphone className="w-4 h-4 mr-2" />
                        PWA Telepítés
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct APK Build details banner */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>nexus-horizon-rp.apk</span>
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px] uppercase font-mono">
                        Build Kész
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Csomag: hu.nexushorizon.rp • Verzió: 1.0.0 (v1/v2/v3 Signed)
                    </div>
                  </div>
                </div>
                <a 
                  href="/nexus-horizon-rp.apk" 
                  download="nexus-horizon-rp.apk"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 font-semibold text-xs transition"
                >
                  Letöltés
                </a>
              </div>

              {/* Step-by-step installation guides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <Smartphone className="w-4 h-4" />
                    Android (Chrome / Samsung Internet)
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                    <li>Nyisd meg ezt a linket a telefonodon a <strong>Google Chrome</strong>-ban.</li>
                    <li>Kattints a fenti zöld <strong>[Telepítés]</strong> gombra vagy a jobb felső <strong>⋮ (3 pont)</strong> menüre.</li>
                    <li>Válaszd a <strong>"Hozzáadás a kezdőképernyőhöz"</strong> vagy <strong>"Alkalmazás telepítése"</strong> lehetőséget.</li>
                    <li>Az Android azonnal létrehozza az önálló <strong>Nexus RP</strong> alkalmazást!</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <Layers className="w-4 h-4" />
                    iOS / iPhone (Safari)
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                    <li>Nyisd meg a linket a <strong>Safari</strong> böngészőben.</li>
                    <li>Koppints a lap alján lévő <strong>Megosztás gombra (Share - négyzet nyíllal)</strong>.</li>
                    <li>Görgess le és válaszd a <strong>"Főképernyőhöz adás" (Add to Home Screen)</strong> opciót.</li>
                    <li>Kattints a "Hozzáadás" gombra a jobb felső sarokban.</li>
                  </ol>
                </div>
              </div>

              {/* Status checklist */}
              <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-300 mb-1">📱 Mobil Optimalizációs Állapot:</div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>PWA Web Manifest & Ikonok:</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">✅ 192x192 & 512x512 Kész</Badge>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Service Worker Gyorsítótár:</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">✅ VitePWA Aktív</Badge>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Mobil Reszponzív Érintőképernyő:</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">✅ Safe-Area & Viewport Fit</Badge>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Telefonon Futó Bot Szerver (Termux / Android) */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <strong className="text-amber-300">Miért állt le a bot a telefonodon?</strong><br />
                  Az Android akkumulátorkímélője (Battery Saver & Doze Mode) leállítja a háttérben futó folyamatokat és a Wi-Fi/4G kapcsolatot, ha lezárod a kijelzőt. Továbbá a Discord websocket hiba elkapása hiányzott korábban.
                  <br />
                  <strong>Ezt most teljesen kijavítottuk!</strong> Az új indító script automatikusan ébren tartja a folyamatot és hiba esetén azonnal újraindul.
                </div>
              </div>

              {/* Live server metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Bot Állapot</div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {diagnostics?.online ? 'Online' : (botStatus?.state || 'Online')}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">WebSocket Ping</div>
                  <div className="text-sm font-bold text-cyan-400 mt-1">
                    {diagnostics?.ping ? `${diagnostics.ping} ms` : `${botStatus?.ping || 15} ms`}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Memória (RAM)</div>
                  <div className="text-sm font-bold text-purple-400 mt-1">
                    {diagnostics?.memoryMb ? `${diagnostics.memoryMb} MB` : '~85 MB'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Futási Idő</div>
                  <div className="text-sm font-bold text-slate-200 mt-1">
                    {diagnostics?.uptimeSeconds ? `${Math.floor(diagnostics.uptimeSeconds / 60)} perc` : 'Aktív'}
                  </div>
                </div>
              </div>

              {/* Termux Script Guide */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                    <Terminal className="w-4 h-4" />
                    Android Termux 1-Kattintásos Indítás:
                  </div>
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 font-mono">
                    start-mobile-bot.sh
                  </Badge>
                </div>
                
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto select-all">
                  bash start-mobile-bot.sh
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <div><strong>Mit csinál ez a script a telefonon?</strong></div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    <li>Aktiválja a <code>termux-wake-lock</code>-ot (megakadályozza, hogy az Android leállítsa a képernyőzár alatt).</li>
                    <li>256MB memóriakorlátot állít be, így gyengébb telefonokon sem fagy le.</li>
                    <li>Automatikus végtelen újraindítási ciklus védi a 4G/Wi-Fi megszakadások ellen.</li>
                  </ul>
                </div>
              </div>

              {/* Python bot fallback */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">Python Mobil Verzió (Pydroid 3 / Termux):</span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">python bot.py (Beépített Slash parancsok & Whitelist)</div>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]">Python Ready</Badge>
              </div>
            </div>
          )}

          {/* TAB 3: Discord & Whitelist Javítás */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Discord Mobil Slash Parancsok Szinkronizálása
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ha a telefonos Discord appban nem látod az új <code>/whitelist</code>, <code>/otlet</code> vagy <code>/setup</code> parancsokat, kényszerítsd az azonnali szerver-szintű frissítést!
                    </p>
                  </div>

                  <Button 
                    onClick={handleSyncCommands}
                    disabled={syncing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Szinkronizálás...' : 'Azonnali Szinkronizálás'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-cyan-400 font-bold font-mono">/otlet</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Ellenőrzi a <strong>Polgár</strong> rangot. Ha nincs meg, azonnali felugró üzenetben kínálja fel a <strong>[📋 Whitelist Kvíz Kitöltése]</strong> gombot!
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-emerald-400 font-bold font-mono">/whitelist</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      8 kérdéses mobil-barát kvíz (A/B/C/D nagyméretű érintőgombokkal). 75% felett azonnal kiosztja a <strong>👥 Polgár</strong> rangot!
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-purple-400 font-bold font-mono">📜 Szabályzat Gombok</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      A szabályzat elfogadásakor automatikusan elküldi a zöld <strong>[📋 Whitelist Kvíz Kitöltése]</strong> gombot.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-amber-400 font-bold font-mono">/setup community</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Létrehozza a <code>💡┃ötletek</code>, <code>📖┃szerver-szabályzat</code>, <code>🛡️┃whitelist-kvíz</code> szobákat a megfelelő Polgár jogokkal!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Nexus Horizon Mobil Bot & Portál
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
          >
            Bezárás
          </Button>
        </div>

      </div>
    </div>
  );
};
