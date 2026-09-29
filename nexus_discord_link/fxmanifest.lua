fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nexus_discord_link'
author 'SzilardGames'
description 'Discord <-> FiveM (QBox) fiók összekötés a Nexus Horizon RP dashboardhoz — PP, pénz és VIP jóváírás a webshopból/Discordból'
version '1.0.0'

shared_scripts {
    'config.lua'
}

server_scripts {
    'server/main.lua'
}

client_scripts {
    'client/main.lua'
}

dependencies {
    'qbx_core'
}
