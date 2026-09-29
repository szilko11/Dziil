import React, { useState } from 'react';

interface NexusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({ 
  size = 'md', 
  showText = false, 
  className = '' 
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeMap = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24 sm:w-28 sm:h-28'
  };

  const textMap = {
    sm: 'text-sm font-black',
    md: 'text-lg font-black',
    lg: 'text-2xl font-black',
    xl: 'text-3xl sm:text-4xl font-black'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative group flex items-center justify-center shrink-0">
        {/* Ambient Neon Horizon Glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-cyan-500 via-blue-600 to-teal-400 rounded-full blur-md opacity-60 group-hover:opacity-90 transition duration-500" />
        
        {/* Outer Circular Rim */}
        <div className={`relative ${sizeMap[size]} rounded-full overflow-hidden border-2 border-cyan-400/90 bg-slate-900 shadow-xl shadow-cyan-950/60 flex items-center justify-center`}>
          {!imageFailed ? (
            <img
              src="file_00000000b2a8820a8dbe1d1fa43bb97b.png"
              alt="Nexus Horizon RP Logo"
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageFailed(true)}
            />
          ) : (
            /* Custom High-Quality Horizon Emblem SVG */
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="skyGrad" cx="50%" cy="40%" r="50%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="60%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#020617" />
                </radialGradient>
                <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="neonRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Background Sky */}
              <circle cx="50" cy="50" r="48" fill="url(#skyGrad)" />
              {/* Sun on Horizon */}
              <circle cx="50" cy="50" r="22" fill="url(#sunGrad)" />
              {/* Skyline Silhouette */}
              <path d="M12 68 L20 68 L20 54 L27 54 L27 60 L34 60 L34 44 L40 44 L40 50 L46 50 L46 40 L54 40 L54 46 L60 46 L60 42 L66 42 L66 56 L73 56 L73 52 L80 52 L80 68 L88 68 L88 78 L12 78 Z" fill="#090d16" opacity="0.95" />
              {/* Horizon Line with Neon Glow */}
              <line x1="10" y1="68" x2="90" y2="68" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.8" />
              {/* Palm trees silhouettes */}
              <path d="M18 68 Q19 60 17 52 M17 52 Q22 50 25 53 M17 52 Q13 49 10 52 M17 52 Q18 46 22 47" stroke="#040810" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M82 68 Q81 61 83 54 M83 54 Q87 52 90 55 M83 54 Q79 51 76 54 M83 54 Q84 48 88 49" stroke="#040810" strokeWidth="1.2" strokeLinecap="round" />
              {/* Outer Ring */}
              <circle cx="50" cy="50" r="46" stroke="url(#neonRing)" strokeWidth="2.5" />
              {/* Text Badge */}
              <rect x="22" y="72" width="56" height="15" rx="3" fill="#0b1120" stroke="#06b6d4" strokeWidth="0.8" />
              <text x="50" y="82" fill="#38bdf8" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="system-ui, sans-serif">NEXUS</text>
            </svg>
          )}
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent ${textMap[size]}`}>
            Nexus <span className="text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]">Horizon</span>
          </span>
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] text-cyan-400 uppercase font-mono mt-1">
            FiveM Roleplay
          </span>
        </div>
      )}
    </div>
  );
};

