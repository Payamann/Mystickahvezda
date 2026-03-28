# /html-scaffold — Vytvoř novou HTML stránku s kompletním boilerplate

Vytvoř novou HTML stránku se všemi povinnými meta tagy, favicon, OG, JSON-LD, canonical, CSS, SW registrací.
Argument `$ARGUMENTS` = název souboru a titulek, oddělené čárkou. Např: `runy-vyklad, Výklad Run`

---

## Postup

### 1. Zjisti aktuální CSS verzi
```bash
grep -oP 'style\.v2\.min\.css\?v=\K[0-9]+' index.html | head -1
```

### 2. Přečti vzorovou stránku pro referenci
Přečti `index.html` a zjisti:
- Přesný favicon blok
- Apple-touch-icon
- Font preconnect bloky
- Service worker registraci
- Navigaci a patičku

### 3. Vygeneruj HTML soubor

Použij tuto strukturu:

```html
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>">
    <link rel="apple-touch-icon" href="img/icon-192.webp">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>[TITULEK] | Mystická Hvězda</title>
    <meta name="description" content="[POPIS — 150-160 znaků]">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="[TITULEK] | Mystická Hvězda">
    <meta property="og:description" content="[POPIS]">
    <meta property="og:url" content="https://www.mystickahvezda.cz/[SOUBOR].html">
    <meta property="og:image" content="https://www.mystickahvezda.cz/img/hero-3d.webp">
    <meta property="og:locale" content="cs_CZ">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap&subset=latin,latin-ext" rel="stylesheet">

    <link rel="stylesheet" href="css/style.v2.min.css?v=[AKTUÁLNÍ VERZE]">
    <link rel="canonical" href="https://www.mystickahvezda.cz/[SOUBOR].html">

    <script type="application/ld+json">{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "[TITULEK] | Mystická Hvězda",
        "url": "https://www.mystickahvezda.cz/[SOUBOR].html",
        "description": "[POPIS]"
    }</script>
</head>
<body>
    <div class="stars" aria-hidden="true"></div>
    <!-- [NAVIGACE — zkopíruj z existující stránky] -->

    <main>
        <section class="hero">
            <h1>[TITULEK]</h1>
            <p>[PODTITULEK]</p>
        </section>

        <!-- OBSAH ZDE -->

    </main>

    <!-- [PATIČKA — zkopíruj z existující stránky] -->

    <script src="js/main.js" defer></script>
</body>
</html>
```

### 4. Po vytvoření souboru

1. **Přidej do sitemap.xml:**
   ```xml
   <url><loc>https://www.mystickahvezda.cz/[SOUBOR].html</loc><lastmod>[DNES]</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
   ```

2. **Přidej do service-worker.js STATIC_ASSETS** (pokud je to statická stránka)

3. **Bumpni SW cache verzi**

Informuj uživatele o všech třech krocích.
