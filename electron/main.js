const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');
const fs = require('fs');

let mainWindow;
let pythonProcess;

// 获取应用资源路径
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  } else {
    return path.join(__dirname, '..', relativePath);
  }
}

// 启动Python后端
function startBackend() {
  const backendPath = getResourcePath('backend');
  const pythonPath = path.join(backendPath, 'venv', 'Scripts', 'python.exe'); // Windows
  const pythonPathUnix = path.join(backendPath, 'venv', 'bin', 'python'); // Unix
  
  let pythonExecutable;
  if (fs.existsSync(pythonPath)) {
    pythonExecutable = pythonPath;
  } else if (fs.existsSync(pythonPathUnix)) {
    pythonExecutable = pythonPathUnix;
  } else {
    pythonExecutable = 'python'; // 使用系统Python
  }

  const options = {
    mode: 'text',
    pythonPath: pythonExecutable,
    pythonOptions: ['-u'], // unbuffered output
    scriptPath: backendPath,
    args: ['run.py']
  };

  console.log('启动Python后端...');
  console.log('Python路径:', pythonExecutable);
  console.log('后端路径:', backendPath);

  pythonProcess = new PythonShell('run.py', options);

  pythonProcess.on('message', function (message) {
    console.log('Python输出:', message);
  });

  pythonProcess.on('error', function (err) {
    console.error('Python进程错误:', err);
  });

  pythonProcess.on('close', function (code) {
    console.log('Python进程退出，代码:', code);
  });

  return pythonProcess;
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // 加载前端应用
  if (app.isPackaged) {
    // 生产环境：加载打包后的前端文件
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  } else {
    // 开发环境：加载开发服务器
    mainWindow.loadURL('http://localhost:5173');
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 开发环境下打开开发者工具
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理窗口关闭
  mainWindow.on('close', (event) => {
    if (pythonProcess) {
      event.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['是', '否'],
        title: '确认退出',
        message: '确定要退出DebateLens吗？这将关闭所有相关进程。'
      }).then((result) => {
        if (result.response === 0) {
          // 用户选择退出
          if (pythonProcess) {
            pythonProcess.kill();
          }
          app.quit();
        }
      });
    }
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  // 启动后端
  startBackend();
  
  // 创建窗口
  createWindow();

  // macOS: 当所有窗口关闭时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (pythonProcess) {
      pythonProcess.kill();
    }
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  dialog.showErrorBox('错误', `发生未预期的错误：${error.message}`);
});

// IPC处理程序
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

// 开发环境下的热重载
if (!app.isPackaged) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
  });
} 