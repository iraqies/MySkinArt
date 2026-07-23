let state = {
  inputPath: null,
  baseSkinPath: null,
  originalSkinPath: null,
  originalSkinHead: null,
  lastTileDataUrl: null,
  skins: [],
  bearerToken: null,
  refreshToken: null,
  ign: null,
  uuid: null,
  pollTimer: null,
  uploadRunning: false,
  claiming: false,
  templates: [],
  tileData: {},
  activeFilter: 'all'
};

const dom = {
  inputName: document.getElementById('input-name'),
  baseName: document.getElementById('base-name'),
  originalName: document.getElementById('original-name'),
  inputZone: document.getElementById('input-zone'),
  baseZone: document.getElementById('base-zone'),
  originalZone: document.getElementById('original-zone'),
  previewWrapper: document.getElementById('preview-wrapper'),
  btnGenerate: document.getElementById('btn-generate'),
  stepUpload: document.getElementById('step-upload'),
  stepDone: document.getElementById('step-done'),
  btnStart: document.getElementById('btn-start-upload'),
  btnExport: document.getElementById('btn-export'),
  uploadGrid: document.getElementById('upload-grid'),
  uploadLog: document.getElementById('upload-log'),
  confirmArea: document.getElementById('confirm-area'),
  confirmNum: document.getElementById('confirm-num'),
  confirmHead: document.getElementById('confirm-head'),
  btnNextSkin: document.getElementById('btn-next-skin'),
  btnSkipWait: document.getElementById('btn-skip-wait'),
  pollStatus: document.getElementById('poll-status'),
  pollText: document.getElementById('poll-text'),
  btnRestart: document.getElementById('btn-restart'),
  templatesGrid: document.getElementById('templates-grid'),
  accountArea: document.getElementById('account-area'),
  btnSignin: document.getElementById('btn-signin'),
  signinModal: document.getElementById('signin-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnAuthStart: document.getElementById('btn-auth-start'),
  deviceCodeArea: document.getElementById('device-code-area'),
  dcUri: document.getElementById('dc-uri'),
  dcCode: document.getElementById('dc-code'),
  dcStatus: document.getElementById('dc-status'),
  dcSpinner: document.getElementById('dc-spinner'),
  savedAccountsSection: document.getElementById('saved-accounts-section'),
  savedAccountsList: document.getElementById('saved-accounts-list'),
  accountDropdown: document.getElementById('account-dropdown'),
  ddHead: document.getElementById('dd-head'),
  ddName: document.getElementById('dd-name'),
  ddUuid: document.getElementById('dd-uuid'),
  ddNamemc: document.getElementById('dd-namemc'),
  ddClaim: document.getElementById('dd-claim'),
  ddClaimArea: document.getElementById('dd-claim-area'),
  ddClaimGo: document.getElementById('dd-claim-go'),
  ddClaimResult: document.getElementById('dd-claim-result'),
  ddClaimStatus: document.getElementById('dd-claim-status'),
  ddClaimLink: document.getElementById('dd-claim-link'),
  ddSwitch: document.getElementById('dd-switch'),
  ddLogout: document.getElementById('dd-logout'),
  claimModal: document.getElementById('claim-modal'),
  btnCloseClaimModal: document.getElementById('btn-close-claim-modal'),
  claimServerHost: document.getElementById('claim-server-host'),
  claimServerPort: document.getElementById('claim-server-port'),
  btnClaimGo: document.getElementById('btn-claim-go'),
  claimResultArea: document.getElementById('claim-result-area'),
  claimSpinner: document.getElementById('claim-spinner'),
  claimStatus: document.getElementById('claim-status'),
  claimLink: document.getElementById('claim-link')
};

// ── Tab Switching ────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Template Filter ──────────────────────────────────────────────

const filterAllBtn = document.getElementById('filter-all');
const filterTags = document.getElementById('filter-tags');

function updateFilterTags() {
  const allCats = ['nature', 'flag', 'cape', 'anime'];
  const allActive = state.activeFilter === 'all';
  filterAllBtn.classList.toggle('active', allActive);
  filterTags.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.toggle('active', state.activeFilter === tag.dataset.filter);
  });
}

filterAllBtn.addEventListener('click', () => {
  state.activeFilter = 'all';
  updateFilterTags();
  renderTemplates();
});

filterTags.querySelectorAll('.filter-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    state.activeFilter = tag.dataset.filter;
    updateFilterTags();
    renderTemplates();
  });
});

updateFilterTags();

// ── File Selection ───────────────────────────────────────────────

dom.inputZone.querySelector('#select-input').addEventListener('click', async () => {
  const p = await window.electronAPI.selectImage();
  if (p) {
    state.inputPath = p;
    dom.inputName.textContent = p.split('\\').pop();
    dom.inputZone.classList.add('has-file');
    updateGenerateBtn();
    renderPreview();
  }
});

dom.baseZone.querySelector('#select-base').addEventListener('click', async () => {
  const p = await window.electronAPI.selectBaseSkin();
  if (p) {
    state.baseSkinPath = p;
    dom.baseName.textContent = p.split('\\').pop();
    dom.baseZone.classList.add('has-file');
  } else {
    state.baseSkinPath = null;
    dom.baseName.textContent = 'None';
    dom.baseZone.classList.remove('has-file');
  }
});

