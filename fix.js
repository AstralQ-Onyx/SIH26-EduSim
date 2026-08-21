const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'dashboard.js');
let content = fs.readFileSync(file, 'utf8');

const marker = '// ── Start Agent Connection ────────────────────────────────\nconnectAgent();\n// Also show offline banner immediately (before WS connects)\nshowAgentBanner(false);\n';

const idx = content.indexOf(marker);

if (idx !== -1) {
    const cleanContent = content.substring(0, idx + marker.length);
    fs.writeFileSync(file, cleanContent, 'utf8');
    console.log('Successfully removed duplicate code from dashboard.js!');
} else {
    console.log('Marker not found!');
}
