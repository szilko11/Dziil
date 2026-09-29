-- ============================================================
--  NEXUS HORIZON — DISCORD <-> FIVEM ÖSSZEKÖTÉS (SZERVER OLDAL)
-- ============================================================
-- Ez a resource köti össze a Nexus dashboard/Discord botot a QBox
-- karaktereiddel. Két irányban működik:
--
--   1) Játékos -> Web:  /verify <kód>   -> POST /api/link/verify
--   2) Web/Discord -> Játékos: RCON parancsok (nexus_givepp, nexus_givecash, nexus_setvip)
--
-- Mind az online, mind az offline karaktereken működik: ha a játékos
-- épp nincs bent a szerveren, a jóváírás akkor is megtörténik, és a
-- karakter a következő belépéskor már a frissített adatokkal töltődik be.
--
-- Részletes szerződés: lásd a dashboard repo FIVEM_INTEGRATION.md fájlját.
-- ============================================================

local function DebugPrint(msg)
    if Config.Debug then
        print(("^3[nexus_discord_link]^7 %s"):format(msg))
    end
end

local function SafeJsonDecode(str)
    if not str or str == "" then return nil end
    local ok, result = pcall(json.decode, str)
    if ok then return result end
    return nil
end

local function BuildApiUrl(path)
    local base = tostring(Config.ApiBaseUrl or ""):gsub("/+$", "")
    path = tostring(path or "")
    if path:sub(1, 1) ~= "/" then
        path = "/" .. path
    end
    return base .. path
end

local function HttpErrorText(statusCode, rawResponse, errorData)
    local response = SafeJsonDecode(rawResponse) or {}
    local msg = response.error or response.message or response.detail
    if msg and msg ~= "" then return tostring(msg) end

    if errorData and tostring(errorData) ~= "" then
        return tostring(errorData)
    end

    if rawResponse and rawResponse ~= "" and #rawResponse <= 500 then
        return rawResponse
    end

    if tonumber(statusCode) == 0 then
        return "HTTP 0 - nem sikerült kapcsolódni a backendhez (DNS/TLS/tűzfal/Cloud Run elérhetőség)."
    end

    return ("HTTP %s - a backend nem adott értelmezhető JSON hibaüzenetet."):format(tostring(statusCode))
end

-- Egységes értesítés küldése egy ÉLŐ (online) játékosnak
local function NotifyPlayer(src, message, notifyType)
    notifyType = notifyType or "success"
    if not src or src == 0 then return end

    if Config.NotifyMethod == "qbx" then
        local ok = pcall(function()
            exports.qbx_core:Notify(src, message, notifyType)
        end)
        if ok then return end
    end

    TriggerClientEvent('chat:addMessage', src, {
        color = { 6, 182, 212 },
        multiline = true,
        args = { "Nexus Horizon", message }
    })
end

-- Egy karakter lekérése citizenid alapján, akár online, akár offline.
-- Visszaadja a Player objektumot ÉS hogy éppen online-e.
-- online esetén: Player.Functions.* hívható közvetlenül
-- offline esetén: Player.PlayerData-t kell közvetlenül módosítani,
--                 majd exports.qbx_core:SaveOffline(Player.PlayerData) menti el
local function GetCharacter(citizenid)
    local Player = exports.qbx_core:GetPlayerByCitizenId(citizenid)
    if Player then
        return Player, true
    end

    local ok, offlinePlayer = pcall(function()
        return exports.qbx_core:GetOfflinePlayer(citizenid)
    end)
    if ok and offlinePlayer then
        return offlinePlayer, false
    end

    return nil, false
end

-- Pénz jóváírása/levonása, online és offline karakteren egyaránt működik.
local function ModifyMoney(citizenid, moneyType, amount, reason)
    local Player, isOnline = GetCharacter(citizenid)
    if not Player then return false end

    if isOnline then
        return Player.Functions.AddMoney(moneyType, amount, reason)
    else
        Player.PlayerData.money[moneyType] = (Player.PlayerData.money[moneyType] or 0) + amount
        local ok = pcall(function()
            exports.qbx_core:SaveOffline(Player.PlayerData)
        end)
        return ok
    end
end

-- Metaadat mező írása, online és offline karakteren egyaránt működik.
local function SetCharacterMetadata(citizenid, key, value)
    local Player, isOnline = GetCharacter(citizenid)
    if not Player then return false end

    if isOnline then
        Player.Functions.SetMetaData(key, value)
    else
        Player.PlayerData.metadata = Player.PlayerData.metadata or {}
        Player.PlayerData.metadata[key] = value
        pcall(function()
            exports.qbx_core:SaveOffline(Player.PlayerData)
        end)
    end
    return true
