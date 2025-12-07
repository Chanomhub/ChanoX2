const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../web-build/index.html');

if (!fs.existsSync(indexPath)) {
    console.error('Error: dist/index.html not found');
    process.exit(1);
}

let content = fs.readFileSync(indexPath, 'utf8');

// Replace absolute paths with relative paths
// Expo Web exports with /_expo/ and /assets/ by default
content = content.replace(/"\/_expo\//g, '"./_expo/');
content = content.replace(/"\/assets\//g, '"./assets/');

// Also handle any other root-relative paths if necessary
// content = content.replace(/(href|src)="\//g, '$1="./'); 

fs.writeFileSync(indexPath, content);

console.log('Successfully updated paths in dist/index.html for Electron compatibility.');
