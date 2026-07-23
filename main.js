const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const mc = require('minecraft-protocol');
const { generateAll } = require('./lib/imageProcessor');

app.commandLine.appendSwitch('disable-gpu-compositing');

const MC_CLIENT_ID = 'c36a9fb6-4f2a-41ff-90bd-ae7cc92031eb';

let mainWindow;

const TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');
const TEMPLATES_CACHE = path.join(app.getPath('userData'), 'templates', 'templates.json');
const TEMPLATES_BUNDLED = path.join(__dirname, 'templates', 'templates.json');
const TEMPLATES_BUNDLED_DIR = path.join(__dirname, 'templates');
const GITHUB_RAW = 'https://raw.githubusercontent.com/iraqies/MySkinArt/main/templates';

function getTemplatesPath() {
  return TEMPLATES_CACHE;
}

function readTemplates() {
  try {
    const data = JSON.parse(fs.readFileSync(getTemplatesPath(), 'utf8'));
    return data.templates || [];
  }
  catch {
    try {
      const data = JSON.parse(fs.readFileSync(TEMPLATES_BUNDLED, 'utf8'));
      return data.templates || [];
    } catch { return []; }
  }
}

function ensureTemplatesDir() {
  if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  const imgDir = path.join(TEMPLATES_DIR, 'images');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
}

function syncBundledTemplates() {
  ensureTemplatesDir();
  try {
    const bundled = JSON.parse(fs.readFileSync(TEMPLATES_BUNDLED, 'utf8'));
    const bundledTemplates = bundled.templates || [];
    for (const t of bundledTemplates) {
      const src = path.join(TEMPLATES_BUNDLED_DIR, t.filename);
      const dest = path.join(TEMPLATES_DIR, t.filename);
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (!fs.existsSync(dest)) {
        try { fs.copyFileSync(src, dest); } catch {}
      }
    }
    if (!fs.existsSync(TEMPLATES_CACHE)) {
      fs.writeFileSync(TEMPLATES_CACHE, JSON.stringify(bundled, null, 2), 'utf8');
    }
  } catch {}
}

async function syncRemoteTemplates() {
  ensureTemplatesDir();
  try {
    const json = await httpsGet('raw.githubusercontent.com', '/iraqies/MySkinArt/main/templates/templates.json');
    const remote = JSON.parse(json);
    const remoteTemplates = remote.templates || [];
    fs.writeFileSync(TEMPLATES_CACHE, JSON.stringify(remote, null, 2), 'utf8');
    for (const t of remoteTemplates) {
      const localPath = path.join(TEMPLATES_DIR, t.filename);
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      if (!fs.existsSync(localPath)) {
        try {
          const imgUrl = '/iraqies/MySkinArt/main/templates/' + t.filename.split('/').map(seg => encodeURIComponent(seg)).join('/');
          const buf = await downloadFile('https://raw.githubusercontent.com' + imgUrl);
          fs.writeFileSync(localPath, buf);
        } catch {}
      }
    }
  } catch {}
}

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'MySkinArt',
    backgroundColor: '#0f172a',
    show: false
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r') event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  syncBundledTemplates();
  syncRemoteTemplates();
  createWindow();
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── HTTP Helpers ─────────────────────────────────────────────────

function httpsPost(hostname, urlPath, bodyString, headers, allowNon2xx) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: urlPath, method: 'POST',
      headers: { 'Content-Length': Buffer.byteLength(bodyString), ...headers }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else if (allowNon2xx) resolve(data);
        else reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 200)));
      });
    });
    req.on('error', reject);
    req.write(bodyString);
    req.end();
  });
}

function httpsGet(hostname, urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: urlPath, method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 200)));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Temp File IPC ────────────────────────────────────────────────

ipcMain.handle('save-temp-buffer', async (event, { data, filename }) => {
  const tmpPath = path.join(os.tmpdir(), filename || ('myskinart_temp_' + Date.now() + '.png'));
  fs.writeFileSync(tmpPath, Buffer.from(data, 'base64'));
  return tmpPath;
});

// ── UUID / Head / Skin API ──────────────────────────────────────

