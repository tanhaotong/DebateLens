#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 DebateLens 快速打包脚本\n');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查依赖
function checkDependencies() {
  log('📦 检查依赖...', 'cyan');
  
  const requiredDeps = [
    'node_modules/electron',
    'node_modules/electron-builder',
    'node_modules/python-shell'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !fs.existsSync(dep));
  
  if (missingDeps.length > 0) {
    log('❌ 缺少依赖，正在安装...', 'yellow');
    try {
      execSync('npm install', { stdio: 'inherit' });
      log('✅ 依赖安装完成', 'green');
    } catch (error) {
      log('❌ 依赖安装失败', 'red');
      process.exit(1);
    }
  } else {
    log('✅ 依赖检查通过', 'green');
  }
}

// 快速检查
function quickCheck() {
  log('🔍 快速检查...', 'cyan');
  
  const required = ['package.json', 'frontend/package.json', 'backend/requirements.txt'];
  const missing = required.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    log('❌ 缺少必要文件，请运行完整打包脚本', 'red');
    process.exit(1);
  }
  
  log('✅ 检查通过', 'green');
}

// 构建前端
function buildFrontend() {
  log('🔨 构建前端...', 'cyan');
  
  if (fs.existsSync('frontend/dist/index.html')) {
    log('✅ 前端已构建', 'green');
    return;
  }
  
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  log('✅ 前端构建完成', 'green');
}

// 打包应用
function buildApp() {
  log('📦 打包应用...', 'cyan');
  
  try {
    // 使用正确的打包命令
    execSync('npm run build:frontend && electron-builder', { stdio: 'inherit' });
    log('✅ 打包完成', 'green');
  } catch (error) {
    log('❌ 打包失败，请检查依赖是否完整', 'red');
    process.exit(1);
  }
}

// 主函数
function main() {
  const platform = process.argv[2];
  
  if (platform && !['win', 'mac', 'linux', 'current'].includes(platform)) {
    log('❌ 无效平台参数', 'red');
    process.exit(1);
  }
  
  log(`🎯 目标平台: ${platform || 'current'}`, 'cyan');
  
  quickCheck();
  checkDependencies();
  buildFrontend();
  buildApp();
  
  log('\n🎉 快速打包完成！', 'green');
  log('📦 输出目录: dist/', 'green');
}

if (require.main === module) {
  main();
} 