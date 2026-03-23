"""
🔮 Mystická Hvězda — Social Media Agent v2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Použití:
  python agent.py generate              Interaktivní generování (výběr tématu, typů, variací)
  python agent.py generate --auto       Automaticky vygeneruje post (vhodné pro denní rutinu)
  python agent.py batch                 Content calendar — 3 posty/den na 7 dní (21 postů)
  python agent.py batch --days 3        Kratší plán (3 dny = 9 postů)
  python agent.py blog [--all]          Blog promo post (--all ukáže výběr z posledních 10 článků)
  python agent.py plan                  Týdenní plán s lunárním kontextem
  python agent.py story TÉMA            Série Instagram Stories (5-7 slidů)
  python agent.py carousel TÉMA         Karusel post obsah (7 slidů)
  python agent.py list                  Přehled uložených postů
  python agent.py reply "komentář"      Manuální odpověď na komentář (bez Meta API)
  python agent.py comments              Správa komentářů z FB + IG (vyžaduje Meta API)
  python agent.py comments --sync       Načte nové komentáře a vygeneruje odpovědi
  python agent.py astro                 Dnešní astrologický kontext
"""
import argparse
import sys
import os
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt, Confirm, IntPrompt
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn
from rich.columns import Columns
from rich.text import Text
from rich import box

import config
from utils import slugify
from logger import get_logger

log = get_logger(__name__)
from generators.text_generator import (
    generate_post, refine_post, generate_comment_reply,
    generate_weekly_content_plan, generate_story_sequence, generate_carousel,
)
from generators.image_generator import generate_image
from generators.lunar_context import get_full_astrological_context
from generators.content_memory import (
    get_variety_context, record_post, pick_content_intent, record_approved_post,
    record_qg_issues, record_hook_score, record_golden_template,
)
from blog_reader import get_article_for_promo, format_article_for_post, load_blog_articles
from post_saver import save_post, load_all_posts, mark_post_approved
from comment_manager import (
    sync_comments, get_pending_comments, reply_to_comment,
    hide_comment, get_stats, analyze_comment_sentiment,
)
from quality_gate import validate_post, print_quality_report

console = Console()


def print_banner():
    astro = None
    try:
        astro = get_full_astrological_context()
    except Exception as e:
        log.debug("Banner astro kontext nedostupný: %s", e)

    moon_str = f"  {astro['moon']['emoji']} {astro['moon']['phase_cs']}  {astro['sun']['symbol']} {astro['sun']['sign_cs']}" if astro else ""
    console.print(Panel.fit(
        f"[bold purple]🔮 Mystická Hvězda[/bold purple]  [dim]Social Media Agent v2[/dim]{moon_str}",
        border_style="purple"
    ))
    console.print()


# ══════════════════════════════════════════════════
# BUFFER HELPERS
# ══════════════════════════════════════════════════

def _offer_buffer_publish(post_data: dict, image_path, auto: bool):
    """Nabídne publikování přes Buffer pokud je token nastaven."""
    if not config.BUFFER_ACCESS_TOKEN:
        return  # Buffer není nakonfigurován — tiše přeskočíme

    caption = post_data.get("caption", "")
    hashtags = post_data.get("hashtags", [])

    if auto:
        # V auto módu přidej do fronty bez ptaní
        action = "queue"
    else:
        console.print("\n[bold blue]📤 Buffer Publishing[/bold blue]")
        console.print("  [dim]1.[/dim] Přidat do fronty [dim](Buffer vybere optimální čas)[/dim]")
        console.print("  [dim]2.[/dim] Publikovat hned")
        console.print("  [dim]3.[/dim] Přeskočit")
        choice = Prompt.ask("Vyber možnost", choices=["1", "2", "3"], default="1")
        action = {"1": "queue", "2": "now", "3": "skip"}.get(choice, "skip")

    if action == "skip":
        return

    try:
        from buffer_publisher import publish_now, add_to_queue
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            p.add_task("📤  Odesílám do Buffer...", total=None)
            if action == "now":
                result = publish_now(caption, hashtags, image_path)
            else:
                result = add_to_queue(caption, hashtags, image_path)

        if result.get("success"):
            updates = result.get("updates", [])
            bid = updates[0].get("id", "?") if updates else "?"
            mode_label = "publikován" if action == "now" else "přidán do fronty"
            console.print(f"[bold green]✓ Buffer: post {mode_label}[/bold green] [dim](ID: {bid})[/dim]")
        else:
            console.print(f"[yellow]⚠️  Buffer: {result.get('message', 'neznámá chyba')}[/yellow]")

    except Exception as e:
        console.print(f"[red]✗ Buffer chyba: {e}[/red]")
        log.error("Buffer publish selhal: %s", e)


def cmd_buffer_profiles():
    """Zobrazí seznam profilů připojených v Buffer účtu."""
    print_banner()
    if not config.BUFFER_ACCESS_TOKEN:
        console.print("[red]✗ BUFFER_ACCESS_TOKEN není nastaven v .env[/red]")
        console.print("[dim]Token získáš na: https://buffer.com/developers/apps[/dim]")
        return

    try:
        from buffer_publisher import get_profiles, verify_access
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            p.add_task("🔍  Načítám Buffer profily...", total=None)
            check = verify_access()
            profiles = get_profiles()

        if not check["ok"]:
            console.print(f"[red]✗ Buffer token nefunguje: {check['error']}[/red]")
            return

        user = check.get("user", {})
        console.print(f"\n[green]✓ Připojeno jako:[/green] {user.get('name', '?')} ({user.get('email', '?')})\n")

        table = Table(title="Buffer profily", box=box.ROUNDED)
        table.add_column("ID", style="dim", width=28)
        table.add_column("Platforma", style="cyan", width=14)
        table.add_column("Název profilu", style="white")
        table.add_column("Stav", width=10)

        for p in profiles:
            platform = p.get("service", "?")
            name = p.get("formatted_username") or p.get("formatted_service") or "?"
            pid = p.get("id", "?")
            paused = p.get("paused", False)
            status = "[red]Pozastaveno[/red]" if paused else "[green]Aktivní[/green]"
            table.add_row(pid, platform, name, status)

        console.print(table)
        console.print("\n[dim]Zkopíruj ID Instagram profilu a vlož do .env jako BUFFER_PROFILE_ID=[/dim]")

    except Exception as e:
        console.print(f"[red]✗ Chyba: {e}[/red]")


def cmd_buffer_queue():
    """Zobrazí aktuální frontu naplánovaných postů v Buffer."""
    print_banner()
    if not config.BUFFER_ACCESS_TOKEN or not config.BUFFER_PROFILE_ID:
        console.print("[red]✗ Nastav BUFFER_ACCESS_TOKEN a BUFFER_PROFILE_ID v .env[/red]")
        return

    try:
        from buffer_publisher import get_pending_posts
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            p.add_task("🔍  Načítám Buffer frontu...", total=None)
            posts = get_pending_posts()

        if not posts:
            console.print("[dim]Buffer fronta je prázdná.[/dim]")
            return

        console.print(f"\n[bold]📋 Buffer fronta — {len(posts)} postů[/bold]\n")
        for i, post in enumerate(posts, 1):
            text = post.get("text", "")[:80]
            scheduled = post.get("scheduled_at", "?")
            pid = post.get("id", "?")
            console.print(f"  [dim]{i}.[/dim] [cyan]{scheduled}[/cyan]  {text}...  [dim]({pid})[/dim]")

    except Exception as e:
        console.print(f"[red]✗ Chyba: {e}[/red]")



# ══════════════════════════════════════════════════
# BATCH HELPERS
# ══════════════════════════════════════════════════

def _print_posting_checklist():
    """Zobrazí checklist pro manuální postování."""
    console.print(Panel(
        "  [bold]1.[/bold] Vygeneruj obrázek z promptu výše [dim](Midjourney / Canva AI / DALL-E)[/dim]\n"
        "  [bold]2.[/bold] Nahraj obrázek do Meta Business Suite\n"
        "  [bold]3.[/bold] Vlož caption [bold]i s hashtagy[/bold] (hashtagy jsou součástí textu)\n"
        "  [bold]4.[/bold] Naplánuj nebo zveřejni\n"
        "  [dim]⏰ Nejlepší čas: Ráno 8:00  ·  Poledne 12:00  ·  Večer 19:00–21:00[/dim]",
        title="📋 Jak postovat (Meta Business Suite)",
        border_style="dim",
        padding=(0, 1),
    ))


