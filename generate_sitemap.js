import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = 'c:\\Users\\pavel\\OneDrive\\Desktop\\MystickaHvezda';
const BASE_URL = 'https://mystickahvezda.cz';

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.gemini') {
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

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

files.forEach(file => {
    // Convert absolute path to relative URL
    let relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    
    // Priority logic
    let priority = '0.8';
    if (relativePath === 'index.html') priority = '1.0';
    if (relativePath.includes('partnerska-shoda/')) priority = '0.6';
    if (relativePath.includes('template')) return; // Skip templates
    
    const url = `${BASE_URL}/${relativePath}`;
    const lastMod = new Date().toISOString().split('T')[0];
    
    sitemapContent += `    <url>
        <loc>${url}</loc>
        <lastmod>${lastMod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${priority}</priority>
    </url>
`;
});

sitemapContent += `</urlset>`;

fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapContent, 'utf8');
console.log('✅ sitemap.xml generated successfully!');
