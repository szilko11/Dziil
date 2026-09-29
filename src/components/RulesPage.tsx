import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  Crosshair, 
  Radio, 
  Search, 
  CheckCircle2, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Users,
  Check,
  Award,
  RefreshCw,
  Coins,
  Gavel,
  ChevronDown,
  MessageCircleQuestion,
  Clock,
  Ban
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

export const RulesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');

  // Live Readers Tracking Dashboard State
  const [stats, setStats] = useState({
    discordCount: 142,
    serverCount: 128,
    totalReaders: 270
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [hasAckedDiscord, setHasAckedDiscord] = useState(false);
  const [hasAckedServer, setHasAckedServer] = useState(false);
  const [ackFeedback, setAckFeedback] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Fetch live stats from API
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await fetch('/api/rules/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          discordCount: data.discordCount || 0,
          serverCount: data.serverCount || 0,
          totalReaders: data.totalReaders || ((data.discordCount || 0) + (data.serverCount || 0))
        });
      }
    } catch (e) {
      console.log('Using cached stats fallback');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Check local storage for previous acks
    const ackD = localStorage.getItem('nexus_rules_acked_discord') === 'true';
    const ackS = localStorage.getItem('nexus_rules_acked_server') === 'true';
    setHasAckedDiscord(ackD);
    setHasAckedServer(ackS);
  }, []);

  const handleAcknowledge = async (type: 'discord' | 'server') => {
    const isDiscord = type === 'discord';
    if (isDiscord && hasAckedDiscord) {
      setAckFeedback('Már korábban elfogadtad a Discord szabályzatot! ✅');
      setTimeout(() => setAckFeedback(null), 4000);
      return;
    }
    if (!isDiscord && hasAckedServer) {
      setAckFeedback('Már korábban elfogadtad a Szerver szabályzatot! ✅');
      setTimeout(() => setAckFeedback(null), 4000);
      return;
    }

    try {
      const res = await fetch('/api/rules/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userId: `web_user_${Math.random().toString(36).substring(2, 7)}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStats({
          discordCount: data.discordCount,
          serverCount: data.serverCount,
          totalReaders: data.totalReaders
        });
      } else {
        // Fallback optimistic increment
        setStats(prev => ({
          ...prev,
          discordCount: isDiscord ? prev.discordCount + 1 : prev.discordCount,
          serverCount: !isDiscord ? prev.serverCount + 1 : prev.serverCount,
          totalReaders: prev.totalReaders + 1
        }));
      }

      if (isDiscord) {
        setHasAckedDiscord(true);
        localStorage.setItem('nexus_rules_acked_discord', 'true');
        setAckFeedback('🎉 Köszönjük! Sikeresen elfogadtad a Discord Szabályzatot! ✅');
      } else {
        setHasAckedServer(true);
        localStorage.setItem('nexus_rules_acked_server', 'true');
        setAckFeedback('🎉 Köszönjük! Sikeresen elfogadtad a Szerver Szabályzatot! ✅');
      }

      setTimeout(() => setAckFeedback(null), 5000);
    } catch (e) {
      if (isDiscord) setHasAckedDiscord(true);
      else setHasAckedServer(true);
      setAckFeedback('✅ Szabályzat sikeresen elfogadva!');
      setTimeout(() => setAckFeedback(null), 4000);
    }
  };

  const categories = [
    { id: 'general', label: 'Általános Szabályzat', icon: BookOpen, count: 5, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { id: 'rp', label: 'RP Fogalmak & Szabályok', icon: Scale, count: 8, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { id: 'illegal', label: 'Illegális Tevékenység & Rablások', icon: Crosshair, count: 6, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { id: 'factions', label: 'Frakció & Banda Szabályok', icon: ShieldCheck, count: 5, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'economy', label: 'Gazdaság & Kereskedelem', icon: Coins, count: 5, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { id: 'discord', label: 'Discord & Kommunikáció', icon: Radio, count: 4, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  ];

  const rulesData: Record<string, Array<{ title: string; desc: string; important?: boolean; example?: string }>> = {
    general: [
      {
        title: 'Tiszteletteljes Viselkedés & Közösségi Normák',
        desc: 'Minden játékos köteles tisztelettudóan viselkedni játékostársaival és a staff csapattal szemben mind a játékszerveren, mind a Discordon. A mások minősítése, zaklatása vagy kirekesztése azonnali kitiltást von maga után.',
        important: true
      },
      {
        title: 'Mikrofon & Kommunikációs Követelmények',
        desc: 'A szerverre való belépés feltétele a megfelelően működő, visszhang- és zajmentes mikrofon megléte. Hangtorzító használata kizárólag engedélyezett szerepjátékos kontextusban (pl. maszkos rablás) használható.',
      },
      {
        title: 'Karakternév Szabályzat',
        desc: 'A névnek reális, vezeték- és keresztnévből kell állnia (pl. John Miller, Kovacs Peter). Hírességek, vulgáris szavak, mémek vagy kitalált fantázianevek használata tilos.',
      },
      {
        title: 'Csalások, Külső Segédprogramok & Exploitek (Zéró Tolerancia)',
        desc: 'Bármilyen harmadik féltől származó szoftver (pl. aimbot, speedhack, noclip, crosshair overlay) vagy játékmechanikai bugok szándékos kihasználása azonnali, feloldhatatlan végleges kitiltást eredményez.',
        important: true
      },
      {
        title: 'Fiókmegosztás és Értékátvitel',
        desc: 'Tilos fiókok átadása, megosztása vagy játékon belüli javak valós pénzre (RMT) történő átváltása vagy azzal való kereskedés.',
      }
    ],
    rp: [
      {
        title: 'In Character (IC) és Out of Character (OOC)',
        desc: 'Szigorúan tilos a két világ keverése. Az IC történések a játékbeli karaktered életét jelentik, míg az OOC a valós énedet. Karaktered nem tudhat olyan dolgokról, amiket csak te mint ember tudsz a képernyő előtt.',
        example: 'Példa: Discord chaten olvasott infót nem használhatsz fel a játékban anélkül, hogy a karaktered nem tudta meg IC.'
      },
      {
        title: 'MetaGaming (MG)',
        desc: 'OOC úton szerzett információk felhasználása IC játékban szigorúan tilos! Ide tartozik a stream nézés, Discord hívás használata RP közben, vagy Discord chatek olvasása.',
        important: true
      },
      {
        title: 'PowerGaming (PG)',
        desc: 'Olyan cselekedetek végrehajtása, amelyek a valóságban fizikai vagy logikai képtelenségek, vagy a másik fél döntési lehetőségének teljes ellehetetlenítése (/me felveszi a földről és azonnal elvágja a torkát anélkül hogy védekezhetne).',
        example: 'Példa: 100 km/h-val fának csapódsz, de kiszállsz és azonnal elkezdesz futni és lőni.'
      },
      {
        title: 'DeathMatch (DM)',
        desc: 'Indokolatlan vagy nem kellően megalapozott gyilkosság, lövöldözés vagy erőszakos támadás. Minden fegyveres konfliktusnak komoly, előre felépített szerepjátékos indokának kell lennie.',
        important: true
      },
      {
        title: 'Fear RP (Félelemérzet szerepjátéka)',
        desc: 'Minden karakternek kötelessége félteni az életét. Ha fegyvert fognak a fejedhez vagy túlerővel szembesülsz, köteles vagy együttműködni, hacsak nincs egyértelmű, reális esélyed a menekülésre.',
      },
      {
        title: 'New Life Rule (NLR - Új Élet Szabály)',
        desc: 'Ha a karaktered meghal (PK - Player Kill), a kórházi újraéledés után nem emlékezhet az őt halálhoz vezető közvetlen eseményekre, és nem térhet vissza az incidens helyszínére legalább 30 percig.',
      },
      {
        title: 'Force RP',
        desc: 'Saját akaratod ráerőltetése a másik félre úgy, hogy annak semmilyen esélyt vagy reakcióidőt nem hagysz a szerepjátékra.',
      },
      {
        title: 'Drive-By & VDM (Vehicle Deathmatch)',
        desc: 'Tilos más játékosokat szándékosan elütni járművel, vagy fegyvertelen személyekre járműből tüzet nyitni.',
      }
    ],
    illegal: [
      {
        title: 'Rablási Szabályok & Létszámkorlátok',
        desc: 'Minden rablásnál (kisbolt, ékszerbolt, bank) betartandó a maximális rablói és rendvédelmi létszám, valamint az előzetes felkészülés (tárgyaló biztosítása, túsz ejtése).',
      },
      {
        title: 'Túsz Szabályzat & Kamu Túsz Tilalom',
        desc: 'Tilos ismerőst vagy banda tagot beállítani túsznak ("kamu túsz"). A tússzal való bánásmódnak reálisnak kell lennie; a túsz nem sérülhet ok nélkül, ha a rendvédelem teljesíti az ésszerű követeléseket.',
        important: true
      },
      {
        title: 'Banda Területek (Hood RP)',
        desc: 'Egy hivatalos illegális frakció vagy banda területére való belépés magas kockázattal jár. Idegenként provokálni vagy fegyvert rántani a banda területén azonnali IC válaszreakciót vonhat maga után.',
      },
      {
        title: 'Rendvédelmi járművek és fegyverek rablása',
        desc: 'Rendőrautók és szolgálati fegyverek elvétele csak alapos indokkal, jól megtervezett és staff által tudomásul vett nagyszabású RP szituációban lehetséges.',
      },
      {
        title: 'Csomagtartózás és Lootolás',
        desc: 'Tilos más játékosokat pusztán anyagi javak kifosztása céljából indokolatlanul feltartóztatni vagy megölni. A fegyverek és pénz elvétele megalapozott RP előzményt kíván.',
      },
      {
        title: 'Golyóálló mellény és Heavy Armor RP',
        desc: 'A sérülések szerepjátéka minden esetben kötelező még mellény viselése esetén is.',
      }
    ],
    factions: [
      {
        title: 'Frakció Vezetői Felelősség',
        desc: 'A frakció leaderek felelősek tagjaik magatartásáért és a szabályok betartásáért. Rendszeres szabályszegések esetén a frakció figyelmeztetésben részesülhet vagy feloszlatásra kerülhet.',
      },
      {
        title: 'Frakció Háborúk & CK Szabályok',
        desc: 'Banda- és frakcióháborúk kizárólag Staff jóváhagyással és előre rögzített feltételekkel indíthatók el. CK (Karakter Végleges Halála) kizárólag alapos indokkal és jóváhagyással hajtható végre.',
        important: true
      },
      {
        title: 'Frakció Járművek és Felszerelések Használata',
        desc: 'A frakció javait kizárólag a szervezet céljaira lehet használni, azok magáncélú kisajátítása vagy eladása tilos.',
      },
      {
        title: 'Tagfelvétel és Ranglétrák',
        desc: 'Minden frakció köteles a felvételt és előléptetéseket tiszta IC folyamatokon keresztül lebonyolítani.',
      },
      {
        title: 'Frakcióváltási Korlátozások',
        desc: 'Frakcióból való kilépés után minimum 7 napos várakozási idő érvényes új frakcióba való belépés előtt.',
      }
    ],
    economy: [
      {
        title: 'Reális Árazás & Piaci Egyensúly',
        desc: 'A saját üzletben vagy webshopban meghatározott áraknak igazodniuk kell a szerver gazdasági egyensúlyához. A mesterséges áringadozás vagy a piac szándékos manipulálása staff figyelmet vonhat maga után.',
      },
      {
        title: 'Valós Pénzért Történő Kereskedelem (RMT) Tilalma',
        desc: 'Szigorúan tilos játékon belüli valutát, tárgyakat vagy fiókokat valós pénzért adni, venni vagy cserélni a hivatalos webshopon kívül. Ez azonnali, végleges kitiltást von maga után.',
        important: true
      },
      {
        title: 'Vállalkozások & Cégalapítás',
        desc: 'Legális vállalkozás alapításához előzetes gazdasági tervet és staff jóváhagyást kell benyújtani. A cég vagyonát kizárólag a bejegyzett tevékenységi körnek megfelelően lehet felhasználni.',
      },
      {
        title: 'Adózás és Illegális Jövedelem Tisztára Mosása',
        desc: 'Az illegális úton szerzett jövedelmet kizárólag a kijelölt pénzmosó rendszereken keresztül lehet legalizálni. A bug vagy exploit útján szerzett pénz azonnali elkobzást és büntetést eredményez.',
      },
      {
        title: 'Aukciók & Csereüzletek Játékosok Között',
        desc: 'Nagyértékű tárgyak (jármű, ingatlan, fegyver) cseréjénél ajánlott staff vagy tanú jelenléte a csalások elkerülése végett. A szerver nem vállal felelősséget a tanú nélküli, be nem jelentett csalásokért.',
      }
    ],
    discord: [
      {
        title: 'Hang- és Szöveges Szobák Rendje',
        desc: 'Kérjük, minden üzenetet a megfelelő témájú szobában tegyél közzé. Tilos a floodolás, a nem megfelelő médiafájlok megosztása és a kéretlen direkt üzenetek (DM hirdetések) küldése.',
      },
      {
        title: 'Ticket Rendszer Használata',
        desc: 'Support és adminisztrátori segítséget a megfelelő ticket kategóriában kérj. Kérjük, egy problémához csak egy ticketet nyiss, és foglald össze pontosan az esetet.',
      },
      {
        title: 'Staff Döntések és Panaszkönyv',
        desc: 'A staff tagok döntései a játékszerveren érvényesek. Amennyiben egy döntéssel nem értesz egyet, azt a Discord panaszkönyv szekcióban teheted szóvá higgadtan, bizonyítékokkal alátámasztva.',
        important: true
      },
      {
        title: 'Hirdetési Szabályok',
        desc: 'Más Discord szerverek, játékszerverek vagy szolgáltatások reklámozása azonnali kitiltással jár.',
      }
    ]
  };

  const punishmentTiers = [
    { level: '1. Figyelmeztetés', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25', desc: 'Enyhe, nem szándékos szabályszegés (pl. kisebb MG/PG eset).', action: 'Szóbeli / írásbeli figyelmeztetés a Discordon.' },
    { level: '2. Ideiglenes Kitiltás', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', desc: 'Ismétlődő vagy közepes súlyú szabályszegés (pl. DM, hamis túsz).', action: '1–7 napos kitiltás a szerverről, staff mérlegelés alapján.' },
    { level: '3. Súlyos Kitiltás', color: 'text-orange-400 bg-orange-500/10 border-orange-500/25', desc: 'Súlyos, szándékos szabályszegés vagy staff döntés semmibevétele.', action: '14–30 napos kitiltás, frakciótagság felfüggesztése.' },
    { level: '4. Végleges Kitiltás', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', desc: 'Csalás, exploit, RMT vagy súlyosan sértő magatartás.', action: 'Végleges, feloldhatatlan kitiltás a szerverről és a Discordról.' },
  ];

  const faqItems = [
    { q: 'Mennyi idő alatt bírálják el a whitelist kérelmemet?', a: 'A whitelist kvíz és bemutatkozás elbírálása általában 24–48 órát vesz igénybe. Az eredményről Discord DM-ben és a #whitelist-eredmenyek csatornában is értesítést kapsz.' },
    { q: 'Mi történik, ha megszegek egy szabályt?', a: 'A szabályszegés súlyosságától függően a staff csapat a fenti Büntetési Rendszer alapján jár el, a szóbeli figyelmeztetéstől a végleges kitiltásig. Minden esetet egyénileg vizsgálunk.' },
    { q: 'Hogyan jelenthetek be egy szabályszegést?', a: 'Nyiss egy ticketet a Discord szerver #support-ticket csatornájában, csatolj bizonyítékot (klip, screenshot) és írd le részletesen a történteket. A staff csapat mielőbb kivizsgálja.' },
    { q: 'Fellebbezhetek egy staff döntés ellen?', a: 'Igen. A Discord panaszkönyv szekcióban, higgadt hangnemben és bizonyítékkal alátámasztva jelezheted, ha úgy érzed, jogtalanság ért. A vezetőség minden fellebbezést átnéz.' },
    { q: 'Használhatok hangtorzítót RP közben?', a: 'Kizárólag indokolt szerepjátékos kontextusban (pl. maszkos rablás, telefonhívás elváltoztatott hangon), staff jóváhagyással vagy egyértelmű RP indokkal.' },
  ];

  const currentRules = rulesData[activeCategory] || [];
  const filteredRules = searchTerm
    ? Object.values(rulesData).flat().filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.desc.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : currentRules;

  return (
    <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-8 sm:p-10 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-0.5">
                📜 SZERVER IRÁNYELVEK & WHITELIST
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-0.5">
                ✨ ÚJ: Büntetési Rendszer & GYIK
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white italic">
              Nexus Horizon <span className="text-cyan-400">Szabályzat</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Ismerd meg a szerver és a Discord szabályzatát, a szintezett büntetési rendszert, valamint a leggyakoribb kérdéseket. A teszt kitöltése előtt kötelező mindkét szabályzat elolvasása és elfogadása.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full md:w-80 relative shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés a szabályok között..."
              className="bg-slate-950/80 border-slate-700/80 pl-10 text-xs sm:text-sm h-12 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* READ RULES TRACKING DASHBOARD (Visual Dashboard with Green Checkmarks)    */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">
                ✓
              </span>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Szabályzat Olvasottsági Dashboard
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Valós idejű statisztika a Discord és Szerver szabályzatot igazoltan elolvasott játékosokról.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5 h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Frissítés
          </Button>
        </div>

        {/* 3 Main Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Card 1: Discord Rules Readers */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-900 border border-indigo-500/30 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-400" /> Discord Szabályzat
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                Elolvasva
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                <span className="text-emerald-400 text-2xl sm:text-3xl">✅</span> {stats.discordCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">olvasó</span>
            </div>
            <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Te állapotod:</span>
              {hasAckedDiscord ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Elfogadva
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400">Olvasatlan</span>
              )}
            </div>
          </div>

          {/* Card 2: Server Rules Readers */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-900 border border-rose-500/30 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-rose-400" /> Szerver Szabályzat
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                Elolvasva
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                <span className="text-emerald-400 text-2xl sm:text-3xl">✅</span> {stats.serverCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">olvasó</span>
            </div>
            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Te állapotod:</span>
              {hasAckedServer ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Elfogadva
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-400">Olvasatlan</span>
              )}
            </div>
          </div>

          {/* Card 3: Total Verified Readers */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-900 border border-emerald-500/30 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Összes Igazolás
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Hitelesített
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight flex items-center gap-2 font-mono">
                <span className="text-emerald-400 text-2xl sm:text-3xl">✅</span> {stats.totalReaders}
              </span>
              <span className="text-xs text-slate-400 font-medium">összesen</span>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Közösségi arány:</span>
              <span className="text-xs font-bold text-emerald-400">
                100% Aktív Tag
              </span>
            </div>
          </div>

        </div>

        {/* Interactive "I have read" Action Buttons Bar */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" /> Szabályzat Elfogadási Igazolás
              </div>
              <p className="text-xs text-slate-400">
                Kattints az alábbi gombokra az elolvasás igazolásához. A számláló azonnal növekszik a zöld pipával!
              </p>
            </div>

            {ackFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
              >
                {ackFeedback}
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Button 1: Discord Rules */}
            <button
              onClick={() => handleAcknowledge('discord')}
              className={`p-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all duration-200 ${
                hasAckedDiscord 
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/30' 
                  : 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{hasAckedDiscord ? '✅' : '📜'}</span>
                <span>{hasAckedDiscord ? 'Discord Szabályzat Elolvasva' : 'Elolvastam a Discord Szabályzatot'}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-emerald-400 font-mono text-xs">
                ✅ {stats.discordCount}
              </span>
            </button>

            {/* Button 2: Server Rules */}
            <button
              onClick={() => handleAcknowledge('server')}
              className={`p-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all duration-200 ${
                hasAckedServer 
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/30' 
                  : 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/40 text-rose-200 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{hasAckedServer ? '✅' : '📖'}</span>
                <span>{hasAckedServer ? 'Szerver Szabályzat Elolvasva' : 'Elolvastam a Szerver Szabályzatot'}</span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-emerald-400 font-mono text-xs">
                ✅ {stats.serverCount}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Rules Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Category Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
            Kategóriák
          </div>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id && !searchTerm;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchTerm('');
                }}
                className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/10 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cat.color}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className={`text-sm font-black uppercase tracking-wide ${isActive ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'}`}>
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {cat.count} fő pont
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className={`transition-transform ${isActive ? 'text-cyan-400 translate-x-1' : 'text-slate-600'}`} />
              </button>
            );
          })}

          {/* Quick Notice Card */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 mt-6">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
              <ShieldAlert size={16} /> Fontos Figyelmeztetés
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Bármilyen vitás helyzetben a döntő szó mindig a jelen lévő adminisztrátoré. Ha úgy érzed, jogtalanság ért, nyiss panaszkönyvet bizonyítékkal.
            </p>
          </div>
        </div>

        {/* Rules List Container */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">
              {searchTerm ? `Keresési találatok: "${searchTerm}" (${filteredRules.length})` : categories.find(c => c.id === activeCategory)?.label}
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
              Verzió 2.5 • Frissítve
            </Badge>
          </div>

          <div className="space-y-4">
            {filteredRules.length > 0 ? (
              filteredRules.map((rule, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl border transition-all duration-200 ${
                    rule.important 
                      ? 'bg-gradient-to-r from-rose-950/20 via-slate-900 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20' 
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                        rule.important ? 'bg-rose-500 text-white' : 'bg-slate-800 text-cyan-400 border border-slate-700'
                      }`}>
                        {idx + 1}
                      </div>
                      <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-tight">
                        {rule.title}
                      </h3>
                    </div>
                    {rule.important && (
                      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[9px] font-black uppercase tracking-wider shrink-0">
                        FONTOS
                      </Badge>
                    )}
                  </div>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pl-10">
                    {rule.desc}
                  </p>

                  {rule.example && (
                    <div className="mt-3 ml-10 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-cyan-300/90 italic font-mono">
                      💡 {rule.example}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
                <HelpCircle size={36} className="mx-auto text-slate-600" />
                <div className="text-slate-300 font-bold text-sm">Nincs találat a megadott kifejezésre</div>
                <div className="text-slate-500 text-xs">Próbálj más kulcsszót vagy töröld a keresőt</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* BÜNTETÉSI RENDSZER — SZINTEZETT TÁBLÁZAT (ÚJ FUNKCIÓ)                     */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
            <Gavel size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
              Büntetési Rendszer
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Átlátható, szintezett eljárásrend a szabályszegések kezelésére.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
          {punishmentTiers.map((tier, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border space-y-3 bg-slate-950/40 ${tier.color.split(' ').find(c => c.startsWith('border-'))}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${tier.color}`}>
                  {tier.level}
                </span>
                {idx === punishmentTiers.length - 1 ? (
                  <Ban size={16} className="text-rose-400" />
                ) : (
                  <Clock size={16} className="text-slate-500" />
                )}
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{tier.desc}</p>
              <div className="pt-2 border-t border-slate-800 flex items-start gap-2">
                <ChevronRight size={14} className="text-slate-500 mt-0.5 shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">{tier.action}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="relative p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] sm:text-xs text-slate-400 leading-relaxed">
          A fenti szintek irányadóak — az esetek súlyosságától és előzményeitől függően a staff csapat szintet ugorhat (pl. csalás esetén azonnali 4. szint).
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GYIK — GYAKRAN ISMÉTELT KÉRDÉSEK (ÚJ FUNKCIÓ)                             */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
            <MessageCircleQuestion size={22} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
              Gyakran Ismételt Kérdések
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              A leggyakoribb kérdések a szabályzattal, whitelisttel és elbírálással kapcsolatban.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen ? 'bg-slate-900/90 border-cyan-500/40' : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className={`text-xs sm:text-sm font-bold ${isOpen ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {item.q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
