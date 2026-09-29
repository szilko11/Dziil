#!/usr/bin/env python3
"""
Nexus Horizon RP - Discord Bot (Python Mobile & Desktop Edition)
Komplett mobil (Android Termux / Pydroid) és szerver kompatibilis Discord bot.

Funkciók:
- Prefix parancsok (!hello, !ping, !cases, !opencase, !balance, !daily, !givemoney)
- Slash parancsok (/otlet, /whitelist, /whitelist_panel, /setup, /daily, /cases, /balance)
- Szabályzat gombok kezelése (Discord & Szerver Szabályzat elfogadás + számláló)
- Automata Whitelist Kvíz (8 kérdés, 75% küszöb, azonnali Polgár rang kiosztás)
- Ötlet beküldési ellenőrzés (Polgár rang szükséges, közvetlen kvíz gomb)
- Automata újracsatlakozás mobil hálózat (4G/5G/Wi-Fi) szakadás esetén
"""

import os
import sys
import time
import asyncio
import random
import discord
from discord.ext import commands
from discord import app_commands
from dotenv import load_dotenv

load_dotenv()

DEFAULT_TOKEN = "MTE2MDQ3MTQ0NDE5NTY1MTU4NQ.GGDK-7.8wnW0PcI96_Z17afDJjhVdjl6h4AMlmW8juJBY"
TOKEN = os.getenv("DISCORD_BOT_TOKEN") or os.getenv("BOT_TOKEN") or DEFAULT_TOKEN

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix='!', intents=intents, help_command=None)

# Memóriatárak
user_balances = {}
rules_ack_cache = {"discord": set(), "server": set()}

# 8 Whitelist Kérdés
WL_QUESTIONS = [
    {
        "q": "Mit jelent a PowerGaming (PG)?",
        "opts": [
            "Olyan cselekedet végrehajtása, ami a valóságban lehetetlen, vagy rákényszerítése másra",
            "Valós pénzért játékon belüli tárgyak vásárlása más játékostól",
            "Rendőrök elől való menekülés nagy sebességgel",
            "Fegyver elővétele felszólítás nélkül"
        ],
        "ans": 0
    },
    {
        "q": "Mit jelent a MetaGaming (MG)?",
        "opts": [
            "Játékon belüli hangos zenelejátszás mikrofonon keresztül",
            "Játékon kívüli (OOC/Discord/Stream) információk felhasználása IC a karaktered javára",
            "Több karakter egyidejű létrehozása és irányítása",
            "Autó lopása forgalmas helyről fényes nappal"
        ],
        "ans": 1
    },
    {
        "q": "Mit jelent a DeathMatch (DM)?",
        "opts": [
            "Versenyzés más játékosokkal pénzért",
            "Játékos megölése vagy bántalmazása megfelelő és nyomós RP indok nélkül",
            "Párbaj az illegális bokszklubban engedéllyel",
            "Rendőrautó megrongálása menekülés közben"
        ],
        "ans": 1
    },
    {
        "q": "Mit jelent a FearRP (Félelem RP)?",
        "opts": [
            "A sötét helyektől való félelem a játékban",
            "A karakterednek úgy kell féltenie az életét fegyveres fenyegetés alatt, mint a valóságban",
            "A rendőröktől való azonnali menekülés kötelezettsége",
            "Nem szabad bandaterületre menni egyedül"
        ],
        "ans": 1
    },
    {
        "q": "Mi a New Life Rule (NLR) szabály lényege halál után?",
        "opts": [
            "Törölni kell a karaktert a szerverről",
            "Halálod után elfelejted az azt közvetlenül megelőző eseményeket, és tilos azonnal bosszút állni",
            "Nem csatlakozhatsz újra a szerverhez 24 órán át",
            "Minden vagyonod automatikusan átkerül a mentősökhöz"
        ],
        "ans": 1
    },
    {
        "q": "Mi a különbség az IC (In Character) és az OOC (Out of Character) között?",
        "opts": [
            "Nincs különbség, mindkettő játék",
            "IC a kitalált karaktered világa és cselekedetei; OOC a te valós éned és játékos mivoltod",
            "IC a rendőrségi rádió, OOC a mentős rádió",
            "IC a szöveges chat, OOC a hangos beszéd"
        ],
        "ans": 1
    },
    {
        "q": "Mit jelent a ForceRP?",
        "opts": [
            "Erőszakos frakció indítása a szerveren",
            "Saját akaratod és RP cselekményed ráerőltetése a másik játékosra esélyadás nélkül",
            "Rendőrségi bilincs használata felszólításra",
            "Fegyver vásárlása feketepiacon"
        ],
        "ans": 1
    },
    {
        "q": "Mire szolgál a /me és a /do parancs?",
        "opts": [
            "/me cselekvés leírására, /do történések, látható körülmények és állapotok leírására szolgál",
            "/me a privát üzenet, /do a globális hirdetés",
            "/me a mentők hívása, /do a rendőrség hívása",
            "/me a pénzküldés, /do a járműkulcs átadása"
        ],
        "ans": 0
    }
]