def _save_calendar_markdown(calendar: list, platform: str) -> "Path":
    """Uloží content calendar jako přehledný markdown soubor."""
    CS_DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"]
    CS_MONTHS = [
        "ledna", "února", "března", "dubna", "května", "června",
        "července", "srpna", "září", "října", "listopadu", "prosince",
    ]

    calendar_dir = config.OUTPUT_DIR / "calendar"
    calendar_dir.mkdir(parents=True, exist_ok=True)

    start_date = calendar[0]["date"]
    end_date = calendar[-1]["date"]

    start_str = f"{start_date.day}. {CS_MONTHS[start_date.month - 1]} {start_date.year}"
    end_str = f"{end_date.day}. {CS_MONTHS[end_date.month - 1]} {end_date.year}"
    filename = f"calendar_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.md"
    path = calendar_dir / filename

    lines = [
        f"# 📅 Content Calendar — {start_str} – {end_str}",
        "",
        f"> Vygenerováno: {datetime.now().strftime('%d.%m.%Y %H:%M')}  |  Platforma: {platform}",
        "> **Jak postovat:** Zkopíruj caption (hashtagy jsou součástí textu) → Meta Business Suite → Naplánuj",
        "",
        "---",
        "",
    ]

    for day in calendar:
        d = day["date"]
        day_name = CS_DAYS[d.weekday()]
        date_str = f"{d.day}. {CS_MONTHS[d.month - 1]}"

        lines.append(f"## 📅 {day_name} {date_str}")
        lines.append("")

        for post in day["posts"]:
            slot = post["slot"]
            score = post.get("qg_score", 0)
            score_emoji = "✅" if score >= 7.5 else "⚠️" if score >= 6.0 else "🔴"
            intent = post["post_data"].get("content_intent", "pure_value")
            intent_cs = {"pure_value": "pure_value", "soft_promo": "soft_promo", "direct_promo": "direct_promo"}.get(intent, intent)
            hook = post["post_data"].get("hook_formula", "—")
            cta = post["post_data"].get("call_to_action", "")
            # Zkrať CTA na max 40 znaků pro header
            cta_short = (cta[:37] + "…") if len(cta) > 40 else cta

            lines.append(f"### {slot['label']} {slot['time']} — `{post['post_type']}` | {hook} | {intent_cs}")
            lines.append(f"> {score_emoji} Kvalita: **{score:.1f}/10**  ·  Téma: {post['topic']}")
            if cta_short:
                lines.append(f"> 💬 CTA: *{cta_short}*")
            lines.append("")

            # Caption — inline, ne code block
            caption = post["post_data"].get("caption", "")
            hashtags = post["post_data"].get("hashtags", [])
            hashtag_str = ("\n\n" + "  ".join(hashtags)) if hashtags else ""
            grammar_changes = post["post_data"].get("grammar_changes", [])
            lines.append("**📝 Caption:**")
            lines.append("")
            lines.append(caption + hashtag_str)
            lines.append("")
            if grammar_changes:
                lines.append(f"> ✏️ Gramatické opravy: {' · '.join(grammar_changes)}")
                lines.append("")

            # Image prompt
            image_prompt = post["post_data"].get("image_prompt", "")
            if image_prompt:
                lines.append("**🖼️ Image Prompt:**")
                lines.append("```")
                lines.append(image_prompt)
                lines.append("```")
                lines.append("")
                lines.append("> 🎨 Styl: Premium 3D CGI render · ONE central floating object · NO frames NO borders")
                lines.append("> 📐 Formát: Portrait 4:5 · 1080×1350px · Plain dark navy border pro ořez vodoznaku")
                lines.append("")

            lines.append("---")
            lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


def _show_batch_summary(calendar: list, errors: int):
    """Zobrazí souhrnnou tabulku výsledků batch generování."""
    CS_DAYS_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"]

    total = sum(len(d["posts"]) for d in calendar)
    all_scores = [p["qg_score"] for d in calendar for p in d["posts"]]
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
    high_quality = sum(1 for s in all_scores if s >= 7.5)

    console.print(f"\n[bold green]✅ Batch dokončen![/bold green]  "
                  f"[bold]{total}[/bold] postů · "
                  f"průměr [cyan]{avg_score:.1f}/10[/cyan] · "
                  f"[green]{high_quality}×[/green] skóre 7.5+ · "
                  f"[red]{errors}[/red] chyb\n")

    table = Table(
        title="📅 Content Calendar — Přehled",
        border_style="purple",
        box=box.ROUNDED,
        show_lines=True,
    )
    table.add_column("Den", style="bold cyan", width=4)
    table.add_column("Datum", style="dim", width=6)
    table.add_column("🌅 Ráno 8:00", width=26)
    table.add_column("☀️ Poledne 12:00", width=26)
    table.add_column("🌙 Večer 19:00", width=26)

    for day in calendar:
        d = day["date"]
        posts = {p["slot"]["id"]: p for p in day["posts"]}

        def fmt_post(slot_id: str) -> str:
            p = posts.get(slot_id)
            if not p:
                return "[dim]—[/dim]"
            score = p["qg_score"]
            color = "green" if score >= 7.5 else "yellow" if score >= 6.0 else "red"
            return (
                f"[{color}]{score:.1f}[/{color}] [dim]{p['post_type'][:12]}[/dim]\n"
                f"{p['topic'][:22]}"
            )

        table.add_row(
            CS_DAYS_SHORT[d.weekday()],
            f"{d.day}.{d.month}.",
            fmt_post("morning"),
            fmt_post("noon"),
            fmt_post("evening"),
        )

    console.print(table)


def cmd_batch(days: int = 3, platform: str = "instagram"):
    """Generuje content calendar — 3 posty denně na N dní."""
    print_banner()

    import random
    from datetime import date as dateclass, timedelta

    total_posts = days * 3

    console.print(Panel(
        f"Generuji [bold]{total_posts} postů[/bold] pro [bold]{days} dní[/bold]  "
        f"[dim]({days} × 3 sloty)[/dim]\n"
        f"[dim]🌅 Ráno 8:00  ·  ☀️ Poledne 12:00  ·  🌙 Večer 19:00[/dim]\n"
        f"[dim]Platforma: {platform}  ·  QG práh: 7.5  ·  1× refinement při chybách[/dim]",
        title="📅 Batch Generator",
        border_style="purple",
    ))

    BATCH_THRESHOLD = 7.5
    calendar_data = []
    errors = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=20),
        MofNCompleteColumn(),
        transient=False,
    ) as progress:
        main_task = progress.add_task("[purple]Generuji...[/purple]", total=total_posts)

        for day_offset in range(days):
            current_date = dateclass.today() + timedelta(days=day_offset)
            day_posts = []

            # ── Anti-repetition: sleduj co bylo použito dnes ──
            today_used_topics = []
            today_used_hooks = []
            today_used_types = []

            # ── Týdenní rytmus pro tento den ──
            weekday = current_date.weekday()  # 0=Pondělí, 6=Neděle
            weekly_rhythm = config.WEEKLY_RHYTHM.get(weekday, {})
            rhythm_mood = weekly_rhythm.get("mood", "")
            rhythm_focus = weekly_rhythm.get("focus", "")
            rhythm_preferred = weekly_rhythm.get("preferred_themes", [])
            rhythm_avoid_types = weekly_rhythm.get("avoid_types", [])
            rhythm_boost_types = weekly_rhythm.get("boost_types", [])

            for slot in config.DAILY_TIME_SLOTS:
                # Téma — vyhni se nedávno použitým + DNES použitým
                # Preferuj témata z týdenního rytmu
                variety = get_variety_context()
                recent_topics = variety.get("recent_topics", [])
                blocked_topics = set(recent_topics) | set(today_used_topics)

                # Nejdřív zkus témata z weekly rhythm (pokud jsou dostupná)
                rhythm_available = [t for t in rhythm_preferred if t not in blocked_topics]
                if rhythm_available:
                    available_topics = rhythm_available
                else:
                    available_topics = [t for t in config.CONTENT_THEMES if t not in blocked_topics]
                if not available_topics:
                    available_topics = [t for t in config.CONTENT_THEMES if t not in today_used_topics]
                if not available_topics:
                    available_topics = config.CONTENT_THEMES
                topic = random.choice(available_topics)
                today_used_topics.append(topic)

                # Typ z preferovaných pro slot — vyhni se dnes použitým typům + avoid_types z rytmu
                from generators.content_memory import pick_post_type_for_slot
                slot_types = [
                    t for t in slot["preferred_types"]
                    if t not in today_used_types and t not in rhythm_avoid_types
                ]
                if not slot_types:
                    slot_types = [t for t in slot["preferred_types"] if t not in today_used_types]
                if not slot_types:
                    slot_types = slot["preferred_types"]

                # Boost types z weekly rytmu — přidej na začátek pro vyšší pravděpodobnost
                boosted = [t for t in rhythm_boost_types if t in slot_types]
                rest = [t for t in slot_types if t not in boosted]
                slot_types_weighted = boosted + rest  # boosted typy mají přednost

                post_type = pick_post_type_for_slot(slot_types_weighted)
                today_used_types.append(post_type)

                # Content intent
                # Soft/direct promo jen pro témata s přímým nástrojem na webu
                raw_intent = slot["content_intent"] or pick_content_intent()
                if raw_intent in ("soft_promo", "direct_promo"):
                    if topic not in config.PROMOTABLE_THEMES:
                        raw_intent = "pure_value"
                        log.info("Intent downgraded na pure_value — téma '%s' nemá nástroj na webu", topic)
                content_intent = raw_intent

                # URL pro promo — z PROMOTABLE_TOOLS dict (přesná URL pro dané téma)
                promo_url = ""
                if content_intent in ("soft_promo", "direct_promo"):
                    promo_url = config.PROMOTABLE_TOOLS.get(topic, "")

                # ── Kontext pro prompt: co už dnes bylo použito + týdenní rytmus + URL ──
                today_context = ""
                if today_used_topics[:-1]:  # předchozí posty (ne aktuální)
                    today_context = (
                        f"\n\nDNEŠNÍ ANTI-REPETITION (POVINNÉ — dodržuj!):\n"
                        f"Dnes už byly vygenerovány posty na: {', '.join(today_used_topics[:-1])}\n"
                        f"Dnes použité hook formule: {', '.join(today_used_hooks) if today_used_hooks else 'žádné'}\n"
                        f"Dnes použité typy: {', '.join(today_used_types[:-1])}\n"
                        f"MUSÍŠ použít JINÝ úhel, JINOU hook formuli a JINÝ tón než předchozí posty dnes."
                    )
                if rhythm_mood:
                    today_context += (
                        f"\n\nTÝDENNÍ RYTMUS — dnes je {['pondělí','úterý','středa','čtvrtek','pátek','sobota','neděle'][weekday]}:\n"
                        f"Nálada dne: {rhythm_mood}\n"
                        f"Fokus: {rhythm_focus}\n"
                        f"Přizpůsob tón a obsah tomuto zaměření."
                    )
                if promo_url:
                    today_context += (
                        f"\n\nPROMO URL (POVINNÉ — použij přesně tuto URL v CTA):\n"
                        f"→ {promo_url}\n"
                        f"NEZAMĚŇUJ s jinou URL — tato URL odpovídá tématu '{topic}'."
                    )

                progress.update(
                    main_task,
                    description=(
                        f"[dim]{current_date}[/dim] {slot['label']} · "
                        f"[cyan]{post_type}[/cyan] · {topic[:18]}…"
                    ),
                )

                try:
                    post_data = generate_post(
                        post_type=post_type,
                        topic=topic,
                        platform=platform,
                        use_astro_context=(day_offset == 0),  # astro kontext jen pro dnes
                        content_intent=content_intent,
                        extra_context=today_context,
                    )

                    # Rule-based QG (bez AI review pro rychlost batch generování)
                    qg_data = {**post_data, "topic": topic, "post_type": post_type}
                    qg_result = validate_post(qg_data, platform, run_ai_review=False)

                    # Jeden refinement pokus pokud jsou pravidlové chyby
                    if qg_result["score"] < BATCH_THRESHOLD and qg_result.get("errors", 0) > 0:
                        refined = refine_post(
                            post_data=post_data,
                            qg_result=qg_result,
                            topic=topic,
                            post_type=post_type,
                            platform=platform,
                            iteration=1,
                        )
                        refined_qg = validate_post(
                            {**refined, "topic": topic, "post_type": post_type},
                            platform, run_ai_review=False,
                        )
                        if refined_qg["score"] >= qg_result["score"]:
                            post_data = refined
                            qg_result = refined_qg

                    # Sleduj hook pro anti-repetition v rámci dne
                    used_hook = post_data.get("hook_formula", "")
                    if used_hook:
                        today_used_hooks.append(used_hook)

                    # Uložení
                    post_data["quality_score"] = qg_result["score"]
                    json_path = save_post(post_data, None, platform, topic, post_type)

                    # Záznam do paměti
                    record_post(
                        topic, post_type,
                        used_hook,
                        content_intent=content_intent,
                    )
                    record_approved_post(
                        topic=topic,
                        post_type=post_type,
                        caption=post_data.get("caption", ""),
                        quality_score=qg_result["score"],
                        content_intent=content_intent,
                    )

                    # Auto-Learning: QG issues + hook skóre + golden template
                    record_qg_issues(post_type, qg_result.get("issues", []))
                    record_hook_score(post_data.get("hook_formula", ""), qg_result["score"])
                    record_golden_template(post_type, post_data.get("caption", ""),
                                           post_data.get("hook_formula", ""), qg_result["score"])

                    day_posts.append({
                        "date": current_date,
                        "slot": slot,
                        "topic": topic,
                        "post_type": post_type,
                        "post_data": post_data,
                        "qg_score": qg_result["score"],
                        "file": str(json_path),
                    })

                except Exception as e:
                    log.error("Batch chyba %s/%s: %s", topic, post_type, e)
                    errors += 1

                progress.update(main_task, advance=1)

            calendar_data.append({"date": current_date, "posts": day_posts})

    if calendar_data:
        cal_path = _save_calendar_markdown(calendar_data, platform)
        _show_batch_summary(calendar_data, errors)
        console.print(f"\n[bold]📄 Kalendář uložen:[/bold] [dim]{cal_path}[/dim]")
        console.print(
            "[dim]💡 Otevři soubor — máš připravené captions, hashtagy i image prompty na celý týden[/dim]"
        )