dom.originalZone.querySelector('#select-original').addEventListener('click', async () => {
  const p = await window.electronAPI.selectOriginalSkin();
  if (p) {
    setOriginalSkin(p, p.split('\\').pop());
  } else {
    clearOriginalSkin();
  }
});

function setOriginalSkin(filePath, displayName) {
  state.originalSkinPath = filePath;
  state.originalSkinHead = null;
  dom.originalName.textContent = displayName + ' -> #27';
  dom.originalZone.classList.add('has-file');
  const img = new Image();
  img.src = 'file://' + filePath + '#' + Date.now();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);
    state.originalSkinHead = c.toDataURL();
    updateCell27();
    updatePreviewCell27();
  };
}

function clearOriginalSkin() {
  state.originalSkinPath = null;
  state.originalSkinHead = null;
  dom.originalName.textContent = 'Defaults to last tile from art';
  dom.originalZone.classList.remove('has-file');
  updateCell27();
  updatePreviewCell27();
}

function updatePreviewCell27() {
  const cells = dom.previewWrapper.querySelectorAll('.preview-cell');
  if (cells.length < 27) return;
  const cell27 = cells[0];
  if (!cell27) return;
  const img = cell27.querySelector('img');
  const label = cell27.querySelector('.pl');
  if (state.originalSkinHead && img) {
    img.src = state.originalSkinHead;
    if (label) { label.textContent = 'FACE'; label.className = 'pl'; }
  } else if (state.lastTileDataUrl && img) {
    img.src = state.lastTileDataUrl;
    if (label) { label.textContent = '27'; label.className = 'pl'; }
  } else if (state.tileData && state.tileData[27] && img) {
    img.src = state.tileData[27];
    if (label) { label.textContent = '27'; label.className = 'pl'; }
  } else if (img) {
    img.src = '';
    if (label) { label.textContent = ''; label.className = 'pl'; }
  }
}

function updateGenerateBtn() {
  dom.btnGenerate.disabled = !state.inputPath;
}

// ── Generate ─────────────────────────────────────────────────────

dom.btnGenerate.addEventListener('click', async () => {
  dom.btnGenerate.disabled = true;
  dom.btnGenerate.textContent = 'Generating...';
  try {
    const result = await window.electronAPI.generateAll({
      inputPath: state.inputPath,
      baseSkinPath: state.baseSkinPath,
      originalSkinPath: state.originalSkinPath
    });
    state.skins = result.skins;
    state.outputDir = result.outputDir;
    switchToUpload();
  } catch (e) {
    alert('Error: ' + e.message);
  }
  dom.btnGenerate.textContent = 'Generate Skins';
  dom.btnGenerate.disabled = false;
});

function switchToUpload() {
  document.getElementById('tab-create').classList.remove('active');
  document.getElementById('tab-templates').classList.remove('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-buttons').style.display = 'none';
  dom.stepUpload.classList.add('active');
  setupGrid();
  dom.btnExport.disabled = false;
  dom.btnStart.disabled = false;
  dom.btnStart.textContent = 'Start Upload';
}

// ── Templates ────────────────────────────────────────────────────

async function loadTemplates() {
  state.templates = await window.electronAPI.loadTemplates();
  renderTemplates();
}

