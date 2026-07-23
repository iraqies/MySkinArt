const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  selectBaseSkin: () => ipcRenderer.invoke('select-base-skin'),
  selectOriginalSkin: () => ipcRenderer.invoke('select-original-skin'),
  generateAll: (opts) => ipcRenderer.invoke('generate-all', opts),
  startAuthDevice: () => ipcRenderer.invoke('start-auth-device'),
  pollAuthToken: (opts) => ipcRenderer.invoke('poll-auth-token', opts),
  refreshSavedToken: (opts) => ipcRenderer.invoke('refresh-saved-token', opts),
  selectExportDir: (opts) => ipcRenderer.invoke('select-export-dir', opts),
  fetchProfile: (opts) => ipcRenderer.invoke('fetch-profile', opts),
  openUrl: (opts) => ipcRenderer.invoke('open-url', opts),
  uploadOneSkin: (opts) => ipcRenderer.invoke('upload-one-skin', opts),
  loadAccounts: () => ipcRenderer.invoke('load-accounts'),
  saveAccount: (opts) => ipcRenderer.invoke('save-account', opts),
  deleteAccount: (opts) => ipcRenderer.invoke('delete-account', opts),
  claimNamemc: (opts) => ipcRenderer.invoke('claim-namemc', opts),
  cancelClaim: () => ipcRenderer.invoke('cancel-claim'),
  onClaimStatus: (callback) => ipcRenderer.on('claim-status', (event, data) => callback(data)),
  getUuidFromName: (opts) => ipcRenderer.invoke('get-uuid-from-name', opts),
  downloadHead: (opts) => ipcRenderer.invoke('download-head', opts),
  downloadSkinTexture: (opts) => ipcRenderer.invoke('download-skin-texture', opts),
  loadTemplates: () => ipcRenderer.invoke('load-templates'),
  getTemplateImagePath: (opts) => ipcRenderer.invoke('get-template-image-path', opts),
  getTemplateImageData: (opts) => ipcRenderer.invoke('get-template-image-data', opts),
  saveTempBuffer: (opts) => ipcRenderer.invoke('save-temp-buffer', opts)
});
