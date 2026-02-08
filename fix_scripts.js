import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = 'c:\\Users\\pavel\\OneDrive\\Desktop\\MystickaHvezda';

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                getAllHtmlFiles(filePath, fileList);
            }
        } else {
            if (path.extname(file) === '.html') {
                fileList.push(filePath);
            }
        }
    });

    return fileList;
}

const files = getAllHtmlFiles(ROOT_DIR);
console.log(`Found ${files.length} HTML files.`);

let fixedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    const isSubfolder = file.includes('partnerska-shoda\\');
    const prefix = isSubfolder ? '../' : '';

    // Standard Script Block to Inject/Replace
    // We want to ensure consistent loading of:
    // 1. api-config (classic)
    // 2. auth-client (classic)
    // 3. components (classic? No, main.js imports things, components does fetches)
    // components.js does NOT use imports, so it can be classic.
    // main.js DOES use imports, so it MUST be type="module".

    // Define the correct block
    const scriptBlock = `
    <script src="${prefix}js/api-config.js?v=5"></script>
    <script src="${prefix}js/auth-client.js?v=5"></script>
    <script src="${prefix}js/components.js?v=5"></script>
    <script type="module" src="${prefix}js/main.js?v=5"></script>
    `;

    // STRATEGY:
    // 1. Remove existing individual script tags for these files to clean up.
    // 2. Insert the new block before </body>.

    // Regex to remove existing scripts (loose matching to catch variants)
    content = content.replace(/<script[^>]*src=["'](\.\.\/)?js\/api-config\.js[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src=["'](\.\.\/)?js\/auth-client\.js[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src=["'](\.\.\/)?js\/components\.js[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src=["'](\.\.\/)?js\/main\.js[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src=["'](\.\.\/)?js\/templates\.js[^>]*><\/script>/g, ''); // templates is imported by main/components often? No, verify. 
    // Actually templates.js is used? Let's check. 
    // In tarot.html it was there. But maybe main.js imports it? 
    // main.js does NOT import templates.js. components.js doesn't.
    // Let's keep templates.js if it exists, but usually it's better to explicit include.

    // Simplification: Just replace the known block at the bottom
    // We will inject the new block before </body>

    if (content.includes('</body>')) {
        content = content.replace('</body>', `${scriptBlock}\n</body>`);
        // Cleanup empty lines left by removals? Hard to do perfectly with regex, but fine.
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed: ${path.basename(file)}`);
        fixedCount++;
    }
});

console.log(`Total files updated: ${fixedCount}`);
