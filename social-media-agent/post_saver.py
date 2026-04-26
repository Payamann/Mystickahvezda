"""
Post Saver — ukládá posty a generuje pixel-perfect Instagram/Facebook náhledy
"""
import json
import os
from pathlib import Path
from datetime import datetime
import sys
sys.path.insert(0, str(Path(__file__).parent))
import config
from utils import slugify
from logger import get_logger

log = get_logger(__name__)

PREVIEW_JS = """/* Preview interactions for Mysticka Hvezda post previews */

function getPreviewData() {
  return document.getElementById('post-preview')?.dataset || {};
}

function copyText(text, successMessage) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      alert(successMessage);
    }).catch(function() {
      fallbackCopy(text);
    });
    return;
  }

  fallbackCopy(text);
}

function fallbackCopy(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  alert('Zkopirovano.');
}

function copyCaption() {
  var data = getPreviewData();
  copyText((data.caption || '') + '\\n\\n' + (data.hashtags || ''), 'Caption + hashtags zkopirovany.');
}

function copyHashtags() {
  var data = getPreviewData();
  copyText(data.hashtags || '', 'Hashtags zkopirovany.');
}

function selectVariant(index) {
  var cards = document.querySelectorAll('.variant-card');
  cards.forEach(function(card, cardIndex) {
    card.style.borderColor = cardIndex === index ? '#c9a227' : '#3a1a5e';
  });
}
"""


