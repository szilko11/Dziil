# nexus_discord_link

QBox resource, ami összeköti a **Nexus Horizon** Discord botot / webes dashboardot
a FiveM szervereddel. Ez a csomag **teljesen kész**, csak be kell másolni a
`resources` mappádba és beállítani a `config.lua`-t.

## Mit csinál?

- `/verify <kód>` — a játékos ezzel köti össze a Discord fiókját a karakterével
  (a kódot a Discordon a `🔗┃fiók-összekötés` csatornában, vagy a weboldal
  "Fiókom" oldalán tudja igényelni).
- `/pp` — a játékos lekérdezheti a saját PP egyenlegét és VIP szintjét.
- A dashboard/bot RCON-on keresztül 3 parancsot küldhet a szervernek, amiket
  ez a resource automatikusan lekezel:
  - `nexus_givepp <citizenid> <összeg> <indoklás>` — PP jóváírás (boost, napi jutalom)
  - `nexus_givecash <citizenid> <összeg> <indoklás>` — készpénz/bank jóváírás (webshop)
  - `nexus_setvip <citizenid> <bronze|silver|gold> <napok>` — VIP szint beállítása (webshop)
- Óránként automatikusan leveszi a lejárt, időzített VIP tagságokat.

A PP pontokat és a VIP szintet a karakter **metadata**-jában tárolja
(`pp_points`, `vip_tier`, `vip_expires`), így **nem kell hozzá új SQL tábla** —
telepítés után azonnal működik.

## Telepítés

1. Másold be a `nexus_discord_link` mappát a szervered `resources` könyvtárába.
2. Nyisd meg a `config.lua`-t, és állítsd be:
   - `Config.ApiBaseUrl` — a dashboardod webcíme (pl. `https://dashboard.nexushorizon.hu`)
   - `Config.SyncSecret` — **PONTOSAN** egyezzen a dashboard szerver `.env`
     fájljában lévő `FIVEM_SYNC_SECRET` értékével
   - `Config.CashAccount` — `"bank"` vagy `"cash"`, attól függően, melyik
     számlára írja jóvá a webshop pénz-csomagjait
3. A `server.cfg`-be írd be:
   ```
   ensure qbx_core
   ensure nexus_discord_link
   ```
   (A `qbx_core` után kell szerepelnie, mert attól függ.)
4. Indítsd újra a szervert, vagy írd be konzolba: `refresh` majd `ensure nexus_discord_link`.

Ennyi — nincs SQL migráció, nincs extra függőség.

## Tesztelés

1. Lépj be a szerverre egy karakterrel.
2. A Discordon (vagy a "Fiókom" oldalon) igényelj egy összekötő kódot.
3. Írd be a szerveren: `/verify <kód>`.
4. Sikeres összekötés esetén zöld visszaigazolást kapsz, és a Discord fiókod
   DM-ben is értesítést kap.
5. Konzolból (vagy a dashboard admin felületéről RCON-on) teszteld:
   ```
   nexus_givepp <a_te_citizenid-d> 1000 "Teszt jóváírás"
   ```
   Ha minden jól ment, `/pp` paranccsal már 1000 PP-t kell látnod.

## Gyakori hibák

| Probléma | Megoldás |
|---|---|
| `/verify` mindig "lejárt vagy hibás kód" hibát ad | Ellenőrizd, hogy a `Config.SyncSecret` egyezik-e a dashboard `.env` fájljával |
| A `nexus_givepp`/`nexus_givecash`/`nexus_setvip` parancsok nem csinálnak semmit | Ellenőrizd, hogy a dashboard `.env`-jében be van-e állítva `FIVEM_RCON_PASSWORD`, és hogy a `FIVEM_SERVER_IP`/`FIVEM_SERVER_PORT` a te szerveredre mutat |
| "nem található karakter ezzel a citizenid-vel" | A játékosnak legalább egyszer be kellett lépnie a szerverre az adott karakterrel, hogy létezzen a rekordja |
| Nincs értesítés a jóváíráskor | Állítsd `Config.NotifyMethod = "chat"`-re, ha nincs `qbx_core:Notify` exportod, vagy cseréld le az `ox_lib`-es notify hívásra |

## Kapcsolódó dokumentáció

A teljes web ↔ FiveM szerződés (végpontok, RCON parancsformátum) a dashboard
repo `FIVEM_INTEGRATION.md` fájljában található — ez a resource pontosan azt
valósítja meg.
