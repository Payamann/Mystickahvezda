import os
import re

def fix_footer():
    path = r'c:\Users\pavel\OneDrive\Desktop\MystickaHvezda\components\footer.html'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add width/height to logo and remove style
    content = re.sub(
        r'<img src="img/logo-3d\.webp" alt="Mystická Hvězda Logo" class="logo__image"\s+style="height: 40px; width: auto;" loading="lazy">',
        r'<img src="img/logo-3d.webp" alt="Mystická Hvězda Logo" class="logo__image" width="40" height="40" loading="lazy">',
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed footer.html")

def fix_css_transitions():
    path = r'c:\Users\pavel\OneDrive\Desktop\MystickaHvezda\css\style.v2.css'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace transition: all with specific properties for common components
    # 1. .tarot-card
    content = re.sub(
        r'\.tarot-card\s*\{([^}]*?)transition:\s*all\s*var\(--transition-base\);',
        r'.tarot-card {\1transition: transform var(--transition-base), box-shadow var(--transition-base);',
        content, flags=re.DOTALL
    )
    
    # 2. .tab
    content = re.sub(
        r'\.tab\s*\{([^}]*?)transition:\s*all\s*var\(--transition-fast\);',
        r'.tab {\1transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);',
        content, flags=re.DOTALL
    )
    
    # 3. Generic replace for others where we don't have specific context easily
    # Replace 'transition: all' with 'transition: color, background-color, border-color, transform, opacity'
    content = re.sub(
        r'transition:\s*all\b',
        r'transition: color 0.2s, background-color 0.2s, border-color 0.2s, transform 0.2s, opacity 0.2s',
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed style.v2.css transitions")

def fix_index_head():
    path = r'c:\Users\pavel\OneDrive\Desktop\MystickaHvezda\index.html'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add Preconnects
    preconnects = """
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://js.stripe.com">
  <link rel="dns-prefetch" href="https://js.stripe.com">
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
"""
    if '<link rel="preconnect" href="https://js.stripe.com">' not in content:
        content = content.replace('<!-- Fonts -->', preconnects + '  <!-- Fonts -->')

    # 2. Inline Critical Hero CSS
    critical_css = """
    /* Critical Hero CSS */
    .hero { position: relative; overflow: hidden; min-height: 80vh; display: flex; align-items: center; padding: 100px 0 60px; }
    .hero__content { max-width: 800px; margin: 0 auto; text-align: center; position: relative; z-index: 5; }
    .hero__title { font-size: clamp(2.5rem, 8vw, 4.5rem); line-height: 1.1; margin-bottom: 20px; font-family: 'Cinzel', serif; color: #fff; }
    .hero__subtitle { font-size: clamp(1rem, 4vw, 1.25rem); color: rgba(255,255,255,0.7); margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto; }
    .hero__image { width: 100%; max-width: 500px; height: auto; transform: translateZ(0); filter: drop-shadow(0 0 30px rgba(155,89,182,0.3)); }
    @media (max-width: 768px) { .hero { padding: 80px 0 40px; min-height: 60vh; } }
"""
    if '/* Critical Hero CSS */' not in content:
        content = content.replace('</style>', critical_css + '    </style>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed index.html head (preconnects & inline CSS)")

def fix_horoskopy_head():
    path = r'c:\Users\pavel\OneDrive\Desktop\MystickaHvezda\horoskopy.html'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add Preconnects & Preloads
    head_extras = """
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://js.stripe.com">
    <link rel="dns-prefetch" href="https://js.stripe.com">
    <link rel="preload" as="image" href="img/bg-cosmic-hd.webp">
"""
    if '<link rel="preconnect" href="https://js.stripe.com">' not in content:
        content = content.replace('<title>', head_extras + '    <title>')

    # 2. Inline Critical Hero CSS for Horoskopy
    critical_css = """
    <style>
    /* Critical Hero CSS */
    .section--hero { min-height: 40vh !important; display: flex; align-items: center; justify-content: center; padding: 60px 0 20px !important; }
    .hero__title { font-size: clamp(2rem, 7vw, 3.5rem); text-align: center; margin-bottom: 1rem; }
    .zodiac-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 10px; margin-top: 20px; }
    @media (max-width: 768px) { .zodiac-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; } }
    </style>
"""
    if '/* Critical Hero CSS */' not in content:
        content = content.replace('</head>', critical_css + '</head>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed horoskopy.html head")

if __name__ == "__main__":
    # fix_footer() 
    # fix_css_transitions() 
    fix_index_head()
    fix_horoskopy_head()