ipcMain.handle('get-uuid-from-name', async (event, { username }) => {
  try {
    const data = await httpsGet('api.mojang.com', '/users/profiles/minecraft/' + encodeURIComponent(username));
    const json = JSON.parse(data);
    return { uuid: json.id, name: json.name };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('download-head', async (event, { uuid }) => {
  try {
    const buf = await downloadFile('https://mc-heads.net/avatar/' + uuid + '/128');
    return { success: true, data: buf.toString('base64') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('download-skin-texture', async (event, { uuid }) => {
  try {
    const profileData = await httpsGet('sessionserver.mojang.com', '/session/minecraft/profile/' + uuid);
    const profile = JSON.parse(profileData);
    const textureProp = profile.properties.find(p => p.name === 'textures');
    if (!textureProp) return { success: false, error: 'No texture data' };
    const decoded = JSON.parse(Buffer.from(textureProp.value, 'base64').toString('utf8'));
    const skinUrl = decoded.textures.SKIN.url;
    const skinBuf = await downloadFile(skinUrl);
    return { success: true, data: skinBuf.toString('base64') };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── Templates ───────────────────────────────────────────────────

ipcMain.handle('load-templates', async () => {
  return readTemplates();
});

ipcMain.handle('get-template-image-path', async (event, { id }) => {
  const templates = readTemplates();
  const tmpl = templates.find(t => t.id === id);
  if (!tmpl) return null;
  return path.join(TEMPLATES_DIR, tmpl.filename);
});

ipcMain.handle('get-template-image-data', async (event, { id }) => {
  const templates = readTemplates();
  const tmpl = templates.find(t => t.id === id);
  if (!tmpl) return null;
  const imgPath = path.join(TEMPLATES_DIR, tmpl.filename);
  try {
    const data = fs.readFileSync(imgPath);
    return data.toString('base64');
  } catch {
    return null;
  }
});

// ── File Dialogs ────────────────────────────────────────────────

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select 72x24 Skin Art Image',
    filters: [{ name: 'Images', extensions: ['png'] }],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-base-skin', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Base 64x64 Skin (optional)',
    filters: [{ name: 'Images', extensions: ['png'] }],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-original-skin', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Your Original Minecraft Skin (becomes #27)',
    filters: [{ name: 'Images', extensions: ['png'] }],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('generate-all', async (event, { inputPath, baseSkinPath }) => {
  const outputDir = path.join(os.tmpdir(), 'myskinart_' + Date.now());
  fs.mkdirSync(outputDir, { recursive: true });
  const generated = await generateAll(inputPath, outputDir, baseSkinPath);
  return { outputDir, skins: generated };
});

ipcMain.handle('select-export-dir', async (event, { skins }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Export Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled) return null;
  const dest = result.filePaths[0];
  for (const skin of skins) {
    const name = 'skin_' + String(skin.num).padStart(2, '0') + '.png';
    fs.copyFileSync(skin.path, path.join(dest, name));
  }
  return dest;
});

// ── Profile ─────────────────────────────────────────────────────

ipcMain.handle('fetch-profile', async (event, { bearerToken }) => {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.minecraftservices.com',
      path: '/minecraft/profile',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + bearerToken }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { const j = JSON.parse(data); resolve({ id: j.id, name: j.name }); }
          catch { reject('Failed to parse profile'); }
        } else { reject('HTTP ' + res.statusCode); }
      });
    });
    req.on('error', reject);
    req.end();
  });
});

ipcMain.handle('open-url', async (event, { url }) => {
  shell.openExternal(url);
});

// ── Device Code Auth ──────────────────────────────────────────────

ipcMain.handle('start-auth-device', async () => {
  const body = new URLSearchParams({
    client_id: MC_CLIENT_ID,
    scope: 'XboxLive.signin offline_access'
  }).toString();
  const resp = await httpsPost('login.microsoftonline.com', '/consumers/oauth2/v2.0/devicecode', body,
    { 'Content-Type': 'application/x-www-form-urlencoded' });
  const json = JSON.parse(resp);
  if (json.error) throw new Error(json.error_description || json.error);
  return {
    user_code: json.user_code, verification_uri: json.verification_uri,
    device_code: json.device_code, interval: json.interval, expires_in: json.expires_in
  };
});

ipcMain.handle('poll-auth-token', async (event, { deviceCode }) => {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    client_id: MC_CLIENT_ID,
    device_code: deviceCode
  }).toString();
  try {
    const resp = await httpsPost('login.microsoftonline.com', '/consumers/oauth2/v2.0/token', body,
      { 'Content-Type': 'application/x-www-form-urlencoded' }, true);
    const json = JSON.parse(resp);
    if (json.error) {
      if (json.error === 'authorization_pending') return { status: 'pending' };
      if (json.error === 'slow_down') return { status: 'slow_down' };
      return { status: 'error', message: json.error_description || json.error };
    }
    const bearer = await exchangeForMinecraft(json.access_token);
    return { status: 'success', bearerToken: bearer, refreshToken: json.refresh_token || null };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
});