function renderTemplates() {
  if (!state.templates.length) {
    dom.templatesGrid.innerHTML = '<p class="templates-empty">No templates available.</p>';
    return;
  }
  const filtered = state.activeFilter === 'all'
    ? state.templates
    : state.templates.filter(t => t.category === state.activeFilter);
  if (!filtered.length) {
    dom.templatesGrid.innerHTML = '<p class="templates-empty">No templates in this category.</p>';
    return;
  }
  dom.templatesGrid.innerHTML = '';
  for (const t of filtered) {
    const card = document.createElement('div');
    card.className = 'template-card';
    const headUrl = t.uuid ? 'https://mc-heads.net/avatar/' + t.uuid + '/64?t=' + Date.now() : '';
    card.innerHTML =
      '<div class="template-preview" id="tpl-preview-' + t.id + '"></div>' +
      '<div class="template-card-header">' +
        (headUrl ? '<img class="template-card-head" src="' + headUrl + '" alt="">' : '') +
        '<div class="template-card-info">' +
          '<div class="template-card-name">' + escHtml(t.name) + '</div>' +
          (t.uploader ? '<div class="template-card-uploader">by ' + escHtml(t.uploader) + '</div>' : '') +
        '</div>' +
      '</div>';

    card.addEventListener('click', async () => {
      const imgPath = await window.electronAPI.getTemplateImagePath({ id: t.id });
      if (imgPath) {
        state.inputPath = imgPath;
        dom.inputName.textContent = t.name;
        dom.inputZone.classList.add('has-file');
        updateGenerateBtn();
        renderPreview();
        document.querySelector('[data-tab="create"]').click();
      }
    });

    dom.templatesGrid.appendChild(card);

    window.electronAPI.getTemplateImageData({ id: t.id }).then(data => {
      if (data) {
        const previewEl = document.getElementById('tpl-preview-' + t.id);
        if (previewEl) {
          previewEl.innerHTML = '<img src="data:image/png;base64,' + data + '" alt="' + escHtml(t.name) + '">';
        }
      }
    });
  }
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Account Area / Auth ──────────────────────────────────────────

async function updateAccountArea() {
  if (state.ign && state.uuid) {
    const avatar = await window.electronAPI.fetchAvatar({ id: state.uuid });
    const src = avatar.success ? avatar.dataUrl : '';
    dom.accountArea.innerHTML =
      '<div class="account-pill" id="account-pill">' +
        '<img class="account-head" src="' + src + '" alt="">' +
        '<span class="account-name">' + escHtml(state.ign) + '</span>' +
        '<span class="account-arrow">&#9662;</span>' +
      '</div>';
    document.getElementById('account-pill').addEventListener('click', toggleDropdown);
    dom.ddHead.src = src;
    dom.ddName.textContent = state.ign;
    dom.ddUuid.textContent = state.uuid;
  } else {
    dom.accountArea.innerHTML = '<button id="btn-signin" class="btn-signin">Sign in</button>';
    document.getElementById('btn-signin').addEventListener('click', openSigninModal);
  }
}

function toggleDropdown() {
  const dd = dom.accountDropdown;
  if (dd.style.display === 'none' || !dd.style.display) {
    const pill = document.getElementById('account-pill');
    const rect = pill.getBoundingClientRect();
    dd.style.display = 'block';
    dd.style.right = (window.innerWidth - rect.right) + 'px';
    dd.style.top = rect.bottom + 4 + 'px';
  } else {
    dd.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  if (!dom.accountDropdown.contains(e.target) && !e.target.closest('.account-pill')) {
    dom.accountDropdown.style.display = 'none';
  }
});

function openSigninModal() {
  dom.signinModal.style.display = 'flex';
  dom.deviceCodeArea.style.display = 'none';
  dom.dcSpinner.style.display = 'none';
  dom.dcStatus.textContent = '';
  dom.btnAuthStart.disabled = false;
  dom.btnAuthStart.textContent = 'Start Sign In';
  refreshSavedAccountsList();
}

dom.btnCloseModal.addEventListener('click', () => { dom.signinModal.style.display = 'none'; });
dom.signinModal.addEventListener('click', (e) => { if (e.target === dom.signinModal) dom.signinModal.style.display = 'none'; });

dom.btnAuthStart.addEventListener('click', async () => {
  dom.btnAuthStart.disabled = true;
  dom.btnAuthStart.textContent = 'Starting...';
  try {
    const dc = await window.electronAPI.startAuthDevice();
    dom.deviceCodeArea.style.display = 'block';
    dom.dcSpinner.style.display = 'block';
    dom.dcUri.textContent = dc.verification_uri;
    dom.dcUri.href = dc.verification_uri;
    dom.dcCode.textContent = dc.user_code;
    dom.dcStatus.textContent = 'Waiting for you to sign in...';
    dom.dcStatus.style.color = '';
    dom.btnAuthStart.textContent = 'Sign in with Microsoft';
    dom.btnAuthStart.disabled = true;
    pollDeviceCode(dc.device_code, dc.interval * 1000);
  } catch (e) {
    dom.dcStatus.textContent = 'Error: ' + e.message;
    dom.dcStatus.style.color = '#FF5555';
    dom.btnAuthStart.textContent = 'Start Sign In';
    dom.btnAuthStart.disabled = false;
    dom.dcSpinner.style.display = 'none';
  }
});

function pollDeviceCode(deviceCode, interval) {
  if (state.pollTimer) clearTimeout(state.pollTimer);
  async function tick() {
    try {
      const result = await window.electronAPI.pollAuthToken({ deviceCode });
      if (result.status === 'success') {
        state.bearerToken = result.bearerToken;
        state.refreshToken = result.refreshToken || null;
        dom.dcSpinner.style.display = 'none';
        dom.dcStatus.textContent = 'Signed in!';
        dom.dcStatus.style.color = '#55FF55';
        await fetchProfile();
        dom.signinModal.style.display = 'none';
        return;
      }
      if (result.status === 'error') {
        dom.dcSpinner.style.display = 'none';
        dom.dcStatus.textContent = 'Error: ' + result.message;
        dom.dcStatus.style.color = '#FF5555';
        dom.btnAuthStart.disabled = false;
        return;
      }
      if (result.status === 'slow_down') interval = Math.min(interval + 5000, 30000);
      state.pollTimer = setTimeout(tick, interval);
    } catch (e) {
      dom.dcSpinner.style.display = 'none';
      dom.dcStatus.textContent = 'Error: ' + e.message;
      dom.dcStatus.style.color = '#FF5555';
      dom.btnAuthStart.disabled = false;
    }
  }
  state.pollTimer = setTimeout(tick, interval);
}

async function fetchProfile() {
  try {
    const profile = await window.electronAPI.fetchProfile({ bearerToken: state.bearerToken });
    state.ign = profile.name;
    state.uuid = profile.id;
    await window.electronAPI.saveAccount({
      ign: profile.name, uuid: profile.id, refreshToken: state.refreshToken
    });
    await updateAccountArea();
    autoDetectOriginalSkin();
  } catch (e) {
    state.ign = null;
    state.uuid = null;
  }
}

async function autoDetectOriginalSkin() {
  if (!state.uuid) return;
  if (state.originalSkinPath) return;
  try {
    const result = await window.electronAPI.downloadSkinTexture({ uuid: state.uuid });
    if (result.success) {
      const tmpPath = await window.electronAPI.saveTempBuffer({
        data: result.data,
        filename: 'myskinart_original_' + Date.now() + '.png'
      });
      state.originalSkinPath = tmpPath;
      dom.originalName.textContent = state.ign + ' (current skin) -> #27';
      dom.originalZone.classList.add('has-file');
      const img = new Image();
      img.src = 'data:image/png;base64,' + result.data;
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 8; c.height = 8;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);
        state.originalSkinHead = c.toDataURL();
        updateCell27();
        updatePreviewCell27();
      };
      img.onerror = () => {
        state.originalSkinHead = 'https://mc-heads.net/avatar/' + state.uuid + '/64?t=' + Date.now();
        updateCell27();
        updatePreviewCell27();
      };
    }
  } catch {}
}

