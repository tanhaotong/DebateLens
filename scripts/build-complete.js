#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DebateLens 完整打包脚本\n');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查系统环境
function checkEnvironment() {
  log('\n🔍 检查系统环境...', 'cyan');
  
  const checks = {
    node: false,
    npm: false,
    python: false,
    pip: false,
    git: false
  };
  
  try {
    execSync('node --version', { stdio: 'pipe' });
    checks.node = true;
    log('✅ Node.js 已安装', 'green');
  } catch (error) {
    log('❌ Node.js 未安装', 'red');
  }
  
  try {
    execSync('npm --version', { stdio: 'pipe' });
    checks.npm = true;
    log('✅ npm 已安装', 'green');
  } catch (error) {
    log('❌ npm 未安装', 'red');
  }
  
  try {
    execSync('python --version', { stdio: 'pipe' });
    checks.python = true;
    log('✅ Python 已安装', 'green');
  } catch (error) {
    log('❌ Python 未安装', 'red');
  }
  
  try {
    execSync('pip --version', { stdio: 'pipe' });
    checks.pip = true;
    log('✅ pip 已安装', 'green');
  } catch (error) {
    log('❌ pip 未安装', 'red');
  }
  
  try {
    execSync('git --version', { stdio: 'pipe' });
    checks.git = true;
    log('✅ Git 已安装', 'green');
  } catch (error) {
    log('❌ Git 未安装', 'red');
  }
  
  const allGood = Object.values(checks).every(Boolean);
  if (!allGood) {
    log('\n⚠️ 请先安装缺失的依赖，然后重新运行脚本', 'yellow');
    process.exit(1);
  }
  
  log('✅ 环境检查通过', 'green');
}

// 设置镜像源
function setupMirrors() {
  log('\n🌐 设置镜像源...', 'cyan');
  
  try {
    execSync('npm config set registry https://registry.npmmirror.com', { stdio: 'pipe' });
    execSync('npm config set electron_mirror https://npmmirror.com/mirrors/electron/', { stdio: 'pipe' });
    execSync('npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/', { stdio: 'pipe' });
    execSync('npm config set fetch-timeout 300000', { stdio: 'pipe' });
    execSync('npm config set fetch-retry-mintimeout 20000', { stdio: 'pipe' });
    execSync('npm config set fetch-retry-maxtimeout 120000', { stdio: 'pipe' });
    
    log('✅ 镜像源设置完成', 'green');
  } catch (error) {
    log('⚠️ 镜像源设置失败，继续使用默认源', 'yellow');
  }
}

// 检查项目文件
function checkProjectFiles() {
  log('\n📋 检查项目文件...', 'cyan');
  
  const requiredFiles = [
    'package.json',
    'electron/main.js',
    'electron/preload.js',
    'frontend/package.json',
    'backend/requirements.txt',
    'backend/run.py'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    log('❌ 缺少必要文件:', 'red');
    missingFiles.forEach(file => log(`   - ${file}`, 'red'));
    process.exit(1);
  }
  
  log('✅ 项目文件检查通过', 'green');
}

// 安装Node.js依赖
function installNodeDependencies() {
  log('\n📦 安装Node.js依赖...', 'cyan');
  
  const checks = {
    rootNodeModules: fs.existsSync('node_modules'),
    frontendNodeModules: fs.existsSync('frontend/node_modules'),
    electronInstalled: false,
    pythonShellInstalled: false
  };
  
  if (checks.rootNodeModules) {
    checks.electronInstalled = fs.existsSync('node_modules/electron');
    checks.pythonShellInstalled = fs.existsSync('node_modules/python-shell');
  }
  
  if (!checks.rootNodeModules || !checks.electronInstalled || !checks.pythonShellInstalled) {
    log('安装根目录依赖...', 'yellow');
    execSync('npm install', { stdio: 'inherit' });
  } else {
    log('✅ 根目录依赖已完整', 'green');
  }
  
  if (!checks.frontendNodeModules) {
    log('安装前端依赖...', 'yellow');
    execSync('cd frontend && npm install', { stdio: 'inherit' });
  } else {
    log('✅ 前端依赖已完整', 'green');
  }
}

// 准备Python环境
function preparePythonEnvironment() {
  log('\n🐍 准备Python环境...', 'cyan');
  
  const backendPath = path.join(__dirname, '..', 'backend');
  const venvPath = path.join(backendPath, 'venv');
  
  // 创建虚拟环境
  if (!fs.existsSync(venvPath)) {
    log('创建Python虚拟环境...', 'yellow');
    execSync('cd backend && python -m venv venv', { stdio: 'inherit' });
  } else {
    log('✅ 虚拟环境已存在', 'green');
  }
  
  // 安装Python依赖
  log('安装Python依赖...', 'yellow');
  const pipCommand = process.platform === 'win32' 
    ? 'cd backend && venv\\Scripts\\pip install -r requirements.txt'
    : 'cd backend && venv/bin/pip install -r requirements.txt';
  
  execSync(pipCommand, { stdio: 'inherit' });
  log('✅ Python环境准备完成', 'green');
}

