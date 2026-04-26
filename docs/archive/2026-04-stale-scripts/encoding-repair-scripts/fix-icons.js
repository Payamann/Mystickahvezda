import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, '../../horoskop');

const files = [
    'beran.html', 'blizenci.html', 'byk.html', 'kozoroh.html',
    'lev.html', 'panna.html', 'rak.html', 'ryby.html', 'stir.html',
    'strelec.html', 'vahy.html', 'vodnar.html', 'vodnár.html'
];

for (const f of files) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) {
        let content = fs.readFileSync(p, 'utf8');
        let changed = false;

        if (content.includes('âť“')) {
            content = content.split('âť“').join('❓');
            changed = true;
        }
        if (content.includes('đź”˘')) {
            content = content.split('đź”˘').join('🔢');
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(p, content, 'utf8');
            console.log('Fixed additional icons in', f);
        }
    }
}
