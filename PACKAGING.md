# 📦 DebateLens 打包说明

## 最终成功的打包方法

经过测试，最终成功的打包命令是：

```bash
# 快速打包（推荐）
npm run build:quick

# 或者手动执行
npm run build:frontend && electron-builder
```

## 简化的打包脚本

我们保留了以下有用的脚本：

### 开发相关
- `npm run dev` - 启动开发环境
- `npm run dev:backend` - 启动后端服务
- `npm run dev:frontend` - 启动前端服务

### 构建相关
- `npm run build:frontend` - 构建前端
- `npm run build:quick` - 快速打包
- `npm run build:complete` - 完整打包（包含环境检查）

### 依赖管理
- `npm run install:all` - 安装所有依赖
- `npm run install:deps` - 安装Node.js依赖
- `npm run install:minimal` - 最小依赖安装

### 版本管理
- `npm run version:patch` - 增加修订版本
- `npm run version:minor` - 增加次版本
- `npm run version:major` - 增加主版本
- `npm run build:version` - 自动增加版本并打包

### Logo管理
- `npm run logo:check` - 检查Logo文件
- `npm run logo:generate` - 生成默认Logo
- `npm run logo:help` - 查看Logo制作指南

## 已删除的不必要脚本

删除了以下不再使用的脚本：
- `build` - 旧的构建命令
- `build:electron` - 旧的electron构建
- `pack` - 开发模式打包
- `dist` - 旧的打包命令
- `dist:win/mac/linux` - 平台特定打包
- `start` - 启动electron
- `build:fast` - 重复的快速构建

## 打包配置

打包配置在 `package.json` 的 `build` 字段中：

```json
{
  "build": {
    "appId": "com.debatelens.app",
    "productName": "DebateLens",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "frontend/dist/**/*",
      "backend/**/*",
      "node_modules/python-shell/**/*",
      "package.json"
    ],
    "win": {
      "target": [{"target": "nsis", "arch": ["x64"]}],
      "icon": "assets/icon.ico"
    }
  }
}
```

## 注意事项

1. **依赖问题**: 确保 `python-shell` 在 `dependencies` 而不是 `devDependencies` 中
2. **Logo文件**: 确保 `assets/icon.ico` 文件存在
3. **版本号**: 确保 `package.json` 中有正确的版本号和 `author` 字段
4. **网络问题**: 如果下载依赖失败，可以设置镜像源

## 常见问题

### Q: electron-builder 模块找不到
```bash
npm install electron-builder --save-dev
```

### Q: python-shell 模块找不到
确保在 `dependencies` 中：
```json
{
  "dependencies": {
    "python-shell": "^5.0.0"
  }
}
```

### Q: 打包时出现权限错误
```bash
# 关闭相关进程
taskkill /f /im node.exe
taskkill /f /im electron.exe

# 清理并重新安装
Remove-Item -Recurse -Force node_modules
npm install
```

## 输出文件

打包完成后，在 `dist/` 目录下会生成：
- `DebateLens Setup.exe` - Windows安装程序
- 其他平台对应的安装文件

---

**总结**: 最终成功的打包方法就是 `npm run build:quick`，其他复杂的脚本都已简化或删除。 