# Aktív kvíz munkamenetek: user_id -> {"index": int, "score": int, "questions": list}
active_quizzes = {}

CASES = {
    "bronze": {"name": "📦 Kezdő Bronz Láda", "price": 100, "color": 0xcd7f32},
    "silver": {"name": "💼 Fegyver & Bűnözés Ezüst Láda", "price": 250, "color": 0xc0c0c0},
    "gold": {"name": "👑 Arany Prémium Láda", "price": 500, "color": 0xffd700},
    "knife": {"name": "✨ Legendás Kés & Exkluzív Láda", "price": 1000, "color": 0xe11d48}
}

def get_user_balance(user_id: int):
    if user_id not in user_balances:
        user_balances[user_id] = {"dc": 500, "pp": 0, "cash": 25000, "last_daily": 0}
    return user_balances[user_id]

async def ensure_polgar_role(guild: discord.Guild, member: discord.Member):
    """Kikeresi vagy létrehozza a Polgár rangot és ráadja a tagra"""
    polgar = None
    for r in guild.roles:
        if "polgár" in r.name.lower() or "polgar" in r.name.lower():
            polgar = r
            break
    if not polgar:
        try:
            polgar = await guild.create_role(name="👥 Polgár", color=discord.Color.light_grey(), reason="Automata Polgár rang")
        except Exception as e:
            print(f"[Python Bot] Nem sikerült létrehozni a Polgár rangot: {e}")
    if polgar and polgar not in member.roles:
        try:
            await member.add_roles(polgar, reason="Sikeres Whitelist vizsga")
            return polgar
        except Exception as e:
            print(f"[Python Bot] Hiba a rang kiosztásakor: {e}")
    return polgar

class WhitelistQuizView(discord.ui.View):
    def __init__(self, user_id: int):
        super().__init__(timeout=180)
        self.user_id = user_id
        for i, label in enumerate(["A Válasz", "B Válasz", "C Válasz", "D Válasz"]):
            btn = discord.ui.Button(label=label, style=discord.ButtonStyle.primary, custom_id=f"wl_ans_{i}")
            btn.callback = self.make_callback(i)
            self.add_item(btn)

    def make_callback(self, idx: int):
        async def callback(interaction: discord.Interaction):
            if interaction.user.id != self.user_id:
                return await interaction.response.send_message("❌ Ez a teszt egy másik játékoshoz tartozik!", ephemeral=True)
            
            session = active_quizzes.get(self.user_id)
            if not session:
                return await interaction.response.send_message("ℹ️ A kvíz munkamenet lejárt. Kattints a Whitelist Kvíz Indítása gombra!", ephemeral=True)

            q_data = session["questions"][session["index"]]
            if idx == q_data["ans"]:
                session["score"] += 1
            session["index"] += 1

            if session["index"] >= len(session["questions"]):
                # Befejeződött
                score = session["score"]
                total = len(session["questions"])
                percent = round((score / total) * 100)
                del active_quizzes[self.user_id]

                if percent >= 75:
                    embed = discord.Embed(
                        title="🎉 GRATULÁLUNK! SIKERES WHITELIST VIZSGA!",
                        description=(
                            f"Sikeresen teljesítetted a szabályzati kvízt!\n\n"
                            f"📊 **Elért eredmény:** `{score}/{total}` pont (**{percent}%**)\n"
                            f"🏆 **Megszerzett rang:** `👥 Polgár (Whitelist)`\n\n"
                            f"Most már korlátlanul írhatsz az ötletek közé (`💡┃ötletek`), a csevegőbe és játszhatsz a szerveren!\n"
                            f"Jó játékot kíván a **Nexus Horizon RP** csapata!"
                        ),
                        color=0x10b981
                    )
                    await interaction.response.edit_message(embed=embed, view=None)
                    if interaction.guild and isinstance(interaction.user, discord.Member):
                        await ensure_polgar_role(interaction.guild, interaction.user)
                else:
                    embed = discord.Embed(
                        title="❌ SIKERTELEN WHITELIST VIZSGA",
                        description=(
                            f"Sajnos nem érted el a szükséges 75%-os szintet.\n\n"
                            f"📊 **Elért pontszám:** `{score}/{total}` pont (**{percent}%**)\n"
                            f"📖 Olvasd át újra a szabályzatot és próbáld meg újra!"
                        ),
                        color=0xef4444
                    )
                    retry_view = discord.ui.View()
                    btn = discord.ui.Button(label="🔄 Újrapróbálkozás", style=discord.ButtonStyle.success)
                    async def retry_cb(inter):
                        await start_quiz_for_interaction(inter)
                    btn.callback = retry_cb
                    retry_view.add_item(btn)
                    await interaction.response.edit_message(embed=embed, view=retry_view)
            else:
                # Következő kérdés
                embed, view = get_question_embed_and_view(self.user_id)
                await interaction.response.edit_message(embed=embed, view=view)

        return callback