# ══════════════════════════════════════════════════
# CMD: GENERATE
# ══════════════════════════════════════════════════

def cmd_generate(auto: bool = False, platform: str = "instagram", variations: int = 1):
    print_banner()

    if auto:
        import random
        # Smart auto: vyhni se nedávno použitým tématům
        variety = get_variety_context()
        recent = variety.get("recent_topics", [])
        available_topics = [t for t in config.CONTENT_THEMES if t not in recent]
        if not available_topics:
            available_topics = config.CONTENT_THEMES

        topic = random.choice(available_topics)
        recent_types = variety.get("recent_post_types", [])
        available_types = [t for t in config.POST_TYPES if t not in recent_types]
        if not available_types:
            available_types = list(config.POST_TYPES.keys())
        post_type = random.choice(available_types)

        # Automatický výběr content intentu podle poměru
        content_intent = pick_content_intent()
        intent_labels = {
            "pure_value": "🎓 vzdělávací",
            "soft_promo": "💫 soft promo",
            "direct_promo": "📣 direct promo",
        }
        intent_label = intent_labels.get(content_intent, content_intent)
        console.print(f"[dim]🤖 Auto mód: [cyan]{topic}[/cyan] / [yellow]{post_type}[/yellow] / {intent_label}[/dim]\n")
    else:
        # Zobraz astro kontext
        try:
            astro = get_full_astrological_context()
            console.print(Panel(
                f"{astro['moon']['emoji']} [bold]{astro['moon']['phase_cs']}[/bold] — {astro['moon']['energy_type']}\n"
                f"{astro['sun']['symbol']} Slunce v [bold]{astro['sun']['sign_cs']}[/bold] — {astro['sun']['themes']}\n"
                f"🔢 Universální den [bold]{astro['universal_day']}[/bold]: {astro['universal_day_meaning']}",
                title="Dnešní energie",
                border_style="dim purple",
            ))
            console.print()
        except Exception as e:
            log.debug("Astro kontext pro generate nedostupný: %s", e)

        # Výběr tématu
        console.print("[bold]📋 Dostupná témata:[/bold]")
        for i, theme in enumerate(config.CONTENT_THEMES, 1):
            console.print(f"  [dim]{i:2}.[/dim] {theme}")

        topic_num = Prompt.ask("\nVyber číslo tématu", default="1")
        try:
            topic = config.CONTENT_THEMES[int(topic_num) - 1]
        except (ValueError, IndexError):
            topic = config.CONTENT_THEMES[0]

        # Výběr typu
        console.print("\n[bold]🎭 Typ postu:[/bold]")
        post_types = list(config.POST_TYPES.keys())
        for i, (pt, desc) in enumerate(config.POST_TYPES.items(), 1):
            console.print(f"  [dim]{i:2}.[/dim] [yellow]{pt}[/yellow] — [dim]{desc}[/dim]")

        type_num = Prompt.ask("\nVyber typ postu", default="1")
        try:
            post_type = post_types[int(type_num) - 1]
        except (ValueError, IndexError):
            post_type = "educational"

        platform = Prompt.ask("Platforma", choices=["instagram", "facebook"], default="instagram")
        variations = IntPrompt.ask("Počet variací captionů (1-3)", default=1)
        variations = max(1, min(3, variations))

        # Výběr content intentu (interaktivní mód)
        console.print("\n[bold]🎯 Záměr postu:[/bold]")
        console.print("  [dim]1.[/dim] [green]Vzdělávací[/green]   — čistá hodnota, bez propagace webu [dim](doporučeno 60%)[/dim]")
        console.print("  [dim]2.[/dim] [yellow]Soft promo[/yellow]  — přirozená zmínka webu pokud to sedí [dim](doporučeno 25%)[/dim]")
        console.print("  [dim]3.[/dim] [red]Direct promo[/red] — explicitní propagace nástroje/blogu [dim](doporučeno 15%)[/dim]")
        auto_intent = pick_content_intent()
        intent_map = {"1": "pure_value", "2": "soft_promo", "3": "direct_promo"}
        auto_num = {"pure_value": "1", "soft_promo": "2", "direct_promo": "3"}.get(auto_intent, "1")
        intent_num = Prompt.ask("Vyber záměr [dim](Enter = doporučeno dle poměru)[/dim]", default=auto_num)
        content_intent = intent_map.get(intent_num, auto_intent)

    # === GENEROVÁNÍ ===
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task(f"✨ Gemini Flash generuje {variations}x caption pro [cyan]{topic}[/cyan]...", total=None)
        post_data = generate_post(
            post_type=post_type,
            topic=topic,
            platform=platform,
            use_astro_context=True,
            variations=variations,
            content_intent=content_intent,
        )

    # Zobrazení výsledku
    if variations > 1 and "variations" in post_data:
        console.print(f"\n[bold green]✓ Vygenerovány {len(post_data['variations'])} varianty![/bold green]\n")
        for i, var in enumerate(post_data["variations"], 1):
            console.print(Panel(
                var.get("caption", ""),
                title=f"[yellow]Varianta {i}[/yellow] — [dim]{var.get('hook_formula', '')}[/dim]",
                border_style="cyan" if i == post_data.get("recommended_variation", 0) + 1 else "dim",
            ))

        choice = IntPrompt.ask(f"\nKterou variantu použít? (1-{len(post_data['variations'])})",
                               default=post_data.get("recommended_variation", 0) + 1)
        selected = post_data["variations"][choice - 1]
        post_data["caption"] = selected["caption"]
        post_data["hook_formula"] = selected.get("hook_formula", "")
    else:
        caption = post_data.get("caption", "")
        hook = post_data.get("hook_formula", "")
        hashtags = post_data.get("hashtags", [])
        hashtag_str = "\n\n" + "  ".join(hashtags) if hashtags else ""
        grammar_changes = post_data.get("grammar_changes", [])
        grammar_note = ""
        if grammar_changes:
            grammar_note = f"\n\n[dim yellow]✏️ Gramatické opravy ({len(grammar_changes)}): {' · '.join(grammar_changes[:3])}{'…' if len(grammar_changes) > 3 else ''}[/dim yellow]"
        console.print(Panel(
            f"[dim]Hook: {hook}[/dim]\n\n{caption}{hashtag_str}{grammar_note}",
            title=f"📝 {topic.upper()} / {post_type}",
            border_style="cyan",
        ))

    # === IMAGE PROMPT ===
    image_prompt = post_data.get("image_prompt", "")
    if image_prompt:
        console.print(Panel(
            f"{image_prompt}\n\n"
            f"[dim]── Brand barvy ──────────────────────────────────────────\n"
            f"Hlavní: Deep purple #4a0080  |  Zlatá #c9a227  |  Midnight blue #0a0a2e\n"
            f"Doplňkové: Soft lavender #c8a8e9  |  Cream white #f5f0eb\n"
            f"Styl: Mystical, ethereal, spiritual — žádný text, žádné tváře[/dim]",
            title="🎨 Image Prompt  [dim](zkopíruj do Midjourney / DALL-E / Canva AI)[/dim]",
            border_style="magenta",
        ))
    image_path = None

    # === QUALITY GATE + SELF-REFINEMENT LOOP ===
    console.print("\n[bold cyan]═══ QUALITY GATE ═══[/bold cyan]")

    REFINEMENT_THRESHOLD = 7.5   # skóre pod tímto → spustí refinement
    MAX_REFINEMENT_ITERATIONS = 2

    # AI review: v auto módu zapnout, v interaktivním se zeptáme
    use_ai = True if auto else Confirm.ask(
        "🔍 Spustit AI kontrolu kvality? (doporučeno)", default=True
    )

    def _run_qg(pd):
        pd_review = {**pd, "topic": topic, "post_type": post_type}
        return validate_post(pd_review, platform=platform, image_path=image_path, run_ai_review=use_ai)

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task("🔍  Quality Gate: analýza kvality...", total=None)
        qg_result = _run_qg(post_data)

    print_quality_report(qg_result)

    # ── Auto-Learning: zaznamenej QG problémy ──
    record_qg_issues(
        post_type=post_data.get("post_type", ""),
        issues=qg_result.get("issues", []),
        ai_review=qg_result.get("ai_review"),
    )

    # ── SELF-REFINEMENT LOOP ──
    score_history = [qg_result["score"]]

    if use_ai and qg_result["score"] < REFINEMENT_THRESHOLD:
        should_refine = True
        if not auto:
            should_refine = Confirm.ask(
                f"\n🔄 Skóre {qg_result['score']}/10 je pod prahem {REFINEMENT_THRESHOLD}. "
                f"Mám post automaticky vylepšit?",
                default=True
            )

        if should_refine:
            for iteration in range(1, MAX_REFINEMENT_ITERATIONS + 1):
                console.print(f"\n[bold magenta]🔄 Refinement iterace {iteration}/{MAX_REFINEMENT_ITERATIONS}...[/bold magenta]")

                with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
                    p.add_task(f"✨ Gemini přepisuje post na základě {len(qg_result.get('issues', []))} problémů...", total=None)
                    refined = refine_post(
                        post_data=post_data,
                        qg_result=qg_result,
                        topic=topic,
                        post_type=post_type,
                        platform=platform,
                        iteration=iteration,
                    )

                # QG na vylepšenou verzi
                with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
                    p.add_task("🔍  Quality Gate: kontrola vylepšené verze...", total=None)
                    refined_qg = _run_qg(refined)

                score_change = refined_qg["score"] - qg_result["score"]
                score_history.append(refined_qg["score"])

                # Zobraz změny
                changes = refined.get("refinement_changes", "")
                score_color = "green" if score_change >= 0 else "red"
                console.print(
                    f"  [{score_color}]{qg_result['score']:.1f} → {refined_qg['score']:.1f} "
                    f"({'+'if score_change>=0 else ''}{score_change:.1f})[/{score_color}]"
                    + (f"  [dim]{changes}[/dim]" if changes else "")
                )

                # Přijmout vylepšenou verzi (i pokud se skóre nezlepšilo — aspoň opravila rule errory)
                if refined_qg["score"] >= qg_result["score"] or qg_result.get("errors", 0) > 0:
                    post_data = refined
                    qg_result = refined_qg
                else:
                    console.print(f"  [yellow]Refinement skóre kleslo — ponechávám původní verzi[/yellow]")

                # Zastavit pokud dosáhli prahu nebo maximálního počtu
                if qg_result["score"] >= REFINEMENT_THRESHOLD:
                    console.print(f"  [green]✓ Dosáhli jsme prahu {REFINEMENT_THRESHOLD}/10 — refinement dokončen[/green]")
                    break

            # Shrnutí refinementu
            if len(score_history) > 1:
                trajectory = " → ".join(f"{s:.1f}" for s in score_history)
                console.print(f"\n[bold]📈 Průběh skóre: {trajectory}[/bold]")
                print_quality_report(qg_result)

    # Rozhodnutí po refinementu
    if not qg_result["approved"]:
        console.print("\n[bold red]⚠️  Quality Gate: post NESCHVÁLEN ani po vylepšení[/bold red]")
        action = Prompt.ask(
            "Co chceš udělat?",
            choices=["save", "skip"],
            default="save",
        ) if not auto else "save"
        if action == "skip":
            console.print("[dim]Post přeskočen.[/dim]")
            return None
        # action == "save" → uloží i přes varování

    # Ulož historii skóre do post_data
    post_data["score_history"] = score_history

    # === ULOŽENÍ ===
    # Přidej QG skóre do post záznamu
    post_data["quality_score"] = qg_result["score"]
    post_data["quality_verdict"] = qg_result["summary"]

    json_path = save_post(post_data, image_path, platform, topic, post_type)
    html_path = str(json_path).replace('.json', '.html')

    console.print(f"\n[bold green]✓ Post uložen jako DRAFT[/bold green]")
    console.print(f"  Kvalita: [cyan]{qg_result['score']}/10[/cyan] | {qg_result['summary']}")
    console.print(f"[dim]  Otevři v prohlížeči: {html_path}[/dim]")

    # === POSTING CHECKLIST ===
    _print_posting_checklist()

    # === BUFFER PUBLISHING ===
    _offer_buffer_publish(post_data, image_path, auto)

    # Zaznamenej do paměti (včetně content_intent pro tracking poměru)
    record_post(topic, post_type, post_data.get("hook_formula", ""),
                content_intent=post_data.get("content_intent", "pure_value"))

    # Zaznamenej schválený post — sleduje blog slugy, caption preview, skóre
    record_approved_post(
        topic=topic,
        post_type=post_type,
        caption=post_data.get("caption", ""),
        quality_score=qg_result["score"],
        content_intent=post_data.get("content_intent", "pure_value"),
    )

    # Auto-Learning: zaznamenej hook skóre + golden template
    record_hook_score(post_data.get("hook_formula", ""), qg_result["score"])
    record_golden_template(
        post_type=post_type,
        caption=post_data.get("caption", ""),
        hook_formula=post_data.get("hook_formula", ""),
        score=qg_result["score"],
    )

    return post_data


