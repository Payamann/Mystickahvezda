"""
Pinterest analytics CSV analyzer.

Export analytics from Pinterest, then run:
    python pinterest_analytics.py path/to/pinterest_export.csv

The script is intentionally tolerant of English/Czech column names.
It reports top pins by outbound clicks and flags non-canonical destination URLs.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

CANONICAL_HOST = "www.mystickahvezda.cz"


FIELD_ALIASES = {
    "title": [
        "title", "pin title", "nazev", "nadpis", "pin",
    ],
    "destination": [
        "destination", "destination link", "link", "url", "odkaz", "cilova adresa", "cilovy odkaz",
    ],
    "impressions": [
        "impressions", "imprese", "zobrazeni",
    ],
    "outbound_clicks": [
        "outbound clicks", "outbound click", "link clicks", "clicks", "odchozi kliknuti", "kliknuti na odkaz",
    ],
    "pin_clicks": [
        "pin clicks", "pin click", "kliknuti na pin",
    ],
    "saves": [
        "saves", "ulozeni", "ulozene",
    ],
}


@dataclass
class PinMetric:
    title: str
    destination: str
    impressions: int
    outbound_clicks: int
    pin_clicks: int
    saves: int

    @property
    def outbound_ctr(self) -> float:
        if self.impressions <= 0:
            return 0.0
        return self.outbound_clicks / self.impressions

    @property
    def save_rate(self) -> float:
        if self.impressions <= 0:
            return 0.0
        return self.saves / self.impressions


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def parse_int(value: str | None) -> int:
    if not value:
        return 0
    cleaned = re.sub(r"[^\d.,-]", "", value)
    if "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")
    if "." in cleaned:
        cleaned = cleaned.split(".", 1)[0]
    try:
        return int(cleaned)
    except ValueError:
        return 0


def find_field(headers: list[str], aliases: list[str]) -> str | None:
    normalized = {norm(header): header for header in headers}
    for alias in aliases:
        if alias in normalized:
            return normalized[alias]
    for header_norm, header in normalized.items():
        if any(alias in header_norm for alias in aliases):
            return header
    return None


def load_metrics(path: Path) -> tuple[list[PinMetric], dict[str, str | None]]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        fields = {key: find_field(headers, aliases) for key, aliases in FIELD_ALIASES.items()}

        metrics = []
        for row in reader:
            title = row.get(fields["title"] or "", "").strip()
            destination = row.get(fields["destination"] or "", "").strip()
            metrics.append(
                PinMetric(
                    title=title,
                    destination=destination,
                    impressions=parse_int(row.get(fields["impressions"] or "")),
                    outbound_clicks=parse_int(row.get(fields["outbound_clicks"] or "")),
                    pin_clicks=parse_int(row.get(fields["pin_clicks"] or "")),
                    saves=parse_int(row.get(fields["saves"] or "")),
                )
            )
    return metrics, fields


def print_table(rows: list[PinMetric], limit: int) -> None:
    for idx, row in enumerate(rows[:limit], 1):
        host = urlparse(row.destination).netloc
        print(
            f"{idx:>2}. clicks={row.outbound_clicks:<5} "
            f"ctr={row.outbound_ctr * 100:>5.2f}% "
            f"impr={row.impressions:<7} saves={row.saves:<5} "
            f"host={host or '-'} title={row.title[:90]}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze Pinterest analytics export.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    metrics, fields = load_metrics(args.csv_path)
    print("PINTEREST ANALYTICS")
    print("=" * 80)
    print("Detected columns:")
    for key, value in fields.items():
        print(f"  {key}: {value or 'NOT FOUND'}")

    bad_destinations = [
        row for row in metrics
        if row.destination and urlparse(row.destination).netloc not in {"", CANONICAL_HOST}
    ]

    print("\nTop by outbound clicks")
    print("-" * 80)
    print_table(sorted(metrics, key=lambda row: row.outbound_clicks, reverse=True), args.limit)

    print("\nTop by outbound CTR, minimum 100 impressions")
    print("-" * 80)
    qualified = [row for row in metrics if row.impressions >= 100]
    print_table(sorted(qualified, key=lambda row: row.outbound_ctr, reverse=True), args.limit)

    print("\nDestination URL issues")
    print("-" * 80)
    if not bad_destinations:
        print("No non-canonical destination hosts found.")
    else:
        for row in bad_destinations[:args.limit]:
            print(f"{urlparse(row.destination).netloc or '-'} | {row.destination} | {row.title[:90]}")


if __name__ == "__main__":
    main()
