const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // 平台信息
  platform: process.platform,
  
  // 应用环境
  isPackaged: process.env.NODE_ENV === 'production',
  
  // 文件系统操作（如果需要）
  // 注意：这里只暴露安全的API，避免直接文件系统访问
}); 