// ── Refresh Token ─────────────────────────────────────────────────

ipcMain.handle('refresh-saved-token', async (event, { refreshToken }) => {
  try {
    const body = new URLSearchParams({
      client_id: MC_CLIENT_ID, scope: 'XboxLive.signin offline_access',
      grant_type: 'refresh_token', refresh_token: refreshToken
    }).toString();
    const resp = await httpsPost('login.microsoftonline.com', '/consumers/oauth2/v2.0/token', body,
      { 'Content-Type': 'application/x-www-form-urlencoded' }, true);
    const json = JSON.parse(resp);
    if (json.error) throw new Error(json.error_description || json.error);
    const bearer = await exchangeForMinecraft(json.access_token);
    return { success: true, bearerToken: bearer, refreshToken: json.refresh_token || refreshToken };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── NameMC Claiming ───────────────────────────────────────────────

let activeClaimClient = null;

ipcMain.handle('claim-namemc', async (event, { bearerToken, profile, server, port }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return new Promise((resolve) => {
    const serverHost = server || 'blockmania.com';
    const serverPort = port || 25565;
    const client = mc.createClient({
      host: serverHost, port: serverPort, username: profile.name,
      auth: async (client, options) => {
        client.session = { accessToken: bearerToken, selectedProfile: profile, availableProfiles: [profile] };
        client.username = profile.name;
        options.accessToken = bearerToken;
        options.haveCredentials = true;
        options.connect(client);
      },
      disableChatSigning: true
    });
    activeClaimClient = client;
    let resolved = false;

    function sendStatus(msg) {
      if (!win.isDestroyed()) event.sender.send('claim-status', { message: msg });
    }

    function extractText(msg) {
      if (typeof msg === 'string') return msg;
      if (!msg) return '';
      if (msg.text) return msg.text;
      if (msg.translate) { let out = msg.translate; if (msg.with) out += ' ' + msg.with.map(w => extractText(w)).join(' '); return out; }
      if (msg.extra) return msg.extra.map(extractText).join('');
      return '';
    }

    function handleChat(formattedMessage) {
      if (resolved) return;
      let text;
      try { text = extractText(JSON.parse(formattedMessage)); } catch { text = formattedMessage || ''; }
      const match = text.match(/https?:\/\/namemc\.com\/\S+/);
      if (match) {
        resolved = true;
        sendStatus('Link received!');
        client.end();
        resolve({ success: true, url: match[0] });
      }
    }

    client.on('systemChat', (data) => handleChat(data.formattedMessage));
    client.on('playerChat', (data) => handleChat(data.formattedMessage));
    client.on('playerJoin', () => {
      sendStatus('Joined server, waiting...');
      setTimeout(() => { sendStatus('Typing /namemc...'); client.chat('/namemc'); }, 2000);
      setTimeout(() => { if (!resolved) { resolved = true; client.end(); resolve({ success: false, error: 'Timeout (15s)' }); } }, 15000);
    });
    client.on('disconnect', () => { if (!resolved) { resolved = true; sendStatus('Disconnected'); resolve({ success: false, error: 'Disconnected' }); } });
    client.on('error', (err) => { if (!resolved) { resolved = true; sendStatus('Error: ' + err.message); resolve({ success: false, error: err.message }); } });
    client.on('end', () => { activeClaimClient = null; });
    setTimeout(() => { if (!resolved) { resolved = true; client.end(); resolve({ success: false, error: 'Global timeout (5 min)' }); } }, 300000);
  });
});

ipcMain.handle('cancel-claim', async () => {
  if (activeClaimClient) { try { activeClaimClient.end(); } catch {} activeClaimClient = null; }
  return true;
});

// ── Xbox / Minecraft Auth Chain ──────────────────────────────────

async function exchangeForMinecraft(msToken) {
  const TIMEOUT_MS = 30000;
  const post = (hostname, urlPath, body) => new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname, path: urlPath, method: 'POST', timeout: TIMEOUT_MS, headers: {
      'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(b)
    }}, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request to ' + hostname + ' timed out')); });
    req.on('error', reject);
    req.write(b);
    req.end();
  });

  const xbl = await post('user.auth.xboxlive.com', '/user/authenticate', {
    RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT',
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: 'd=' + msToken }
  });
  if (xbl.error) throw new Error('Xbox Live auth failed: ' + (xbl.error_description || xbl.error));
  if (!xbl.Token) throw new Error('Xbox Live auth failed: no token in response');

  const xsts = await post('xsts.auth.xboxlive.com', '/xsts/authorize', {
    RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT',
    Properties: { SandboxId: 'RETAIL', UserTokens: [xbl.Token] }
  });
  if (xsts.error) throw new Error('XSTS auth failed: ' + (xsts.error_description || xsts.error));
  if (!xsts.Token) throw new Error('XSTS auth failed: no token in response');

  const mcAuth = await post('api.minecraftservices.com', '/authentication/login_with_xbox', {
    identityToken: 'XBL3.0 x=' + xbl.DisplayClaims.xui[0].uhs + ';' + xsts.Token
  });
  if (mcAuth.error) throw new Error('Minecraft auth failed: ' + (mcAuth.error_description || mcAuth.error));
  if (!mcAuth.access_token) throw new Error('Minecraft auth failed: no access_token in response');
  return mcAuth.access_token;
}

