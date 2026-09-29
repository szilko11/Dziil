-- ============================================================
--  NEXUS HORIZON — DISCORD ÖSSZEKÖTÉS (KLIENS OLDAL)
-- ============================================================
-- Csak a chat-parancs javaslatokat (autocomplete) regisztrálja,
-- hogy szépen megjelenjenek a játékos chatjében. Minden valós
-- logika szerver oldalon fut (lásd server/main.lua).
-- ============================================================

CreateThread(function()
    TriggerEvent('chat:addSuggestion', '/' .. Config.VerifyCommand, 'Discord fiók összekötése a karaktereddel', {
        { name = 'kód', help = 'A Discordon kapott 6 jegyű kód (pl. /verify 123456)' }
    })

    TriggerEvent('chat:addSuggestion', '/' .. Config.CheckCommand, 'Saját PP egyenleg és VIP szint lekérdezése')
end)