# ══════════════════════════════════════════════════
# CMD: BLOG PROMO
# ══════════════════════════════════════════════════

def cmd_blog_promo(platform: str = "instagram", show_all: bool = False):
    print_banner()

    articles = load_blog_articles()
    if not articles:
        console.print("[red]Žádné články nenalezeny.[/red]")
        return

    if show_all:
        # Zobraz posledních 10 článků na výběr
        console.print("[bold]📚 Výběr článku k propagaci:[/bold]\n")
        recent_articles = articles[:10]
        for i, a in enumerate(recent_articles, 1):
            console.print(f"  [dim]{i:2}.[/dim] [cyan]{a.get('title', '')[:55]}[/cyan]  [dim]{a.get('published_at', '')}[/dim]")

        choice = IntPrompt.ask("\nVyber číslo článku", default=1)
        article = recent_articles[min(choice - 1, len(recent_articles) - 1)]
    else:
        article = get_article_for_promo() or articles[0]

    formatted = format_article_for_post(article)
    console.print(f"\nPropaguji: [cyan bold]{formatted['title']}[/cyan bold]")
    console.print(f"URL: [dim]{formatted['url']}[/dim]\n")

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task("✨ Generuji blog promo post...", total=None)
        post_data = generate_post(
            post_type="blog_promo",
            topic=formatted['category'] or "mystika",
            platform=platform,
            blog_url=formatted['url'],
            blog_title=formatted['title'],
            extra_context=formatted['description'],
            variations=2,
        )

    if "variations" in post_data and post_data["variations"]:
        console.print("\n[bold green]✓ 2 varianty vygenerovány:[/bold green]\n")
        for i, var in enumerate(post_data["variations"], 1):
            console.print(Panel(var.get("caption", ""), title=f"Varianta {i}", border_style="green"))

        choice = IntPrompt.ask("Která varianta?", default=1)
        selected = post_data["variations"][min(choice - 1, 1)]
        post_data["caption"] = selected["caption"]
    else:
        console.print(Panel(post_data.get("caption", ""), title="Blog Promo", border_style="green"))

    generate_img = Confirm.ask("\nVygenerovat obrázek?", default=True)
    image_path = None
    if generate_img:
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            image_path = generate_image(
                prompt=post_data.get("image_prompt", ""),
                platform=platform,
                post_type="square",
                filename=f"blog_{ts}",
            )
        except Exception as e:
            console.print(f"[yellow]⚠️  {e}[/yellow]")

    # Quality Gate
    console.print("\n[bold cyan]═══ QUALITY GATE ═══[/bold cyan]")
    post_data_for_review = {**post_data, "topic": formatted['title'], "post_type": "blog_promo"}
    qg_result = validate_post(post_data_for_review, platform, image_path, run_ai_review=False)
    print_quality_report(qg_result, verbose=True)

    if not qg_result["approved"]:
        action = Prompt.ask("Post neschválen. Uložit přesto?", choices=["save", "skip"], default="save")
        if action == "skip":
            console.print("[dim]Přeskočeno.[/dim]")
            return

    post_data["quality_score"] = qg_result["score"]
    json_path = save_post(post_data, image_path, platform, formatted['title'], "blog_promo")
    record_post(formatted['title'], "blog_promo", blog_slug=article.get("slug", ""), content_intent="direct_promo")
    record_approved_post(
        topic=formatted['title'],
        post_type="blog_promo",
        caption=post_data.get("caption", ""),
        quality_score=qg_result["score"],
        content_intent="direct_promo",
        blog_slugs=[article.get("slug", "")] if article.get("slug") else [],
    )
    console.print(f"\n[green]✓ Blog promo uložen![/green]  Kvalita: [cyan]{qg_result['score']}/10[/cyan]")
    console.print(f"[dim]Náhled: {str(json_path).replace('.json', '.html')}[/dim]")