end

local function GetCharacterMetadata(citizenid, key)
    local Player = GetCharacter(citizenid)
    if not Player then return nil end
    return Player.PlayerData.metadata and Player.PlayerData.metadata[key]
end

-- ------------------------------------------------------------
-- 1) JÁTÉKOS -> WEB: /verify <kód>
-- ------------------------------------------------------------
RegisterCommand(Config.VerifyCommand, function(source, args)
    local src = source
    if src == 0 then
        print("^1[nexus_discord_link]^7 A /verify parancsot csak játékos futtathatja, konzolból nem.")
        return
    end

    local code = args[1]
    if not code or code == "" then
        NotifyPlayer(src, "Használat: /verify <kód> — a kódot a Discordon vagy a weboldalon kapod.", "error")
        return
    end

    code = tostring(code):upper():gsub("%s+", "")

    local Player = exports.qbx_core:GetPlayer(src)
    if not Player then
        NotifyPlayer(src, "Hiba: a karakteredet nem sikerült betölteni. Próbáld újra pár másodperc múlva.", "error")
        return
    end

    local citizenid = tostring(Player.PlayerData.citizenid or "")
    local charinfo = Player.PlayerData.charinfo or {}
    local fullName = ("%s %s"):format(charinfo.firstname or "Ismeretlen", charinfo.lastname or "Karakter")

    if citizenid == "" then
        NotifyPlayer(src, "Hiba: a citizenid nem található a karakterednél.", "error")
        return
    end

    local url = BuildApiUrl("/api/link/verify")
    local payload = {
        code = code,
        fivemIdentifier = citizenid,
        citizenid = citizenid,
        fivemName = fullName,
        playerName = fullName,
        secretKey = Config.SyncSecret
    }

    DebugPrint(("Összekötés kísérlet: %s (citizenid: %s), kód: %s"):format(fullName, citizenid, code))
    DebugPrint(("Backend URL: %s"):format(url))

    PerformHttpRequest(url, function(statusCode, responseText, headers, errorData)
        local rawResponse = responseText or ""
        local response = SafeJsonDecode(rawResponse) or {}

        print(("^3[nexus_discord_link]^7 /api/link/verify HTTP %s | válasz: %s"):format(
            tostring(statusCode),
            rawResponse ~= "" and rawResponse or "<üres válasz>"
        ))

        if errorData and tostring(errorData) ~= "" then
            print(("^1[nexus_discord_link]^7 HTTP/CURL HIBA: %s"):format(tostring(errorData)))
        end

        if tonumber(statusCode) == 200 and response.success == true then
            local discordName = response.discordTag
                or response.discordName
                or response.username
                or "Ismeretlen Discord"

            local discordId = response.discordId and tostring(response.discordId) or nil
            local discordText = discordName

            if discordId and discordId ~= "" then
                discordText = ("%s | ID: %s"):format(discordName, discordId)
            end

            NotifyPlayer(
                src,
                ("✅ Sikeres összekapcsolás! FiveM karakter: %s | Discord: %s"):format(fullName, discordText),
                "success"
            )

            print(("^2[nexus_discord_link]^7 SIKERES ÖSSZEKAPCSOLÁS: FiveM=%s (%s) <-> Discord=%s"):format(
                fullName,
                citizenid,
                discordText
            ))
            return
        end

        local errMsg = HttpErrorText(statusCode, rawResponse, errorData)

        NotifyPlayer(src, ("❌ Sikertelen összekötés: %s"):format(errMsg), "error")
        print(("^1[nexus_discord_link]^7 Sikertelen összekötés (%s): %s"):format(
            tostring(statusCode),
            tostring(errMsg)
        ))
    end, "POST", json.encode(payload), {
        ["Content-Type"] = "application/json",
        ["Accept"] = "application/json",
        ["User-Agent"] = "NexusState-FiveM-Link/2.1"
    })
end, false)

