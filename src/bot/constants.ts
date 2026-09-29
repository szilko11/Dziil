import { ChannelType } from 'discord.js';
import { CategoryData } from '../types';

export const communityStructure: CategoryData[] = [
  {
    category: "🚪 ÉRKEZÉS & TÁJÉKOZTATÓ",
    perm: 'READ_ONLY',
    channels: [
      { name: "👋┃üdvözlés", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'welcome', topic: "Ide érkeznek az automatikus üdvözlő üzenetek minden új taghoz. Nézd meg, mielőtt bárhova is mész — itt találod a legfontosabb első lépéseket." },
      { name: "🔗┃fiók-összekötés", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'link_account', topic: "Kösd össze a Discord fiókodat a FiveM karaktereddel, hogy a boost, napi jutalom és webshop vásárlásod PP pontja ténylegesen a karaktereden landoljon." },
      { name: "🔔┃értesítés-szerepek", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'selfroles', topic: "Válaszd ki, milyen pingeket (értesítéseket) szeretnél kapni: frissítések, eventek, nyereményjátékok. Bármikor le- és felkapcsolhatod magadnak a gombokkal." },
    ]
  },
  {
    category: "👑 TULAJDONOS",
    perm: 'OWNER_ONLY',
    channels: [
      { name: "🔒┃konfiguráció", type: ChannelType.GuildText, topic: "Kizárólag a szerver tulajdonosának fenntartott, rejtett beállítási csatorna a bot és a szerver konfigurációjához." },
    ]
  },
  {
    category: "📌 NEXUS STATE RP",
    perm: 'READ_ONLY',
    channels: [
      { name: "📢┃bejelentések", type: ChannelType.GuildText, topic: "Hivatalos szerver bejelentések: frissítések, karbantartások, verzió-változások és fontos közlemények. Csak a vezetőség írhat ide." },
      { name: "📜┃discord-szabályzat", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'rules_discord', topic: "A Discord közösségi szabályzata. Az elolvasás és elfogadás kötelező a whitelist kvíz megkezdése előtt." },
      { name: "📖┃szerver-szabályzat", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'rules_server', topic: "A FiveM szerepjáték szabályzata: MG, PG, FearRP, NLR és minden IC/OOC irányelv. Kötelező elolvasni belépés előtt." },
      { name: "🛡️┃whitelist-kvíz", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'whitelist', topic: "Itt indíthatod el a whitelist kvízt, ami a szabályzat ismeretét és RP hozzáállásod méri fel. Sikeres kitöltés után azonnal hozzáférést kapsz a szerverhez." },
      { name: "🧭┃kezdés-menete", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'start_guide', topic: "Lépésről lépésre útmutató: csatlakozás, karakterkészítés, első munka, első lakhely megszerzése." },
      { name: "🔗┃hasznos-linkek", type: ChannelType.GuildText, topic: "Weboldal, webshop, MDT, szabályzat és egyéb hasznos linkek gyűjtőhelye egy csokorban." },
      { name: "🟢┃szerver-státusz", type: ChannelType.GuildText, topic: "Élő, automatikusan frissülő szerver állapot: online/offline, játékos létszám és csatlakozási parancs." },
    ]
  },
  {
    category: "📊 SZERVER STATISZTIKA",
    perm: 'STATS_VOICE',
    channels: [
      { name: "🟢┃Játékosok: 0 / 64", type: ChannelType.GuildVoice, topic: "Élő játékosszám a FiveM szerverről, 60 másodpercenként frissül." },
      { name: "👮┃Szolgálatban LSPD: 0", type: ChannelType.GuildVoice, topic: "Aktuálisan szolgálatban lévő rendőrök száma." },
      { name: "🚑┃Szolgálatban OMSZ: 0", type: ChannelType.GuildVoice, topic: "Aktuálisan szolgálatban lévő mentősök száma." },
      { name: "👑┃Staff Duty-ban: 0", type: ChannelType.GuildVoice, topic: "Jelenleg szolgálatban lévő adminisztrátorok/staff tagok száma." },
      { name: "👥┃Discord Tagok: 0", type: ChannelType.GuildVoice, topic: "A Discord szerver teljes taglétszáma, élőben frissülve." },
      { name: "🚀┃Boost Szint: 0", type: ChannelType.GuildVoice, topic: "A szerver aktuális Nitro Boost szintje és boost-ok száma." },
    ]
  },
  {
    category: "🏛️ VÁROSHÁZA",
    channels: [
      { name: "🎫┃ticket-nyitás", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'ticket', topic: "Nyiss privát hibajegyet adminisztrátori segítségért, hibabejelentéshez vagy támogatás vásárláshoz." },
      { name: "📑┃support-ügyek", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'support_info', topic: "Hogyan írj le egy problémát hatékonyan? Mi számít elfogadható bizonyítéknak? Itt megtalálod." },
      { name: "⚖️┃panasz-bejelentés", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'report', topic: "Panasz bejelentése másik játékosra, frakcióra vagy staff döntésre, bizonyítékkal alátámasztva." },
      { name: "💼┃vállalkozás-igénylés", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'business', topic: "Legális vállalkozás alapításának igénylése, üzleti terv benyújtása elbírálásra." },
      { name: "🏢┃frakció-jelentkezés", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'faction', topic: "Legális és illegális frakciók/bandák hivatalos jelentkezési felülete." },
      { name: "🪪┃karakter-regisztráció", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'character', topic: "Karaktered adatainak és háttértörténetének rögzítése az első belépés előtt." },
    ]
  },
  {
    category: "🚔 FRAKCIÓK",
    channels: [
      { name: "🚓┃rendőrség-infó", type: ChannelType.GuildText, topic: "Rendőrségi hierarchia, felszerelés, toborzási feltételek és MDT elérhetőség." },
      { name: "🚑┃mentőszolgálat", type: ChannelType.GuildText, topic: "OMSZ hierarchia, felszerelés és toborzási feltételek." },
      { name: "🔧┃szerelőtelep", type: ChannelType.GuildText, topic: "Szerelő és vontatási szolgálat információi, árlista és jelentkezés." },
    ]
  },
  {
    category: "📰 VÁROSI INFORMÁCIÓK",
    perm: 'READ_ONLY',
    channels: [
      { name: "📡┃városi-hírek", type: ChannelType.GuildText, topic: "In-game városi események, frakcióháborúk kimenetele, közösségi hírek RP kontextusban." },
      { name: "🚧┃fejlesztési-napló", type: ChannelType.GuildText, topic: "Fejlesztés alatt álló új rendszerek, MLO-k és funkciók előzetes bemutatása képekkel/videókkal." },
      { name: "🎁┃eventek-nyeremények", type: ChannelType.GuildText, topic: "Aktuális szerver eventek, nyereményjátékok és a nyertesek bejelentése." },
    ]
  },
  {
    category: "📖 TUDÁSTÁR",
    perm: 'READ_ONLY',
    channels: [
      { name: "🐕┃k9-útmutató", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'guide_k9', topic: "Rendőrségi K9 egység használati útmutatója és parancsai." },
      { name: "🐾┃pet-útmutató", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'guide_pet', topic: "Háziállat rendszer útmutatója: örökbefogadás, gondozás, parancsok." },
    ]
  },
  {
    category: "💬 KÖZÖSSÉG",
    channels: [
      { name: "💬┃általános-csevegő", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Szabad, közösségi beszélgetés Polgároknak bármilyen témában — tartsd tiszteletteljesen!" },
      { name: "💬┃szerver-chat", type: ChannelType.GuildText, perm: 'READ_ONLY', topic: "Az in-game chat élő tükrözése a Discordra. Csak olvasható." },
      { name: "📸┃képek-és-videók", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Oszd meg a legjobb RP pillanataidat, screenshotjaidat és klipjeidet a szerverről." },
      { name: "🎬┃highlight-videók", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Hosszabb RP videók, montázsok és highlight-ok gyűjtőhelye." },
      { name: "😂┃mémek", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Csak szerverhez kapcsolódó vagy közösségi mémek, humoros tartalmak." },
      { name: "🤝┃partnerkedés", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Partner szerverek megosztása és partnerségi kérelmek egyeztetése a vezetőséggel." },
      { name: "🎂┃szülinapok", type: ChannelType.GuildText, perm: 'READ_ONLY', topic: "A bot automatikusan köszönti a tagok születésnapját, ha beállították a `/szuletesnap` paranccsal." },
      { name: "🏆┃heti-legjobb-rp", type: ChannelType.GuildText, perm: 'READ_ONLY', topic: "A hét legjobb, staff által kiválasztott RP pillanata, klipje vagy sztorija." },
      { name: "🗳️┃szavazások", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'polls', topic: "Közösségi szavazások és felmérések a szerver jövőbeli irányáról, funkciókról." },
      { name: "💡┃szerver-ötletek", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Javaslatok és ötletek a szerver fejlesztéséhez. Polgár rang szükséges az íráshoz." },
      { name: "🎮┃off-topic", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Bármi, ami nem a szerverhez kapcsolódik: játékok, filmek, hétköznapi témák." },
      { name: "🤖┃bot-parancsok", type: ChannelType.GuildText, perm: 'CITIZEN_WRITE', topic: "Ide írd a bot parancsait (/daily, /profil, stb.), hogy ne szemetelj a többi csatornában." },
    ]
  },
  {
    category: "🌟 BOOSTER KIVÁLTSÁGOK",
    perm: 'BOOSTER_ONLY',
    channels: [
      { name: "💎┃booster-only", type: ChannelType.GuildText, perm: 'BOOSTER_ONLY', panel: 'booster_info', topic: "Exkluzív csatorna kizárólag a szervert Nitro-val boostoló tagoknak. Köszönjük a támogatást!" },
    ]
  },
  {
    category: "🎫 TÁMOGATÁS ÉS SEGÍTSÉG",
    channels: [
      { name: "📜┃gyik", type: ChannelType.GuildText, perm: 'READ_ONLY', panel: 'faq', topic: "Gyakran ismételt kérdések csatlakozásról, karakterről, PP-ről és adminisztrációról." },
      { name: "🐛┃hibabejelentés", type: ChannelType.GuildText, topic: "Technikai hibák, bugok bejelentése — mindig csatolj részletes leírást és lehetőleg bizonyítékot." },
      { name: "🙋┃kérdezni-szeretnék", type: ChannelType.GuildText, topic: "Gyors, informális kérdések a közösségnek vagy a staffnak — nem igényel ticketet." },
    ]
  },
  {
    category: "🎫 AKTÍV ÜGYINTÉZÉS",
    perm: 'STAFF_ONLY_TEXT',
    channels: []
  },
  {
    category: "🔊 HANGCSATORNÁK",
    channels: [
      { name: "➕┃Privát szoba", type: ChannelType.GuildVoice, topic: "Csatlakozz ide, hogy automatikusan létrejöjjön a saját privát hangszobád, amit te irányítasz." },
      { name: "🗣️┃Társalgó 1", type: ChannelType.GuildVoice },
      { name: "🗣️┃Társalgó 2", type: ChannelType.GuildVoice },
      { name: "🔊┃Váró", type: ChannelType.GuildVoice },
      { name: "🎮┃RP Szoba 1", type: ChannelType.GuildVoice },
      { name: "🎮┃RP Szoba 2", type: ChannelType.GuildVoice },
      { name: "🛡️┃Staff szoba", type: ChannelType.GuildVoice, perm: 'STAFF_ONLY_VOICE' },
    ]
  }
];

export const staffLogStructure: CategoryData[] = [
  {
    category: "👑 VEZETŐSÉG & STAFF",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "👑┃vezetőség", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Vezetőségi egyeztetések, stratégiai döntések." },
      { name: "🛡️┃staff-csevegő", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Staff csapat belső kommunikációja." },
      { name: "📋┃duty-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Admin szolgálatba lépések/leadások automatikus naplózása." },
      { name: "📅┃megbeszélések", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Staff meetingek időpontjai és jegyzőkönyvei." },
      { name: "🔧┃fejlesztői-napló", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Fejlesztői csapat belső feladatkövetése és changelog." },
    ]
  },
  {
    category: "⚔️ JÁTÉKBELI ESEMÉNYEK & BŰNÖZÉS",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "💀┃kill-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Gyilkosságok, halálesetek automatikus naplózása." },
      { name: "🚨┃rablás-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Bank, ékszerbolt, bolt rablási riasztások." },
      { name: "📦┃item-és-drop-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Item eldobások és felvételek naplózása." },
      { name: "🚗┃jármű-lopás-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Autólopások és lefoglalások naplózása." },
    ]
  },
  {
    category: "🔨 ADMINISZTRÁCIÓ & BÍRÁLATOK",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "🔨┃admin-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Kick, Ban, Jail és RCON műveletek naplózása." },
      { name: "⚠️┃figyelmeztetések", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Automata és admin figyelmeztetések naplózása." },
      { name: "🛡️┃whitelist-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Sikeres és sikertelen whitelist kvíz kitöltések." },
      { name: "👮┃report-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Bejelentett panaszok és jelentések naplózása." },
    ]
  },
  {
    category: "💰 GAZDASÁG & TRANZAKCIÓK",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "💰┃pénz-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Nagyobb összegű utalások naplózása." },
      { name: "🏧┃bank-és-széf-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Bank- és széfmozgások naplózása." },
      { name: "🏪┃bolt-vásárlás-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "In-game bolti vásárlások naplózása." },
      { name: "💎┃prémium-pont-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "PP vásárlások és jóváírások naplózása." },
    ]
  },
  {
    category: "⚙️ SZERVER & BIZTONSÁG",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "🚨┃anticheat", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Gyanús játékos mozgások és anticheat riasztások." },
      { name: "🔌┃csatlakozás-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Játékos belépések, kilépések és crash-ek." },
      { name: "💬┃chat-mirror", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Teljes in-game chat tükrözése moderációs célból." },
    ]
  },
  {
    category: "🎟️ TICKET & ARCHÍVUM",
    perm: 'STAFF_ONLY_TEXT',
    channels: [
      { name: "📂┃aktív-tickettek", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Jelenleg nyitva lévő support ticketek áttekintése." },
      { name: "📦┃archivált-log", type: ChannelType.GuildText, perm: 'STAFF_ONLY_TEXT', topic: "Lezárt ticketek HTML transcript archívuma." }
    ]
  },
  {
    category: "🔊 STAFF PRIVÁT",
    perm: 'STAFF_ONLY_VOICE',
    channels: [
      { name: "🔒┃Staff Tárgyaló", type: ChannelType.GuildVoice, perm: 'STAFF_ONLY_VOICE' },
      { name: "🔒┃Admin Szoba 1", type: ChannelType.GuildVoice, perm: 'STAFF_ONLY_VOICE' },
      { name: "🔒┃Admin Szoba 2", type: ChannelType.GuildVoice, perm: 'STAFF_ONLY_VOICE' },
      { name: "🤫┃Vezetőségi Zárt", type: ChannelType.GuildVoice, perm: 'STAFF_ONLY_VOICE' },
    ]
  }
];

export const serverStructure = communityStructure;