# ══════════════════════════════════════════════════
# CMD: STORIES
# ══════════════════════════════════════════════════

def cmd_story(topic: str, slides: int = 5):
    print_banner()
    console.print(f"[bold]📱 Generuji Instagram Stories sérii: [cyan]{topic}[/cyan][/bold]\n")

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task(f"Generuji {slides} Stories slidů...", total=None)
        story_slides = generate_story_sequence(topic, story_count=slides)

    if not story_slides:
        console.print("[red]Nepodařilo se vygenerovat Stories.[/red]")
        return

    table = Table(title=f"📱 Stories: {topic}", border_style="purple", box=box.ROUNDED)
    table.add_column("Slide", style="bold cyan", width=6)
    table.add_column("Typ", style="yellow", width=10)
    table.add_column("Text", width=35)
    table.add_column("Interakce", style="green", width=20)
    table.add_column("Vizuál", style="dim", width=25)

    for slide in story_slides:
        table.add_row(
            str(slide.get("slide", "")),
            slide.get("type", ""),
            slide.get("text", "")[:50],
            str(slide.get("interactive", "—") or "—")[:25],
            slide.get("visual", "")[:40],
        )

    console.print(table)

    # Uložení
    config.POSTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    story_path = config.POSTS_DIR / f"story_{ts}_{slugify(topic)}.json"
    with open(story_path, 'w', encoding='utf-8') as f:
        json.dump({
            "type": "instagram_story",
            "topic": topic,
            "generated_at": datetime.now().isoformat(),
            "slides": story_slides,
        }, f, ensure_ascii=False, indent=2)

    # Quality Gate — kontrola textu všech slidů
    all_text = " ".join(s.get("text", "") for s in story_slides)
    qg_data = {"caption": all_text, "hashtags": [], "image_prompt": "", "call_to_action": "", "topic": topic, "post_type": "instagram_story"}
    qg_result = validate_post(qg_data, "instagram", run_ai_review=False)
    if qg_result["errors"] > 0:
        console.print(f"\n[bold red]⚠️  Quality Gate: {qg_result['summary']}[/bold red]")
        for issue in qg_result["issues"]:
            if issue["severity"] == "error":
                console.print(f"  [red]✗ {issue['message']}[/red]")
        action = Prompt.ask("Stories obsahují chyby. Uložit přesto?", choices=["save", "skip"], default="save")
        if action == "skip":
            # Smaž již uložený soubor
            story_path.unlink(missing_ok=True)
            console.print("[dim]Stories přeskočeny.[/dim]")
            return

    console.print(f"\n[green]✓ Stories plán uložen: {story_path.name}[/green]")
    record_post(topic, "instagram_story")


# _slugify odstraněn — používáme sdílený utils.slugify


# ══════════════════════════════════════════════════
# CMD: CAROUSEL
# ══════════════════════════════════════════════════

def cmd_carousel(topic: str, platform: str = "instagram"):
    print_banner()
    console.print(f"[bold]🎠 Generuji karusel: [cyan]{topic}[/cyan][/bold]\n")

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task("Generuji karusel obsah...", total=None)
        carousel = generate_carousel(topic, slides=7, platform=platform)

    console.print(Panel(
        carousel.get("cover_caption", ""),
        title="📍 Cover Caption (feed)",
        border_style="cyan",
    ))
    console.print()

    table = Table(title=f"🎠 Karusel: {topic}", border_style="purple", box=box.ROUNDED)
    table.add_column("Slide", style="bold cyan", width=6)
    table.add_column("Nadpis", style="yellow", width=25)
    table.add_column("Text", width=35)
    table.add_column("Design tip", style="dim", width=25)

    for slide in carousel.get("slides", []):
        table.add_row(
            str(slide.get("slide", "")),
            slide.get("headline", "")[:30],
            slide.get("body", "")[:50],
            slide.get("design_note", "")[:30],
        )

    console.print(table)

    # Uložení
    config.POSTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    carousel_path = config.POSTS_DIR / f"carousel_{ts}_{slugify(topic)}.json"
    with open(carousel_path, 'w', encoding='utf-8') as f:
        json.dump({
            "type": "carousel",
            "platform": platform,
            "topic": topic,
            "generated_at": datetime.now().isoformat(),
            **carousel,
        }, f, ensure_ascii=False, indent=2)

    # Quality Gate — kontrola cover caption + slide textů
    all_text = carousel.get("cover_caption", "")
    all_text += " " + " ".join(s.get("body", "") for s in carousel.get("slides", []))
    qg_data = {
        "caption": all_text,
        "hashtags": carousel.get("hashtags", []),
        "image_prompt": carousel.get("image_prompt_cover", ""),
        "call_to_action": "",
        "topic": topic, "post_type": "carousel",
    }
    qg_result = validate_post(qg_data, platform, run_ai_review=False)
    if qg_result["errors"] > 0:
        console.print(f"\n[bold red]⚠️  Quality Gate: {qg_result['summary']}[/bold red]")
        for issue in qg_result["issues"]:
            if issue["severity"] == "error":
                console.print(f"  [red]✗ {issue['message']}[/red]")
        action = Prompt.ask("Karusel obsahuje chyby. Uložit přesto?", choices=["save", "skip"], default="save")
        if action == "skip":
            carousel_path.unlink(missing_ok=True)
            console.print("[dim]Karusel přeskočen.[/dim]")
            return

    console.print(f"\n[green]✓ Karusel uložen: {carousel_path.name}[/green]")
    record_post(topic, "carousel")


# ══════════════════════════════════════════════════
# CMD: PLAN
# ══════════════════════════════════════════════════

def cmd_plan():
    print_banner()
    console.print("[bold]📅 Generuji týdenní plán s lunárním kontextem...[/bold]\n")

    from datetime import date
    current_week = date.today().isocalendar()[1]
    current_year = date.today().year

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
        p.add_task(f"Gemini Flash plánuje týden {current_week}/{current_year}...", total=None)
        plan = generate_weekly_content_plan(current_week, current_year)

    if not plan:
        console.print("[red]Nepodařilo se vygenerovat plán.[/red]")
        return

    table = Table(
        title=f"📅 Týdenní Plán — Týden {current_week}/{current_year}",
        border_style="purple",
        box=box.ROUNDED,
    )
    table.add_column("Den", style="bold cyan", width=10)
    table.add_column("Typ", style="yellow", width=14)
    table.add_column("Téma", style="green", width=30)
    table.add_column("Čas", style="dim", width=6)
    table.add_column("Měsíc", style="magenta", width=8)
    table.add_column("Popis", width=40)

    for day in plan:
        table.add_row(
            day.get("day", ""),
            day.get("post_type", ""),
            day.get("topic", "")[:35],
            day.get("best_time", ""),
            day.get("moon_connection", "")[:10],
            day.get("brief", "")[:55],
        )

    console.print(table)

    # Uložení
    plan_path = config.POSTS_DIR / f"plan_week_{current_week}_{current_year}.json"
    config.POSTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(plan_path, 'w', encoding='utf-8') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)

    console.print(f"\n[green]✓ Plán uložen: {plan_path.name}[/green]")
    console.print("\n[dim]Generuj konkrétní posty: python agent.py generate[/dim]")


