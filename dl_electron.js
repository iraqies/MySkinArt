const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function download(url, dest, follow) {
  if (follow === undefined) follow = true;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (follow && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        console.log('Redirect to:', res.headers.location);
        return download(res.headers.location, dest, true).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        return reject(new Error('HTTP ' + res.statusCode));
      }
      const total = parseInt(res.headers['content-length'], 10);
      let downloaded = 0;
      const start = Date.now();
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        const pct = total ? (downloaded / total * 100).toFixed(1) : '?';
        const elapsed = (Date.now() - start) / 1000;
        const speed = downloaded / 1024 / 1024 / (elapsed || 1);
        const remaining = total ? ((total - downloaded) / 1024 / 1024 / (speed || 0.01)).toFixed(0) : '?';
        process.stdout.write(`\r${pct}% (${(downloaded/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)} MB) ${speed.toFixed(1)} MB/s ETA ${remaining}s`);
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve();
      });
    }).on('error', (e) => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      reject(e);
    });
  });
}

const destDir = path.join(__dirname, 'node_modules', 'electron', 'dist');
const dest = path.join(destDir, 'electron.zip');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

const url = 'https://cdn.npmmirror.com/binaries/electron/28.3.3/electron-v28.3.3-win32-x64.zip';
console.log('Downloading electron v28.3.3 from npmmirror CDN...');

download(url, dest, true).then(() => {
  console.log('Extracting...');
  const { execSync } = require('child_process');
  execSync(`tar -xf "${dest}" -C "${destDir}"`, { stdio: 'inherit' });
  fs.unlinkSync(dest);
  console.log('Electron installed successfully!');
}).catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
