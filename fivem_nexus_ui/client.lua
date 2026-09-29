local display = false

RegisterCommand("dashboard", function()
    TriggerServerEvent("nexus_ui:requestData")
end)

RegisterNetEvent("nexus_ui:showDashboard")
AddEventHandler("nexus_ui:showDashboard", function(data)
    SetDisplay(true, data)
end)

RegisterNUICallback("close", function(data, cb)
    SetDisplay(false)
    cb("ok")
end)

function SetDisplay(bool, data)
    display = bool
    SetNuiFocus(bool, bool)
    SendNUIMessage({
        type = "ui",
        status = bool,
        data = data
    })
end

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        if display then
            DisableControlAction(0, 1, display) -- LookLeftRight
            DisableControlAction(0, 2, display) -- LookUpDown
            DisableControlAction(0, 142, display) -- MeleeAttackAlternate
            DisableControlAction(0, 18, display) -- Enter
            DisableControlAction(0, 322, display) -- ESC
            DisableControlAction(0, 106, display) -- VehicleMouseControlOverride
        else
            Citizen.Wait(500)
        end
    end
end)
