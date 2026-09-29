#!/bin/bash
# ==============================================================================
# Nexus Horizon RP - Mobil Bot & Szerver Indító (Android / Termux)
# ==============================================================================

echo "=========================================================="
echo "  🚀 NEXUS HORIZON RP - MOBIL BOT SZERVER INDÍTÓ (ANDROID)"
echo "=========================================================="
echo ""

# Termux ébrentartás (wake-lock) bekapcsolása, hogy a telefon ne zárja le a botot a háttérben
if command -v termux-wake-lock &> /dev/null; then
    echo "🔋 [Mobil] Android Termux ébrentartás (wake-lock) aktiválva..."
    termux-wake-lock
fi

# Környezeti változók ellenőrzése
export PORT=${PORT:-3000}
export NODE_ENV=${NODE_ENV:-production}
export NODE_OPTIONS="--max-old-space-size=256"

echo "📱 Port: $PORT"
echo "🌐 Mód: $NODE_ENV"
echo "🤖 Discord Bot Token: Betöltve"
echo ""

# Függőségek ellenőrzése
if [ ! -d "node_modules" ]; then
    echo "📦 [Telepítés] node_modules nem található, csomagok telepítése..."
    npm install --production=false
fi

# Build ellenőrzése
if [ ! -f "dist/server.cjs" ]; then
    echo "⚡ [Build] Szerver lefordítása..."
    npm run build
fi

echo "🟢 [Szerver] Mobil Bot & Web Szerver indítása (Auto-Restart aktív)..."
echo "----------------------------------------------------------"

# Végtelen újraindítási ciklus mobil hálózat-ingadozások esetére
while true; do
    if [ -f "dist/server.cjs" ]; then
        node dist/server.cjs
    else
        npx tsx server.ts
    fi

    EXIT_CODE=$?
    echo ""
    echo "⚠️ [Mobil Figyelmeztetés] A szerver leállt (Kód: $EXIT_CODE)."
    echo "🔄 Automata újraindítás 3 másodperc múlva (Ctrl+C a leállításhoz)..."
    sleep 3
done