# ══════════════════════════════════════════════════
# CMD: LIST
# ══════════════════════════════════════════════════

def cmd_list():
    print_banner()
    posts = load_all_posts()

    if not posts:
        console.print("[dim]Žádné posty. Začni s: python agent.py generate[/dim]")
        return

    draft = [p for p in posts if p.get("status") == "draft"]
    approved = [p for p in posts if p.get("status") == "approved"]
    published = [p for p in posts if p.get("status") == "published"]

    console.print(f"[bold]Přehled:[/bold] [yellow]{len(draft)} draft[/yellow] · "
                  f"[green]{len(approved)} approved[/green] · "
                  f"[blue]{len(published)} published[/blue] · "
                  f"[dim]{len(posts)} celkem[/dim]\n")

    table = Table(border_style="purple", box=box.SIMPLE)
    table.add_column("Datum", style="dim", width=16)
    table.add_column("Plat.", style="cyan", width=6)
    table.add_column("Téma", style="green", width=28)
    table.add_column("Typ", style="yellow", width=14)
    table.add_column("Status", width=10)
    table.add_column("Hook vzorec", style="dim", width=18)

    for post in posts[:20]:
        status_map = {
            "draft": "[yellow]DRAFT[/yellow]",
            "approved": "[green]APPROVED[/green]",
            "published": "[blue]PUBLISHED[/blue]",
        }
        table.add_row(
            post.get("generated_at", "")[:16].replace("T", " "),
            post.get("platform", "")[:3],
            post.get("topic", "")[:30],
            post.get("post_type", "")[:15],
            status_map.get(post.get("status", "draft"), "—"),
            post.get("hook_formula", "")[:20],
        )

    console.print(table)

    if len(posts) > 20:
        console.print(f"[dim]... a {len(posts) - 20} dalších[/dim]")


# ══════════════════════════════════════════════════
# CMD: DAILY  (alias pro batch --days 1)
# ══════════════════════════════════════════════════

def cmd_daily(platform: str = "instagram"):
    """Zkratka: vygeneruj dnešní 3 posty (ráno / poledne / večer)."""
    cmd_batch(days=1, platform=platform)


# ══════════════════════════════════════════════════
# CMD: STATUS  (co bylo dnes/tento týden generováno)
# ══════════════════════════════════════════════════

def cmd_status():
    """Zobrazí přehled vygenerovaných postů za dnešek a posledních 7 dní."""
    from generators.content_memory import _load_memory
    from datetime import date, timedelta

    print_banner()
    memory = _load_memory()
    today = date.today()

    approved = memory.get("approved_posts", [])
    used = memory.get("used_topics", [])

    # Dnešní posty
    today_posts = [e for e in approved if e.get("date") == today.isoformat()]
    week_posts  = [e for e in approved if (today - date.fromisoformat(e["date"])).days <= 7]

    console.print(Panel(
        f"[bold]Dnes ({today.strftime('%d.%m.%Y')}):[/bold] {len(today_posts)} postů  ·  "
        f"[bold]Tento týden:[/bold] {len(week_posts)} postů  ·  "
        f"[bold]Celkem:[/bold] {memory.get('total_approved', 0)} postů",
        title="📊 Status",
        border_style="purple",
    ))

    if not week_posts:
        console.print("[dim]Žádné posty tento týden. Začni s: python agent.py daily[/dim]")
        return

    table = Table(border_style="purple", box=box.SIMPLE)
    table.add_column("Datum", style="dim", width=12)
    table.add_column("Typ", style="cyan", width=14)
    table.add_column("Záměr", style="yellow", width=12)
    table.add_column("Skóre", width=7)
    table.add_column("Náhled caption", style="dim", width=50)

    intent_cs = {"pure_value": "vzdělávací", "soft_promo": "soft promo", "direct_promo": "direct promo"}

    for e in sorted(week_posts, key=lambda x: x["date"], reverse=True):
        score = e.get("quality_score", 0)
        score_fmt = f"[green]{score:.1f}[/green]" if score >= 7.5 else f"[yellow]{score:.1f}[/yellow]"
        table.add_row(
            e.get("date", ""),
            e.get("post_type", ""),
            intent_cs.get(e.get("content_intent", ""), "—"),
            score_fmt,
            (e.get("caption_preview", "") or "")[:48] + "…",
        )

    console.print(table)

    # Upozornění na dnešní stav
    if len(today_posts) == 0:
        console.print("\n[yellow]Dnes ještě žádné posty — spusť:[/yellow] [bold]python agent.py daily[/bold]")
    elif len(today_posts) < 3:
        console.print(f"\n[yellow]Dnes {len(today_posts)}/3 postů[/yellow] — zbývá {3 - len(today_posts)}")
    else:
        console.print("\n[green]Dnes máš všechny 3 posty hotové.[/green]")

    # Témata použitá v posl. 14 dnech
    recent_topics = list({
        e["topic"] for e in used
        if (today - date.fromisoformat(e["date"])).days <= 14
    })
    if recent_topics:
        console.print(f"\n[dim]Témata posl. 14 dní (agent se jim vyhne): {', '.join(recent_topics)}[/dim]")

    # ── Auto-Learning Insights ──
    from generators.content_memory import get_learning_stats, get_hook_ranking

    stats = get_learning_stats()
    if any(v for v in stats.values()):
        learning_lines = []
        if stats["qg_issues_tracked"]:
            learning_lines.append(f"QG vzorce: {stats['qg_issues_tracked']} problémů sledováno (posl. 30 dní)")
        if stats["hooks_ranked"]:
            learning_lines.append(f"Hook ranking: {stats['hooks_ranked']} hooků s daty")
        if stats["engagement_ratings"]:
            learning_lines.append(f"Engagement: {stats['engagement_ratings']} hodnocení (posl. 60 dní)")
        if stats["has_lessons"]:
            learning_lines.append("[green]Systém má naučené lekce → ovlivňují generování[/green]")

        console.print(Panel(
            "\n".join(learning_lines),
            title="🧠 Auto-Learning",
            border_style="blue",
        ))

    # Hook ranking (top 3 + bottom 2)
    hook_ranking = get_hook_ranking()
    if hook_ranking:
        sorted_hooks = sorted(hook_ranking.items(), key=lambda x: x[1], reverse=True)
        top = sorted_hooks[:3]
        bottom = sorted_hooks[-2:] if len(sorted_hooks) >= 4 else []

        hook_lines = [f"  [green]★[/green] {h}: {s}/10" for h, s in top]
        if bottom:
            hook_lines.append("  ---")
            hook_lines.extend(f"  [dim]{h}: {s}/10[/dim]" for h, s in bottom)

        console.print(Panel("\n".join(hook_lines), title="📎 Hook Efektivita", border_style="dim"))

    # Engagement trend
    eng_log = memory.get("engagement_log", [])
    recent_eng = [e for e in eng_log if (today - date.fromisoformat(e.get("rated_at", e["date"]))).days <= 30]
    if recent_eng:
        high = sum(1 for e in recent_eng if e["engagement"] == "high")
        med = sum(1 for e in recent_eng if e["engagement"] == "medium")
        low = sum(1 for e in recent_eng if e["engagement"] == "low")
        total_eng = high + med + low
        if total_eng:
            high_pct = high / total_eng * 100
            console.print(
                f"\n[dim]Engagement (30d): "
                f"[green]{high}× high[/green] ({high_pct:.0f}%) / "
                f"[yellow]{med}× med[/yellow] / [red]{low}× low[/red][/dim]"
            )


# ══════════════════════════════════════════════════
# CMD: SERIES — mini-série postů
# ══════════════════════════════════════════════════

def cmd_series(action: str = "status", name: str = "", theme: str = "", posts: int = 3):
    """Správa content mini-sérií."""
    from generators.content_memory import start_series, get_series_context, _load_memory

    print_banner()

    if action == "start":
        if not name or not theme:
            console.print("[red]Použití: python agent.py series start --name 'Týden tarotu' --theme tarot --posts 3[/red]")
            return
        start_series(name, theme, posts)
        console.print(f"[green]Série '{name}' zahájena — {posts} postů na téma '{theme}'[/green]")
        console.print("[dim]Budoucí posty budou navazovat na sérii automaticky.[/dim]")

    elif action == "stop":
        from generators.content_memory import _save_memory
        memory = _load_memory()
        if memory.get("active_series"):
            old = memory["active_series"]["name"]
            memory["active_series"] = None
            _save_memory(memory)
            console.print(f"[yellow]Série '{old}' ukončena předčasně.[/yellow]")
        else:
            console.print("[dim]Žádná aktivní série.[/dim]")

    else:  # status
        ctx = get_series_context()
        if ctx:
            console.print(Panel(ctx.strip(), title="📚 Aktivní série", border_style="cyan"))
        else:
            console.print("[dim]Žádná aktivní série. Zahaj novou: python agent.py series start --name '...' --theme '...'[/dim]")


# ══════════════════════════════════════════════════
# CMD: WEEKLY — téma týdne
# ══════════════════════════════════════════════════

