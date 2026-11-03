const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const srcDir = path.resolve(__dirname, '..');
const targetZip = path.resolve(srcDir, '..', 'rbscriacao-v3-deploy.zip');

console.log('Deploy packaging starting...');

// 1. Generate clean zip directly with git archive (ensures clean POSIX forward slashes)
console.log('1. Exporting clean git archive...');
if (fs.existsSync(targetZip)) fs.unlinkSync(targetZip);
execSync(`git archive -o "${targetZip}" HEAD`, { cwd: srcDir });

// 2. Post-process ZIP central directory to inject strict UNIX permissions:
//    - osMadeBy = 3 (UNIX)
//    - Directories = 0o040755 (drwxr-xr-x)
//    - Regular files = 0o100644 (-rw-r--r--)
// This prevents EACCES (permission denied) during Linux cloud builds (Hostinger hbuilds).
console.log('2. Injecting POSIX mode bits (0755 dirs, 0644 files)...');
const buf = fs.readFileSync(targetZip);
let idx = 0;
let modified = 0;
while ((idx = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), idx)) !== -1) {
  const nameLen = buf.readUInt16LE(idx + 28);
  const extraLen = buf.readUInt16LE(idx + 30);
  const commentLen = buf.readUInt16LE(idx + 32);
  const name = buf.toString('utf8', idx + 46, idx + 46 + nameLen);

  // Set host OS to UNIX (3)
  buf.writeUInt8(3, idx + 5);

  if (name.endsWith('/')) {
    // Directory: Unix mode 040755 (drwxr-xr-x)
    const val = (0o040755 * 65536) + 0x10;
    buf.writeUInt32LE(val, idx + 38);
  } else {
    // File: Unix mode 0100644 (-rw-r--r--)
    const isExec = name.endsWith('.sh') || name.startsWith('scripts/');
    const mode = isExec ? 0o100755 : 0o100644;
    const val = mode * 65536;
    buf.writeUInt32LE(val, idx + 38);
  }

  modified++;
  idx += 46 + nameLen + extraLen + commentLen;
}

fs.writeFileSync(targetZip, buf);

// Clean temporary test file if present
const testZip = path.resolve(srcDir, '..', 'test-git.zip');
const testUnix = path.resolve(srcDir, '..', 'test-unix.zip');
if (fs.existsSync(testZip)) fs.unlinkSync(testZip);
if (fs.existsSync(testUnix)) fs.unlinkSync(testUnix);

const stats = fs.statSync(targetZip);
console.log(`SUCCESS! Zip generated at: ${targetZip} (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${modified} Unix-compliant entries)`);
