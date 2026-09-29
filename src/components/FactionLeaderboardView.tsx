import React from 'react';
import { 
  Crown, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FactionLeaderboardViewProps {
  setActiveTab: (tab: string) => void;
}

export const FactionLeaderboardView: React.FC<FactionLeaderboardViewProps> = ({ setActiveTab }) => {
  const sampleFactions = [
    {
      name: 'Los Santos Police Department',
      type: 'LEGAL',
      leader: 'Chief James Holden',
      members: 24,
      status: 'AKTÍV',
      desc: 'A város közbiztonságáért, a rend fenntartásáért és a lakosság védelméért felelős rendvédelmi szerv.',
      color: 'border-blue-500/40 bg-gradient-to-r from-blue-950/20 via-slate-900 to-slate-900',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      name: 'Pillbox Hill Medical Center',
      type: 'LEGAL',
      leader: 'Dr. Emily Watson',
      members: 16,
      status: 'AKTÍV',
      desc: 'Elsősegélynyújtás, sürgősségi ellátás és kórházi rehabilitáció a város minden polgára számára.',
      color: 'border-rose-500/30 bg-slate-900/60',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      name: 'Benny\'s Original Motorworks',
      type: 'LEGAL',
      leader: 'Frank Russo',
      members: 12,
      status: 'AKTÍV',
      desc: 'Prémium jármű tuning, karosszéria javítás, motoroptimalizálás és egyedi fényezések.',
      color: 'border-amber-500/30 bg-slate-900/60',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      name: 'Marabunta Grande 13',
      type: 'ILLEGAL',
      leader: 'El Diablo (CK)',
      members: 14,
      status: 'AKTÍV',
      desc: 'El Burro Heights területén működő fegyver- és kábítószer-kereskedelemmel foglalkozó utcai banda.',
      color: 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/20 via-slate-900 to-slate-900',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      name: 'Ballas Street Cartel',
      type: 'ILLEGAL',
      leader: 'T-Bone Davis',
      members: 15,
      status: 'AKTÍV',
      desc: 'Davis és Forum Drive környékét uraló tradicionális utcai szervezet.',
      color: 'border-purple-500/30 bg-slate-900/60',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Crown className="text-amber-400" size={24} />
            Hivatalos Frakciók & Szervezetek
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            A szerveren jelenleg jóváhagyott legális és illegális szervezetek listája
          </p>
        </div>

        <Button
          onClick={() => setActiveTab('faction-apply')}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase h-10 px-5 rounded-xl shadow-md"
        >
          + Frakció Pályázat Leadása
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleFactions.map((f, i) => (
          <div
            key={i}
            className={`p-6 rounded-2xl border ${f.color} space-y-4 transition hover:border-cyan-500/50`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge className={`text-[9px] font-black uppercase mb-1.5 ${f.badgeClass}`}>
                  {f.type === 'LEGAL' ? '⚖️ LEGÁLIS SZERVEZET' : '💀 ILLEGÁLIS BANDA'}
                </Badge>
                <h3 className="text-lg font-black uppercase text-white tracking-tight">
                  {f.name}
                </h3>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
                {f.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {f.desc}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <div>Vezető: <span className="text-slate-200 font-bold">{f.leader}</span></div>
              <div>Taglétszám: <span className="text-cyan-400 font-mono font-bold">{f.members} fő</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