// ── Saved Accounts List ──────────────────────────────────────────

async function refreshSavedAccountsList() {
  const accounts = await window.electronAPI.loadAccounts();
  if (!accounts.length) {
    dom.savedAccountsSection.style.display = 'none';
    return;
  }
  dom.savedAccountsSection.style.display = '';
  dom.savedAccountsList.innerHTML = '';
  const avatars = await Promise.all(
    accounts.map(a => window.electronAPI.fetchAvatar({ id: a.uuid || a.ign }))
  );
  for (let i = 0; i < accounts.length; i++) {
    const acct = accounts[i];
    const row = document.createElement('div');
    row.className = 'saved-account-row';
    const src = avatars[i].success ? avatars[i].dataUrl : '';
    row.innerHTML =
      '<img class="saved-head" src="' + src + '" alt="">' +
      '<span class="saved-name">' + escHtml(acct.ign) + '</span>' +
      '<button class="btn-load-acct" data-ign="' + escHtml(acct.ign) + '">Load</button>' +
      '<button class="btn-remove-acct" data-ign="' + escHtml(acct.ign) + '">&times;</button>';
    row.querySelector('.btn-load-acct').addEventListener('click', async (e) => {
      const ign = e.target.dataset.ign;
      await loadSavedAccount(ign);
    });
    row.querySelector('.btn-remove-acct').addEventListener('click', async (e) => {
      const ign = e.target.dataset.ign;
      await window.electronAPI.deleteAccount({ ign });
      if (state.ign === ign) {
        state.bearerToken = null; state.refreshToken = null; state.ign = null; state.uuid = null;
        await updateAccountArea();
      }
      refreshSavedAccountsList();
    });
    dom.savedAccountsList.appendChild(row);
  }
}

async function loadSavedAccount(ign) {
  const accounts = await window.electronAPI.loadAccounts();
  const acct = accounts.find(a => a.ign === ign);
  if (!acct || !acct.refreshToken) return;

  dom.dcSpinner.style.display = 'block';
  dom.deviceCodeArea.style.display = 'block';
  dom.dcStatus.textContent = 'Refreshing token for ' + ign + '...';
  dom.dcStatus.style.color = '';
  try {
    const result = await window.electronAPI.refreshSavedToken({ refreshToken: acct.refreshToken });
    if (result.success) {
      state.bearerToken = result.bearerToken;
      state.refreshToken = result.refreshToken;
      state.ign = acct.ign;
      state.uuid = acct.uuid || null;
      await window.electronAPI.saveAccount({
        ign: acct.ign, uuid: acct.uuid, refreshToken: result.refreshToken
      });
      dom.signinModal.style.display = 'none';
      await updateAccountArea();
      autoDetectOriginalSkin();
    } else {
      dom.dcStatus.textContent = 'Refresh failed: ' + result.error;
      dom.dcStatus.style.color = '#FF5555';
      dom.dcSpinner.style.display = 'none';
    }
  } catch (e) {
    dom.dcStatus.textContent = 'Error: ' + e.message;
    dom.dcStatus.style.color = '#FF5555';
    dom.dcSpinner.style.display = 'none';
  }
}

// ── Dropdown Actions ─────────────────────────────────────────────

dom.ddNamemc.addEventListener('click', () => {
  if (state.ign) window.electronAPI.openUrl({ url: 'https://namemc.com/profile/' + state.ign });
  dom.accountDropdown.style.display = 'none';
});

dom.ddClaim.addEventListener('click', () => {
  dom.claimModal.style.display = 'flex';
  dom.claimResultArea.style.display = 'none';
  dom.accountDropdown.style.display = 'none';
});

dom.btnCloseClaimModal.addEventListener('click', () => { dom.claimModal.style.display = 'none'; });
dom.claimModal.addEventListener('click', (e) => { if (e.target === dom.claimModal) dom.claimModal.style.display = 'none'; });

