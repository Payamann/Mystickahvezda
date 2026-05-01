"""
Pinterest pin audit
===================

Checks local Pinterest export files before upload or manual pin edits:
- CSV link shape and live HTTP status
- www vs apex domain mistakes
- missing local blog pages
- missing image files
- generated images that are not present in the CSV
- stale scheduled dates
- current root/www HTTPS health

Usage:
    python pinterest_audit.py
    python pinterest_audit.py --live
    python pinterest_audit.py --json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent
REPO_DIR = BASE_DIR.parent
OUT_DIR = BASE_DIR / "output" / "pinterest"
CSV_PATH = OUT_DIR / "pinterest_pins.csv"
IMAGES_DIR = OUT_DIR / "images"
INBOX_DIR = OUT_DIR / "inbox"
BLOG_INDEX = REPO_DIR / "data" / "blog-index.json"
BLOG_DIR = REPO_DIR / "blog"
TOOL_CAMPAIGNS_PATH = BASE_DIR / "pinterest_tool_campaigns.json"

CANONICAL_HOST = "www.mystickahvezda.cz"
CANONICAL_BASE = f"https://{CANONICAL_HOST}"
APEX_HOST = "mystickahvezda.cz"


@dataclass
class Issue:
    severity: str
    code: str
    message: str
    item: str = ""


def load_blog_index() -> dict[str, dict]:
    if not BLOG_INDEX.exists():
        return {}
    posts = json.loads(BLOG_INDEX.read_text(encoding="utf-8"))
    return {post["slug"]: post for post in posts}


def load_tool_campaigns() -> dict[str, dict]:
    if not TOOL_CAMPAIGNS_PATH.exists():
        return {}
    campaigns = json.loads(TOOL_CAMPAIGNS_PATH.read_text(encoding="utf-8"))
    return {campaign["slug"]: campaign for campaign in campaigns}


def tool_paths(campaigns: dict[str, dict]) -> dict[str, dict]:
    return {campaign["path"]: campaign for campaign in campaigns.values()}


def load_csv_rows() -> list[dict]:
    if not CSV_PATH.exists():
        return []
    with CSV_PATH.open(newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def slug_from_pin_stem(stem: str) -> str:
    stem = stem.replace("_pin", "")
    if "_v" in stem:
        return stem.rsplit("_v", 1)[0]
    return stem


def variant_from_pin_stem(stem: str) -> int:
    stem = stem.replace("_pin", "")
    if "_v" not in stem:
        return 1
    _, variant = stem.rsplit("_v", 1)
    try:
        return int(variant)
    except ValueError:
        return 1


def slug_from_blog_url(url: str) -> str | None:
    path = urlparse(url).path
    match = re.fullmatch(r"/blog/([^/]+)\.html", path)
    return match.group(1) if match else None


def pin_images() -> list[Path]:
    if not IMAGES_DIR.exists():
        return []
    images = []
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        images.extend(IMAGES_DIR.glob(f"*_pin{ext}"))
    return sorted(images)


def inbox_images() -> list[Path]:
    if not INBOX_DIR.exists():
        return []
    return sorted(
        p for p in INBOX_DIR.iterdir()
        if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )


def check_live_url(url: str, timeout: int = 12) -> tuple[str, str]:
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "Mozilla/5.0 PinterestAudit/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return str(resp.status), resp.geturl()
    except urllib.error.HTTPError as exc:
        if exc.code in {403, 405}:
            try:
                req_get = urllib.request.Request(
                    url,
                    method="GET",
                    headers={"User-Agent": "Mozilla/5.0 PinterestAudit/1.0"},
                )
                with urllib.request.urlopen(req_get, timeout=timeout) as resp:
                    return str(resp.status), resp.geturl()
            except Exception as get_exc:  # noqa: BLE001 - report exact audit failure
                return "ERR", str(get_exc)
        return str(exc.code), exc.geturl()
    except ssl.SSLError as exc:
        return "SSL_ERR", str(exc)
    except Exception as exc:  # noqa: BLE001 - report exact audit failure
        return "ERR", str(exc)


def audit_rows(rows: list[dict], posts: dict[str, dict], campaigns: dict[str, dict], live: bool) -> list[Issue]:
    issues: list[Issue] = []
    today = date.today()
    tools_by_path = tool_paths(campaigns)

    for idx, row in enumerate(rows, 1):
        item = row.get("title") or f"row {idx}"
        link = (row.get("link") or "").strip()
        parsed = urlparse(link)

        if parsed.scheme != "https":
            issues.append(Issue("fail", "link_scheme", "Link must start with https://", item))

        if parsed.netloc == APEX_HOST:
            issues.append(Issue("fail", "apex_link", "Use www domain in Pinterest links, not apex domain.", item))
        elif parsed.netloc != CANONICAL_HOST:
            issues.append(Issue("fail", "wrong_host", f"Expected host {CANONICAL_HOST}, got {parsed.netloc or '(empty)'}.", item))

        slug = slug_from_blog_url(link)
        tool_campaign = tools_by_path.get(parsed.path)
        if slug:
            if slug not in posts:
                issues.append(Issue("fail", "unknown_slug", f"Slug is not in data/blog-index.json: {slug}", item))
            elif not (BLOG_DIR / f"{slug}.html").exists():
                issues.append(Issue("fail", "missing_blog_file", f"Local blog file is missing for slug: {slug}", item))
        elif tool_campaign:
            local_tool_page = REPO_DIR / parsed.path.lstrip("/")
            if not local_tool_page.exists():
                issues.append(Issue("fail", "missing_tool_file", f"Local tool page is missing: {parsed.path}", item))
            if "utm_source=pinterest" not in parsed.query:
                issues.append(Issue("warn", "missing_pinterest_utm", "Tool campaign link should include utm_source=pinterest.", item))
        else:
            issues.append(Issue("fail", "bad_destination_url", "Expected /blog/<slug>.html or a known tool campaign path.", item))

        image_path = Path(row.get("image_path") or "")
        if not image_path.exists():
            issues.append(Issue("fail", "missing_image", f"Image path does not exist: {image_path}", item))

        scheduled = (row.get("scheduled") or "").strip()
        if scheduled:
            try:
                scheduled_at = datetime.strptime(scheduled, "%Y-%m-%d %H:%M")
                if scheduled_at < datetime.now():
                    issues.append(Issue("warn", "stale_schedule", f"Scheduled time is in the past: {scheduled}", item))
            except ValueError:
                try:
                    scheduled_date = datetime.strptime(scheduled.split()[0], "%Y-%m-%d").date()
                    if scheduled_date < today:
                        issues.append(Issue("warn", "stale_schedule", f"Scheduled date is in the past: {scheduled}", item))
                except ValueError:
                    issues.append(Issue("warn", "bad_schedule", f"Could not parse scheduled date: {scheduled}", item))

        if live and link:
            status, final = check_live_url(link)
            if status != "200":
                issues.append(Issue("fail", "live_url", f"Live check returned {status}: {final}", item))
            elif urlparse(final).netloc != CANONICAL_HOST:
                issues.append(Issue("warn", "live_redirect", f"Final URL changed to: {final}", item))

    return issues


def audit_inventory(rows: list[dict], posts: dict[str, dict], campaigns: dict[str, dict]) -> list[Issue]:
    issues: list[Issue] = []
    row_images = {Path(row.get("image_path") or "").resolve() for row in rows if row.get("image_path")}
    row_links = {row.get("link", "") for row in rows}

    for image in pin_images():
        if image.resolve() not in row_images:
            slug = slug_from_pin_stem(image.stem)
            issues.append(Issue("warn", "image_not_in_csv", "Generated pin image is not included in CSV.", image.name))
            if slug in posts:
                expected_link = f"{CANONICAL_BASE}/blog/{slug}.html"
                if expected_link not in row_links:
                    issues.append(Issue("warn", "missing_csv_link", f"CSV has no row for {expected_link}", image.name))
            elif slug in campaigns:
                expected_path = campaigns[slug]["path"]
                if not any(urlparse(link).path == expected_path for link in row_links):
                    issues.append(Issue("warn", "missing_csv_link", f"CSV has no row for tool path {expected_path}", image.name))

    for image in inbox_images():
        slug = image.stem
        if slug in posts or slug in campaigns:
            variants = [p for p in pin_images() if slug_from_pin_stem(p.stem) == slug]
            if not variants:
                issues.append(Issue("info", "inbox_waiting", "Inbox image is waiting for compositor.", image.name))

    for image in pin_images():
        slug = slug_from_pin_stem(image.stem)
        if slug not in posts and slug not in campaigns:
            issues.append(Issue("warn", "image_unknown_slug", f"Generated image does not map to blog-index or tool campaign slug: {slug}", image.name))

    return issues


def audit_domains(live: bool) -> list[Issue]:
    if not live:
        return []
    issues: list[Issue] = []
    for host in (CANONICAL_HOST, APEX_HOST):
        url = f"https://{host}/"
        status, final = check_live_url(url)
        if host == CANONICAL_HOST and status != "200":
            issues.append(Issue("fail", "www_https", f"{url} returned {status}: {final}", host))
        if host == APEX_HOST and status != "200":
            issues.append(Issue("warn", "apex_https", f"{url} is not healthy yet: {status}: {final}", host))
    return issues


def build_report(live: bool) -> dict:
    posts = load_blog_index()
    campaigns = load_tool_campaigns()
    rows = load_csv_rows()
    images = pin_images()
    inbox = inbox_images()

    issues = []
    if not rows:
        issues.append(Issue("warn", "missing_csv", f"CSV not found or empty: {CSV_PATH}"))
    if not posts:
        issues.append(Issue("fail", "missing_blog_index", f"Blog index not found or empty: {BLOG_INDEX}"))

    issues.extend(audit_rows(rows, posts, campaigns, live))
    issues.extend(audit_inventory(rows, posts, campaigns))
    issues.extend(audit_domains(live))

    return {
        "csv_path": str(CSV_PATH),
        "rows": len(rows),
        "blog_posts": len(posts),
        "tool_campaigns": len(campaigns),
        "generated_pin_images": len(images),
        "inbox_images": len(inbox),
        "live_checks": live,
        "issues": [asdict(issue) for issue in issues],
    }


def print_report(report: dict) -> None:
    issues = report["issues"]
    counts = {
        "fail": sum(1 for i in issues if i["severity"] == "fail"),
        "warn": sum(1 for i in issues if i["severity"] == "warn"),
        "info": sum(1 for i in issues if i["severity"] == "info"),
    }

    print("PINTEREST AUDIT")
    print("=" * 60)
    print(f"CSV rows:             {report['rows']}")
    print(f"Blog posts:           {report['blog_posts']}")
    print(f"Tool campaigns:       {report['tool_campaigns']}")
    print(f"Generated pin images: {report['generated_pin_images']}")
    print(f"Inbox images:         {report['inbox_images']}")
    print(f"Live checks:          {'yes' if report['live_checks'] else 'no'}")
    print(f"Issues:               {counts['fail']} fail, {counts['warn']} warn, {counts['info']} info")
    print("=" * 60)

    if not issues:
        print("OK: no issues found.")
        return

    for issue in issues:
        item = f" [{issue['item']}]" if issue["item"] else ""
        print(f"{issue['severity'].upper():5} {issue['code']}{item}: {issue['message']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit local Pinterest pin exports.")
    parser.add_argument("--live", action="store_true", help="Check live URLs and HTTPS health.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    args = parser.parse_args()

    report = build_report(live=args.live)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_report(report)

    if any(issue["severity"] == "fail" for issue in report["issues"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