def get_question_embed_and_view(user_id: int):
    session = active_quizzes[user_id]
    q_data = session["questions"][session["index"]]
    q_num = session["index"] + 1
    total = len(session["questions"])

    letters = ["🇦", "🇧", "🇨", "🇩"]
    opts_txt = "\n\n".join([f"### {letters[i]} Opció\n> **{opt}**" for i, opt in enumerate(q_data["opts"])])

    embed = discord.Embed(
        title=f"🛡️ WHITELIST KVÍZ • KÉRDÉS [{q_num} / {total}]",
        description=(
            f"## 📋 {q_data['q']}\n\n"
            f"📊 **Haladás:** `{q_num}/{total}` kérdés ({round(((q_num - 1) / total) * 100)}%)\n\n"
            f"───────────────────────────────────────\n\n"
            f"{opts_txt}\n\n"
            f"───────────────────────────────────────\n"
            f"👉 **Válaszd ki a helyes válasz betűjelét az alábbi gombokkal:**"
        ),
        color=0x00e5ff
    )
    return embed, WhitelistQuizView(user_id)

async def start_quiz_for_interaction(interaction: discord.Interaction):
    user_id = interaction.user.id
    q_copy = list(WL_QUESTIONS)
    random.shuffle(q_copy)
    active_quizzes[user_id] = {
        "index": 0,
        "score": 0,
        "questions": q_copy
    }
    embed, view = get_question_embed_and_view(user_id)
    if interaction.response.is_done():
        await interaction.followup.send(embed=embed, view=view, ephemeral=True)
    else:
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

class PersistentRulesAndQuizView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Elolvastam és Elfogadom (Discord)", style=discord.ButtonStyle.success, emoji="✅", custom_id="ack_rules_discord")
    async def ack_discord(self, interaction: discord.Interaction, button: discord.ui.Button):
        rules_ack_cache["discord"].add(interaction.user.id)
        embed = discord.Embed(
            title="🎉 Discord Szabályzat Sikeresen Elfogadva!",
            description=(
                "Köszönjük a szabályzat elfogadását!\n\n"
                "🚀 **Következő lépés a Polgár rangért:**\n"
                "Kattints az alábbi zöld **[📋 Whitelist Kvíz Kitöltése]** gombra!"
            ),
            color=0x10b981
        )
        row = discord.ui.View()
        btn = discord.ui.Button(label="📋 Whitelist Kvíz Kitöltése (Polgár rangért)", style=discord.ButtonStyle.success, emoji="✨")
        async def cb(inter):
            await start_quiz_for_interaction(inter)
        btn.callback = cb
        row.add_item(btn)
        await interaction.response.send_message(embed=embed, view=row, ephemeral=True)

    @discord.ui.button(label="Elolvastam és Elfogadom (Szerver)", style=discord.ButtonStyle.success, emoji="✅", custom_id="ack_rules_server")
    async def ack_server(self, interaction: discord.Interaction, button: discord.ui.Button):
        rules_ack_cache["server"].add(interaction.user.id)
        embed = discord.Embed(
            title="🎉 Szerver Szabályzat Sikeresen Elfogadva!",
            description=(
                "Köszönjük a szabályzat elfogadását!\n\n"
                "🚀 **Következő lépés a Polgár rangért:**\n"
                "Kattints az alábbi zöld **[📋 Whitelist Kvíz Kitöltése]** gombra!"
            ),
            color=0x10b981
        )
        row = discord.ui.View()
        btn = discord.ui.Button(label="📋 Whitelist Kvíz Kitöltése (Polgár rangért)", style=discord.ButtonStyle.success, emoji="✨")
        async def cb(inter):
            await start_quiz_for_interaction(inter)
        btn.callback = cb
        row.add_item(btn)
        await interaction.response.send_message(embed=embed, view=row, ephemeral=True)

    @discord.ui.button(label="📋 Whitelist Kvíz Indítása", style=discord.ButtonStyle.primary, emoji="✨", custom_id="start_whitelist_quiz")
    async def start_quiz_btn(self, interaction: discord.Interaction, button: discord.ui.Button):
        await start_quiz_for_interaction(interaction)