dom.btnClaimGo.addEventListener('click', async () => {
  if (state.claiming || !state.bearerToken || !state.ign) return;
  state.claiming = true;
  dom.btnClaimGo.disabled = true;
  dom.btnClaimGo.textContent = 'Connecting...';
  dom.claimResultArea.style.display = 'block';
  dom.claimSpinner.style.display = 'block';
  dom.claimStatus.textContent = 'Connecting to server...';
  dom.claimStatus.style.color = '';
  dom.claimLink.style.display = 'none';
  const server = dom.claimServerHost.value.trim() || 'blockmania.com';
  const port = parseInt(dom.claimServerPort.value, 10) || 25565;
  try {
    const result = await window.electronAPI.claimNamemc({
      bearerToken: state.bearerToken,
      profile: { name: state.ign, id: state.uuid || state.ign },
      server, port
    });
    dom.claimSpinner.style.display = 'none';
    if (result.success) {
      dom.claimStatus.textContent = 'Claim link received!';
      dom.claimStatus.style.color = '#55FF55';
      dom.claimLink.href = result.url;
      dom.claimLink.textContent = result.url;
      dom.claimLink.style.display = 'inline-block';
    } else {
      dom.claimStatus.textContent = result.error;
      dom.claimStatus.style.color = '#FF5555';
    }
  } catch (e) {
    dom.claimSpinner.style.display = 'none';
    dom.claimStatus.textContent = e.message;
    dom.claimStatus.style.color = '#FF5555';
  }
  dom.btnClaimGo.disabled = false;
  dom.btnClaimGo.textContent = 'Connect & Claim';
  state.claiming = false;
});

window.electronAPI.onClaimStatus((data) => {
  dom.claimStatus.textContent = data.message;
  dom.claimStatus.style.color = '';
});

dom.claimLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (dom.claimLink.href) window.electronAPI.openUrl({ url: dom.claimLink.href });
});

dom.ddSwitch.addEventListener('click', () => {
  dom.accountDropdown.style.display = 'none';
  openSigninModal();
});

dom.ddLogout.addEventListener('click', () => {
  state.bearerToken = null; state.refreshToken = null; state.ign = null; state.uuid = null;
  state.originalSkinPath = null; state.originalSkinHead = null;
  dom.originalName.textContent = 'Defaults to last tile from art';
  dom.originalZone.classList.remove('has-file');
  dom.accountDropdown.style.display = 'none';
  updateAccountArea();
  updateCell27();
  updatePreviewCell27();
});

dom.ddClaimLink.addEventListener('click', (e) => {
  e.preventDefault();
  if (dom.ddClaimLink.href) window.electronAPI.openUrl({ url: dom.ddClaimLink.href });
});

// ── Upload Flow ──────────────────────────────────────────────────

async function uploadWithRetry(skin, maxRetries) {
  maxRetries = maxRetries || 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await window.electronAPI.uploadOneSkin({
      bearerToken: state.bearerToken, skinPath: skin.path, variant: skin.variant || 'classic'
    });
    if (result.success) return result;
    if (result.statusCode === 401) {
      let rt = state.refreshToken;
      if (!rt && state.ign) {
        try {
          const accounts = await window.electronAPI.loadAccounts();
          const acct = accounts.find(a => a.ign === state.ign);
          if (acct && acct.refreshToken) rt = acct.refreshToken;
        } catch {}
      }
      if (rt) {
        logEntry('err', 'Token expired, refreshing...');
        try {
          const refresh = await window.electronAPI.refreshSavedToken({ refreshToken: rt });
          if (refresh.success) {
            state.bearerToken = refresh.bearerToken;
            state.refreshToken = refresh.refreshToken;
            await window.electronAPI.saveAccount({
              ign: state.ign, uuid: state.uuid, refreshToken: refresh.refreshToken
            });
            logEntry('ok', 'Token refreshed');
            attempt--;
            continue;
          } else {
            logEntry('err', 'Refresh failed: ' + refresh.error);
          }
        } catch (e) {
          logEntry('err', 'Refresh error: ' + e.message);
        }
      } else {
        return { success: false, error: 'Re-authentication required', statusCode: 401 };
      }
    }
    if (attempt < maxRetries) {
      logEntry('err', 'Skin ' + skin.num + ': attempt ' + attempt + ' failed (' + result.error + '), retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
    } else {
      return result;
    }
  }
}

function logEntry(cls, text) {
  const entry = document.createElement('div');
  entry.className = 'entry ' + cls;
  entry.textContent = text;
  dom.uploadLog.prepend(entry);
}

function askSkinModel() {
  return new Promise((resolve) => {
    const modal = document.getElementById('model-modal');
    const btnSlim = document.getElementById('btn-model-slim');
    const btnWide = document.getElementById('btn-model-wide');
    modal.style.display = 'flex';
    const pick = (variant) => { modal.style.display = 'none'; resolve(variant); };
    btnSlim.onclick = () => pick('slim');
    btnWide.onclick = () => pick('classic');
  });
}

