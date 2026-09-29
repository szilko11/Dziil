import React, { useState } from 'react';
import { 
  Crown, 
  FileText, 
  Users, 
  Code2, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FactionApplicationView } from './FactionApplicationView';
import { FactionLeaderPanel } from './FactionLeaderPanel';
import { FivemScriptExport } from './FivemScriptExport';
import { FactionAdminManagement } from './FactionAdminManagement';

interface FactionHubProps {
  auth: any;
  onNavigateHome: () => void;
}

export const FactionHub: React.FC<FactionHubProps> = ({ auth, onNavigateHome }) => {
  const [subTab, setSubTab] = useState<'apply' | 'leader' | 'scripts' | 'admin'>('apply');

  const tabs = [
    { id: 'apply', label: 'Jelentkezési Lap', icon: FileText, desc: 'Új banda vagy szervezet alapítása' },
    { id: 'leader', label: 'Vezetői Panel', icon: Users, desc: 'Tagok, rangok és járművek kezelése' },
    { id: 'scripts', label: 'FiveM LUA & SQL', icon: Code2, desc: 'Kész FiveM resource export' },
  ];

  if (auth?.isAdmin) {
    tabs.push({ id: 'admin', label: 'Staff Bírálat', icon: ShieldCheck, desc: 'Kérelmek bírálata és szobagenerálás' });
  }

  return (
    <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/50 border border-cyan-500/20 p-8 sm:p-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-0.5">
                👑 NEXUS HORIZON RP
              </Badge>
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-0.5">
                AUTOMATIZÁLT RENDSZER
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white italic">
              Frakció és Banda Központ
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Nyújts be kérelmet új illegális szervezet vagy banda alapítására, kezeld a jóváhagyott frakciódat, vagy tekintsd meg a szerver-oldali szinkronizációs LUA fájlokat.
            </p>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          {tabs.map((t) => {
            const isActive = subTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as any)}
                className={`p-3.5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border-cyan-500/50 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon size={16} />
                  </div>
                  {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {t.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                    {t.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Render */}
      <div className="min-h-[600px]">
        {subTab === 'apply' && (
          <FactionApplicationView auth={auth} onNavigateHome={onNavigateHome} />
        )}
        {subTab === 'leader' && (
          <FactionLeaderPanel auth={auth} />
        )}
        {subTab === 'scripts' && (
          <FivemScriptExport />
        )}
        {subTab === 'admin' && auth?.isAdmin && (
          <FactionAdminManagement auth={auth} />
        )}
      </div>

    </div>
  );
};
