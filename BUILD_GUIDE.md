# 🚀 DebateLens 打包指南

本指南将帮助你完成 DebateLens 应用的打包、版本管理和Logo更换。

## 📋 目录

- [快速开始](#快速开始)
- [环境准备](#环境准备)
- [打包命令](#打包命令)
- [版本管理](#版本管理)
- [Logo更换](#logo更换)
- [常见问题](#常见问题)
- [高级配置](#高级配置)

## ⚡ 快速开始

### 一键打包
```bash
# 快速打包（推荐）
npm run build:quick

# 完整打包（包含环境检查）
npm run build:complete
```

### 版本管理打包
```bash
# 自动增加版本号并打包
npm run build:version
```

## 🔧 环境准备

### 1. 系统要求
- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: v16.0.0 或更高版本
- **Python**: 3.8 或更高版本
- **内存**: 至少 4GB RAM
- **磁盘空间**: 至少 2GB 可用空间

### 2. 依赖安装
```bash
# 安装所有依赖
npm run install:all

# 或者分步安装
npm install                    # 根目录依赖
cd frontend && npm install     # 前端依赖
cd ../backend && pip install -r requirements.txt  # 后端依赖
```

### 3. 环境检查
```bash
# 检查环境配置
npm run build:setup
```

## 📦 打包命令

### 基础打包命令

| 命令 | 说明 | 适用场景 |
|------|------|----------|
| `npm run build:quick` | 快速打包 | 日常开发，快速测试 |
| `npm run build:complete` | 完整打包 | 正式发布，包含环境检查 |
| `npm run build:setup` | 环境设置 | 首次安装，环境配置 |
| `npm run build:version` | 版本打包 | 发布新版本 |

### 平台特定打包

```bash
# Windows 打包
npm run dist:win

# macOS 打包
npm run dist:mac

# Linux 打包
npm run dist:linux
```

### 开发模式打包

```bash
# 开发模式（不压缩）
npm run pack

# 生产模式（压缩优化）
npm run dist
```

## 🔄 版本管理

### 自动化版本管理

我们提供了完整的版本管理工具，支持语义化版本控制。

#### 版本类型说明

- **patch** (修订版本): 修复bug，向后兼容
  - 示例: `1.0.0` → `1.0.1`
- **minor** (次版本): 新功能，向后兼容
  - 示例: `1.0.0` → `1.1.0`
- **major** (主版本): 重大更新，可能不兼容
  - 示例: `1.0.0` → `2.0.0`

#### 版本管理命令

```bash
# 增加修订版本
npm run version:patch

# 增加次版本
npm run version:minor

# 增加主版本
npm run version:major

# 自动增加版本并打包
npm run build:version
```

#### 手动版本管理

```bash
# 查看当前版本
node scripts/version-manager.js --help

# 手动更新版本
node scripts/version-manager.js patch
node scripts/version-manager.js minor
node scripts/version-manager.js major

# 只更新版本，不构建
node scripts/version-manager.js patch --no-build
```

#### 版本管理最佳实践

1. **开发阶段**: 使用 `patch` 版本
2. **功能更新**: 使用 `minor` 版本
3. **重大重构**: 使用 `major` 版本
4. **发布前**: 使用 `npm run build:version`

## 🎨 Logo更换

### Logo文件要求

#### 文件格式和尺寸

| 平台 | 格式 | 尺寸 | 文件路径 |
|------|------|------|----------|
| Windows | `.ico` | 256x256+ | `assets/icon.ico` |
| macOS | `.icns` | 512x512+ | `assets/icon.icns` |
| Linux | `.png` | 512x512+ | `assets/icon.png` |

#### 设计规范

- **尺寸**: 最小 256x256 像素，推荐 512x512 或更大
- **背景**: 透明或白色背景
- **设计**: 简洁、清晰，在小尺寸下也能识别
- **颜色**: 使用高对比度颜色
- **格式**: 支持透明背景

### Logo制作工具

#### 在线工具
- [ConvertICO](https://convertico.com/) - PNG转ICO
- [IconKitchen](https://icon.kitchen/) - 生成应用图标
- [Favicon.io](https://favicon.io/) - 图标生成器

#### 设计软件
- **Photoshop** - 专业设计
- **GIMP** - 免费开源
- **Figma** - 在线协作
- **Sketch** - macOS专用

#### 命令行工具
```bash
# 安装 ImageMagick
# Windows: 下载安装包
# macOS: brew install imagemagick
# Ubuntu: sudo apt-get install imagemagick

# 转换PNG为ICO
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# 转换PNG为ICNS (macOS)
# 需要先安装 iconutil 工具
```

### Logo更换步骤

#### 1. 准备Logo文件

```bash
# 创建assets目录（如果不存在）
mkdir -p assets

# 放置Logo文件
# Windows: assets/icon.ico
# macOS: assets/icon.icns  
# Linux: assets/icon.png
```

#### 2. 验证Logo文件

```bash
# 检查文件是否存在
ls assets/

# 应该看到以下文件：
# icon.ico (Windows)
# icon.icns (macOS)
# icon.png (Linux)
```

#### 3. 更新配置

确保 `package.json` 中的图标路径正确：

```json
{
  "build": {
    "win": {
      "icon": "assets/icon.ico"
    },
    "mac": {
      "icon": "assets/icon.icns"
    },
    "linux": {
      "icon": "assets/icon.png"
    }
  }
}
```

#### 4. 重新打包

```bash
# 快速打包测试
npm run build:quick

# 或完整打包
npm run build:complete
```

#### 5. 验证Logo

打包完成后，检查：
- 桌面快捷方式图标
- 开始菜单图标
- 任务栏图标
- 应用程序属性中的图标

### Logo制作示例

#### 使用在线工具制作ICO

1. 访问 [ConvertICO](https://convertico.com/)
2. 上传你的PNG图片
3. 下载生成的ICO文件
4. 重命名为 `icon.ico` 并放到 `assets/` 目录

#### 使用ImageMagick批量生成

```bash
# 创建不同尺寸的图标
magick logo.png -resize 16x16 icon-16.png
magick logo.png -resize 32x32 icon-32.png
magick logo.png -resize 48x48 icon-48.png
magick logo.png -resize 64x64 icon-64.png
magick logo.png -resize 128x128 icon-128.png
magick logo.png -resize 256x256 icon-256.png

# 合并为ICO文件
magick icon-16.png icon-32.png icon-48.png icon-64.png icon-128.png icon-256.png icon.ico
```

## ❓ 常见问题

### 依赖问题

#### Q: 安装依赖时出现网络错误
```bash
# 设置镜像源
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

#### Q: electron-builder 模块找不到
```bash
# 重新安装依赖
npm run install:deps

# 或最小依赖安装
npm run install:minimal
```

#### Q: python-shell 模块找不到
确保 `python-shell` 在 `dependencies` 而不是 `devDependencies` 中：

```json
{
  "dependencies": {
    "python-shell": "^5.0.0"
  }
}
```

### 打包问题

#### Q: 打包时出现权限错误
```bash
# 关闭相关进程
taskkill /f /im node.exe
taskkill /f /im electron.exe

# 清理并重新安装
Remove-Item -Recurse -Force node_modules
npm install
```

#### Q: 打包文件过大
- 检查 `node_modules` 是否包含不必要的依赖
- 使用 `npm prune` 清理未使用的依赖
- 考虑使用 `webpack` 进行代码分割

#### Q: Logo不显示
- 检查文件路径是否正确
- 确认文件格式和尺寸
- 重新打包应用

### 版本问题

#### Q: 版本号格式错误
确保版本号符合语义化版本规范：`主版本.次版本.修订版本`

#### Q: 版本更新后打包失败
```bash
# 清理缓存
npm cache clean --force

# 重新安装依赖
npm install

# 重新打包
npm run build:quick
```

## ⚙️ 高级配置

### 自定义打包配置

#### 修改应用信息

在 `package.json` 中修改：

```json
{
  "name": "debatelens",
  "version": "1.0.0",
  "description": "辩论视频分析工具",
  "author": "你的名字",
  "build": {
    "appId": "com.yourcompany.debatelens",
    "productName": "DebateLens",
    "copyright": "Copyright © 2024"
  }
}
```

#### 自定义安装程序

```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "DebateLens"
    }
  }
}
```

#### 代码签名（可选）

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password"
    }
  }
}
```

### 自动化脚本

#### 创建发布脚本

```bash
#!/bin/bash
# scripts/release.sh

# 更新版本
npm run version:minor

# 构建应用
npm run build:quick

# 创建发布标签
git tag v$(node -p "require('./package.json').version")

# 推送标签
git push origin --tags

echo "发布完成！"
```

#### 批量构建脚本

```bash
#!/bin/bash
# scripts/build-all.sh

# Windows
npm run dist:win

# macOS  
npm run dist:mac

# Linux
npm run dist:linux

echo "所有平台构建完成！"
```

## 📞 技术支持

如果遇到问题，请：

1. 查看本指南的常见问题部分
2. 检查控制台错误信息
3. 查看项目日志文件
4. 提交 Issue 到项目仓库

---

**祝您打包顺利！** 🎉 