// 构建前端
function buildFrontend() {
  log('\n🔨 构建前端...', 'cyan');
  
  // 检查是否已构建
  if (fs.existsSync('frontend/dist') && fs.existsSync('frontend/dist/index.html')) {
    log('✅ 前端已构建，跳过构建步骤', 'green');
    return;
  }
  
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  log('✅ 前端构建完成', 'green');
}

// 创建默认配置文件
function createDefaultConfig() {
  log('\n⚙️ 创建默认配置...', 'cyan');
  
  const configPath = path.join(__dirname, '..', 'backend', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      "geminiApiKey": "",
      "description": "请在此处配置您的Gemini API密钥"
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    log('✅ 默认配置文件已创建', 'green');
  } else {
    log('✅ 配置文件已存在', 'green');
  }
}

// 打包应用
function buildApplication() {
  log('\n📦 开始打包应用...', 'cyan');
  
  try {
    // 使用正确的打包命令
    execSync('npm run build:frontend && electron-builder', { stdio: 'inherit' });
    log('✅ 应用打包完成', 'green');
  } catch (error) {
    log('❌ 打包失败，尝试备选方案...', 'red');
    
    // 备选方案：使用electron-packager
    log('使用electron-packager打包...', 'yellow');
    execSync('npx electron-packager . DebateLens --platform=win32 --arch=x64 --out=dist --overwrite', { stdio: 'inherit' });
    
    // 复制后端文件
    log('复制后端文件...', 'yellow');
    const copyCommand = process.platform === 'win32'
      ? 'xcopy backend dist\\DebateLens-win32-x64\\resources\\backend /E /I /Y'
      : 'cp -r backend dist/DebateLens-win32-x64/resources/';
    
    execSync(copyCommand, { stdio: 'inherit' });
    log('✅ 备选方案打包完成', 'green');
  }
}

// 创建启动脚本
function createStartScripts() {
  log('\n🚀 创建启动脚本...', 'cyan');
  
  const distPath = path.join(__dirname, '..', 'dist');
  
  if (fs.existsSync(distPath)) {
    // Windows启动脚本
    const winStartScript = `@echo off
echo 启动DebateLens...
cd /d "%~dp0"
start "" "DebateLens.exe"
`;
    
    fs.writeFileSync(path.join(distPath, 'start.bat'), winStartScript);
    
    // Linux/macOS启动脚本
    const unixStartScript = `#!/bin/bash
echo "启动DebateLens..."
cd "$(dirname "$0")"
./DebateLens
`;
    
    fs.writeFileSync(path.join(distPath, 'start.sh'), unixStartScript);
    execSync(`chmod +x ${path.join(distPath, 'start.sh')}`, { stdio: 'pipe' });
    
    log('✅ 启动脚本已创建', 'green');
  }
}

// 生成使用说明
function generateReadme() {
  log('\n📖 生成使用说明...', 'cyan');
  
  const readmeContent = `# DebateLens 桌面应用

## 快速开始

### Windows用户
1. 双击 \`start.bat\` 或 \`DebateLens.exe\`
2. 首次启动时，点击"API配置"按钮配置Gemini API密钥
3. 开始使用！

### Linux/macOS用户
1. 运行 \`./start.sh\` 或双击 \`DebateLens\`
2. 首次启动时，点击"API配置"按钮配置Gemini API密钥
3. 开始使用！

## 功能特性

- 🎥 支持Bilibili视频分析
- 🤖 AI智能对话
- 📊 可视化图表（树形图、气泡图）
- 💬 基于视频内容的智能问答

## 系统要求

- Windows 10+ / macOS 10.14+ / Linux Ubuntu 18.04+
- 至少2GB内存
- 至少500MB磁盘空间

## 注意事项

1. 首次使用需要配置Gemini API密钥
2. 确保网络连接正常
3. 视频处理可能需要一些时间

## 技术支持

如遇问题，请查看应用日志或联系技术支持。
`;

  const distPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distPath)) {
    fs.writeFileSync(path.join(distPath, 'README.txt'), readmeContent);
    log('✅ 使用说明已生成', 'green');
  }
}

// 主函数
function main() {
  const platform = process.argv[2];
  
  if (platform && !['win', 'mac', 'linux', 'current'].includes(platform)) {
    log('❌ 无效的平台参数。支持: win, mac, linux, current', 'red');
    process.exit(1);
  }
  
  log(`🎯 目标平台: ${platform || 'current'}`, 'magenta');
  
  try {
    checkEnvironment();
    setupMirrors();
    checkProjectFiles();
    installNodeDependencies();
    preparePythonEnvironment();
    buildFrontend();
    createDefaultConfig();
    buildApplication();
    createStartScripts();
    generateReadme();
    
    log('\n🎉 打包流程完成！', 'green');
    log('📦 应用已打包到 dist/ 目录', 'green');
    log('🚀 用户可以双击启动文件直接使用', 'green');
    log('\n📋 下一步：', 'cyan');
    log('1. 测试打包后的应用', 'yellow');
    log('2. 分发给用户', 'yellow');
    log('3. 收集用户反馈', 'yellow');
    
  } catch (error) {
    log(`\n❌ 打包过程中出现错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 