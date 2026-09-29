import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Crown, 
  Building2, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Palette, 
  MapPin, 
  MessageSquare,
  Clock,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Plus,
  Trash2,
  HelpCircle,
  Car,
  Shirt,
  Image as ImageIcon,
  Flame,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { FactionApplicationFull } from '../types';

interface FactionApplicationViewProps {
  auth?: any;
  onSuccess?: (app: any) => void;
  onNavigateHome?: () => void;
  onLoginClick?: () => void;
}

const FACTION_TYPES = [
  { id: 'gang', label: 'Utcai Banda (Street Gang)', emoji: '👑', desc: 'Területfelügyelet, utcai rivalizálás, feketepiac, illegális versenyek', color: '#f59e0b' },
  { id: 'mafia', label: 'Maffia / Szervezet', emoji: '🏴‍☠️', desc: 'Elegáns bűnszervezet, cégek, kaszinók, védelmi pénzek, fegyverkereskedelem', color: '#d97706' },
  { id: 'cartel', label: 'Drogkartell', emoji: '💀', desc: 'Nagybani drogtermesztés, laborok, nemzetközi szállítás, fegyveres konvojok', color: '#dc2626' },
  { id: 'mc', label: 'Motoros Klub (MC)', emoji: '🏍️', desc: 'Testvériség, klubház üzemeltetés, motoros túrák, fegyver- és védelmi üzletek', color: '#7c3aed' },
  { id: 'syndicate', label: 'Szervezett Bűnözői Csoport', emoji: '💼', desc: 'Modern fehérgalléros bűnözés, pénzmosás, politikai befolyás', color: '#0284c7' },
  { id: 'legal', label: 'Legális Szervezet / Cég', emoji: '🚓', desc: 'Rendvédelem, Mentőszolgálat, Autószerelő telep, Biztonsági cég', color: '#2563eb' }
];

const PRESET_COLORS = [
  { label: 'Arany / Sárga', hex: '#f59e0b' },
  { label: 'Királylila', hex: '#8b5cf6' },
  { label: 'Smaragdzöld', hex: '#10b981' },
  { label: 'Vérvörös', hex: '#ef4444' },
  { label: 'Királykék', hex: '#3b82f6' },
  { label: 'Éjfekete', hex: '#27272a' },
  { label: 'Türkizkék', hex: '#06b6d4' },
  { label: 'Rózsaszín', hex: '#ec4899' }
];

