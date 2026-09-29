# Discord ↔ FiveM Összekötés — Integrációs Szerződés

> ✅ **A FiveM (QBox) oldali resource elkészült!** Lásd a `nexus_discord_link/` mappát
> ebben a csomagban — csak be kell másolni a szervered `resources` könyvtárába, a
> `config.lua`-ban beállítani az API URL-t és a kulcsot, és `ensure`-elni. A `nexus_discord_link/README.md`
> tartalmazza a pontos telepítési lépéseket. Az alábbi dokumentáció azt írja le, hogyan
> működik belül — akkor van rá szükséged, ha módosítani szeretnéd a resource-ot.

Ez a dokumentum leírja, mit kell a **FiveM szerver oldalán (QBox resource)** megvalósítani ahhoz,
hogy a Discord bot / webes dashboard PP- és pénzjutalmai ténylegesen a játékos karakterén landoljanak.

A bot/web oldal (ez a repo) már készen áll — az alábbi 2 irányú kapcsolatot kell a saját
FiveM resource-odban lekezelned.

---

## 1. Irány: FiveM → Web (fiók összekötés visszaigazolása)

Amikor egy játékos beírja a szerveren: `/verify <kód>`, a resource-odnak egy HTTP POST
kérést kell küldenie a dashboard API-jára:

```
POST https://<a-te-domained>/api/link/verify
Content-Type: application/json

{
  "code": "AB12CD",
  "fivemIdentifier": "ABC12345",
  "fivemName": "Kovács János",
  "secretKey": "<FIVEM_SYNC_SECRET környezeti változó értéke>"
}
```

> A mellékelt `nexus_discord_link` resource a QBox **citizenid**-t küldi `fivemIdentifier`-ként
> (nem a license-t) — ez az egyetlen azonosító, ami közvetlenül használható az online/offline
> karakter-lekérdező exportokkal (`GetPlayerByCitizenId` / `GetOfflinePlayer`), így a
> `nexus_givepp`/`nexus_givecash`/`nexus_setvip` parancsok is ugyanezt várják első paraméterként.

**Válasz siker esetén:** `{ "success": true, "discordTag": "..." }`
**Válasz hiba esetén:** `{ "success": false, "error": "..." }` (pl. lejárt vagy hibás kód)

> A `secretKey`-nek meg kell egyeznie a bot `.env` fájljában lévő `FIVEM_SYNC_SECRET` értékével
> (ugyanazt a kulcsot használja a `/api/fivem/sync/job` végpont is a frakció-szinkronizációhoz).

---

## 2. Irány: Web/Discord → FiveM (jutalmak jóváírása RCON-on keresztül)

Amikor egy játékos boostol, napi jutalmat vesz fel, vagy vásárol a webshopban, a bot RCON-on
keresztül elküld egy parancsot a szervernek. Ezeket a parancsokat **neked kell regisztrálnod**
szerver oldali (server-side) command-ként a QBox resource-odban:

### `nexus_givepp <citizenid> <összeg> <indoklás>`
PP pont jóváírása a karakteren (pl. banki egyenlegen, vagy egy egyedi `pp_balance` mezőn —
a te gazdasági rendszered dönti el, hova kerüljön).

```lua
RegisterCommand('nexus_givepp', function(source, args)
    local citizenid = args[1]
    local amount = tonumber(args[2])
    local reason = table.concat(args, ' ', 3)
    -- pl. QBox: add PP to the matching player's account by citizenid
end, true) -- true = csak konzol/RCON hívhatja
```

### `nexus_givecash <citizenid> <összeg> <indoklás>`
Készpénz jóváírása a karakter bankszámláján (webshop "Pénz Csomag" vásárlások).

### `nexus_setvip <citizenid> <tier: bronze|silver|gold> <napok (0 = örökös)>`
VIP szint beállítása/meghosszabbítása a karakteren.

> **Fontos:** ezek RCON-on (Q3 UDP protokoll) érkeznek, tehát a `source` paraméter a
> parancsban 0 lesz (konzol). A `citizenid`-t kell felhasználnod a megfelelő
> játékos/karakter megtalálásához, akkor is, ha épp nincs bejelentkezve — a mellékelt
> resource ezt a `GetOfflinePlayer` + `SaveOffline` mintával oldja meg.

---

## 3. Környezeti változók (.env)

```
FIVEM_SERVER_IP=...
FIVEM_SERVER_PORT=30120
FIVEM_RCON_PASSWORD=...
FIVEM_SYNC_SECRET=nexus_secret_key_2026   # cseréld le élesben!
```

---

## 4. Web oldali végpontok (már készen állnak, csak hívni kell őket)

| Végpont | Irány | Leírás |
|---|---|---|
| `POST /api/link/verify` | FiveM → Web | Kód beváltása, fiók összekötése |
| `GET /api/link/status` | Web (bejelentkezett user) | Aktuális összekötés lekérdezése |
| `POST /api/link/request` | Web (bejelentkezett user) | Új összekötő kód igénylése |
| `POST /api/link/unlink` | Web (bejelentkezett user) | Összekötés megszüntetése |
| `POST /api/shop/purchase` | Web (bejelentkezett user) | Webshop vásárlás — automatikusan RCON-oz |
| `GET /api/shop/history` | Web (bejelentkezett user) | Utolsó 10 vásárlás lekérdezése |

A Discord oldalon a `🔗┃fiók-összekötés` csatorna gombjai (`/setup` után jönnek létre)
ugyanezt a `createLinkCode` / `unlinkAccount` logikát hívják — a játékos akár Discordon,
akár a weboldalon kérheti a kódot.
