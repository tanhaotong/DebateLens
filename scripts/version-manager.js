#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 DebateLens 版本管理工具\n');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 获取当前版本
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

// 更新版本号
function updateVersion(type) {
  log(`🔄 更新版本号 (${type})...`, 'cyan');
  
  try {
    execSync(`npm version ${type} --no-git-tag-version`, { stdio: 'inherit' });
    const newVersion = getCurrentVersion();
    log(`✅ 版本已更新为: ${newVersion}`, 'green');
    return newVersion;
  } catch (error) {
    log('❌ 版本更新失败', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// 构建应用
function buildApp() {
  log('🔨 开始构建应用...', 'cyan');
  
  try {
    execSync('npm run build:quick', { stdio: 'inherit' });
    log('✅ 应用构建完成', 'green');
  } catch (error) {
    log('❌ 应用构建失败', 'red');
    console.error(error.message);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  log('📖 版本管理命令说明:', 'blue');
  log('');
  log('patch - 修订版本 (1.0.0 → 1.0.1)', 'cyan');
  log('minor - 次版本 (1.0.0 → 1.1.0)', 'cyan');
  log('major - 主版本 (1.0.0 → 2.0.0)', 'cyan');
  log('');
  log('示例:', 'yellow');
  log('  node scripts/version-manager.js patch', 'green');
  log('  node scripts/version-manager.js minor', 'green');
  log('  node scripts/version-manager.js major', 'green');
  log('');
  log('快捷命令:', 'yellow');
  log('  npm run version:patch', 'green');
  log('  npm run version:minor', 'green');
  log('  npm run version:major', 'green');
  log('  npm run build:version', 'green');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const versionType = args[0];
  const validTypes = ['patch', 'minor', 'major'];
  
  if (!validTypes.includes(versionType)) {
    log('❌ 无效的版本类型', 'red');
    log(`支持的类型: ${validTypes.join(', ')}`, 'yellow');
    process.exit(1);
  }
  
  const currentVersion = getCurrentVersion();
  log(`📋 当前版本: ${currentVersion}`, 'blue');
  
  // 更新版本
  const newVersion = updateVersion(versionType);
  
  // 询问是否构建
  if (args.includes('--no-build')) {
    log('⏭️ 跳过构建步骤', 'yellow');
  } else {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('是否立即构建应用? (y/N): ', (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        buildApp();
        log(`🎉 版本 ${newVersion} 构建完成！`, 'green');
      } else {
        log('⏭️ 跳过构建，你可以稍后运行: npm run build:quick', 'yellow');
      }
    });
  }
}

if (require.main === module) {
  main();
} 