async function runUpload(startNum) {
  if (state.uploadRunning) return;
  if (!state.bearerToken) { openSigninModal(); return; }
  state.uploadRunning = true;
  dom.btnStart.disabled = true;
  dom.btnStart.textContent = 'Uploading...';

  if (startNum != null) {
    for (const s of state.skins) {
      if (s.num < startNum) updateUploadCell(s.num, 'skip');
    }
  }

  const sorted = state.skins.slice().sort((a, b) => a.num - b.num);
  const toUpload = startNum != null ? sorted.filter(s => s.num >= startNum) : sorted;
  for (const skin of toUpload) {
    highlightGridCell(skin.num);
    const result = await uploadWithRetry(skin);
    if (!result.success) {
      updateUploadCell(skin.num, 'error');
      logEntry('err', 'Skin ' + skin.num + ': ' + result.error);
      continue;
    }
    updateUploadCell(skin.num, 'uploaded', skin.path);
    logEntry('ok', 'Skin ' + skin.num + ': OK');
    await waitForNextSkin(skin.num, skin.path);
  }
  if (state.originalSkinPath) {
    highlightGridCell(27);
    const variant = await askSkinModel();
    const result = await uploadWithRetry({ path: state.originalSkinPath, num: 27, variant });
    if (!result.success) {
      updateUploadCell(27, 'error');
      logEntry('err', 'Skin 27 (original): ' + result.error);
    } else {
      updateUploadCell(27, 'uploaded', state.originalSkinPath);
      logEntry('ok', 'Skin 27 (original): OK');
    }
  }
  dom.btnStart.textContent = 'Done!';
  state.uploadRunning = false;
  switchToDone();
}

dom.btnStart.addEventListener('click', () => runUpload(null));

function highlightGridCell(num) {
  document.querySelectorAll('.upload-grid .cell').forEach(c => c.classList.remove('active-cell'));
  const cell = document.getElementById('cell-' + num);
  if (cell) cell.classList.add('active-cell');
}

function compareFaces(faceBase64, tileDataUrl) {
  const SIZE = 32;
  return new Promise((resolve) => {
    const nmImg = new Image();
    nmImg.onload = () => {
      const tileImg = new Image();
      tileImg.onload = () => {
        const nmCanvas = document.createElement('canvas');
        nmCanvas.width = SIZE; nmCanvas.height = SIZE;
        const nmCtx = nmCanvas.getContext('2d');
        nmCtx.imageSmoothingEnabled = false;
        nmCtx.drawImage(nmImg, 0, 0, SIZE, SIZE);
        const nmData = nmCtx.getImageData(0, 0, SIZE, SIZE).data;

        const tCanvas = document.createElement('canvas');
        tCanvas.width = SIZE; tCanvas.height = SIZE;
        const tCtx = tCanvas.getContext('2d');
        tCtx.imageSmoothingEnabled = false;
        tCtx.drawImage(tileImg, 0, 0, SIZE, SIZE);
        const tData = tCtx.getImageData(0, 0, SIZE, SIZE).data;

        let matching = 0, compared = 0;
        for (let i = 0; i < nmData.length; i += 4) {
          if (nmData[i + 3] > 10 || tData[i + 3] > 10) {
            compared++;
            const dr = Math.abs(nmData[i] - tData[i]);
            const dg = Math.abs(nmData[i + 1] - tData[i + 1]);
            const db = Math.abs(nmData[i + 2] - tData[i + 2]);
            if (dr < 30 && dg < 30 && db < 30) matching++;
          }
        }
        resolve(compared > 0 ? matching / compared : 0);
      };
      tileImg.onerror = () => resolve(0);
      tileImg.src = tileDataUrl;
    };
    nmImg.onerror = () => resolve(0);
    nmImg.src = 'data:image/png;base64,' + faceBase64;
  });
}

