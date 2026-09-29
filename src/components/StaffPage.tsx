import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  Crown, 
  Headphones, 
  Code2, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface StaffPageProps {
  stats: any;
}

export const StaffPage: React.FC<StaffPageProps> = ({ stats }) => {
  // Built-in verified staff roles for clear transparency & hierarchy
  const staffHierarchy = [
    {
      group: 'Tulajdonosi Kör (Management)',
      color: 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      members: [
        { name: 'NexusOwner', role: 'Server Owner & Developer', status: 'online', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', desc: 'Szerver menedzsment, infrastruktúra és egyedi scriptek fejlesztése.' },
        { name: 'HorizonDev', role: 'Co-Owner & Lead Developer', status: 'online', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', desc: 'FiveM LUA rendszerek, MLO belsők és jármű handling optimalizáció.' }
      ]
    },
    {
      group: 'Főadminisztrátorok (Head Admins)',
      color: 'border-rose-500/30 bg-slate-900/60',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      members: [
        { name: 'Alex_Vance', role: 'Head of Factions', status: 'online', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', desc: 'Legális és illegális frakciók felügyelete, kérelmek elbírálása.' },
        { name: 'Sarah_Connor', role: 'Head of Support', status: 'dnd', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', desc: 'Discord ticketek, játékos panaszok és support minőségbiztosítás.' }
      ]
    },
    {
      group: 'Adminisztrátorok & Moderátorok (Staff Team)',
      color: 'border-cyan-500/30 bg-slate-900/60',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      members: [
        { name: 'Marcus_Reeves', role: 'Admin', status: 'online', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', desc: 'Játékbeli felügyelet, rendezvények biztosítása.' },
        { name: 'Elena_Rostova', role: 'Admin', status: 'offline', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', desc: 'Kezdő játékosok segítése, általános támogatás.' },
        { name: 'David_Miller', role: 'Junior Admin', status: 'online', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', desc: 'Support és ticket kezelés.' },
        { name: 'Thomas_Crown', role: 'Moderator', status: 'online', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', desc: 'Discord és chat felügyelet.' }
      ]
    }
  ];

  return (
    <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-8 sm:p-10 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-0.5">
              🛡️ VEZETŐSÉG & CSAPAT
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white italic">
              Nexus Horizon <span className="text-cyan-400">Staff Csapat</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Ismerd meg a szerver stabil és minőségi működéséért felelős vezetőséget és moderátorokat.
            </p>
          </div>

          <a href="https://discord.gg" target="_blank" rel="noreferrer">
            <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs uppercase h-12 px-6 rounded-xl shadow-lg flex items-center gap-2">
              <MessageSquare size={16} />
              Support Kérés Discordon
            </Button>
          </a>
        </div>
      </div>

      {/* Staff Groups */}
      <div className="space-y-10">
        {staffHierarchy.map((group, gIdx) => (
          <div key={gIdx} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                {group.group}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {group.members.map((member, mIdx) => (
                <div
                  key={mIdx}
                  className={`p-5 rounded-2xl border ${group.color} flex items-start gap-4 transition hover:border-cyan-500/40`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-14 h-14 rounded-2xl border-2 border-slate-700">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback className="bg-slate-800 text-cyan-400 font-bold">
                        {member.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                        member.status === 'online' ? 'bg-emerald-500' : member.status === 'dnd' ? 'bg-rose-500' : 'bg-slate-500'
                      }`} 
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-black text-white">{member.name}</span>
                      <Badge className={`text-[9px] font-black uppercase ${group.badgeClass}`}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {member.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
