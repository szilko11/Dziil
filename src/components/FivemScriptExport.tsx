import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  Layers, 
  Key, 
  ShieldCheck, 
  ExternalLink, 
  BookOpen,
  Server,
  FileCode
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

export const FivemScriptExport: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Vágólapra másolva!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const fxmanifestCode = `fx_version 'cerulean'
game 'gta5'

author 'Nexus Horizon RP Dev Team'
description 'Automated Faction, Job & Discord Sync Module'
version '2.5.0'

server_scripts {
    '@mysql-async/lib/MySQL.lua', -- vagy oxmysql
    'config.lua',
    'server/main.lua'
}

client_scripts {
    'config.lua',
    'client/main.lua'
}
`;

  const configLuaCode = `Config = {}

-- Web Dashboard & Discord Bot API cím
Config.ApiUrl = "http://localhost:3000" -- Vagy a saját VPS / Domain címed
Config.SyncSecret = "nexus_secret_key_2026" -- Ugyanaz mint a .env fájlban!

-- Framework beállítás ('esx' vagy 'qbcore')
Config.Framework = 'qbcore'

-- Frakció menü gyorsbillentyű (Alapértelmezett: F6)
Config.MenuKey = 'F6'
`;

  const serverLuaCode = `-- Nexus Faction Integration: Server Sync Script
local QBCore = nil
local ESX = nil

if Config.Framework == 'qbcore' then
    QBCore = exports['qb-core']:GetCoreObject()
elseif Config.Framework == 'esx' then
    ESX = exports['es_extended']:getSharedObject()
end

-- Webhook hívás a Web API felé, amikor in-game tagot vesznek fel vagy rúgnak ki
function NotifyFactionSync(action, playerIdentifier, playerName, factionTag, jobName, grade, gradeName)
    local payload = json.encode({
        action = action,
        playerIdentifier = playerIdentifier,
        playerName = playerName,
        factionTag = factionTag,
        jobName = jobName,
        grade = grade,
        gradeName = gradeName,
        secretKey = Config.SyncSecret
    })

    PerformHttpRequest(Config.ApiUrl .. "/api/fivem/sync/job", function(statusCode, responseText, headers)
        if statusCode == 200 then
            print("^2[Nexus Factions] Sikeres szinkronizacio a Web/Discord fele: " .. action .. "^0")
        else
            print("^1[Nexus Factions] Szinkronizacios hiba (" .. tostring(statusCode) .. "): " .. tostring(responseText) .. "^0")
        end
    end, 'POST', payload, { ["Content-Type"] = 'application/json' })
end

-- Tag felvétele parancs: /fhire [id] [grade]
RegisterCommand('fhire', function(source, args)
    local src = source
    local targetId = tonumber(args[1])
    local grade = tonumber(args[2]) or 1

    if not targetId then
        TriggerClientEvent('chat:addMessage', src, { args = { '^1HIBA', 'Hasznalat: /fhire [JatekosID] [RangSzam]' } })
        return
    end

    if Config.Framework == 'qbcore' then
        local Player = QBCore.Functions.GetPlayer(src)
        local Target = QBCore.Functions.GetPlayer(targetId)

        if Player and Target and Player.PlayerData.job.isboss then
            local jobName = Player.PlayerData.job.name
            Target.Functions.SetJob(jobName, grade)
            TriggerClientEvent('QBCore:Notify', targetId, 'Felvetelt nyertel a(z) ' .. jobName .. ' frakcioba!', 'success')
            NotifyFactionSync('hire', Target.PlayerData.citizenid, Target.PlayerData.charinfo.firstname .. ' ' .. Target.PlayerData.charinfo.lastname, jobName, jobName, grade, 'Tag')
        end
    end
end, false)

-- Kirúgás parancs: /ffire [id]
RegisterCommand('ffire', function(source, args)
    local src = source
    local targetId = tonumber(args[1])
    if not targetId then return end

    if Config.Framework == 'qbcore' then
        local Player = QBCore.Functions.GetPlayer(src)
        local Target = QBCore.Functions.GetPlayer(targetId)

        if Player and Target and Player.PlayerData.job.isboss then
            local oldJob = Target.PlayerData.job.name
            Target.Functions.SetJob('unemployed', 0)
            TriggerClientEvent('QBCore:Notify', targetId, 'Elbocsatottak a frakciobol!', 'error')
            NotifyFactionSync('fire', Target.PlayerData.citizenid, Target.PlayerData.charinfo.firstname .. ' ' .. Target.PlayerData.charinfo.lastname, oldJob, oldJob, 0, 'Unemployed')
        end
    end
end, false)
`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
          <FileCode size={14} /> FiveM LUA Erőforrás Integráció
        </div>
        <h2 className="text-3xl sm:text-4xl font-black uppercase italic text-white">
          FiveM <span className="text-emerald-400">Resource</span> Export
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
          Másold be az alábbi fájlokat a FiveM szervered <span className="text-emerald-400 font-mono">resources/[scripts]/nexus_factions</span> mappájába az in-game és Discord automatikus kétirányú szinkronizációhoz.
        </p>
      </div>

      {/* Guide Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
            1
          </div>
          <h4 className="font-bold text-white text-sm">Mappa Létrehozása</h4>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Hozz létre egy <span className="text-emerald-400 font-mono">nexus_factions</span> nevű mappát a szerver <span className="text-zinc-300 font-mono">resources/</span> könyvtárában.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
            2
          </div>
          <h4 className="font-bold text-white text-sm">Fájlok Elhelyezése</h4>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Hozd létre a <span className="text-zinc-300 font-mono">fxmanifest.lua</span>, <span className="text-zinc-300 font-mono">config.lua</span> és <span className="text-zinc-300 font-mono">server/main.lua</span> fájlokat.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
            3
          </div>
          <h4 className="font-bold text-white text-sm">server.cfg Indítás</h4>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Írd be a szerver <span className="text-zinc-300 font-mono">server.cfg</span> fájljába: <span className="text-emerald-400 font-mono font-bold">ensure nexus_factions</span>.
          </p>
        </div>
      </div>

      {/* Code Blocks */}
      <div className="space-y-6">
        {/* fxmanifest.lua */}
        <Card className="bg-zinc-950/90 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/60 border-b border-zinc-800">
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-zinc-300">
              <Code size={14} className="text-emerald-400" /> fxmanifest.lua
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(fxmanifestCode, 'fxmanifest')}
              className="border-zinc-700 bg-zinc-800 text-xs text-white rounded-xl h-8"
            >
              {copiedSection === 'fxmanifest' ? <Check size={12} className="mr-1 text-emerald-400" /> : <Copy size={12} className="mr-1" />}
              {copiedSection === 'fxmanifest' ? 'Másolva' : 'Másolás'}
            </Button>
          </div>
          <pre className="p-6 text-xs font-mono text-zinc-300 bg-black/60 overflow-x-auto">
            {fxmanifestCode}
          </pre>
        </Card>

        {/* config.lua */}
        <Card className="bg-zinc-950/90 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/60 border-b border-zinc-800">
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-zinc-300">
              <Code size={14} className="text-amber-400" /> config.lua
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(configLuaCode, 'config')}
              className="border-zinc-700 bg-zinc-800 text-xs text-white rounded-xl h-8"
            >
              {copiedSection === 'config' ? <Check size={12} className="mr-1 text-emerald-400" /> : <Copy size={12} className="mr-1" />}
              {copiedSection === 'config' ? 'Másolva' : 'Másolás'}
            </Button>
          </div>
          <pre className="p-6 text-xs font-mono text-zinc-300 bg-black/60 overflow-x-auto">
            {configLuaCode}
          </pre>
        </Card>

        {/* server/main.lua */}
        <Card className="bg-zinc-950/90 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/60 border-b border-zinc-800">
            <div className="flex items-center gap-2 font-mono font-bold text-xs text-zinc-300">
              <Code size={14} className="text-indigo-400" /> server/main.lua
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(serverLuaCode, 'server')}
              className="border-zinc-700 bg-zinc-800 text-xs text-white rounded-xl h-8"
            >
              {copiedSection === 'server' ? <Check size={12} className="mr-1 text-emerald-400" /> : <Copy size={12} className="mr-1" />}
              {copiedSection === 'server' ? 'Másolva' : 'Másolás'}
            </Button>
          </div>
          <pre className="p-6 text-xs font-mono text-zinc-300 bg-black/60 overflow-x-auto">
            {serverLuaCode}
          </pre>
        </Card>
      </div>
    </div>
  );
};
