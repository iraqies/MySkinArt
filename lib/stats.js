const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

const GITHUB_REPO = 'iraqies/MySkinArt';
const RATE_LIMITS = {
  launch: 24 * 60 * 60 * 1000,
  template_used: 5 * 60 * 1000
};

let _config = null;
let _deviceId = null;
let _rateLimits = {};
let _configPath = null;
let _ratePath = null;
let _deviceIdPath = null;

function init(userDataPath) {
  _configPath = path.join(__dirname, '..', 'firebase-config.json');
  _ratePath = path.join(userDataPath, 'stats-ratelimit.json');
  _deviceIdPath = path.join(userDataPath, 'device-id.txt');
  loadConfig();
  loadRateLimits();
}

function loadConfig() {
  try {
    _config = JSON.parse(fs.readFileSync(_configPath, 'utf8'));
    if (!_config.projectId || _config.projectId.includes('YOUR_')) _config = null;
  } catch { _config = null; }
}

function loadRateLimits() {
  try { _rateLimits = JSON.parse(fs.readFileSync(_ratePath, 'utf8')); }
  catch { _rateLimits = {}; }
}

function saveRateLimits() {
  try { fs.writeFileSync(_ratePath, JSON.stringify(_rateLimits, null, 2), 'utf8'); }
  catch {}
}

function isRateLimited(eventType) {
  const last = _rateLimits[eventType];
  if (!last) return false;
  return (Date.now() - last) < RATE_LIMITS[eventType];
}

function markEvent(eventType) {
  _rateLimits[eventType] = Date.now();
  saveRateLimits();
}

function getDeviceId() {
  if (_deviceId) return _deviceId;
  try {
    if (fs.existsSync(_deviceIdPath)) {
      _deviceId = fs.readFileSync(_deviceIdPath, 'utf8').trim();
      if (_deviceId) return _deviceId;
    }
  } catch {}
  try {
    const result = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: 'utf8', timeout: 5000 }
    );
    const match = result.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
    if (match && match[1]) {
      _deviceId = crypto.createHash('sha256').update(match[1]).digest('hex').slice(0, 32);
      try { fs.writeFileSync(_deviceIdPath, _deviceId, 'utf8'); } catch {}
      return _deviceId;
    }
  } catch {}
  const fallback = crypto.createHash('sha256')
    .update(os.hostname() + (os.cpus()[0] || {}).model + os.totalmem())
    .digest('hex').slice(0, 32);
  _deviceId = fallback;
  try { fs.writeFileSync(_deviceIdPath, _deviceId, 'utf8'); } catch {}
  return _deviceId;
}

function firestoreGet(docPath) {
  return new Promise((resolve) => {
    if (!_config) return resolve(null);
    const urlPath = '/v1/projects/' + _config.projectId + '/databases/(default)/documents/' + docPath + '?key=' + _config.apiKey;
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        } else { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function firestoreUpdate(docPath, fields) {
  return new Promise((resolve) => {
    if (!_config) return resolve(false);
    const urlPath = '/v1/projects/' + _config.projectId + '/databases/(default)/documents/' + docPath + '?key=' + _config.apiKey;
    const body = JSON.stringify({ fields });
    const mask = Object.keys(fields).map(k => 'updateMask.path=' + k).join('&');
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath + '&' + mask,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

function firestoreCreate(docPath, fields) {
  return new Promise((resolve) => {
    if (!_config) return resolve(false);
    const urlPath = '/v1/projects/' + _config.projectId + '/databases/(default)/documents/' + docPath + '?key=' + _config.apiKey;
    const body = JSON.stringify({ fields });
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
    req.write(body);
    req.end();
  });
}

function parseFirestoreInt(val) {
  if (!val) return 0;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10) || 0;
  return 0;
}

async function incrementCounter(docPath, field) {
  try {
    const doc = await firestoreGet(docPath);
    let current = 0;
    if (doc && doc.fields && doc.fields[field]) {
      current = parseFirestoreInt(doc.fields[field]);
    }
    const updateFields = {};
    updateFields[field] = { integerValue: current + 1 };
    if (doc && doc.fields) {
      return await firestoreUpdate(docPath, updateFields);
    } else {
      return await firestoreCreate(docPath, updateFields);
    }
  } catch { return false; }
}

function trackLaunch() {
  if (isRateLimited('launch')) return Promise.resolve(false);
  markEvent('launch');
  const deviceId = getDeviceId();
  return incrementCounter('stats/global', 'launches').then(ok => {
    return firestoreGet('stats/devices/' + deviceId).then(doc => {
      if (doc && doc.fields) return ok;
      return incrementCounter('stats/global', 'unique_users').then(() => {
        return firestoreCreate('stats/devices/' + deviceId, { counted: { integerValue: 1 } }).then(() => ok);
      });
    }).then(() => ok);
  }).catch(() => false);
}

function trackTemplateUsed(templateId) {
  if (isRateLimited('template_used')) return Promise.resolve(false);
  markEvent('template_used');
  return incrementCounter('stats/global', 'template_uses').then(ok => {
    return incrementCounter('stats/templates/' + templateId, 'downloads');
  }).then(() => true).catch(() => false);
}

function fetchGitHubDownloads() {
  return new Promise((resolve) => {
    const urlPath = '/repos/' + GITHUB_REPO + '/releases';
    const req = https.request({
      hostname: 'api.github.com',
      path: urlPath,
      method: 'GET',
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'MySkinArt-App' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const releases = JSON.parse(data);
            let total = 0;
            for (const r of releases) {
              for (const a of (r.assets || [])) total += a.download_count || 0;
            }
            resolve(total);
          } catch { resolve(0); }
        } else { resolve(0); }
      });
    });
    req.on('error', () => resolve(0));
    req.setTimeout(10000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

function fetchGlobalStats() {
  return firestoreGet('stats/global').then(doc => {
    if (!doc || !doc.fields) return null;
    return {
      launches: parseFirestoreInt(doc.fields.launches),
      unique_users: parseFirestoreInt(doc.fields.unique_users),
      template_uses: parseFirestoreInt(doc.fields.template_uses)
    };
  }).catch(() => null);
}

function fetchTemplateStats() {
  return new Promise((resolve) => {
    if (!_config) return resolve({});
    const urlPath = '/v1/projects/' + _config.projectId + '/databases/(default)/documents/stats/templates?key=' + _config.apiKey;
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            const result = {};
            if (json.documents) {
              for (const doc of json.documents) {
                const parts = doc.name.split('/');
                const templateId = parts[parts.length - 1];
                if (doc.fields && doc.fields.downloads) {
                  result[templateId] = parseFirestoreInt(doc.fields.downloads);
                }
              }
            }
            resolve(result);
          } catch { resolve({}); }
        } else { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.setTimeout(8000, () => { req.destroy(); resolve({}); });
    req.end();
  });
}

module.exports = {
  init,
  getDeviceId,
  trackLaunch,
  trackTemplateUsed,
  fetchGitHubDownloads,
  fetchGlobalStats,
  fetchTemplateStats
};