def save_post(
    post_data: dict,
    image_path: Path = None,
    platform: str = "instagram",
    topic: str = "",
    post_type: str = "",
) -> Path:
    """Uloží post + vygeneruje HTML náhled"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    topic_slug = slugify(topic)
    filename = f"{timestamp}_{platform}_{topic_slug}"

    post_record = {
        "id": filename,
        "platform": platform,
        "topic": topic,
        "post_type": post_type,
        "generated_at": datetime.now().isoformat(),
        "status": "draft",
        "caption": post_data.get("caption", ""),
        "hashtags": post_data.get("hashtags", []),
        "image_prompt": post_data.get("image_prompt", ""),
        "call_to_action": post_data.get("call_to_action", ""),
        "hook_formula": post_data.get("hook_formula", ""),
        "image_path": str(image_path) if image_path else None,
        "published_at": None,
        # Uložíme i varianty pokud existují
        "variations": post_data.get("variations", []),
    }

    config.POSTS_DIR.mkdir(parents=True, exist_ok=True)
    _ensure_preview_assets()
    json_path = config.POSTS_DIR / f"{filename}.json"

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(post_record, f, ensure_ascii=False, indent=2)

    html_path = _create_instagram_preview(post_record, image_path, filename)

    log.info("Post uložen: %s", json_path.name)
    log.info("Náhled vytvořen: %s", html_path)

    return json_path


def _ensure_preview_assets() -> None:
    """Write local assets required by generated HTML previews."""
    preview_js_path = config.POSTS_DIR / "preview.js"
    if not preview_js_path.exists() or preview_js_path.read_text(encoding='utf-8') != PREVIEW_JS:
        preview_js_path.write_text(PREVIEW_JS, encoding='utf-8')


def _create_instagram_preview(post_record: dict, image_path: Path, filename: str) -> Path:
    """Generuje vizuální náhled věrně napodobující Instagram feed"""
    caption = post_record.get("caption", "")
    hashtags = post_record.get("hashtags", [])
    platform = post_record.get("platform", "instagram")
    hook = post_record.get("hook_formula", "")
    variations = post_record.get("variations", [])

    # Příprava obrázku
    if image_path and Path(str(image_path)).exists():
        rel_path = os.path.relpath(image_path, config.POSTS_DIR).replace('\\', '/')
        img_html = f'<img src="{rel_path}" alt="Post" class="post-image">'
    else:
        img_html = '<div class="post-image placeholder-img">🔮</div>'

    # Caption → HTML (zachovat zalomení, první řádek bold)
    caption_lines = caption.strip().split('\n')
    first_line = caption_lines[0] if caption_lines else ""
    rest = '\n'.join(caption_lines[1:]) if len(caption_lines) > 1 else ""

    caption_html = f'<strong>{first_line}</strong>'
    if rest:
        caption_html += '<br>' + rest.replace('\n', '<br>')

    hashtags_html = ' '.join(f'<span class="hashtag">{h}</span>' for h in hashtags)

    # Varianty HTML
    variants_html = ""
    if variations:
        variants_html = """<div class="variants-section">
        <h3>🔀 Varianty captionů</h3>"""
        for i, var in enumerate(variations):
            var_caption = var.get("caption", "").replace('\n', '<br>')
            var_hook = var.get("hook_formula", "")
            variants_html += f"""
        <div class="variant-card" onclick="selectVariant({i})">
          <div class="variant-header">
            <span class="variant-num">Varianta {i+1}</span>
            <span class="hook-badge">{var_hook}</span>
          </div>
          <div class="variant-caption">{var_caption}</div>
        </div>"""
        variants_html += "</div>"

    # Počet slov
    word_count = len(caption.split())
    char_count = len(caption)

    platform_color = "#E1306C" if platform == "instagram" else "#1877F2"
    platform_icon = "📸" if platform == "instagram" else "👍"

    html = f"""<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔮 Post Náhled — {post_record['topic']}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0d0d1a; color: #e8deff; min-height: 100vh; padding: 20px; }}

  .page-wrap {{ max-width: 1100px; margin: 0 auto; display: grid;
               grid-template-columns: 500px 1fr; gap: 24px; }}

  /* === INSTAGRAM MOCKUP === */
  .phone-wrap {{ display: flex; flex-direction: column; align-items: center; }}
  .phone {{ background: #111; border: 3px solid #333; border-radius: 40px;
           width: 375px; overflow: hidden; box-shadow: 0 20px 60px rgba(74,0,128,.4); }}
  .phone-notch {{ background: #111; height: 32px; display: flex; align-items: center;
                 justify-content: center; }}
  .phone-notch-bar {{ width: 120px; height: 6px; background: #333; border-radius: 3px; }}

  .ig-feed {{ background: #000; }}
  .ig-header {{ background: #000; padding: 12px 16px; display: flex; align-items: center;
               border-bottom: 1px solid #1a1a1a; }}
  .ig-avatar {{ width: 36px; height: 36px; border-radius: 50%;
               background: linear-gradient(135deg, #4a0080, #c9a227);
               display: flex; align-items: center; justify-content: center; font-size: 18px; }}
  .ig-username {{ font-weight: 600; font-size: 14px; color: #fff; margin-left: 10px; }}
  .ig-verified {{ color: {platform_color}; margin-left: 4px; font-size: 12px; }}
  .ig-more {{ margin-left: auto; color: #888; font-size: 20px; }}

  .post-image {{ width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block; }}
  .placeholder-img {{ width: 100%; aspect-ratio: 1/1;
    background: linear-gradient(135deg, #0a0a2e 0%, #2a0060 50%, #0a0030 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 80px; }}

  .ig-actions {{ padding: 10px 16px; display: flex; gap: 14px; }}
  .ig-action {{ font-size: 22px; cursor: pointer; }}
  .ig-action:hover {{ transform: scale(1.1); }}
  .ig-bookmark {{ margin-left: auto; }}
  .ig-likes {{ padding: 0 16px 4px; font-size: 13px; font-weight: 600; color: #fff; }}
  .ig-caption-wrap {{ padding: 4px 16px 8px; font-size: 13px; line-height: 1.5; color: #e8deff; }}
  .ig-caption-wrap strong {{ color: #fff; }}
  .hashtag {{ color: #8b5cf6; }}
  .ig-more-link {{ color: #999; font-size: 12px; margin: 2px 16px; }}
  .ig-time {{ color: #666; font-size: 11px; padding: 4px 16px 12px; }}

  /* === SIDEBAR === */
  .sidebar {{ display: flex; flex-direction: column; gap: 16px; }}

  .info-card {{ background: #1a0a2e; border: 1px solid #3a1a5e; border-radius: 16px; padding: 20px; }}
  .info-card h3 {{ color: #c9a227; font-size: 14px; font-weight: 600; margin-bottom: 12px;
                  display: flex; align-items: center; gap: 8px; }}
  .badge {{ display: inline-block; background: {platform_color}; color: #fff;
           padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
           text-transform: uppercase; }}
  .status-draft {{ background: #4a3000; color: #ffd700; }}
  .status-approved {{ background: #003a1a; color: #00ff88; }}

  .meta-row {{ display: flex; justify-content: space-between; padding: 6px 0;
              border-bottom: 1px solid #2a1a4e; font-size: 13px; }}
  .meta-row:last-child {{ border-bottom: none; }}
  .meta-key {{ color: #888; }}
  .meta-val {{ color: #e8deff; font-weight: 500; }}

  .hook-badge {{ display: inline-block; background: #2a0060; color: #a855f7;
               padding: 3px 10px; border-radius: 8px; font-size: 11px; font-style: italic; }}

  .prompt-box {{ background: #0a0020; border-radius: 8px; padding: 12px; font-size: 12px;
                color: #a080c0; font-style: italic; line-height: 1.5; }}

  .hashtag-cloud {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .hashtag-pill {{ background: #2a0060; color: #a855f7; padding: 4px 10px;
                  border-radius: 12px; font-size: 12px; }}

  /* === VARIANTY === */
  .variants-section h3 {{ color: #c9a227; font-size: 14px; font-weight: 600; margin-bottom: 12px; }}
  .variant-card {{ background: #0a0020; border: 1px solid #3a1a5e; border-radius: 12px;
                  padding: 14px; margin-bottom: 10px; cursor: pointer; transition: border-color .2s; }}
  .variant-card:hover {{ border-color: #8b5cf6; }}
  .variant-header {{ display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }}
  .variant-num {{ font-weight: 600; font-size: 13px; color: #c9a227; }}
  .variant-caption {{ font-size: 13px; line-height: 1.5; color: #ccc; }}

  /* === HEADER === */
  .page-header {{ grid-column: 1/-1; text-align: center; padding: 20px 0 10px; }}
  .page-header h1 {{ font-size: 22px; color: #c9a227; }}
  .page-header p {{ color: #666; font-size: 13px; margin-top: 4px; }}

  /* === ACTIONS === */
  .action-buttons {{ display: flex; gap: 10px; }}
  .btn {{ padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
         font-size: 14px; font-weight: 600; transition: transform .15s; }}
  .btn:hover {{ transform: translateY(-1px); }}
  .btn-approve {{ background: #00cc66; color: #000; }}
  .btn-copy {{ background: #4a0080; color: #fff; }}
  .btn-regenerate {{ background: #1a0a2e; color: #a855f7; border: 1px solid #4a0080; }}

  @media (max-width: 900px) {{ .page-wrap {{ grid-template-columns: 1fr; }} }}
</style>
</head>
<body>
<div class="page-wrap">

  <div class="page-header">
    <h1>🔮 Mystická Hvězda — Post Náhled</h1>
    <p>Vygenerováno: {post_record['generated_at'][:16].replace('T', ' ')} &nbsp;|&nbsp;
       {platform_icon} {platform.capitalize()} &nbsp;|&nbsp;
       {word_count} slov, {char_count} znaků</p>
  </div>

  <!-- INSTAGRAM MOCKUP -->
  <div class="phone-wrap">
    <div class="phone">
      <div class="phone-notch"><div class="phone-notch-bar"></div></div>
      <div class="ig-feed">
        <div class="ig-header">
          <div class="ig-avatar">🔮</div>
          <div>
            <div class="ig-username">mystickahvezda <span class="ig-verified">✦</span></div>
          </div>
          <div class="ig-more">···</div>
        </div>

        {img_html}

        <div class="ig-actions">
          <span class="ig-action">🤍</span>
          <span class="ig-action">💬</span>
          <span class="ig-action">📤</span>
          <span class="ig-action ig-bookmark">🔖</span>
        </div>
        <div class="ig-likes">🤍 Buď první kdo to ocení</div>
        <div class="ig-caption-wrap">
          <strong>mystickahvezda</strong>&nbsp;{caption_html}<br><br>
          {hashtags_html}
        </div>
        <div class="ig-more-link">Zobrazit všechny komentáře</div>
        <div class="ig-time">PRÁVĚ TEĎ</div>
      </div>
    </div>
  </div>

  <!-- SIDEBAR -->
  <div class="sidebar">

    <!-- Status & Meta -->
    <div class="info-card">
      <h3>📋 Informace o postu</h3>
      <div class="meta-row">
        <span class="meta-key">Status</span>
        <span class="badge status-{post_record['status']}">{post_record['status'].upper()}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Platforma</span>
        <span class="meta-val">{platform_icon} {platform.capitalize()}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Téma</span>
        <span class="meta-val">{post_record['topic']}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Typ</span>
        <span class="meta-val">{post_record.get('post_type', '—')}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Hook vzorec</span>
        <span class="hook-badge">{hook or '—'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-key">Délka captionу</span>
        <span class="meta-val">{word_count} slov / {char_count} znaků</span>
      </div>
    </div>

    <!-- Image Prompt -->
    <div class="info-card">
      <h3>🎨 Image Prompt (pro Imagen 3)</h3>
      <div class="prompt-box">{post_record.get('image_prompt', '—')}</div>
    </div>

    <!-- Hashtags -->
    <div class="info-card">
      <h3>🏷️ Hashtags ({len(hashtags)} tagů)</h3>
      <div class="hashtag-cloud">
        {''.join(f'<span class="hashtag-pill">{h}</span>' for h in hashtags)}
      </div>
    </div>

    <!-- Akce -->
    <div class="info-card">
      <h3>⚡ Akce</h3>
      <div class="action-buttons">
        <button class="btn btn-copy" onclick="copyCaption()">📋 Kopírovat caption</button>
        <button class="btn btn-copy" onclick="copyHashtags()">🏷️ Kopírovat tagy</button>
      </div>
      <p style="font-size:12px;color:#666;margin-top:10px;">
        ID: {post_record['id']}
      </p>
    </div>

    {f'<div class="info-card">{variants_html}</div>' if variants_html else ''}

  </div>
</div>

<div id="post-preview" data-caption={json.dumps(caption, ensure_ascii=False)} data-hashtags={json.dumps(' '.join(hashtags), ensure_ascii=False)}></div>
<script src="preview.js"></script>
</body>
</html>"""

    html_path = config.POSTS_DIR / f"{filename}.html"
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return html_path


def load_all_posts(status: str = None) -> list[dict]:
    config.POSTS_DIR.mkdir(parents=True, exist_ok=True)
    posts = []
    for json_file in sorted(config.POSTS_DIR.glob("*.json"), reverse=True):
        # Přeskoč plány
        if json_file.stem.startswith("plan_"):
            continue
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                post = json.load(f)
            if status is None or post.get('status') == status:
                posts.append(post)
        except (json.JSONDecodeError, OSError):
            pass
    return posts


def mark_post_approved(post_id: str) -> bool:
    json_path = config.POSTS_DIR / f"{post_id}.json"
    if not json_path.exists():
        return False
    with open(json_path, 'r', encoding='utf-8') as f:
        post = json.load(f)
    post['status'] = 'approved'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(post, f, ensure_ascii=False, indent=2)
    return True
