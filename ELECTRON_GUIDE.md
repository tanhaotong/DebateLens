# DebateLens Electron 打包指南

## 概述

DebateLens支持打包为桌面应用，使用Electron框架集成前端React应用和Python后端服务。

## 系统要求

### 开发环境
- Node.js 18+
- Python 3.8+
- FFmpeg
- Git

### 目标平台
- Windows 10+ (x64)
- macOS 10.14+ (Intel/ARM)
- Linux Ubuntu 18.04+ (x64)

## 快速开始

### 1. 安装依赖

```bash
# 一键安装所有依赖
npm run install:all
```

这个命令会：
- 安装根目录Node.js依赖
- 安装前端React依赖
- 安装后端Python依赖
- 创建Python虚拟环境

### 2. 开发模式

```bash
# 启动开发环境
npm run dev
```

这会同时启动：
- 前端开发服务器 (http://localhost:5173)
- 后端Python服务 (http://localhost:5000)
- Electron应用窗口

### 3. 打包应用

```bash
# 打包当前平台
npm run dist

# 或指定平台
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 详细配置

### 项目结构

```
DebateLens/
├── electron/           # Electron主进程
│   ├── main.js        # 主进程入口
│   └── preload.js     # 预加载脚本
├── frontend/          # React前端
│   ├── dist/          # 构建输出
│   └── src/           # 源代码
├── backend/           # Python后端
│   ├── venv/          # 虚拟环境
│   └── app/           # Flask应用
├── assets/            # 应用资源
│   └── icon.png       # 应用图标
├── package.json       # 根配置
├── build-electron.js  # 打包脚本
└── start-electron.js  # 启动脚本
```

### 配置文件

#### package.json
```json
{
  "name": "debatelens",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "npm run build:frontend && npm run build:electron",
    "dist": "npm run build:frontend && electron-builder"
  },
  "build": {
    "appId": "com.debatelens.app",
    "productName": "DebateLens",
    "files": ["electron/**/*", "frontend/dist/**/*", "backend/**/*"],
    "extraResources": [{"from": "backend", "to": "backend"}]
  }
}
```

#### electron/main.js
```javascript
const { app, BrowserWindow } = require('electron');
const { PythonShell } = require('python-shell');

// 启动Python后端
function startBackend() {
  const pythonProcess = new PythonShell('run.py', {
    pythonPath: 'backend/venv/bin/python',
    scriptPath: 'backend'
  });
}

// 创建主窗口
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // 加载前端
  mainWindow.loadFile('frontend/dist/index.html');
}
```

## 打包流程

### 1. 前置检查

```bash
# 检查必要文件
node build-electron.js
```

### 2. 构建前端

```bash
cd frontend
npm run build
```

### 3. 打包应用

```bash
# 使用electron-builder
npm run dist

# 或使用脚本
node build-electron.js win
```

### 4. 输出文件

打包完成后，在`dist/`目录下会生成：

**Windows**
- `DebateLens Setup.exe` - 安装程序
- `win-unpacked/` - 免安装版本

**macOS**
- `DebateLens.dmg` - 磁盘镜像
- `mac/` - 应用包

**Linux**
- `DebateLens.AppImage` - 可执行文件
- `linux-unpacked/` - 免安装版本

## 开发调试

### 1. 开发模式

```bash
# 启动所有服务
npm run dev
```

### 2. 调试技巧

- 使用`Ctrl+Shift+I`打开开发者工具
- 查看主进程日志：`npm start`
- 查看Python后端日志：控制台输出

### 3. 热重载

开发模式下支持：
- 前端代码热重载
- 后端代码重启
- Electron窗口自动刷新

## 常见问题

### 1. Python环境问题

**问题**: Python虚拟环境找不到
**解决**: 
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

### 2. 依赖安装失败

**问题**: npm install失败
**解决**:
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. 打包失败

**问题**: electron-builder打包失败
**解决**:
```bash
# 检查依赖
npm list electron-builder

# 重新安装
npm install electron-builder --save-dev

# 清理缓存
rm -rf dist/
```

### 4. 应用启动失败

**问题**: 打包后的应用无法启动
**解决**:
1. 检查Python环境是否正确打包
2. 确认API密钥配置
3. 查看应用日志

## 性能优化

### 1. 文件大小优化

- 排除不必要的文件：
  ```json
  "files": [
    "!backend/test/**/*",
    "!backend/temp/**/*",
    "!backend/__pycache__/**/*"
  ]
  ```

### 2. 启动速度优化

- 使用异步加载
- 延迟加载非关键模块
- 优化Python导入

### 3. 内存使用优化

- 及时释放资源
- 避免内存泄漏
- 监控进程内存使用

## 发布流程

### 1. 版本管理

```bash
# 更新版本号
npm version patch  # 0.0.1 -> 0.0.2
npm version minor  # 0.0.2 -> 0.1.0
npm version major  # 0.1.0 -> 1.0.0
```

### 2. 代码签名

**Windows**:
```bash
# 使用证书签名
electron-builder --win --publish=always
```

**macOS**:
```bash
# 使用开发者证书
electron-builder --mac --publish=always
```

### 3. 自动更新

配置自动更新：
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "debatelens"
    }
  }
}
```

## 安全考虑

### 1. 代码签名
- Windows: 使用代码签名证书
- macOS: 使用Apple Developer证书
- Linux: 使用GPG签名

### 2. 权限控制
- 最小权限原则
- 沙盒化运行
- 网络访问控制

### 3. 数据安全
- API密钥本地存储
- 用户数据加密
- 安全通信协议

## 技术支持

### 1. 日志查看

```bash
# 应用日志
# Windows: %APPDATA%/DebateLens/logs/
# macOS: ~/Library/Logs/DebateLens/
# Linux: ~/.config/DebateLens/logs/
```

### 2. 错误报告

- 收集错误日志
- 系统信息收集
- 用户反馈渠道

### 3. 更新机制

- 自动检查更新
- 增量更新支持
- 回滚机制

## 总结

Electron打包为DebateLens提供了完整的桌面应用体验，集成了前端界面和后端服务。通过合理的配置和优化，可以创建高性能、易用的桌面应用。

关键要点：
1. 正确配置Python环境
2. 优化打包文件大小
3. 处理跨平台兼容性
4. 实现自动更新机制
5. 确保应用安全性 