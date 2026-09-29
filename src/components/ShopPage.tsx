import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  ShoppingBag, 
  Coins, 
  Sparkles, 
  Check, 
  Crown, 
  Car, 
  Key, 
  CreditCard,
  Link2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ShopPageProps {
  balance: any;
  setActiveTab?: (tab: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ balance, setActiveTab }) => {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const authHeaders = () => {
    const token = localStorage.getItem('nexus_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    fetch('/api/link/status', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setLinked(Boolean(d.linked)))
      .catch(() => setLinked(false));
  }, []);

  const shopItems = [
    { 
      id: 1, 
      itemId: 'vip_bronze',
      name: 'VIP BRONZE', 
      price: '5,000', 
      currency: 'PP', 
      duration: '30 Nap',
      badge: 'BELÉPŐ',
      features: ['+15% Fizetés bónusz', 'Egyedi bronz Discord rang', '1x Ingyenes névváltás', 'Prioritás a várólistán (Tier 1)'],
      color: 'border-amber-700/40 bg-gradient-to-b from-amber-950/20 to-slate-900/60',
      btnClass: 'bg-amber-600 hover:bg-amber-500 text-white'
    },
    { 
      id: 2, 
      itemId: 'vip_silver',
      name: 'VIP SILVER', 
      price: '12,000', 
      currency: 'PP', 
      duration: '30 Nap',
      badge: 'NÉPSZERŰ',
      features: ['+30% Fizetés bónusz', 'Exkluzív import autó bérlés', '2x Ingyenes névváltás', 'Prioritás a várólistán (Tier 2)', 'Egyedi rendszámtábla'],
      color: 'border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 to-slate-900/80 shadow-xl shadow-cyan-950/40',
      btnClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
    },
    { 
      id: 3, 
      itemId: 'vip_gold',
      name: 'VIP GOLD', 
      price: '25,000', 
      currency: 'PP', 
      duration: 'Örökös Tagság',
      badge: 'PRÉMIUM',
      features: ['+50% Fizetés bónusz', 'Örökös VIP státusz & Discord rang', 'Korlátlan névváltás', 'Azonnali szerver belépés (Tier 3)', 'Egyedi ház/garázs igénylési jog', 'Exkluzív jármű festések'],
      color: 'border-amber-400/50 bg-gradient-to-b from-amber-950/30 to-slate-900/80 shadow-xl shadow-amber-950/40',
      btnClass: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black'
    },
    { 
      id: 4, 
      itemId: 'cash_s',
      name: 'PÉNZ CSOMAG (S)', 
      price: '2,000', 
      currency: 'PP', 
      duration: 'Azonnali jóváírás',
      badge: 'GAZDASÁG',
      features: ['$500,000 készpénz a bankszámládra', 'Azonnali banki transzfer', 'Nem vonható le büntetésként'],
      color: 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white'
    },
    { 
      id: 5, 
      itemId: 'cash_l',
      name: 'PÉNZ CSOMAG (L)', 
      price: '8,000', 
      currency: 'PP', 
      duration: 'Azonnali jóváírás',
      badge: 'GAZDASÁG',
      features: ['$2,500,000 készpénz a bankszámládra', 'Azonnali banki transzfer', 'Ajándék prémium jármű tuning kupon'],
      color: 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-900/60',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white'
    },
    { 
      id: 6, 
      name: 'KIMÉRT PP PONT', 
      price: '1.5', 
      currency: 'EUR / 1000 PP', 
      duration: 'Egyedi feltöltés',
      badge: 'FELTÖLTÉS',
      features: ['Bankkártyás és PaySafeCard fizetés', 'Azonnali automatikus jóváírás', 'Tetszőleges összeg vásárolható'],
      color: 'border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/60',
      btnClass: 'bg-purple-600 hover:bg-purple-500 text-white'
    },
  ];

  const handleBuy = async (item: any) => {
    // A "Kimért PP Pont" (feltöltés) egyedi ügyintézést igényel, nincs beépített fizetési kapu
    if (!item.itemId) {
      toast.info(`PP feltöltés: ${item.name}`, {
        description: 'A feltöltéshez nyiss ticketet a Discord szerverünkön!'
      });
      return;
    }

    if (linked === false) {
      toast.error('Előbb kösd össze a fiókod!', {
        description: 'A "Fiókom" oldalon kötheted össze a Discord fiókodat a FiveM karaktereddel.'
      });
      setActiveTab?.('account');
      return;
    }

    setPurchasingId(item.itemId);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ itemId: item.itemId })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Sikeres vásárlás: ${item.name}`, {
          description: data.synced ? 'A jutalom jóváírva a karaktereden!' : 'A vásárlás rögzítve, hamarosan jóváírásra kerül.'
        });
      } else if (data.requiresLink) {
        toast.error(data.error);
        setActiveTab?.('account');
      } else {
        toast.error(data.error || 'A vásárlás sikertelen volt.');
      }
    } catch (e) {
      toast.error('Hiba történt a vásárlás közben.');
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
            🛒 HIVATALOS WEBSHOP
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white italic">
            Nexus <span className="text-cyan-400">Webshop</span> & Prémium
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl">
            Támogasd a Nexus Horizon RP szerver működését, és szerezz exkluzív vizuális és játékmenetbeli előnyöket.
          </p>
        </div>

        {/* User Balance Chips */}
        <div className="flex gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl min-w-[140px]">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              JÁTÉKBELI EGYENLEG
            </div>
            <div className="text-white font-mono font-bold text-2xl tracking-tight">
              ${(balance?.balance || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-cyan-950/40 border border-cyan-500/30 p-4 rounded-2xl min-w-[140px]">
            <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Coins size={12} /> PP PONTOK
            </div>
            <div className="text-cyan-300 font-mono font-bold text-2xl tracking-tight">
              {(balance?.ppBalance || 0).toLocaleString()} PP
            </div>
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-3xl border ${item.color} p-6 flex flex-col justify-between space-y-6 transition duration-200 hover:scale-[1.01]`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-900/90 text-slate-300 border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  {item.badge}
                </Badge>
                <div className="text-xs font-mono text-slate-400">
                  {item.duration}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  {item.name}
                </h3>
                <div className="text-3xl font-black text-cyan-400 font-mono mt-1">
                  {item.price} <span className="text-sm text-slate-400 font-normal">{item.currency}</span>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                {item.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handleBuy(item)}
              disabled={purchasingId === item.itemId}
              className={`w-full h-12 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 ${item.btnClass}`}
            >
              {purchasingId === item.itemId ? (
                <><Loader2 size={15} className="animate-spin" /> Feldolgozás...</>
              ) : item.itemId && linked === false ? (
                <><Link2 size={14} /> Összekötés Szükséges</>
              ) : (
                'Vásárlás Most'
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Custom Request Callout */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-xl sm:text-2xl font-black uppercase text-white">
            Egyedi Frakció vagy Céges Támogatás?
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg">
            Egyedi telephely, cégtábla, frakció bázis vagy flottaigénylés esetén nyiss ticketet a Discord szerverünkön!
          </p>
        </div>

        <a href="https://discord.gg" target="_blank" rel="noreferrer">
          <Button className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase h-12 px-6 rounded-xl border border-slate-700">
            Discord Ticket Nyitása
          </Button>
        </a>
      </div>

    </div>
  );
};