async function waitForNextSkin(num, skinPath) {
  dom.confirmArea.style.display = '';
  dom.confirmNum.textContent = num;
  dom.btnNextSkin.style.display = 'none';
  dom.btnSkipWait.style.display = '';
  dom.pollStatus.className = 'poll-status';
  dom.pollText.textContent = 'Waiting for skin to propagate...';
  if (state.ign) dom.confirmHead.src = 'https://mineskin.eu/helm/' + encodeURIComponent(state.ign) + '/128?t=' + Date.now();

  return new Promise((resolve) => {
    let resolved = false;
    let attempts = 0;
    let timer = null;
    const maxAttempts = 12;
    const interval = 10000;

    function finish() {
      if (resolved) return;
      resolved = true;
      if (timer) clearInterval(timer);
      dom.confirmArea.style.display = 'none';
      resolve();
    }

    dom.btnSkipWait.onclick = () => {
      logEntry('ok', 'Skin ' + num + ': skipped verification');
      finish();
    };

    dom.btnNextSkin.onclick = () => finish();

    setTimeout(async () => {
      const tileDataUrl = state.tileData[num];
      const nmRetryMax = 10;
      const nmRetryInterval = 5000;

      for (let nmAttempt = 1; nmAttempt <= nmRetryMax; nmAttempt++) {
        if (resolved) return;
        logEntry('ok', 'Skin ' + num + ': checking NameMC... (' + nmAttempt + '/' + nmRetryMax + ')');
        dom.pollText.textContent = 'Loading NameMC profile... (' + nmAttempt + '/' + nmRetryMax + ')';

        try {
          const nmResult = await window.electronAPI.scrapeNameMCSkin({ ign: state.ign });
          if (resolved) return;
          if (nmResult.success && nmResult.faceData) {
            if (tileDataUrl) {
              const ratio = await compareFaces(nmResult.faceData, tileDataUrl);
              logEntry('ok', 'Skin ' + num + ': face match: ' + Math.round(ratio * 100) + '%');
              if (ratio > 0.7) {
                dom.pollStatus.className = 'poll-status done';
                dom.pollText.textContent = 'Skin verified on NameMC!';
                logEntry('ok', 'Skin ' + num + ': verified on NameMC');
                dom.btnNextSkin.style.display = '';
                dom.btnSkipWait.style.display = 'none';
                finish();
                return;
              }
              logEntry('ok', 'Skin ' + num + ': face not matched yet, retrying...');
            } else {
              logEntry('ok', 'Skin ' + num + ': NameMC loaded but no tile data for comparison');
              break;
            }
          } else {
            logEntry('ok', 'Skin ' + num + ': NameMC scrape: ' + (nmResult.error || 'unknown'));
          }
        } catch (e) {
          if (resolved) return;
          logEntry('err', 'Skin ' + num + ': NameMC error: ' + e.message);
        }
        if (nmAttempt < nmRetryMax) await new Promise(r => setTimeout(r, nmRetryInterval));
      }

      if (resolved) return;
      logEntry('ok', 'Skin ' + num + ': falling back to session server...');
      dom.pollText.textContent = 'Checking session server...';

      timer = setInterval(async () => {
        attempts++;
        dom.pollText.textContent = 'Checking session server... (' + attempts + '/' + maxAttempts + ')';

        try {
          const status = await window.electronAPI.checkSkinStatus({ uuid: state.uuid, skinPath });
          logEntry('ok', 'Debug: ' + (status.debug || JSON.stringify(status)));
          if (status.success && status.matches) {
            dom.pollStatus.className = 'poll-status done';
            dom.pollText.textContent = 'Skin verified — matches uploaded file!';
            logEntry('ok', 'Skin ' + num + ': verified — matches uploaded file');
            dom.btnNextSkin.style.display = '';
            dom.btnSkipWait.style.display = 'none';
            finish();
            return;
          }
        } catch (e) {
          logEntry('err', 'Debug error: ' + e.message);
        }

        if (attempts >= maxAttempts) {
          dom.pollStatus.className = 'poll-status done';
          dom.pollText.textContent = 'Timed out — click Next Skin to continue';
          logEntry('err', 'Skin ' + num + ': verification timed out');
          dom.btnNextSkin.style.display = '';
          dom.btnSkipWait.style.display = 'none';
          finish();
        }
      }, interval);
    }, 12000);
  });
}

// ── Export ────────────────────────────────────────────────────────

dom.btnExport.addEventListener('click', async () => {
  dom.btnExport.disabled = true;
  dom.btnExport.textContent = 'Exporting...';
  try {
    const dest = await window.electronAPI.selectExportDir({ skins: state.skins });
    if (dest) {
      dom.btnExport.textContent = 'Exported to ' + dest.split('\\').pop();
      dom.btnExport.disabled = false;
    } else {
      dom.btnExport.textContent = 'Export Skins Only';
      dom.btnExport.disabled = false;
    }
  } catch (e) {
    dom.btnExport.textContent = 'Export failed';
    dom.btnExport.disabled = false;
  }
});

// ── Grid ──────────────────────────────────────────────────────────

function setupGrid() {
  dom.uploadGrid.innerHTML = '';
  const grid = [[27,26,25,24,23,22,21,20,19],[18,17,16,15,14,13,12,11,10],[9,8,7,6,5,4,3,2,1]];
  for (const row of grid) {
    for (const num of row) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = 'cell-' + num;
      if (num === 27) {
        const src = state.originalSkinHead || state.lastTileDataUrl;
        if (src) {
          cell.style.backgroundImage = 'url(' + src + ')';
          cell.style.backgroundSize = 'cover';
          cell.textContent = '';
        } else {
          cell.textContent = '27';
        }
      } else {
        cell.textContent = num;
      }
      if (num >= 1 && num <= 26 && !state.uploadRunning) {
        cell.classList.add('clickable');
        cell.addEventListener('click', () => {
          if (state.uploadRunning) return;
          runUpload(num);
        });
      }
      dom.uploadGrid.appendChild(cell);
    }
  }
}

function updateCell27() {
  const cell = document.getElementById('cell-27');
  if (!cell) return;
  const src = state.originalSkinHead || state.lastTileDataUrl || (state.tileData && state.tileData[27]) || null;
  if (src) {
    cell.style.backgroundImage = 'url(' + src + ')';
    cell.style.backgroundSize = 'cover';
    cell.textContent = '';
  } else {
    cell.style.backgroundImage = '';
    cell.textContent = '27';
  }
}

function updateUploadCell(num, status, skinPath) {
  const cell = document.getElementById('cell-' + num);
  if (!cell) return;
  cell.classList.remove('uploaded', 'failed', 'skipped', 'active-cell');
  cell.style.backgroundImage = '';
  cell.style.backgroundSize = '';
  if (status === 'uploaded') {
    cell.classList.add('uploaded');
    if (skinPath) {
      cell.style.backgroundImage = 'url(file:///' + skinPath.replace(/\\/g, '/') + ')';
      cell.style.backgroundSize = 'cover';
      cell.style.backgroundPosition = 'top left';
      cell.textContent = '';
    }
  } else if (status === 'error') {
    cell.classList.add('failed');
    cell.textContent = num;
  } else if (status === 'skip') {
    cell.classList.add('skipped');
  }
}

