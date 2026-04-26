import fs from 'fs';
import path from 'path';

const cssPath = path.resolve('css/style.v2.min.css');
let css = fs.readFileSync(cssPath, 'utf8');

// The weird characters are caused by reading a UTF-8 file as something else or vice versa in previous steps.
// Let's replace the problematic checkmark characters with standard CSS content codes or real UTF-8 checkmarks.
// Commonly: 'âœ”' or 'âš!' etc.
css = css.replace(/content:\s*['"][^'"]*['"]/g, match => {
    // If the content is visibly corrupted (contains 'â')
    if (match.includes('â')) {
        return 'content:"\\2714"';
    }
    return match;
});

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Znaky v CSS byly úspěšně opraveny na správné unicode.');
