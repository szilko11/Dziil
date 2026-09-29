import React from 'react';
import { Megaphone, AlertTriangle, Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface HeaderTickerProps {
  announcements: any[];
  visible: boolean;
}

export const HeaderTicker: React.FC<HeaderTickerProps> = ({ announcements, visible }) => {
  if (!visible || !announcements || announcements.length === 0) return null;

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'giveaway':
        return {
          icon: Gift,
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          label: 'NYEREMÉNYJÁTÉK'
        };
      case 'important':
        return {
          icon: AlertTriangle,
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          label: 'FONTOS'
        };
      default:
        return {
          icon: Sparkles,
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          label: 'BEJELENTÉS'
        };
    }
  };

  return (
    <div className="relative top-0 left-0 right-0 h-10 bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/20 flex items-center overflow-hidden z-40">
      <div className="flex items-center gap-2 px-4 shrink-0 bg-gradient-to-r from-cyan-600 to-blue-600 h-full text-white font-black text-[10px] uppercase tracking-widest italic shadow-md z-10">
        <Megaphone size={13} className="animate-pulse" />
        <span>HÍREK</span>
      </div>

      <div className="flex-1 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap flex items-center gap-12"
        >
          {announcements.map((a, i) => {
            const meta = getTypeMeta(a.type);
            const Icon = meta.icon;
            return (
              <div key={i} className="inline-flex items-center gap-2.5">
                <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 ${meta.badgeClass}`}>
                  <Icon size={10} className="mr-1 inline" />
                  {meta.label}
                </Badge>
                <span className="text-xs font-semibold text-slate-200">{a.content}</span>
                {a.author && (
                  <span className="text-slate-500 font-mono text-[10px]">({a.author})</span>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};
