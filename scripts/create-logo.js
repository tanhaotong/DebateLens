#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 DebateLens Logo制作工具\n');

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

// 检查ImageMagick是否安装
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// 创建assets目录
function createAssetsDir() {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    log('✅ 创建assets目录', 'green');
  } else {
    log('✅ assets目录已存在', 'green');
  }
  return assetsDir;
}

// 生成默认Logo
function generateDefaultLogo(assetsDir) {
  log('🎨 生成默认Logo...', 'cyan');
  
  // 检查是否已有Logo文件
  const existingFiles = ['icon.ico', 'icon.icns', 'icon.png'];
  const hasExisting = existingFiles.some(file => 
    fs.existsSync(path.join(assetsDir, file))
  );
  
  if (hasExisting) {
    log('⚠️ 发现现有Logo文件，跳过生成', 'yellow');
    return;
  }
  
  // 创建简单的SVG Logo
  const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad)"/>
  <circle cx="256" cy="200" r="60" fill="white" opacity="0.9"/>
  <circle cx="200" cy="280" r="40" fill="white" opacity="0.7"/>
  <circle cx="312" cy="280" r="40" fill="white" opacity="0.7"/>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">DL</text>
</svg>
  `.trim();
  
  const svgPath = path.join(assetsDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent);
  log('✅ 生成默认SVG Logo', 'green');
  
  // 如果安装了ImageMagick，转换为其他格式
  if (checkImageMagick()) {
    try {
      // 转换为PNG
      execSync(`magick "${svgPath}" -resize 512x512 "${path.join(assetsDir, 'icon.png')}"`, { stdio: 'pipe' });
      log('✅ 生成PNG格式', 'green');
      
      // 转换为ICO (Windows)
      execSync(`magick "${svgPath}" -define icon:auto-resize=256,128,64,48,32,16 "${path.join(assetsDir, 'icon.ico')}"`, { stdio: 'pipe' });
      log('✅ 生成ICO格式', 'green');
      
    } catch (error) {
      log('⚠️ ImageMagick转换失败，请手动转换', 'yellow');
    }
  } else {
    log('⚠️ 未检测到ImageMagick，请手动转换Logo格式', 'yellow');
    log('💡 安装ImageMagick后重新运行此脚本', 'cyan');
  }
}

// 显示Logo制作指南
function showLogoGuide() {
  log('📖 Logo制作指南:', 'blue');
  log('');
  log('1. 准备Logo文件:', 'cyan');
  log('   - 尺寸: 至少 256x256 像素，推荐 512x512', 'yellow');
  log('   - 格式: PNG (透明背景)', 'yellow');
  log('   - 设计: 简洁、清晰，在小尺寸下也能识别', 'yellow');
  log('');
  log('2. 在线工具:', 'cyan');
  log('   - ConvertICO: https://convertico.com/', 'green');
  log('   - IconKitchen: https://icon.kitchen/', 'green');
  log('   - Favicon.io: https://favicon.io/', 'green');
  log('');
  log('3. 命令行工具 (需要ImageMagick):', 'cyan');
  log('   # 转换PNG为ICO', 'yellow');
  log('   magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico', 'green');
  log('');
  log('4. 文件放置:', 'cyan');
  log('   - Windows: assets/icon.ico', 'yellow');
  log('   - macOS: assets/icon.icns', 'yellow');
  log('   - Linux: assets/icon.png', 'yellow');
  log('');
}

// 检查现有Logo
function checkExistingLogos(assetsDir) {
  log('🔍 检查现有Logo文件...', 'cyan');
  
  const files = [
    { name: 'icon.ico', platform: 'Windows' },
    { name: 'icon.icns', platform: 'macOS' },
    { name: 'icon.png', platform: 'Linux' },
    { name: 'icon.svg', platform: '通用' }
  ];
  
  files.forEach(file => {
    const filePath = path.join(assetsDir, file.name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      log(`✅ ${file.name} (${file.platform}) - ${(stats.size / 1024).toFixed(1)}KB`, 'green');
    } else {
      log(`❌ ${file.name} (${file.platform}) - 缺失`, 'red');
    }
  });
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showLogoGuide();
    return;
  }
  
  // 创建assets目录
  const assetsDir = createAssetsDir();
  
  // 检查现有Logo
  checkExistingLogos(assetsDir);
  
  // 生成默认Logo
  if (args.includes('--generate') || args.includes('-g')) {
    generateDefaultLogo(assetsDir);
  }
  
  // 显示指南
  if (!args.includes('--no-guide')) {
    log('');
    showLogoGuide();
  }
  
  log('\n🎉 Logo工具运行完成！', 'green');
  log('💡 使用 --help 查看详细指南', 'cyan');
}

if (require.main === module) {
  main();
} 