// ── Skin Upload ──────────────────────────────────────────────────

ipcMain.handle('upload-one-skin', async (event, { bearerToken, skinPath }) => {
  try {
    await uploadOneSkin(bearerToken, skinPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message, statusCode: err.statusCode };
  }
});

function uploadOneSkin(bearer, skinPath) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
    const fileBuffer = fs.readFileSync(skinPath);
    const bodyParts = [];
    bodyParts.push('--' + boundary + '\r\nContent-Disposition: form-data; name="variant"\r\n\r\nclassic');
    bodyParts.push('--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="skin.png"\r\nContent-Type: image/png\r\n\r\n');
    const bodyText = bodyParts.join('\r\n');
    const bodyEnd = '\r\n--' + boundary + '--\r\n';
    const bodyBuffer = Buffer.concat([Buffer.from(bodyText, 'utf-8'), fileBuffer, Buffer.from(bodyEnd, 'utf-8')]);
    const req = https.request({
      hostname: 'api.minecraftservices.com', path: '/minecraft/profile/skins', method: 'POST',
      headers: { 'Authorization': 'Bearer ' + bearer,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': bodyBuffer.length }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else {
          let errMsg;
          try {
            const j = JSON.parse(data);
            errMsg = j.error || j.message || j.errorType || '';
          } catch { errMsg = ''; }
          if (!errMsg) errMsg = 'HTTP ' + res.statusCode;
          const e = new Error(errMsg);
          e.statusCode = res.statusCode;
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ── Account Persistence ─────────────────────────────────────────

function getAccountsPath() { return path.join(app.getPath('userData'), 'accounts.json'); }

function readAccounts() {
  try { return JSON.parse(fs.readFileSync(getAccountsPath(), 'utf8')); }
  catch { return []; }
}

function writeAccounts(accounts) {
  fs.writeFileSync(getAccountsPath(), JSON.stringify(accounts, null, 2), 'utf8');
}

ipcMain.handle('load-accounts', async () => readAccounts());

ipcMain.handle('save-account', async (event, { ign, uuid, refreshToken }) => {
  const accounts = readAccounts();
  const idx = accounts.findIndex(a => a.ign === ign);
  const entry = { ign };
  if (uuid) entry.uuid = uuid;
  if (refreshToken) entry.refreshToken = refreshToken;
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...entry };
  else accounts.push(entry);
  writeAccounts(accounts);
  return accounts;
});

ipcMain.handle('delete-account', async (event, { ign }) => {
  const accounts = readAccounts().filter(a => a.ign !== ign);
  writeAccounts(accounts);
  return accounts;
});