@bot.event
async def on_ready():
    print(f"🤖 [Python Bot] Sikeresen bejelentkezve: {bot.user.name} ({bot.user.id})")
    print(f"📱 [Python Bot] Mobil hálózati stabilitási modul aktív.")
    bot.add_view(PersistentRulesAndQuizView())
    try:
        # Globális szinkronizáció
        synced = await bot.tree.sync()
        print(f"⚡ [Python Bot] {len(synced)} globális Slash parancs szinkronizálva.")
        # Szerver szintű azonnali szinkronizálás
        for g in bot.guilds:
            try:
                await bot.tree.sync(guild=g)
                print(f"⚡ [Python Bot] Parancsok azonnal szinkronizálva a(z) {g.name} szerverre.")
            except Exception as ge:
                pass
    except Exception as e:
        print(f"❌ [Python Bot] Szinkronizációs hiba: {e}")

# Slash Parancs: /otlet
@bot.tree.command(name="otlet", description="Ötlet beküldése az ötlet dobozba (Polgár rang szükséges)")
@app_commands.describe(leiras="Az ötleted részletes leírása")
async def slash_otlet(interaction: discord.Interaction, leiras: str):
    member = interaction.user
    if isinstance(member, discord.Member):
        has_polgar = any("polgár" in r.name.lower() or "polgar" in r.name.lower() or "admin" in r.name.lower() or "staff" in r.name.lower() for r in member.roles)
        if not has_polgar and not member.guild_permissions.administrator:
            embed = discord.Embed(
                title="🔒 Hiányzó Polgár Rang",
                description=(
                    "❌ **Az ötlet beküldéséhez és az ötlet doboz használatához `Polgár` rang szükséges!**\n\n"
                    "📌 **Hogyan szerezhetsz Polgár rangot?**\n"
                    "1. Olvasd el a szabályzatot a szabályzat szobákban.\n"
                    "2. Fogadd el a szabályzatot a zöld gombra kattintva.\n"
                    "3. Töltsd ki a Whitelist Kvízt az alábbi zöld gombbal!\n\n"
                    "✨ *A sikeres teszt után azonnal megkapod a rangot és beküldheted az ötleteidet!*"
                ),
                color=0xef4444
            )
            row = discord.ui.View()
            btn = discord.ui.Button(label="📋 Whitelist Kvíz Kitöltése", style=discord.ButtonStyle.success, emoji="✨")
            async def cb(inter):
                await start_quiz_for_interaction(inter)
            btn.callback = cb
            row.add_item(btn)
            return await interaction.response.send_message(embed=embed, view=row, ephemeral=True)

    otlet_ch = None
    if interaction.guild:
        for c in interaction.guild.text_channels:
            if "ötlet" in c.name.lower() or "otlet" in c.name.lower():
                otlet_ch = c
                break

    if not otlet_ch:
        return await interaction.response.send_message("❌ Nem található az ötletek csatorna (`💡┃ötletek`).", ephemeral=True)

    embed = discord.Embed(
        title="💡 Új Közösségi Ötlet",
        description=leiras,
        color=0xfacc15
    )
    embed.set_author(name=interaction.user.name, icon_url=interaction.user.display_avatar.url)
    embed.set_footer(text="Nexus Horizon RP • Ötlet Doboz")
    embed.timestamp = discord.utils.utcnow()

    msg = await otlet_ch.send(embed=embed)
    await msg.add_reaction("👍")
    await msg.add_reaction("👎")
    await interaction.response.send_message(f"✅ Az ötletedet sikeresen elküldtük a(z) {otlet_ch.mention} csatornába!", ephemeral=True)

