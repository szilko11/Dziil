Config = {}

-- ============================================================
--  NEXUS HORIZON — DISCORD ÖSSZEKÖTÉS BEÁLLÍTÁSOK
-- ============================================================

-- A Nexus dashboard/bot webcíme (AHOL a /api/... végpontok futnak).
-- FIGYELEM: Ezt az URL-t arra a webcímre kell állítanod, ahol a Discord botod ÉPPEN fut!
Config.ApiBaseUrl = "IDE_IRD_AZ_AKTUALIS_BOT_URL_CIMET"

-- Ennek PONTOSAN meg kell egyeznie a dashboard szerver .env fájljában
-- lévő FIVEM_SYNC_SECRET értékével! Enélkül a /verify parancs nem fog működni.
Config.SyncSecret = "nexus_secret_key_2026"

-- Melyik QBox pénznemre írja jóvá a webshop "Pénz Csomag" vásárlásait.
-- Lehetséges értékek: "cash" (készpénz) vagy "bank" (bankszámla)
Config.CashAccount = "bank"

-- A PP pontokat karakter metaadatként (metadata) tároljuk, ez a mező neve.
-- Bejelentkezés után a /pp paranccsal bárki lekérdezheti a saját egyenlegét.
Config.PpMetadataKey = "pp_points"

-- VIP szint és lejárat tárolásához használt metaadat kulcsok.
Config.VipTierMetadataKey = "vip_tier"
Config.VipExpiresMetadataKey = "vip_expires"

-- A VIP szintekhez tartozó extra beállítások (fizetés bónusz %, stb.)
-- Ezt bármelyik másik resource-od kiolvashatja:
--   local tier = exports.qbx_core:GetPlayer(src).PlayerData.metadata.vip_tier
Config.VipTiers = {
    bronze = { label = "VIP Bronze", paycheckBonus = 0.15 },
    silver = { label = "VIP Silver", paycheckBonus = 0.30 },
    gold   = { label = "VIP Gold",   paycheckBonus = 0.50 },
}

-- Az összekötéshez használt in-game parancs neve (pl. /verify AB12CD)
Config.VerifyCommand = "verify"

-- A saját PP/VIP egyenleg lekérdezésére szolgáló parancs
Config.CheckCommand = "pp"

-- Debug log-ok a szerver konzolba (kapcsold ki éles üzemben, ha nem kell)
Config.Debug = true

-- Értesítés módja a játékosnak jóváíráskor: "qbx" (qbx_core notify) vagy "chat" (egyszerű chat üzenet)
Config.NotifyMethod = "qbx"
