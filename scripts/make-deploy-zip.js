const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const targetZip = path.resolve(srcDir, '..', 'rbscriacao-v3-deploy.zip');
const tempDir = path.resolve(srcDir, '..', 'temp_deploy_staging');

console.log('Deploy packaging starting...');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

console.log('1. Exporting clean git files...');
const gitZip = path.join(tempDir, 'git_archive.zip');
execSync(`git archive -o "${gitZip}" HEAD`, { cwd: srcDir });

console.log('2. Unpacking git archive...');
execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${gitZip}' -DestinationPath '${tempDir}' -Force"`);
fs.unlinkSync(gitZip);

// Note: Do NOT copy .next directory into deploy zip!
// Hostinger cloud build pipeline (hbuilds) runs "npm install" followed by "npm run build"
// directly on its Linux container. Including a stale Windows .next directory causes EACCES permission errors.

console.log('3. Creating rbscriacao-v3-deploy.zip (clean source package for Hostinger Cloud Build)...');
if (fs.existsSync(targetZip)) fs.unlinkSync(targetZip);
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${targetZip}' -CompressionLevel Optimal"`);

console.log('5. Cleaning temp directory...');
fs.rmSync(tempDir, { recursive: true, force: true });

const stats = fs.statSync(targetZip);
console.log(`SUCCESS! Zip generated at: ${targetZip} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