def cmd_weekly(theme: str = ""):
    """Nastaví nebo zobrazí téma týdne."""
    from generators.content_memory import set_weekly_theme, get_weekly_theme_context

    print_banner()

    if theme:
        desc = Prompt.ask("Popis tématu (volitelné)", default="")
        set_weekly_theme(theme, desc)
        console.print(f"[green]Téma týdne nastaveno: '{theme}'[/green]")
        console.print("[dim]Všechny posty tento týden budou rezonovat s tímto tématem.[/dim]")
    else:
        ctx = get_weekly_theme_context()
        if ctx:
            console.print(Panel(ctx.strip(), title="📅 Téma týdne", border_style="purple"))
        else:
            console.print("[dim]Žádné téma týdne. Nastav: python agent.py weekly 'vnitřní síla'[/dim]")


# ══════════════════════════════════════════════════
# CMD: RATE (engagement feedback)
# ══════════════════════════════════════════════════

def cmd_rate():
    """Manuální zaznamenání reálného engagementu postů — učí systém co funguje."""
    from generators.content_memory import _load_memory, record_engagement

    print_banner()
    memory = _load_memory()
    today = date.today()

    # Zobraz poslední posty bez engagementu k ohodnocení
    approved = memory.get("approved_posts", [])
    rated_keys = {
        (e["date"], e["topic"])
        for e in memory.get("engagement_log", [])
    }

    unrated = [
        e for e in approved
        if (today - date.fromisoformat(e["date"])).days <= 14
        and (e["date"], e["topic"]) not in rated_keys
    ]

    if not unrated:
        console.print("[green]Všechny nedávné posty jsou ohodnocené.[/green]")
        # Zobraz shrnutí
        eng_log = memory.get("engagement_log", [])
        recent = [e for e in eng_log if (today - date.fromisoformat(e["rated_at"])).days <= 30]
        if recent:
            high = sum(1 for e in recent if e["engagement"] == "high")
            med = sum(1 for e in recent if e["engagement"] == "medium")
            low = sum(1 for e in recent if e["engagement"] == "low")
            console.print(f"\n[dim]Posl. 30 dní: {high}× high / {med}× medium / {low}× low[/dim]")
        return

    console.print(Panel(
        f"[bold]{len(unrated)} postů[/bold] čeká na ohodnocení engagementu.\n"
        "[dim]Engagement = reálné lajky, komentáře, uložení, sdílení na Instagramu.[/dim]\n"
        "[dim]high = nadprůměr  ·  medium = průměr  ·  low = podprůměr[/dim]",
        title="📊 Rate — Engagement Feedback",
        border_style="purple",
    ))

    for i, post in enumerate(unrated, 1):
        score = post.get("quality_score", 0)
        score_color = "green" if score >= 7.5 else "yellow"
        console.print(
            f"\n[bold cyan]({i}/{len(unrated)})[/bold cyan]  "
            f"[dim]{post['date']}[/dim]  "
            f"[cyan]{post.get('post_type', '?')}[/cyan]  "
            f"[{score_color}]QG {score:.1f}[/{score_color}]\n"
            f"  {post.get('caption_preview', '')[:80]}…"
        )

        rating = Prompt.ask(
            "Engagement",
            choices=["high", "medium", "low", "skip", "quit"],
            default="medium",
        )

        if rating == "quit":
            break
        if rating == "skip":
            continue

        notes = ""
        if rating in ("high", "low"):
            notes = Prompt.ask("Poznámka (co fungovalo/nefungovalo, volitelné)", default="")

        record_engagement(
            post_date=post["date"],
            post_type=post.get("post_type", ""),
            topic=post.get("topic", ""),
            engagement=rating,
            notes=notes,
        )
        console.print(f"  [green]✓ Zaznamenáno: {rating}[/green]")

    console.print("\n[bold green]Hotovo![/bold green] Systém se z feedbacku naučí a přizpůsobí budoucí generování.")


# ══════════════════════════════════════════════════
# CMD: REPLY
# ══════════════════════════════════════════════════

def cmd_reply(comment: str):
    print_banner()
    console.print(f"[bold]💬 Komentář:[/bold] [italic]\"{comment}\"[/italic]\n")

    topic = Prompt.ask("Téma postu (ke kterému patří komentář)", default="tarot")
    tone = Prompt.ask("Tón odpovědi", choices=["friendly", "empathetic", "educational", "playful"], default="friendly")

    with Progress(SpinnerColumn(), TextColumn("Generuji odpověď..."), transient=True) as p:
        p.add_task("", total=None)
        reply = generate_comment_reply(original_comment=comment, post_topic=topic, tone=tone)

    console.print(Panel(reply, title="💬 Navrhovaná odpověď", border_style="green"))

    if Confirm.ask("\nZkopírovat do schránky?", default=True):
        try:
            import subprocess
            subprocess.run(['clip'], input=reply.encode('utf-16'), check=True)
            console.print("[green]✓ Zkopírováno![/green]")
        except Exception as e:
            log.debug("Clipboard nedostupný: %s", e)
            console.print(f"\n[bold]{reply}[/bold]")


# ══════════════════════════════════════════════════
# CMD: COMMENTS (správa komentářů z Meta API)
# ══════════════════════════════════════════════════

def cmd_comments(sync: bool = False, platform: str = None, auto_reply: bool = False):
    print_banner()

    has_meta = bool(config.META_ACCESS_TOKEN)

    # === SYNC — načti nové komentáře ===
    if sync:
        if not has_meta:
            console.print(Panel(
                "[yellow]META_ACCESS_TOKEN není nastaven v .env[/yellow]\n\n"
                "Pro automatické načítání komentářů:\n"
                "1. Vytvoř Facebook Business stránku\n"
                "2. Vytvoř Meta Developer App na developers.facebook.com\n"
                "3. Přidej Page Access Token do .env jako META_ACCESS_TOKEN\n\n"
                "[dim]Zatím můžeš používat manuální režim: python agent.py reply \"text\"[/dim]",
                title="Napojení na Meta API",
                border_style="yellow",
            ))
            return

        console.print("[bold]Synchronizuji komentáře...[/bold]")
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            p.add_task("Načítám komentáře z Facebook + Instagram...", total=None)
            try:
                stats = sync_comments(since_hours=48)
                console.print(f"[green]✓ Nové: {stats['added']} · Přeskočené: {stats['skipped']} · Odpovědi vygenerovány: {stats['replies_generated']}[/green]\n")
            except Exception as e:
                console.print(f"[red]Chyba synchronizace: {e}[/red]")
                return

    # === ZOBRAZ STATISTIKY ===
    try:
        stats = get_stats()
        console.print(Panel(
            f"Celkem v DB: [bold]{stats['total']}[/bold]  ·  "
            f"Čekají na odpověď: [yellow bold]{stats['pending']}[/yellow bold]  ·  "
            f"Posledni sync: [dim]{stats['last_fetch'][:16].replace('T',' ') if stats['last_fetch'] != 'nikdy' else 'nikdy'}[/dim]\n\n"
            f"[dim]Facebook: {stats['by_platform'].get('facebook', 0)}  ·  "
            f"Instagram: {stats['by_platform'].get('instagram', 0)}[/dim]\n"
            f"[dim]Otázky: {stats['by_sentiment'].get('question', 0)}  ·  "
            f"Pozitivní: {stats['by_sentiment'].get('positive', 0)}  ·  "
            f"Skeptické: {stats['by_sentiment'].get('skeptical', 0)}  ·  "
            f"Spam: {stats['by_sentiment'].get('spam', 0)}[/dim]",
            title="Komentáře — Přehled",
            border_style="purple",
        ))
    except Exception as e:
        console.print(f"[dim]Statistiky nedostupné: {e}[/dim]")

    # === ZOBRAZ PENDING KOMENTÁŘE ===
    pending = []
    try:
        pending = get_pending_comments(platform=platform, min_priority=3)
    except Exception as e:
        console.print(f"[dim]Nelze načíst komentáře: {e}[/dim]")

    if not pending:
        if not has_meta:
            console.print("\n[dim]Žádné komentáře v DB. Spusť --sync po nastavení Meta API.[/dim]")
        else:
            console.print("\n[green]Žádné nevyřízené komentáře[/green]")
        return

    console.print(f"\n[bold]Nevyřízené komentáře ({len(pending)}):[/bold]\n")

    # Zobraz komentáře v tabulce
    table = Table(border_style="purple", box=box.ROUNDED)
    table.add_column("#", style="dim", width=3)
    table.add_column("Platforma", style="cyan", width=8)
    table.add_column("Od", style="yellow", width=15)
    table.add_column("Komentář", width=40)
    table.add_column("Sentiment", width=10)
    table.add_column("Návrh odpovědi", width=35)

    sentiment_colors = {
        "question": "[bold cyan]Otázka[/bold cyan]",
        "positive": "[green]Pozitivní[/green]",
        "skeptical": "[yellow]Skeptický[/yellow]",
        "neutral": "[dim]Neutrální[/dim]",
        "negative": "[red]Negativní[/red]",
    }

    for i, c in enumerate(pending[:15], 1):
        table.add_row(
            str(i),
            c.get("platform", ""),
            c.get("from_name", "")[:15],
            c.get("message", "")[:45],
            sentiment_colors.get(c.get("sentiment", ""), c.get("sentiment", "")),
            (c.get("suggested_reply") or "[dim]bez návrhu[/dim]")[:40],
        )

    console.print(table)

    if not has_meta:
        console.print("\n[dim]Pro publikaci odpovědí nastavte META_ACCESS_TOKEN v .env[/dim]")
        return

    # === INTERAKTIVNÍ ODPOVÍDÁNÍ ===
    if not auto_reply:
        if not Confirm.ask("\nChceš zpracovat komentáře interaktivně?", default=True):
            return

    for i, comment in enumerate(pending[:15], 1):
        console.print(f"\n[bold cyan]--- Komentář {i}/{min(len(pending), 15)} ---[/bold cyan]")
        console.print(f"[dim]Platforma:[/dim] {comment['platform']}  [dim]Od:[/dim] {comment['from_name']}")
        console.print(f"[dim]Post:[/dim] {comment.get('post_message', '')[:60]}")
        console.print(Panel(comment['message'], title="Komentář", border_style="dim"))

        if comment.get("suggested_reply"):
            console.print(Panel(comment['suggested_reply'], title="Navrhovaná odpověď (AI)", border_style="green"))

        if auto_reply and comment.get("suggested_reply"):
            # Automatický mód — odešle návrh bez potvrzení
            result = reply_to_comment(comment["id"], comment["suggested_reply"])
            if result["success"]:
                console.print("[green]✓ Odpověď odeslána automaticky[/green]")
            else:
                console.print(f"[red]✗ Chyba: {result.get('error')}[/red]")
            continue

        # Manuální mód
        action = Prompt.ask(
            "Akce",
            choices=["odeslat", "upravit", "přeskočit", "skrýt", "konec"],
            default="odeslat" if comment.get("suggested_reply") else "přeskočit",
        )

        if action == "konec":
            break
        elif action == "přeskočit":
            continue
        elif action == "skrýt":
            result = hide_comment(comment["id"], comment["platform"])
            console.print("[green]✓ Komentář skryt[/green]" if result["success"] else f"[red]✗ {result.get('error')}[/red]")
        elif action == "upravit":
            new_reply = Prompt.ask("Uprav odpověď", default=comment.get("suggested_reply", ""))
            result = reply_to_comment(comment["id"], new_reply)
            console.print("[green]✓ Odpověď odeslána[/green]" if result["success"] else f"[red]✗ {result.get('error')}[/red]")
        elif action == "odeslat":
            reply_text = comment.get("suggested_reply", "")
            if not reply_text:
                reply_text = Prompt.ask("Napište odpověď")
            result = reply_to_comment(comment["id"], reply_text)
            console.print("[green]✓ Odpověď odeslána[/green]" if result["success"] else f"[red]✗ {result.get('error')}[/red]")

    console.print("\n[bold green]Zpracování komentářů dokončeno.[/bold green]")


