const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = path.join(__dirname, '../desktop-app/release/win-unpacked');
const destZip = path.join(__dirname, 'app.zip');

if (!fs.existsSync(sourceDir)) {
    console.error('win-unpacked folder not found! Build desktop-app first.');
    process.exit(1);
}

console.log('Zipping win-unpacked into app.zip...');
const zip = new AdmZip();
zip.addLocalFolder(sourceDir);
zip.writeZip(destZip);

console.log('app.zip created! Running electron-builder...');
execSync('npx electron-builder --win', { stdio: 'inherit' });
console.log('Build complete!');
