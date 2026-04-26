const fs = require('fs');
const path = require('path');

const gridHtmlTemplate = `    <!-- CROSS-LINKING SEKCE -->
    <section class="section" style="padding-top: 0; padding-bottom: 3rem;">
        <div class="container" style="max-width: 860px;">
            <h3 style="font-family: var(--font-heading); color: var(--color-mystic-gold); text-align: center; font-size: 1.3rem; margin-bottom: 1.5rem; letter-spacing: 1px;">Pokračujte ve své duchovní cestě</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                <a href="andelske-karty.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🕊️</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Andělská Karta</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Poselství na dnešní den</div>
                </a>
                <a href="kristalova-koule.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔮</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Křišťálová koule</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Zeptejte se na cokoli</div>
                </a>
                <a href="tarot.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🃏</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Tarotový výklad</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Hloubkový vhled</div>
                </a>
                <a href="horoskopy.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⭐</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Denní horoskop</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Vaše znamení dnes</div>
                </a>
                <a href="mentor.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌟</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Hvězdný Průvodce</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Hvězdný průvodce</div>
                </a>
                <a href="natalni-karta.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚛️</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Natální karta</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Váš vesmírný otisk</div>
                </a>
                <a href="partnerska-shoda.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">💞</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Partnerská shoda</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Synastrie vztahů</div>
                </a>
                <a href="numerologie.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔢</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Numerologie</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Rozbor čísel</div>
                </a>
                <a href="astro-mapa.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌎</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Astro-mapa</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Zóny síly ve světě</div>
                </a>
                <a href="snar.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🌙</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Lexikon snů</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Analýza vašeho snu</div>
                </a>
                <a href="biorytmy.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">〰️</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Biorytmy</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Dnešní křivky energie</div>
                </a>
                <a href="runy.html" class="card" style="text-decoration: none; padding: 1.5rem; text-align: center; border-radius: 16px; background: rgba(20,15,30,0.6); border: 1px solid rgba(235,192,102,0.2); transition: transform 0.2s, border-color 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(235,192,102,0.5)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(235,192,102,0.2)'">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🪨</div>
                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem;">Věštění z Run</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 0.25rem;">Severská moudrost</div>
                </a>
            </div>
        </div>
    </section>`;

const dir = 'c:/Users/pavel/OneDrive/Desktop/MystickaHvezda';

const filesToProcess = [
    'andelske-karty.html',
    'runy.html',
    'kristalova-koule.html',
    'tarot.html',
    'horoskopy.html',
    'mentor.html',
    'natalni-karta.html',
    'partnerska-shoda.html',
    'numerologie.html',
    'astro-mapa.html',
    'biorytmy.html',
    'snar.html'
];

filesToProcess.forEach(fileName => {
    const fullPath = path.join(dir, fileName);
    if (!fs.existsSync(fullPath)) {
        console.warn(`Soubor nebyl nalezen: ${fullPath}`);
        return;
    }

    try {
        let content = fs.readFileSync(fullPath, 'utf8');

        // 1. Vyhledání href na samotnou stránku a odstranění <a href="...">...</a> tagu z gridu (aby nebyla current stránka 2x)
        const regexStr = `<a href="${fileName}"[\\s\\S]*?</a>`;
        const itemRegex = new RegExp(regexStr, 'g');
        let fileSpecifiGrid = gridHtmlTemplate.replace(itemRegex, '');

        // 2. Odstranění staré cross-linking sekce, pokud u daného souboru už třeba byla
        if (content.includes('<!-- CROSS-LINKING SEKCE -->')) {
            content = content.replace(/<!-- CROSS-LINKING SEKCE -->[\s\S]*?<\/section>/, '');
        }

        // 3. Vložení nové
        if (content.includes('</main>')) {
            content = content.replace('</main>', '\n' + fileSpecifiGrid + '\n    </main>');
            fs.writeFileSync(fullPath, content);
            console.log(`[OK] Updated ${fileName}`);
        } else if (content.includes('<!-- FOOTER')) { // biorytmy, astro-mapa atd.. pokud nemají main
            content = content.replace('<!-- FOOTER', '\n' + fileSpecifiGrid + '\n\n    <!-- FOOTER');
            fs.writeFileSync(fullPath, content);
            console.log(`[OK] Updated ${fileName} (fallback k Footer)`);
        } else {
            console.log(`[SKIP] Nemůžu najít kam to vložit v ${fileName}`);
        }
    } catch (e) {
        console.error(`Error u ${fileName}`, e);
    }
});
