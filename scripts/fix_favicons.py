import glob


FAVICON_SVG = (
    "<link rel=\"icon\" type=\"image/svg+xml\" "
    "href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' "
    "viewBox='0 0 100 100'><text y='.9em' font-size='90'>"
    "%F0%9F%94%AE</text></svg>\">"
)

SKIP = [
    ".claude",
    ".claire",
    "components",
    "coverage",
    "docs",
    "node_modules",
    "playwright-report",
    "server/node_modules",
    "social-media-agent/output",
    "templates",
    "tests",
    "tmp_email_previews",
]


def get_prefix(path):
    parts = path.replace("\\", "/").split("/")
    depth = len(parts) - 1
    return "../" * depth


fixed = 0
skipped = 0
for path in glob.glob("**/*.html", recursive=True):
    path = path.replace("\\", "/")
    if any(skipped_path in path for skipped_path in SKIP):
        continue

    with open(path, encoding="utf-8", errors="ignore") as f:
        content = f.read()

    if 'rel="icon"' in content:
        continue

    prefix = get_prefix(path)
    favicon_block = f'  {FAVICON_SVG}\n  <link rel="apple-touch-icon" href="{prefix}img/icon-192.webp">'

    try:
        if "<meta charset" in content:
            insert_after = content.index("<meta charset")
            end = content.index(">", insert_after) + 1
            content = content[:end] + "\n" + favicon_block + content[end:]
        elif "<head>" in content.lower():
            idx = content.lower().index("<head>") + 6
            content = content[:idx] + "\n" + favicon_block + content[idx:]
        else:
            skipped += 1
            continue

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        fixed += 1
    except Exception as err:
        print(f"Error {path}: {err}")

print(f"Fixed: {fixed}, Skipped (no head): {skipped}")