export const FactionApplicationView: React.FC<FactionApplicationViewProps> = ({ 
  auth, 
  onSuccess, 
  onNavigateHome,
  onLoginClick
}) => {
  const [rulesAccepted, setRulesAccepted] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedApp, setSubmittedApp] = useState<any>(null);

  // Full 8-Step Form State
  const [formData, setFormData] = useState<Partial<FactionApplicationFull>>({
    applicant: {
      discordTag: auth?.user?.username || '',
      discordId: auth?.user?.id || '',
      fivemCharacterName: '',
      fivemIdentifier: '',
      age: 20,
      weeklyHours: 25,
      serverExperienceTime: '6 hónapja játszom a szerveren',
      wasLeaderBefore: true,
      pastExperienceDesc: 'Korábbi szervereken több illegális és legális frakciót vezettem sikeresen.'
    },
    faction: {
      fullName: '',
      tag: '',
      type: 'gang',
      leaderIC: '',
      coLeaderIC: '',
      initialMembersCount: 5,
      plannedMaxMembers: 15,
      primaryColor: '#f59e0b',
      secondaryColor: '#18181b'
    },
    lore: {
      backstory: '',
      whyFormed: 'Egy összetartó, lojális közösség megteremtése a város utcáin.',
      whyLosSantos: 'A város dinamikája és a rivális csoportok jelenléte tökéletes terep az érvényesüléshez.',
      mainGoal: 'Minőségi, hosszan tartó RP szálak és a helyi alvilági/legális gazdaság fellendítése.',
      valuesAndPrinciples: 'Tisztelet, hűség, szabályok maradéktalan betartása és az anti-DM szemlélet.',
      uniqueness: 'Nem a fegyveres harc az elsődleges, hanem a kidolgozott karakterkapcsolatok és üzletek.'
    },
    rpPlan: {
      rpVision: '',
      civilianInteraction: 'Közösségi események, szórakozóhely és védelem biztosítása a civileknek.',
      otherFactionsInteraction: 'Tárgyalások, gazdasági együttműködések és tiszta szabályos RP konfliktusok.',
      policeRelation: 'Fokozott óvatosság, reális életféltés, felesleges lövöldözések kerülése.',
      legalActivities: 'Autós találkozók, vendéglátás és autószerelés.',
      illegalActivities: 'Feketepiac, területi befolyás és illegális versenyek.',
      moneyMakingModel: 'Kereskedelem, rendezvények belépődíjai és védelmi megállapodások.',
      offPeakPlan: 'Belső frakció RP, toborzás, karakterfejlesztés és megbeszélések.',
      antiGunplayStrategy: 'Minden konfliktust először verbálisan, tárgyalásos úton próbálunk megoldani.',
      scenarios: [
        '1. Szituáció: Civil védelmi szerződés megkötése egy belvárosi klubbal.',
        '2. Szituáció: Határterületi egyeztetés rivális motoros klubbal fegyvermentes zónában.',
        '3. Szituáció: Frakciótag beavatási szertartása és titoktartási esküje.'
      ]
    },
    members: [
      {
        discordTag: auth?.user?.username || 'leader#0001',
        discordId: auth?.user?.id || '',
        fivemName: '',
        plannedRank: 'Leader (Frakcióvezető)',
        roleTitle: 'Alapító / Leader',
        notes: 'Fő pályázó'
      },
      {
        discordTag: 'tag2#1234',
        fivemName: 'Marcus_Vance',
        plannedRank: 'Co-Leader',
        roleTitle: 'Alvezér',
        notes: 'Operatív vezető'
      },
      {
        discordTag: 'tag3#5678',
        fivemName: 'Dominic_Cole',
        plannedRank: 'Member',
        roleTitle: 'Teljes jogú tag',
        notes: 'Fegyverfelelős'
      }
    ],
    ranks: [
      { id: '1', name: 'Leader', level: 1, description: 'Frakcióvezető és döntéshozó', permissions: ['all'] },
      { id: '2', name: 'Co-Leader', level: 2, description: 'Alvezér és operatív irányító', permissions: ['manage_members', 'events', 'announcements'] },
      { id: '3', name: 'High Command', level: 3, description: 'Tapasztalt vezető tag', permissions: ['invite', 'events'] },
      { id: '4', name: 'Member', level: 4, description: 'Teljes jogú frakciótag', permissions: ['chat', 'voice'] },
      { id: '5', name: 'Prospect / Újonc', level: 5, description: 'Próbaidős tag', permissions: ['chat', 'voice'] }
    ],
    appearance: {
      logoUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
      referenceImages: [],
      clothingStyle: 'Elegáns fekete öltönyök vagy egységes stílusú utcai viselet',
      vehiclesPlanned: 'Frakciószínű sötét járművek és motorok',
      hqVision: 'Chamberlain Hills vagy Mirror Park garázs',
      hqCoordinates: 'X: 120.4, Y: -1420.5, Z: 29.4'
    }
  });

  const handleRulesChoice = (accepted: boolean) => {
    setRulesAccepted(accepted);
    if (accepted) {
      toast.success('Szabályzat elfogadva! Az űrlap megnyílt a kitöltéshez.');
    } else {
      toast.error('A frakció igényléséhez kötelező a szabályzat feltételeinek elfogadása!');
    }
  };

  // Helper for nested updates
  const updateApplicant = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, applicant: { ...prev.applicant!, [field]: val } }));
  };

  const updateFaction = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, faction: { ...prev.faction!, [field]: val } }));
  };

  const updateLore = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, lore: { ...prev.lore!, [field]: val } }));
  };

  const updateRpPlan = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, rpPlan: { ...prev.rpPlan!, [field]: val } }));
  };

  const updateAppearance = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, appearance: { ...prev.appearance!, [field]: val } }));
  };

  // Member management in form
  const addMemberRow = () => {
    setFormData(prev => ({
      ...prev,
      members: [
        ...(prev.members || []),
        {
          discordTag: '',
          fivemName: '',
          plannedRank: 'Member',
          roleTitle: 'Tag',
          notes: ''
        }
      ]
    }));
  };

  const removeMemberRow = (index: number) => {
    if ((formData.members?.length || 0) <= 1) {
      toast.error('Legalább a Leadert tartalmaznia kell a taglistának!');
      return;
    }
    setFormData(prev => ({
      ...prev,
      members: prev.members?.filter((_, i) => i !== index)
    }));
  };

  const updateMemberRow = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const updated = [...(prev.members || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, members: updated };
    });
  };

  // Validation before step transition
  const validateAndNext = () => {
    if (currentStep === 1) {
      if (!formData.applicant?.discordTag?.trim() || !formData.applicant?.fivemCharacterName?.trim()) {
        toast.error('Kérjük, add meg a Discord neved és a FiveM karakterneved!');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.faction?.fullName?.trim()) {
        toast.error('Kérjük, add meg a frakció pontos nevét!');
        return;
      }
      if (!formData.faction?.tag?.trim()) {
        toast.error('Kérjük, adj meg egy rövidítést (pl. LSK, CMC)!');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.lore?.backstory?.trim() || formData.lore.backstory.length < 50) {
        toast.error('Kérjük, írj legalább 50 karakteres háttértörténetet!');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.rpPlan?.rpVision?.trim() || formData.rpPlan.rpVision.length < 50) {
        toast.error('Kérjük, fejtsd ki az RP tervet részletesebben (min. 50 karakter)!');
        return;
      }
    } else if (currentStep === 5) {
      if (!formData.members || formData.members.length < 3) {
        toast.error('Egy új frakció indításához minimum 3 induló tag szükséges a listában!');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 8));
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Partial<FactionApplicationFull> = {
        ...formData,
        rulesAccepted: true,
        rulesAcceptedAt: new Date().toISOString(),
        source: 'web'
      };

      const res = await fetch('/api/factions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a beküldés során');

      setSubmittedApp(data.application || payload);
      toast.success('Frakciókérelem sikeresen beküldve! A Discord szerveren megnyílt a bírálati csatorna.');
      if (onSuccess) onSuccess(data.application);
    } catch (err: any) {
      toast.error(err.message || 'Nem sikerült elküldeni a kérelmet');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedApp) {
    return (
      <div className="pt-24 pb-24 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Card className="bg-zinc-950/90 border-emerald-500/30 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden text-center p-8 md:p-12 space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 size={44} />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 uppercase tracking-widest text-[10px] font-black">
              🟡 ELBÍRÁLÁS ALATT • DISCORDON RÖGZÍTVE
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white italic">
              {submittedApp.faction?.fullName || submittedApp.factionName}
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto text-sm leading-relaxed">
              A frakció alapítási kérelmed sikeresen megérkezett a <b>Nexus Horizon RP</b> Discord szerverének <span className="text-cyan-400 font-mono">📥・frakció-kérelmek</span> csatornájába!
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-2xl max-w-md mx-auto text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">Azonosító:</span>
              <span className="text-emerald-400 font-mono font-bold">{submittedApp.id || 'fac_live'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">Leader IC & DC:</span>
              <span className="text-white font-bold">{submittedApp.applicant?.fivemCharacterName || submittedApp.leaderIC} ({submittedApp.applicant?.discordTag || submittedApp.leaderDiscord})</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">Frakció Típusa:</span>
              <span className="text-amber-400 font-bold uppercase">{submittedApp.faction?.type || submittedApp.factionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">Automatikus Szobák:</span>
              <span className="text-emerald-400 font-bold">Jóváhagyás után azonnal generálódik</span>
            </div>
          </div>

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl max-w-lg mx-auto text-xs text-indigo-300 text-left space-y-1">
            <div className="font-bold flex items-center gap-2 text-white">
              <Sparkles size={14} className="text-indigo-400" /> Mi a következő lépés?
            </div>
            <p className="text-zinc-400 leading-relaxed">
              1. A staff áttekinti a lapot a Discordon.<br />
              2. Szükség esetén megnyitnak egy <span className="text-indigo-300 font-mono">🎤・interju-[tag]</span> szobát egyeztetésre.<br />
              3. Elfogadáskor a bot <b>automatikusan létrehozza a Discord kategóriát, csatornákat és rangokat!</b>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            {onNavigateHome && (
              <Button onClick={onNavigateHome} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-white rounded-xl">
                Vissza a Főoldalra
              </Button>
            )}
            <Button 
              onClick={() => { setSubmittedApp(null); setRulesAccepted(null); setCurrentStep(1); }} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              Új kérelem benyújtása
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24 px-4 sm:px-6 max-w-5xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest">
          <Crown size={14} className="animate-pulse" />
          Hivatalos Frakciókérelem & Rendszerkezelő
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase italic drop-shadow-md">
          Frakció <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-300">Alapítás</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Töltsd ki az alábbi 8 lépéses hivatalos kérvényt. A vezetőségi jóváhagyást követően a rendszer <b>automatikusan létrehozza a teljes Discord struktúrát és rangokat!</b>
        </p>
      </div>

      {/* STEP 1: RULES ACCEPTANCE GATE */}
      <Card className={`border transition-all duration-300 rounded-3xl overflow-hidden shadow-2xl ${rulesAccepted === true ? 'bg-zinc-950/70 border-emerald-500/30' : rulesAccepted === false ? 'bg-zinc-950/70 border-red-500/40' : 'bg-zinc-950/80 border-amber-500/30'}`}>
        <div className={`h-1.5 bg-gradient-to-r ${rulesAccepted === true ? 'from-emerald-500 to-teal-400' : rulesAccepted === false ? 'from-red-500 to-rose-400' : 'from-amber-500 to-yellow-400'}`} />
        <CardHeader className="p-6 sm:p-8 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-white italic">
              <FileText className="text-amber-400" />
              Kötelező Frakció Szabályzat & Feltételek
            </CardTitle>
            {rulesAccepted === true && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1 font-bold">
                ✅ ELFOGADVA
              </Badge>
            )}
            {rulesAccepted === false && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 font-bold">
                ❌ ELUTASÍTVA
              </Badge>
            )}
          </div>
          <CardDescription className="text-zinc-400 text-sm">
            Kérjük, hogy a lap kitöltése előtt figyelmesen olvasd át az alapvető frakció követelményeket!
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-amber-500/20 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
                <Users size={16} /> Létszám és Csapat
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Új frakció alapításához minimum <b>3-5 aktív fő</b> szükséges. A tagoknak ismerniük kell a szerver szabályzatát (DM, PG, MG tilalom).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-amber-500/20 transition-colors">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                <Crown size={16} /> Szerepjáték (RP) Minőség
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                A szerver nem fegyveres harcokról szól. A frakciónak életszerű célokkal, vállalkozási vagy közösségi szálakkal kell rendelkeznie.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-amber-500/20 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <ShieldCheck size={16} /> Leaderi Felelősségvállalás
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                A frakció vezetője teljes felelősséggel tartozik a tagjai viselkedéséért. Súlyos vagy ismétlődő NonRP esetén a frakció figyelmeztetést (Warn) kap.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 hover:border-amber-500/20 transition-colors">
              <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wider">
                <Building2 size={16} /> HQ, Garázs és Széf
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Sikeres bírálat után a vezetőség biztosítja az in-game jogokat, frakció garázst és széfet a kijelölt bázison.
              </p>
            </div>
          </div>

          {/* Interactive Acceptance Section */}
          <div className="p-6 rounded-2xl bg-black/40 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center justify-center sm:justify-start gap-2">
                <Sparkles size={16} className="text-amber-400" />
                Elolvastad és elfogadod a fenti szabályzatot és követelményeket?
              </h4>
              <p className="text-zinc-500 text-xs">
                A 8-lépéses kérvény kizárólag a jóváhagyás után válik elérhetővé.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                type="button"
                onClick={() => handleRulesChoice(true)}
                className={`h-11 px-6 rounded-xl font-bold transition-all ${
                  rulesAccepted === true 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400' 
                    : 'bg-zinc-800 hover:bg-emerald-600/80 text-zinc-200 hover:text-white'
                }`}
              >
                <CheckCircle2 size={18} className="mr-2 text-emerald-400" />
                Igen, Elfogadom
              </Button>

              <Button
                type="button"
                onClick={() => handleRulesChoice(false)}
                className={`h-11 px-6 rounded-xl font-bold transition-all ${
                  rulesAccepted === false 
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 ring-2 ring-red-400' 
                    : 'bg-zinc-800 hover:bg-red-600/80 text-zinc-400 hover:text-white'
                }`}
              >
                <XCircle size={18} className="mr-2 text-red-400" />
                Nem fogadom el
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8-STEP WIZARD (ONLY IF RULES ACCEPTED) */}
      <AnimatePresence>
        {rulesAccepted === true && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Step Indicator Tabs */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-zinc-950/80 border border-zinc-800 p-2 rounded-2xl">
              {[
                { step: 1, label: '01 Adatok' },
                { step: 2, label: '02 Frakció' },
                { step: 3, label: '03 Lore' },
                { step: 4, label: '04 RP-Terv' },
                { step: 5, label: '05 Tagok' },
                { step: 6, label: '06 Rangok' },
                { step: 7, label: '07 Megjelenés' },
                { step: 8, label: '08 Összegzés' }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStep(s.step)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all text-center ${
                    currentStep === s.step
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : currentStep > s.step
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Card className="bg-zinc-950/90 border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-8">
              {/* STEP 1: APPLICANT DETAILS */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <UserCheck className="text-amber-400" />
                      01 – Jelentkező Adatai
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Add meg a saját és a karaktered alapvető elérhetőségeit és tapasztalatait.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <MessageSquare size={14} className="text-[#5865F2]" /> Discord Neved / Tag <span className="text-red-400">*</span>
                      </label>
                      <Input
                        placeholder="pl. Marcus#1234 vagy @marcus"
                        value={formData.applicant?.discordTag}
                        onChange={e => updateApplicant('discordTag', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Crown size={14} className="text-amber-400" /> FiveM Karakternév (IC) <span className="text-red-400">*</span>
                      </label>
                      <Input
                        placeholder="pl. Marcus_Vance"
                        value={formData.applicant?.fivemCharacterName}
                        onChange={e => {
                          updateApplicant('fivemCharacterName', e.target.value);
                          updateFaction('leaderIC', e.target.value);
                        }}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        FiveM Azonosító (License / ID)
                      </label>
                      <Input
                        placeholder="pl. license:abc123xyz456 vagy 42"
                        value={formData.applicant?.fivemIdentifier}
                        onChange={e => updateApplicant('fivemIdentifier', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Életkorod (OOC)
                      </label>
                      <Input
                        type="number"
                        min={14}
                        max={99}
                        value={formData.applicant?.age}
                        onChange={e => updateApplicant('age', Number(e.target.value))}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Heti Tervezett Aktivitás (óra)
                      </label>
                      <Input
                        type="number"
                        min={5}
                        max={100}
                        value={formData.applicant?.weeklyHours}
                        onChange={e => updateApplicant('weeklyHours', Number(e.target.value))}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Mióta játszol a szerveren?
                      </label>
                      <Input
                        placeholder="pl. 6 hónapja / 400 órája"
                        value={formData.applicant?.serverExperienceTime}
                        onChange={e => updateApplicant('serverExperienceTime', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Korábbi Frakció és Vezetői Tapasztalatok
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Írd le, milyen frakciókban voltál korábban tag vagy vezető, milyen tapasztalataid vannak..."
                      value={formData.applicant?.pastExperienceDesc}
                      onChange={e => updateApplicant('pastExperienceDesc', e.target.value)}
                      className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: FACTION BASIC DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <Crown className="text-amber-400" />
                      02 – Frakció Alapadatok
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Válaszd ki a típust, add meg a nevet, rövidítést és a színeket.
                    </p>
                  </div>

                  {/* Faction Type Picker */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Frakció Típusa <span className="text-amber-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {FACTION_TYPES.map(type => (
                        <div
                          key={type.id}
                          onClick={() => updateFaction('type', type.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            formData.faction?.type === type.id
                              ? 'bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500'
                              : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                            <span className="text-lg">{type.emoji}</span>
                            {type.label}
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">{type.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Frakció Teljes Neve <span className="text-red-400">*</span>
                      </label>
                      <Input
                        placeholder="pl. Los Santos Kings, Cosa Nostra, Redline MC"
                        value={formData.faction?.fullName}
                        onChange={e => updateFaction('fullName', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Rövidítés / TAG (max. 4-5 karakter) <span className="text-red-400">*</span>
                      </label>
                      <Input
                        placeholder="pl. LSK, CN, RMC"
                        maxLength={6}
                        value={formData.faction?.tag}
                        onChange={e => updateFaction('tag', e.target.value.toUpperCase())}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500 uppercase"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Co-Leader IC Neve
                      </label>
                      <Input
                        placeholder="pl. Dominic_Cole"
                        value={formData.faction?.coLeaderIC}
                        onChange={e => updateFaction('coLeaderIC', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Tervezett Maximális Taglétszám
                      </label>
                      <Input
                        type="number"
                        min={5}
                        max={30}
                        value={formData.faction?.plannedMaxMembers}
                        onChange={e => updateFaction('plannedMaxMembers', Number(e.target.value))}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <Palette size={14} className="text-amber-400" /> Frakció Elsődleges Színe (Discord szerepkör & jelölés)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => updateFaction('primaryColor', c.hex)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                            formData.faction?.primaryColor === c.hex
                              ? 'border-white bg-white/10 text-white shadow-md'
                              : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: c.hex }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LORE & BACKSTORY */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <FileText className="text-amber-400" />
                      03 – Frakciótörténet & Alapítási Háttér
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Írd le a szervezet eredetét, miért alakultak és miért Los Santosban kezdenek működni.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-zinc-400">
                      <span>Frakció Részletes Háttértörténete <span className="text-red-400">*</span></span>
                      <span className="font-mono text-zinc-500">{(formData.lore?.backstory?.length || 0)} / min. 50 karakter</span>
                    </div>
                    <textarea
                      rows={6}
                      placeholder="Írd le a szervezet megalakulásának történetét, az alapító tagok múltját, konfliktusait..."
                      value={formData.lore?.backstory}
                      onChange={e => updateLore('backstory', e.target.value)}
                      className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-amber-500 focus:outline-none leading-relaxed resize-y"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Miért alakult meg a szervezet?
                      </label>
                      <textarea
                        rows={3}
                        value={formData.lore?.whyFormed}
                        onChange={e => updateLore('whyFormed', e.target.value)}
                        className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3 text-white text-xs focus:border-amber-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Miért pont Los Santos városában?
                      </label>
                      <textarea
                        rows={3}
                        value={formData.lore?.whyLosSantos}
                        onChange={e => updateLore('whyLosSantos', e.target.value)}
                        className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3 text-white text-xs focus:border-amber-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Miben egyedi a frakciótok a többihez képest?
                    </label>
                    <Input
                      value={formData.lore?.uniqueness}
                      onChange={e => updateLore('uniqueness', e.target.value)}
                      className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white font-medium focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: RP PLAN & 3 SCENARIOS */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <Sparkles className="text-amber-400" />
                      04 – RP-Terv és Szituációs Modellek
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Ismertesd a civilekkel, rendvédelemmel és más frakciókkal való viszonyt, valamint 3 kidolgozott szituációt.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                      Átfogó RP Koncepció & Célkitűzés <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Milyen szerepjáték szálakat fogtok generálni a városban napi szinten?"
                      value={formData.rpPlan?.rpVision}
                      onChange={e => updateRpPlan('rpVision', e.target.value)}
                      className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 text-white text-sm focus:border-amber-500 focus:outline-none leading-relaxed resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Viszony a civilekkel
                      </label>
                      <Input
                        value={formData.rpPlan?.civilianInteraction}
                        onChange={e => updateRpPlan('civilianInteraction', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-11 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Viszony a rendőrséghez (PD / SD)
                      </label>
                      <Input
                        value={formData.rpPlan?.policeRelation}
                        onChange={e => updateRpPlan('policeRelation', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-11 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Legális Tevékenységek & Pénzkereset
                      </label>
                      <Input
                        value={formData.rpPlan?.legalActivities}
                        onChange={e => updateRpPlan('legalActivities', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-11 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400">
                        Anti-DM & Konfliktuskezelési Stratégia
                      </label>
                      <Input
                        value={formData.rpPlan?.antiGunplayStrategy}
                        onChange={e => updateRpPlan('antiGunplayStrategy', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-11 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* 3 Concrete Scenarios */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Crown size={14} /> 3 Konkrét Kidolgozott RP Szituáció
                    </label>
                    <div className="space-y-3">
                      {[0, 1, 2].map(idx => (
                        <Input
                          key={idx}
                          placeholder={`${idx + 1}. Szituáció leírása...`}
                          value={formData.rpPlan?.scenarios?.[idx] || ''}
                          onChange={e => {
                            const sc = [...(formData.rpPlan?.scenarios || ['', '', ''])];
                            sc[idx] = e.target.value;
                            updateRpPlan('scenarios', sc);
                          }}
                          className="bg-zinc-900/70 border-zinc-800 rounded-xl h-11 text-white text-xs"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: INITIAL MEMBERS */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                        <Users className="text-amber-400" />
                        05 – Induló Frakció Taglista
                      </h3>
                      <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                        Legalább 3 induló tag megadása kötelező az új frakcióhoz.
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={addMemberRow} 
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold"
                    >
                      <Plus size={14} className="mr-1" /> Tag Hozzáadása
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.members?.map((mem, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Discord Tag</label>
                          <Input
                            placeholder="pl. user#1234"
                            value={mem.discordTag}
                            onChange={e => updateMemberRow(idx, 'discordTag', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 rounded-lg h-9 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">FiveM Karakternév</label>
                          <Input
                            placeholder="pl. Marcus_Vance"
                            value={mem.fivemName}
                            onChange={e => updateMemberRow(idx, 'fivemName', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 rounded-lg h-9 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Tervezett Rang</label>
                          <Input
                            placeholder="pl. Leader / Tag / Újonc"
                            value={mem.plannedRank}
                            onChange={e => updateMemberRow(idx, 'plannedRank', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 rounded-lg h-9 text-xs text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-4 sm:pt-0">
                          <Input
                            placeholder="Szerepkör (pl. Pénztáros)"
                            value={mem.roleTitle}
                            onChange={e => updateMemberRow(idx, 'roleTitle', e.target.value)}
                            className="bg-zinc-950 border-zinc-800 rounded-lg h-9 text-xs text-white flex-1"
                          />
                          {idx > 0 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              onClick={() => removeMemberRow(idx)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 h-9 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 6: RANKS CONFIGURATION */}
              {currentStep === 6 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <ShieldCheck className="text-amber-400" />
                      06 – Rangrendszer & Hierarchia
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      A jóváhagyás után a rendszer automatikusan felépíti a Discord szerepköröket.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {formData.ranks?.map((rank, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-xs">
                            #{rank.level}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{rank.name}</div>
                            <div className="text-xs text-zinc-400">{rank.description}</div>
                          </div>
                        </div>
                        <Badge className="bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                          Prioritás: {rank.level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 7: APPEARANCE & HQ */}
              {currentStep === 7 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <Building2 className="text-amber-400" />
                      07 – Frakció Megjelenése & Tervezett HQ
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Add meg a logót, öltözködési stílust, járműveket és a bázis elképzelését.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <ImageIcon size={14} /> Frakció Logó / Kép URL
                      </label>
                      <Input
                        placeholder="https://imgur.com/... vagy kép URL"
                        value={formData.appearance?.logoUrl}
                        onChange={e => updateAppearance('logoUrl', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-400" /> Tervezett HQ / Bázis Helyszíne
                      </label>
                      <Input
                        placeholder="pl. Chamberlain Hills, Mirror Park, Sandy Shores"
                        value={formData.appearance?.hqVision}
                        onChange={e => updateAppearance('hqVision', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Shirt size={14} /> Öltözködési Stílus
                      </label>
                      <Input
                        placeholder="pl. Egységes fekete öltöny, sárga kendő, bőr motoros mellény"
                        value={formData.appearance?.clothingStyle}
                        onChange={e => updateAppearance('clothingStyle', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <Car size={14} /> Tervezett Járműpark
                      </label>
                      <Input
                        placeholder="pl. Fekete SUV-k, sportmotorok, egyedi rendszámok"
                        value={formData.appearance?.vehiclesPlanned}
                        onChange={e => updateAppearance('vehiclesPlanned', e.target.value)}
                        className="bg-zinc-900/70 border-zinc-800 rounded-xl h-12 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 8: SUMMARY & SUBMIT */}
              {currentStep === 8 && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3 italic">
                      <CheckCircle2 className="text-emerald-400" />
                      08 – Összegzés és Hivatalos Beküldés
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                      Ellenőrizd az adataidat a Discord bot és vezetőség felé történő továbbítás előtt.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                      <div className="text-amber-400 font-bold uppercase">Frakció Adatok</div>
                      <div className="text-white font-bold text-base">{formData.faction?.fullName} <span className="text-amber-400">[{formData.faction?.tag}]</span></div>
                      <div className="text-zinc-400">Típus: <b className="text-white uppercase">{formData.faction?.type}</b></div>
                      <div className="text-zinc-400">Leader IC: <b className="text-white">{formData.applicant?.fivemCharacterName}</b></div>
                      <div className="text-zinc-400">Co-Leader IC: <b className="text-white">{formData.faction?.coLeaderIC || 'Nincs'}</b></div>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                      <div className="text-indigo-400 font-bold uppercase">Jelentkező & Tagok</div>
                      <div className="text-white font-bold text-base">{formData.applicant?.discordTag}</div>
                      <div className="text-zinc-400">Induló létszám: <b className="text-white">{formData.members?.length} fő</b></div>
                      <div className="text-zinc-400">Tervezett HQ: <b className="text-white">{formData.appearance?.hqVision || 'Kijelölt zóna'}</b></div>
                      <div className="text-zinc-400">Heti aktivitás: <b className="text-white">{formData.applicant?.weeklyHours} óra</b></div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2 text-xs text-zinc-400">
                    <div className="font-bold text-white uppercase flex items-center gap-2">
                      <FileText size={14} className="text-amber-400" /> Háttértörténet Kivonat:
                    </div>
                    <p className="leading-relaxed line-clamp-3 italic">
                      "{formData.lore?.backstory}"
                    </p>
                  </div>
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between gap-4">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    variant="outline"
                    className="border-zinc-700 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
                  >
                    <ArrowLeft size={14} className="mr-2" /> Vissza
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 8 ? (
                  <Button
                    type="button"
                    onClick={validateAndNext}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl px-6 h-12 shadow-lg shadow-amber-500/20"
                  >
                    Következő Lépés <ArrowRight size={14} className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalSubmit}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase text-sm rounded-xl px-8 h-14 shadow-xl shadow-emerald-500/25"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Clock className="animate-spin" size={18} />
                        Kérelem küldése...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send size={18} />
                        Kérelem Hivatalos Beküldése
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