-- ------------------------------------------------------------
-- BACKEND KAPCSOLAT TESZT: /linktest
-- Ezzel azonnal látszik, hogy a FiveM szerver eléri-e a Cloud Run API-t.
-- ------------------------------------------------------------
RegisterCommand("linktest", function(source)
    local src = source
    local url = BuildApiUrl("/api/link/test")

    print(("^3[nexus_discord_link]^7 Backend teszt indul: %s"):format(url))
    if src ~= 0 then
        NotifyPlayer(src, "Backend kapcsolat tesztelése... nézd a szerver konzolt is.", "primary")
    end

    PerformHttpRequest(url, function(statusCode, responseText, headers, errorData)
        local rawResponse = responseText or ""

        print(("^3[nexus_discord_link]^7 /api/link/test HTTP %s | válasz: %s"):format(
            tostring(statusCode),
            rawResponse ~= "" and rawResponse or "<üres válasz>"
        ))

        if errorData and tostring(errorData) ~= "" then
            print(("^1[nexus_discord_link]^7 HTTP/CURL HIBA: %s"):format(tostring(errorData)))
        end

        if tonumber(statusCode) >= 200 and tonumber(statusCode) < 300 then
            if src ~= 0 then
                NotifyPlayer(src, ("✅ Backend elérhető (HTTP %s)."):format(tostring(statusCode)), "success")
            end
            return
        end

        local errMsg = HttpErrorText(statusCode, rawResponse, errorData)
        if src ~= 0 then
            NotifyPlayer(src, ("❌ Backend nem elérhető: %s"):format(errMsg), "error")
        end
        print(("^1[nexus_discord_link]^7 Backend teszt sikertelen (%s): %s"):format(
            tostring(statusCode),
            tostring(errMsg)
        ))
    end, "GET", "", {
        ["Accept"] = "application/json",
        ["User-Agent"] = "NexusState-FiveM-Link/2.1"
    })
end, false)

-- ------------------------------------------------------------
-- 2) SAJÁT EGYENLEG LEKÉRDEZÉSE: /pp
-- ------------------------------------------------------------
RegisterCommand(Config.CheckCommand, function(source, args)
    local src = source
    if src == 0 then return end

    local Player = exports.qbx_core:GetPlayer(src)
    if not Player then return end

    local metadata = Player.PlayerData.metadata or {}
    local pp = metadata[Config.PpMetadataKey] or 0
    local vipTier = metadata[Config.VipTierMetadataKey]
    local vipExpires = metadata[Config.VipExpiresMetadataKey]

    local msg = ("💰 PP egyenleged: %s PP"):format(pp)
    if vipTier and vipTier ~= "" then
        local tierData = Config.VipTiers[vipTier]
        local label = tierData and tierData.label or vipTier
        if vipExpires and vipExpires > 0 then
            local remainingDays = math.max(0, math.ceil((vipExpires - os.time()) / 86400))
            msg = msg .. ("\n👑 VIP szint: %s (%d nap van hátra)"):format(label, remainingDays)
        else
            msg = msg .. ("\n👑 VIP szint: %s (örökös tagság)"):format(label)
        end
    end

    NotifyPlayer(src, msg, "primary")
end, false)

-- ------------------------------------------------------------
-- 3) WEB/DISCORD -> JÁTÉKOS: RCON-ON ÉRKEZŐ JÓVÁÍRÓ PARANCSOK
--    Ezeket a dashboard bot küldi RCON-on keresztül, SOHA ne hívd
--    kézzel játékosként — ezért restricted (csak konzol/RCON).
-- ------------------------------------------------------------

RegisterCommand("nexus_givepp", function(source, args)
    if source ~= 0 then return end -- csak RCON/konzol

    local citizenid = args[1]
    local amount = tonumber(args[2])
    local reasonJoined = table.concat(args, " ", 3)
    local reason = (reasonJoined ~= "" and reasonJoined) or "Nexus Dashboard jutalom"

    if not citizenid or not amount then
        print("^1[nexus_discord_link]^7 Hibás nexus_givepp hívás. Használat: nexus_givepp <citizenid> <összeg> <indoklás>")
        return
    end

    local Player, isOnline = GetCharacter(citizenid)
    if not Player then
        print(("^1[nexus_discord_link]^7 nexus_givepp: nem található karakter ezzel a citizenid-vel: %s"):format(citizenid))
        return
    end

    local current = GetCharacterMetadata(citizenid, Config.PpMetadataKey) or 0
    local newAmount = current + amount
    SetCharacterMetadata(citizenid, Config.PpMetadataKey, newAmount)

    DebugPrint(("PP jóváírva: %s +%s PP (%s) — új egyenleg: %s"):format(citizenid, amount, reason, newAmount))

    if isOnline then
        NotifyPlayer(Player.PlayerData.source, ("💎 +%s PP jóváírva! (%s)\nÚj egyenleg: %s PP"):format(amount, reason, newAmount), "success")
    end
end, true) -- true = restricted, csak ACE joggal / konzolból hívható

