#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📦 安装DebateLens最小依赖...\n');

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

// 安装最小依赖
function installMinimalDeps() {
  log('🔧 安装最小依赖包...', 'cyan');
  
  const minimalDeps = [
    'electron@latest',
    'electron-builder@latest',
    'python-shell@latest'
  ];
  
  try {
    // 设置环境变量
    process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
    process.env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/';
    
    // 逐个安装依赖
    minimalDeps.forEach(dep => {
      log(`安装 ${dep}...`, 'yellow');
      execSync(`npm install ${dep} --save`, { stdio: 'inherit' });
    });
    
    log('✅ 最小依赖安装完成', 'green');
  } catch (error) {
    log('❌ 依赖安装失败', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// 检查依赖
function checkDependencies() {
  log('🔍 检查依赖状态...', 'cyan');
  
  const deps = [
    { name: 'electron', path: 'node_modules/electron' },
    { name: 'electron-builder', path: 'node_modules/electron-builder' },
    { name: 'python-shell', path: 'node_modules/python-shell' }
  ];
  
  let missing = [];
  
  deps.forEach(dep => {
    if (fs.existsSync(dep.path)) {
      log(`✅ ${dep.name} 已安装`, 'green');
    } else {
      log(`❌ ${dep.name} 未安装`, 'red');
      missing.push(dep.name);
    }
  });
  
  return missing;
}

// 主函数
function main() {
  const missing = checkDependencies();
  
  if (missing.length > 0) {
    log(`\n发现 ${missing.length} 个缺失的依赖，开始安装...`, 'yellow');
    installMinimalDeps();
    
    // 再次检查
    log('\n🔍 重新检查依赖...', 'cyan');
    const stillMissing = checkDependencies();
    
    if (stillMissing.length > 0) {
      log('❌ 仍有依赖未安装成功', 'red');
      process.exit(1);
    } else {
      log('🎉 所有依赖安装成功！', 'green');
    }
  } else {
    log('🎉 所有依赖已安装！', 'green');
  }
  
  log('\n现在可以运行打包命令了：', 'cyan');
  log('npm run build:quick', 'yellow');
}

if (require.main === module) {
  main();
} 