# ══════════════════════════════════════════════════
# CMD: ASTRO
# ══════════════════════════════════════════════════

def cmd_astro():
    print_banner()
    try:
        ctx = get_full_astrological_context()
        console.print(Panel(
            f"{ctx['moon']['emoji']} [bold]Měsíc:[/bold] {ctx['moon']['phase_cs']}  "
            f"([dim]{ctx['moon']['illumination_approx']}% osvětlení[/dim])\n"
            f"  Energie: {ctx['moon']['energy_type']}\n"
            f"  Content: [cyan]{ctx['moon']['content_angle']}[/cyan]\n"
            f"  Rituál: {ctx['moon']['ritual_tip']}\n"
            f"  Téma: [dim]{ctx['moon']['spiritual_theme']}[/dim]\n\n"
            f"{ctx['sun']['symbol']} [bold]Slunce:[/bold] {ctx['sun']['sign_cs']} {ctx['sun']['element']}\n"
            f"  Témata: {ctx['sun']['themes']}\n\n"
            f"🔢 [bold]Universální den {ctx['universal_day']}:[/bold] {ctx['universal_day_meaning']}",
            title=f"🔮 Astrologický Kontext — {ctx['date']}",
            border_style="purple",
        ))
    except Exception as e:
        console.print(f"[red]Chyba: {e}[/red]")


# ══════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="🔮 Mystická Hvězda — Social Media Agent v2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    sub = parser.add_subparsers(dest="command")

    gen = sub.add_parser("generate", help="Generuj post")
    gen.add_argument("--auto", action="store_true")
    gen.add_argument("--platform", default="instagram", choices=["instagram", "facebook"])
    gen.add_argument("--variations", type=int, default=1)

    blog = sub.add_parser("blog", help="Blog promo post")
    blog.add_argument("--platform", default="instagram", choices=["instagram", "facebook"])
    blog.add_argument("--all", action="store_true", dest="show_all", help="Zobraz výběr článků")

    story = sub.add_parser("story", help="Instagram Stories série")
    story.add_argument("topic", help="Téma stories")
    story.add_argument("--slides", type=int, default=5)

    carousel = sub.add_parser("carousel", help="Karusel post")
    carousel.add_argument("topic", help="Téma karuselu")
    carousel.add_argument("--platform", default="instagram")

    batch = sub.add_parser("batch", help="Content calendar — 3 posty/den (default: 3 dny = 9 postů)")
    batch.add_argument("--days", type=int, default=3, help="Počet dní k vygenerování (default: 3)")
    batch.add_argument("--platform", default="instagram", choices=["instagram", "facebook"])

    daily_p = sub.add_parser("daily", help="Dnešní 3 posty (ráno / poledne / večer) — zkratka pro batch --days 1")
    daily_p.add_argument("--platform", default="instagram", choices=["instagram", "facebook"])

    sub.add_parser("status", help="Co bylo dnes/tento týden vygenerováno + auto-learning insights")
    sub.add_parser("rate", help="Ohodnoť engagement nedávných postů — učí systém co funguje")
    sub.add_parser("plan", help="Týdenní plán obsahu")
    sub.add_parser("list", help="Přehled postů")
    sub.add_parser("astro", help="Dnešní astro kontext")
    sub.add_parser("buffer-profiles", help="Zobraz Buffer profily (zjisti BUFFER_PROFILE_ID)")
    sub.add_parser("buffer-queue", help="Zobraz aktuální frontu postů v Buffer")

    reply = sub.add_parser("reply", help="Manuální odpověď na komentář")
    reply.add_argument("comment", help="Text komentáře v uvozovkách")

    comments_p = sub.add_parser("comments", help="Správa komentářů z FB + IG")
    comments_p.add_argument("--sync", action="store_true", help="Načti nové komentáře z API")
    comments_p.add_argument("--platform", choices=["facebook", "instagram"], default=None)
    comments_p.add_argument("--auto", action="store_true", dest="auto_reply",
                             help="Automaticky odeslat AI odpovědi bez potvrzení")

    series_p = sub.add_parser("series", help="Správa content mini-sérií")
    series_p.add_argument("action", nargs="?", default="status", choices=["status", "start", "stop"])
    series_p.add_argument("--name", default="", help="Název série")
    series_p.add_argument("--theme", default="", help="Téma série")
    series_p.add_argument("--posts", type=int, default=3, help="Počet postů v sérii")

    weekly_p = sub.add_parser("weekly", help="Nastavit/zobrazit téma týdne")
    weekly_p.add_argument("theme", nargs="?", default="", help="Téma týdne")

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(auto=args.auto, platform=args.platform, variations=args.variations)
    elif args.command == "blog":
        cmd_blog_promo(platform=args.platform, show_all=args.show_all)
    elif args.command == "story":
        cmd_story(topic=args.topic, slides=args.slides)
    elif args.command == "carousel":
        cmd_carousel(topic=args.topic, platform=args.platform)
    elif args.command == "batch":
        cmd_batch(days=args.days, platform=args.platform)
    elif args.command == "daily":
        cmd_daily(platform=args.platform)
    elif args.command == "status":
        cmd_status()
    elif args.command == "rate":
        cmd_rate()
    elif args.command == "plan":
        cmd_plan()
    elif args.command == "list":
        cmd_list()
    elif args.command == "astro":
        cmd_astro()
    elif args.command == "reply":
        cmd_reply(comment=args.comment)
    elif args.command == "comments":
        cmd_comments(sync=args.sync, platform=args.platform, auto_reply=args.auto_reply)
    elif args.command == "series":
        cmd_series(action=args.action, name=args.name, theme=args.theme, posts=args.posts)
    elif args.command == "weekly":
        cmd_weekly(theme=args.theme)
    elif args.command == "buffer-profiles":
        cmd_buffer_profiles()
    elif args.command == "buffer-queue":
        cmd_buffer_queue()
    else:
        parser.print_help()
        console.print()
        console.print("[dim]Nejrychlejší start:[/dim]")
        console.print("  [bold]python agent.py daily[/bold]              — dnešní 3 posty (ráno/poledne/večer)")
        console.print("  [bold]python agent.py status[/bold]             — co bylo dnes/tento týden vygenerováno")
        console.print("  [bold]python agent.py astro[/bold]              — co dnes říkají hvězdy")
        console.print("  [bold]python agent.py generate[/bold]           — vytvoř 1 post interaktivně")
        console.print("  [bold]python agent.py batch --days 3[/bold]     — 9 postů na 3 dny dopředu")
        console.print("  [bold]python agent.py plan[/bold]               — plán na celý týden")


if __name__ == "__main__":
    main()
