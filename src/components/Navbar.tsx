import React, { useState } from 'react';
import { NexusLogo } from './NexusLogo';
import { 
  Home, 
  Crown, 
  ShoppingBag, 
  BookOpen, 
  Users, 
  Shield, 
  LogIn, 
  LogOut, 
  Menu, 
  X, 
  Server,
  Zap,
  Coins,
  UserCircle2,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  auth: any;
  status: any;
  balance: any;
  onLogin: () => void;
  onLogout: () => void;
  onOpenApkModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  auth,
  status,
  balance,
  onLogin,
  onLogout,
  onOpenApkModal
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOnline = status?.fivem?.online;
  const playerCount = status?.fivem?.clients || 0;
  const maxPlayers = status?.fivem?.max_clients || 64;

  const navItems = [
    { id: 'home', label: 'Főoldal', icon: Home },
    { id: 'faction-hub', label: 'Frakció Központ', icon: Crown, highlight: true },
    { id: 'shop', label: 'Webshop', icon: ShoppingBag },
    { id: 'rules', label: 'Szabályzat', icon: BookOpen },
    { id: 'staff', label: 'Vezetőség', icon: Users },
    ...(auth?.authenticated ? [{ id: 'account', label: 'Fiókom', icon: UserCircle2 }] : []),
  ];

  const handleCopyIp = () => {
    navigator.clipboard.writeText('connect play.nexushorizon.hu');
    toast.success('Csatlakozási parancs vágólapra másolva!', {
      description: 'connect play.nexushorizon.hu'
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setActiveTab('home')}
          className="cursor-pointer transition-opacity hover:opacity-90 flex items-center gap-3 shrink-0"
        >
          <NexusLogo size="md" showText={true} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'faction-hub' && activeTab.startsWith('faction-'));
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
                    : item.highlight
                    ? 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-white' : item.highlight ? 'text-cyan-400' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}

          {auth?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Shield size={15} />
              Admin Panel
            </button>
          )}
        </nav>

        {/* Right Side: Mobile APK button + Server Status Pill + User Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile & APK Modal Button */}
          {onOpenApkModal && (
            <button
              onClick={onOpenApkModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 hover:from-cyan-900/60 hover:to-blue-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Mobil APK letöltés és Bot Szerver beállítás"
            >
              <Smartphone size={14} className="text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Mobil / APK</span>
            </button>
          )}

          {/* Live Status Pill */}
          <button 
            onClick={handleCopyIp}
            title="Kattints a csatlakozáshoz"
            className="hidden md:flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-xl transition group text-left"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-cyan-400' : 'bg-red-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-cyan-500' : 'bg-red-500'}`} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">FiveM Szerver</span>
              <span className="text-xs font-bold text-slate-200 font-mono">
                {isOnline ? `${playerCount}/${maxPlayers} Online` : 'Karbantartás'}
              </span>
            </div>
          </button>

          {/* User Auth Section */}
          {auth?.authenticated ? (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 pr-3 rounded-2xl">
              <button
                onClick={() => setActiveTab('account')}
                className="flex items-center gap-2 hover:opacity-80 transition"
                title="Fiókom"
              >
                {auth.user?.avatar ? (
                  <img 
                    src={`https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png`} 
                    alt={auth.user.username}
                    className="w-9 h-9 rounded-xl border border-cyan-500/40"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 font-bold flex items-center justify-center border border-cyan-500/30">
                    {auth.user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                    {auth.user?.username}
                  </span>
                  <span className="text-[9px] font-black text-cyan-400 flex items-center gap-1 font-mono">
                    <Coins size={10} /> {balance?.ppBalance || 0} PP
                  </span>
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                title="Kijelentkezés"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 ml-1"
              >
                <LogOut size={14} />
              </Button>
            </div>
          ) : (
            <Button
              onClick={onLogin}
              className="hidden sm:flex bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl h-10 px-4 shadow-lg shadow-cyan-500/20 items-center gap-2"
            >
              <LogIn size={15} />
              Discord Belépés
            </Button>
          )}

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-200"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-950 border-b border-slate-800 px-6 py-5 space-y-4"
          >
            {/* Direct Mobile APK Launcher inside Drawer */}
            {onOpenApkModal && (
              <button
                onClick={() => {
                  onOpenApkModal();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 text-cyan-300 font-bold text-xs"
              >
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-cyan-400" />
                  <span>📱 Android APK & Mobil Bot Központ</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-cyan-400 text-cyan-300">Megnyitás</Badge>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id || (item.id === 'faction-hub' && activeTab.startsWith('faction-'));
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-black uppercase tracking-wider text-left transition ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                        : 'bg-slate-900/80 border border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
              {auth?.isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setMobileOpen(false);
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400"
                >
                  <Shield size={16} />
                  Adminisztrációs Panel
                </button>
              )}
            </div>

            {/* Mobile Auth & Server Action */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <button
                onClick={handleCopyIp}
                className="flex-1 py-2.5 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2"
              >
                <Server size={14} className="text-cyan-400" />
                <span>play.nexushorizon.hu</span>
              </button>

              {auth?.authenticated ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold"
                >
                  Kijelentkezés
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onLogin}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase"
                >
                  Belépés
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