// ── Preview ───────────────────────────────────────────────────────

function renderPreview() {
  if (!state.inputPath) return;
  fetchPreviewTiles(state.inputPath).then(tiles => {
    state.tileData = tiles;
    state.lastTileDataUrl = tiles[27] || null;
    const grid = [[27,26,25,24,23,22,21,20,19],[18,17,16,15,14,13,12,11,10],[9,8,7,6,5,4,3,2,1]];
    let html = '<div class="preview-grid">';
    for (const row of grid) {
      for (const num of row) {
        let src, label, cls;
        if (num === 27) {
          src = state.originalSkinHead || tiles[27];
          label = state.originalSkinHead ? 'FACE' : '27';
          cls = '';
        } else {
          src = tiles[num];
          label = num;
          cls = '';
        }
        html += '<div class="preview-cell"><img src="' + (src || '') + '" alt="tile ' + num + '"><span class="pl ' + cls + '">' + label + '</span></div>';
      }
    }
    html += '</div>';
    dom.previewWrapper.innerHTML = html;
    dom.previewWrapper.style.display = 'block';
    updatePreviewCell27();
    updateCell27();
  }).catch(() => {});
}

function fetchPreviewTiles(filePath) {
  const img = new Image();
  img.src = 'file://' + filePath;
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const scaleCanvas = document.createElement('canvas');
      scaleCanvas.width = 72;
      scaleCanvas.height = 24;
      const scaleCtx = scaleCanvas.getContext('2d');
      scaleCtx.imageSmoothingEnabled = false;
      scaleCtx.drawImage(img, 0, 0, 72, 24);
      const map = {};
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
          const num = 27 - (row * 9 + col);
          const c = document.createElement('canvas');
          c.width = 8; c.height = 8;
          const cCtx = c.getContext('2d');
          cCtx.imageSmoothingEnabled = false;
          cCtx.drawImage(scaleCanvas, col * 8, row * 8, 8, 8, 0, 0, 8, 8);
          map[num] = c.toDataURL();
        }
      }
      resolve(map);
    };
    img.onerror = reject;
  });
}

function switchToDone() {
  dom.stepUpload.classList.remove('active');
  dom.stepDone.classList.add('active');
  const namemcUrl = state.ign ? 'https://namemc.com/profile/' + state.ign : null;
  dom.stepDone.innerHTML =
    '<div class="done-icon">' +
      '<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10.5 14 8 11.5"/></svg>' +
    '</div>' +
    '<div class="done-content">' +
      '<h2>All done!</h2>' +
      '<p>All skins have been uploaded and confirmed.</p>' +
      '<div class="done-actions">' +
        (namemcUrl ? '<a class="btn-namemc" href="' + namemcUrl + '" id="done-namemc-link">View on NameMC</a>' : '') +
        '<button class="btn-restart" id="btn-restart-done">Make another</button>' +
      '</div>' +
    '</div>';
  const namemcLink = document.getElementById('done-namemc-link');
  if (namemcLink) {
    namemcLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.electronAPI.openUrl({ url: namemcUrl });
    });
  }
  document.getElementById('btn-restart-done').addEventListener('click', () => dom.btnRestart.click());
}

// ── Restart ──────────────────────────────────────────────────────

dom.btnRestart.addEventListener('click', async () => {
  if (state.pollTimer) clearTimeout(state.pollTimer);
  if (state.claiming) window.electronAPI.cancelClaim();
  const savedIgn = state.ign;
  const savedUuid = state.uuid;
  const savedBearer = state.bearerToken;
  const savedRefresh = state.refreshToken;
  state = {
    inputPath: null, baseSkinPath: null, originalSkinPath: null, originalSkinHead: null,
    lastTileDataUrl: null, skins: [], bearerToken: savedBearer, refreshToken: savedRefresh,
    ign: savedIgn, uuid: savedUuid, pollTimer: null, uploadRunning: false, claiming: false,
    templates: state.templates, tileData: {}
  };
  dom.inputName.textContent = 'No image selected';
  dom.inputZone.classList.remove('has-file');
  dom.baseName.textContent = 'None';
  dom.baseZone.classList.remove('has-file');
  dom.originalName.textContent = 'Defaults to last tile from art';
  dom.originalZone.classList.remove('has-file');
  dom.btnGenerate.disabled = true;
  dom.previewWrapper.style.display = 'none';
  dom.previewWrapper.innerHTML = '';
  dom.uploadGrid.innerHTML = '';
  dom.uploadLog.innerHTML = '';
  dom.confirmArea.style.display = 'none';
  dom.btnStart.disabled = true;
  dom.btnStart.textContent = 'Start Upload';
  dom.btnExport.disabled = true;
  dom.btnExport.textContent = 'Export Skins Only';
  dom.stepDone.classList.remove('active');
  dom.stepUpload.classList.remove('active');
  document.getElementById('tab-create').classList.add('active');
  document.querySelector('.tab-buttons').style.display = '';
  document.querySelector('[data-tab="create"]').click();
  updateAccountArea();
  renderTemplates();
});

// ── Init ──────────────────────────────────────────────────────────

updateAccountArea();
refreshSavedAccountsList();
loadTemplates();
