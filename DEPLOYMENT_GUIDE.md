# DebateLens 部署指南

## 系统要求

### 基础环境
- **Python**: 3.8 或更高版本
- **Node.js**: 16 或更高版本
- **Git**: 用于克隆项目

### 系统依赖
- **FFmpeg**: 用于音视频处理
- **磁盘空间**: 至少 5GB 可用空间（用于存储视频和音频文件）

## 安装步骤

### 1. 克隆项目
```bash
git clone <repository-url>
cd DebateLens-test
```

### 2. 后端环境配置

#### 2.1 创建Python虚拟环境
```bash
# Windows
cd backend
python -m venv venv
venv\Scripts\activate

# macOS/Linux
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 安装Python依赖
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.3 安装FFmpeg

**Windows:**
1. 下载 FFmpeg: https://ffmpeg.org/download.html
2. 解压到 `C:\ffmpeg`
3. 将 `C:\ffmpeg\bin` 添加到系统环境变量 PATH

**macOS:**
```bash
# 使用 Homebrew
brew install ffmpeg

# 或使用 MacPorts
sudo port install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install epel-release
sudo yum install ffmpeg
```

#### 2.4 配置Gemini API密钥
```bash
# 方法1：通过前端配置（推荐）
# 启动应用后，在首页点击"API配置"按钮

# 方法2：直接编辑配置文件
# 编辑 backend/config.json 文件：
{
  "geminiApiKey": "your_gemini_api_key_here"
}
```

#### 2.5 初始化数据库
```bash
# 确保在虚拟环境中
flask db upgrade
```

#### 2.6 启动后端服务
```bash
python run.py
```
或者
```bash
flask run
```

### 3. 前端环境配置

#### 3.1 安装Node.js依赖
```bash
cd frontend
npm install
```

#### 3.2 启动前端开发服务器
```bash
npm run dev
```

#### 3.3 构建生产版本（可选）
```bash
npm run build
```

## 验证安装

### 1. 检查后端服务
- 访问 http://localhost:5000/api/projects/list
- 应该返回空的项目列表或现有项目

### 2. 检查前端服务
- 访问 http://localhost:5173
- 应该看到项目首页

### 3. 测试API配置
```bash
cd backend
python test_config.py
```

## 常见问题解决

### 1. Python依赖安装失败

**问题**: `pip install` 失败
**解决方案**:
```bash
# 升级pip
pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/
```

### 2. FFmpeg未找到

**问题**: `ffmpeg: command not found`
**解决方案**:
- 确保FFmpeg已正确安装
- 检查环境变量PATH是否包含FFmpeg路径
- 重启终端或IDE

### 3. 数据库初始化失败

**问题**: `flask db upgrade` 失败
**解决方案**:
```bash
# 删除现有数据库文件（如果存在）
rm backend/instance/debatelens.db

# 重新初始化
flask db upgrade
```

### 4. Gemini API配置错误

**问题**: `Gemini API Key 未配置`
**解决方案**:
1. 确保 `backend/config.json` 文件存在
2. 检查API密钥格式是否正确（应以"AIza"开头）
3. 重启后端服务

### 5. 端口被占用

**问题**: `Address already in use`
**解决方案**:
```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :5000
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -i :5000
kill -9 <进程ID>
```

## 生产环境部署

### 1. 使用Gunicorn部署后端

```bash
# 安装Gunicorn
pip install gunicorn

# 启动服务
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### 2. 使用Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. 使用Docker部署

**Dockerfile (后端)**:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 5000

# 启动命令
CMD ["python", "run.py"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    volumes:
      - ./backend/config.json:/app/config.json
      - ./backend/temp:/app/temp
    environment:
      - FLASK_ENV=production

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

## 性能优化建议

### 1. 数据库优化
- 定期清理临时文件
- 监控数据库大小
- 考虑使用PostgreSQL替代SQLite（生产环境）

### 2. 文件存储优化
- 定期清理 `temp` 目录
- 考虑使用云存储服务
- 设置文件大小限制

### 3. API优化
- 启用缓存
- 使用CDN加速静态资源
- 监控API响应时间

## 安全注意事项

### 1. API密钥安全
- 不要在代码中硬编码API密钥
- 使用环境变量或配置文件
- 定期轮换API密钥

### 2. 文件上传安全
- 限制上传文件类型和大小
- 扫描上传文件
- 使用安全的文件存储

### 3. 网络安全
- 启用HTTPS
- 配置防火墙
- 定期更新依赖包

## 监控和日志

### 1. 日志配置
```python
# 在 backend/app/__init__.py 中添加
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

### 2. 健康检查
```bash
# 检查后端服务状态
curl http://localhost:5000/api/status

# 检查数据库连接
python -c "from app import create_app; from app.models import db; app = create_app(); app.app_context().push(); print('Database connected')"
```

## 故障排除

### 1. 查看日志
```bash
# 后端日志
tail -f backend/app.log

# 前端日志（浏览器开发者工具）
# 打开浏览器开发者工具查看Console
```

### 2. 检查服务状态
```bash
# 检查Python进程
ps aux | grep python

# 检查端口占用
netstat -tulpn | grep :5000
```

### 3. 重置环境
```bash
# 删除虚拟环境重新创建
rm -rf backend/venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 联系支持

如果遇到部署问题，请：
1. 检查本文档的常见问题部分
2. 查看项目GitHub Issues
3. 提供详细的错误信息和系统环境 