RegisterCommand("nexus_givecash", function(source, args)
    if source ~= 0 then return end

    local citizenid = args[1]
    local amount = tonumber(args[2])
    local reasonJoined = table.concat(args, " ", 3)
    local reason = (reasonJoined ~= "" and reasonJoined) or "Nexus Webshop vásárlás"

    if not citizenid or not amount then
        print("^1[nexus_discord_link]^7 Hibás nexus_givecash hívás. Használat: nexus_givecash <citizenid> <összeg> <indoklás>")
        return
    end

    local Player, isOnline = GetCharacter(citizenid)
    if not Player then
        print(("^1[nexus_discord_link]^7 nexus_givecash: nem található karakter ezzel a citizenid-vel: %s"):format(citizenid))
        return
    end

    local ok = ModifyMoney(citizenid, Config.CashAccount, amount, reason)
    if not ok then
        print(("^1[nexus_discord_link]^7 nexus_givecash: a jóváírás sikertelen (%s, %s)"):format(citizenid, amount))
        return
    end

    DebugPrint(("Pénz jóváírva: %s +$%s (%s) [%s]"):format(citizenid, amount, reason, Config.CashAccount))

    if isOnline then
        NotifyPlayer(Player.PlayerData.source, ("💵 +$%s jóváírva a %s számládra! (%s)"):format(amount, Config.CashAccount == "bank" and "bank" or "készpénz", reason), "success")
    end
end, true)

RegisterCommand("nexus_setvip", function(source, args)
    if source ~= 0 then return end

    local citizenid = args[1]
    local tier = args[2]
    local days = tonumber(args[3]) or 0

    if not citizenid or not tier or not Config.VipTiers[tier] then
        print("^1[nexus_discord_link]^7 Hibás nexus_setvip hívás. Használat: nexus_setvip <citizenid> <bronze|silver|gold> <napok, 0=örökös>")
        return
    end

    local Player, isOnline = GetCharacter(citizenid)
    if not Player then
        print(("^1[nexus_discord_link]^7 nexus_setvip: nem található karakter ezzel a citizenid-vel: %s"):format(citizenid))
        return
    end

    local expiresAt = days > 0 and (os.time() + (days * 86400)) or 0

    SetCharacterMetadata(citizenid, Config.VipTierMetadataKey, tier)
    SetCharacterMetadata(citizenid, Config.VipExpiresMetadataKey, expiresAt)

    local tierLabel = Config.VipTiers[tier].label
    DebugPrint(("VIP beállítva: %s -> %s (%s)"):format(citizenid, tierLabel, days > 0 and (days .. " nap") or "örökös"))

    if isOnline then
        local durationText = days > 0 and (("%d napig"):format(days)) or "örökre"
        NotifyPlayer(Player.PlayerData.source, ("👑 Megkaptad a(z) %s rangot, %s érvényes! Köszönjük a támogatást!"):format(tierLabel, durationText), "success")
    end
end, true)

-- ------------------------------------------------------------
-- 4) VIP LEJÁRAT AUTOMATIKUS ELLENŐRZÉSE (óránként, csak online játékosokra)
--    Ha lejárt egy időzített VIP tagság, automatikusan levesszük.
--    Offline játékosok VIP lejáratát belépéskor ellenőrizzük (lásd lentebb).
-- ------------------------------------------------------------
CreateThread(function()
    while true do
        Wait(60 * 60 * 1000) -- óránként

        local ok, players = pcall(function()
            return exports.qbx_core:GetQBPlayers()
        end)
        if ok and players then
            for _, Player in pairs(players) do
                local metadata = Player.PlayerData.metadata or {}
                local expiresAt = metadata[Config.VipExpiresMetadataKey]
                local tier = metadata[Config.VipTierMetadataKey]
                if tier and tier ~= "" and expiresAt and expiresAt > 0 and expiresAt < os.time() then
                    Player.Functions.SetMetaData(Config.VipTierMetadataKey, nil)
                    Player.Functions.SetMetaData(Config.VipExpiresMetadataKey, nil)
                    NotifyPlayer(Player.PlayerData.source, "⌛ A VIP tagságod lejárt. Hosszabbíts a webshopban!", "primary")
                    DebugPrint(("VIP lejárt és eltávolítva: %s"):format(Player.PlayerData.citizenid))
                end
            end
        end
    end
end)

-- Belépéskor is ellenőrizzük az adott karakter VIP lejáratát (offline közben is lejárhatott)
AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
    if not Player then return end
    local metadata = Player.PlayerData.metadata or {}
    local expiresAt = metadata[Config.VipExpiresMetadataKey]
    local tier = metadata[Config.VipTierMetadataKey]
    if tier and tier ~= "" and expiresAt and expiresAt > 0 and expiresAt < os.time() then
        Player.Functions.SetMetaData(Config.VipTierMetadataKey, nil)
        Player.Functions.SetMetaData(Config.VipExpiresMetadataKey, nil)
        NotifyPlayer(Player.PlayerData.source, "⌛ A VIP tagságod időközben lejárt. Hosszabbíts a webshopban!", "primary")
    end
end)