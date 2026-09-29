-- Példa Server script (ESX Framework)
-- Ha QBCore-t használsz, írd át az exportokat/kéréseket.

ESX = nil
TriggerEvent('esx:getSharedObject', function(obj) ESX = obj end)
if not ESX then
    -- Ha az új export módszert használod:
    -- pcall(function() ESX = exports["es_extended"]:getSharedObject() end)
end

RegisterNetEvent("nexus_ui:requestData")
AddEventHandler("nexus_ui:requestData", function()
    local _source = source
    local identifier = ""
    local name = GetPlayerName(_source)
    local cash = 0
    local bank = 0
    local pp = 0 -- Ha van saját PP rendszered, innen kérd le
    local job = "Ismeretlen"

    if ESX then
        local xPlayer = ESX.GetPlayerFromId(_source)
        if xPlayer then
            identifier = xPlayer.identifier
            name = xPlayer.getName()
            cash = xPlayer.getMoney()
            bank = xPlayer.getAccount('bank').money
            
            if xPlayer.job then
                job = xPlayer.job.label .. " - " .. xPlayer.job.grade_label
            end
            
            -- Ha van PP / Coin rendszered az adatbázisban, ide kell lekérni:
            -- local result = MySQL.Sync.fetchAll("SELECT pp FROM users WHERE identifier = @id", {['@id'] = identifier})
            -- if result[1] then pp = result[1].pp end
        end
    end

    local data = {
        playerName = name,
        identifier = identifier,
        cash = cash,
        bank = bank,
        pp = pp,
        job = job
    }

    TriggerClientEvent("nexus_ui:showDashboard", _source, data)
end)
