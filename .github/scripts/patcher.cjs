const fs = require('fs');
const path = require('path');

const spicySrc = path.join(__dirname, '../../spicy-lyrics/src');
const appTsxPath = path.join(spicySrc, 'app.tsx');
const brdSourcePath = path.join(__dirname, 'brd.js');
const brdDestPath = path.join(spicySrc, 'brd.js');

console.log('[Patcher] Starting auto-patcher...');

// 1. Copy the Beautiful Release Date core script to the src folder
fs.copyFileSync(brdSourcePath, brdDestPath);
console.log('[Patcher] Copied brd.js to spicy-lyrics/src/');

// 2. Inject the import into app.tsx so it gets bundled together!
let appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

if (!appTsxContent.includes('import "./brd.js"')) {
    // We want to run our script after the main app is initialized. 
    // Appending it to the end of the file ensures it hooks in perfectly.
    appTsxContent += '\n\n// --- Injected by Beautiful Release Date Patcher ---\n';
    appTsxContent += 'import "./brd.js";\n';
    
    fs.writeFileSync(appTsxPath, appTsxContent);
    console.log('[Patcher] Successfully injected import into app.tsx');
} else {
    console.log('[Patcher] app.tsx is already patched.');
}

console.log('[Patcher] Done!');