# Slash Parancs: /whitelist
@bot.tree.command(name="whitelist", description="Interaktív Whitelist & Szabályzat Kvíz kitöltése a Polgár rangért")
async def slash_whitelist(interaction: discord.Interaction):
    await start_quiz_for_interaction(interaction)

# Slash Parancs: /whitelist_panel
@bot.tree.command(name="whitelist_panel", description="Whitelist indító panel kiküldése (Admin)")
@app_commands.default_permissions(administrator=True)
async def slash_whitelist_panel(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🛡️ NEXUS HORIZON RP • AUTOMATA WHITELIST KVÍZ",
        description=(
            "Üdvözlünk a **Nexus Horizon RolePlay** szerverén!\n\n"
            "A szerverhez való csatlakozáshoz és a teljes jogú **Polgár (Whitelist)** rang azonnali megszerzéséhez töltsd ki az alábbi 8 kérdéses alapvető szabályzati tesztet.\n\n"
            "📋 **Tudnivalók:**\n"
            "• **8 kérdés** alapvető RP fogalmakról (PG, MG, DM, FearRP, NLR, /me & /do)\n"
            "• Legalább **75%-os** eredmény (minimum 6 helyes válasz)\n"
            "• ✅ **Azonnali jóváhagyás:** A bot sikeres teszt után azonnal kiosztja a Polgár rangot!\n\n"
            "Kattints az alábbi gombra a teszt megkezdéséhez!"
        ),
        color=0x00e5ff
    )
    view = PersistentRulesAndQuizView()
    await interaction.channel.send(embed=embed, view=view)
    await interaction.response.send_message("✅ Whitelist panel sikeresen kiküldve!", ephemeral=True)

# Prefix parancsok
@bot.command(name="hello")
async def cmd_hello(ctx):
    await ctx.reply("Hello there!")

@bot.command(name="ping")
async def cmd_ping(ctx):
    latency = round(bot.latency * 1000)
    await ctx.reply(f"Pong! ({latency}ms)")

@bot.command(name="balance", aliases=["egyenleg"])
async def cmd_balance(ctx):
    bal = get_user_balance(ctx.author.id)
    embed = discord.Embed(
        title=f"💳 {ctx.author.name} Egyenlege",
        description=(
            f"🪙 **Discord Pénz (DC):** `{bal['dc']:,} DC` *(Ládanyitáshoz)*\n"
            f"💎 **Prémium Pont (PP):** `{bal['pp']:,} PP`\n"
            f"💵 **FiveM Készpénz:** `${bal['cash']:,}`"
        ),
        color=0xf59e0b
    )
    await ctx.reply(embed=embed)

@bot.command(name="daily", aliases=["napi"])
async def cmd_daily(ctx):
    bal = get_user_balance(ctx.author.id)
    now = time.time()
    if now - bal["last_daily"] < 86400:
        remain = int(86400 - (now - bal["last_daily"]))
        return await ctx.reply(f"⏳ Ma már átvetted a napi ajándékodat! Újra elérhető: **{remain // 3600} óra {(remain % 3600) // 60} perc** múlva.")
    bal["last_daily"] = now
    bal["dc"] += 150
    bal["cash"] += 25000
    await ctx.reply(f"🎁 **Napi Jutalom Átvéve!**\nJóváírva: `+150 DC` és `+$25,000 FiveM Készpénz`!")

async def main():
    while True:
        try:
            print("[Python Bot] Csatlakozás a Discordhoz...")
            await bot.start(TOKEN)
        except Exception as e:
            print(f"[Python Bot Mobil Újracsatlakozás] Hiba: {e}. Újrapróbálkozás 5 másodperc múlva...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[Python Bot] Leállítva a felhasználó által.")
