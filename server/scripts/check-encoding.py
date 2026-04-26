import os
import re
import subprocess
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
REPORT_PATH = ROOT_DIR / "tmp" / "encoding_issues_report.txt"
SCANNED_EXTENSIONS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sql",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
}
SKIPPED_DIRS = {
    ".git",
    ".agents",
    ".claire",
    ".pytest_cache",
    "coverage",
    "docs",
    "node_modules",
    "playwright-report",
    "social-media-agent",
    "tmp",
    "tmp_email_previews",
}

def should_scan(path):
    rel_path = path.relative_to(ROOT_DIR).as_posix()
    return path.suffix in SCANNED_EXTENSIONS


def iter_scanned_files():
    try:
        result = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
            cwd=ROOT_DIR,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        for rel_path in result.stdout.splitlines():
            path = ROOT_DIR / rel_path
            if SKIPPED_DIRS.intersection(path.parts):
                continue
            if should_scan(path):
                yield path
        return
    except Exception:
        pass

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [directory for directory in dirs if directory not in SKIPPED_DIRS]

        for file in files:
            path = Path(root) / file
            if should_scan(path):
                yield path


def check_files():
    # Common mojibake markers when UTF-8 text was decoded as CP1250/1252.
    # Keep these as escapes so this detector cannot become mojibake itself.
    suspicious_patterns = [
        "[\u00c2\u00c4\u0102\u0139][\u0080-\u00bf\u0100-\u017f\u02c7\u201a-\u203a]",
        "\u00e2[\u0080-\uffff]{1,4}",
        "\ufffd",
        r"\?sp\?\?n\?",
        r"pros\?m",
        r"sv\?j",
        r"potvrzen\?",
        r"\?\?tu",
    ]

    regexes = [re.compile(pattern) for pattern in suspicious_patterns]
    found_issues = []

    for path in iter_scanned_files():
        try:
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            for line_num, line in enumerate(lines, 1):
                for regex in regexes:
                    if regex.search(line):
                        rel_path = os.path.relpath(path, ROOT_DIR)
                        found_issues.append((rel_path, line_num, line.strip()))
                        break
        except Exception:
            pass

    if not found_issues:
        print("No suspicious mojibake patterns found! All good.")
        if REPORT_PATH.exists():
            REPORT_PATH.unlink()
        return

    print(f"Found {len(found_issues)} suspicious lines:")
    # Write to file to avoid console encoding issues.
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        for issue in found_issues:
            f.write(f"- {issue[0]}:{issue[1]} -> {issue[2][:100]}...\n")
    print(f"Wrote results to {REPORT_PATH.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    check_files()
