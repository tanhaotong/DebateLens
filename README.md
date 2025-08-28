 # DebateLens - 辩论视频智能分析系统

## 项目简介

DebateLens 是一个基于人工智能的辩论视频智能分析系统，能够自动分析辩论视频内容，提取攻防逻辑，生成可视化图表，并提供智能对话功能。系统支持Bilibili视频链接和本地视频文件上传。

## 功能特性

### 🎯 核心功能
- **视频上传与处理**：支持Bilibili链接和本地视频文件上传
- **音频提取与转录**：自动提取音频并进行语音转文字
- **AI智能分析**：基于Gemini API的辩论内容深度分析
- **多维度可视化**：树形图和气泡图两种可视化方式
- **智能对话助手**：基于视频内容的AI智能问答
- **实时时间同步**：视频播放与分析结果实时同步
- **API配置管理**：支持Gemini API密钥配置
- **配置测试工具**：提供配置验证和测试功能
- **AI智能分析**：基于Gemini API的辩论内容深度分析
- **多维度可视化**：树形图和气泡图两种可视化方式
- **智能对话助手**：基于视频内容的AI智能问答
- **实时时间同步**：视频播放与分析结果实时同步
- **API配置管理**：支持Gemini API密钥配置

### 📊 可视化图表
1. **树形图**：改进的树形布局，支持缩放和交互，展示攻防关系
2. **气泡图**：力导向布局展示论证节点和关系，支持动态评分和锚点节点

### 🤖 AI功能
- **智能分析**：自动识别论证类型、攻防关系、技术手法
- **内容总结**：生成论证摘要和关键信息
- **智能问答**：基于当前视频内容的上下文感知对话
- **Markdown渲染**：支持富文本格式的AI回复
- **Gemini AI支持**：基于Google Gemini API的智能分析

## 技术架构

### 前端技术栈
- **React 18**：现代化的前端框架
- **TypeScript**：类型安全的JavaScript
- **Ant Design**：企业级UI组件库
- **D3.js**：数据可视化库
- **Vite**：快速构建工具
- **React Router**：客户端路由

### 后端技术栈
- **Flask**：轻量级Python Web框架
- **SQLAlchemy**：ORM数据库操作
- **Flask-Migrate**：数据库迁移管理
- **Google Generative AI**：Gemini API集成
- **FFmpeg**：音视频处理
- **yt-dlp**：视频下载工具
- **JSON配置**：API密钥配置管理

### 数据库
- **SQLite**：轻量级关系型数据库

## 项目结构

```
DebateLens-test/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API路由
│   │   │   ├── analysis.py # 分析数据API
│   │   │   ├── chat.py     # 聊天API
│   │   │   ├── config.py   # API配置管理
│   │   │   ├── project.py  # 项目管理API
│   │   │   ├── proxy.py    # 代理API
│   │   │   ├── status.py   # 状态API
│   │   │   ├── transcribe.py # 转录API
│   │   │   └── video.py    # 视频API
│   │   ├── models/         # 数据模型
│   │   │   ├── analysis_result.py # 分析结果模型
│   │   │   ├── transcription.py # 转录模型
│   │   │   ├── video.py    # 视频模型
│   │   │   └── db.py       # 数据库配置
│   │   ├── services/       # 业务服务
│   │   │   ├── analysis_service.py # 分析服务
│   │   │   ├── audio_service.py # 音频处理服务
│   │   │   ├── audio_transcribe_service.py # 音频转录服务
│   │   │   ├── bilibili_service.py # B站视频服务
│   │   │   └── gemini_chat_service.py # Gemini聊天服务
│   │   ├── config.py       # 配置文件
│   │   └── __init__.py     # Flask应用初始化
│   ├── migrations/         # 数据库迁移
│   ├── config.json         # API配置文件
│   ├── requirements.txt    # Python依赖
│   └── run.py             # 启动脚本
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── AnalysisList.tsx      # 分析列表
│   │   │   ├── ApiConfigModal.tsx    # API配置弹窗
│   │   │   ├── ArgumentMap.tsx       # 力导向图
│   │   │   ├── AttackDefenseTree.tsx # 静态图
│   │   │   ├── DebatePlayer.tsx      # 视频播放器
│   │   │   ├── GeminiChat.tsx        # AI聊天
│   │   │   ├── ProjectList.tsx       # 项目列表
│   │   │   └── VideoSelector.tsx     # 视频选择器
│   │   ├── config/         # 配置文件
│   │   │   └── api.ts      # API配置接口
│   │   ├── services/       # 服务层
│   │   │   └── api.ts      # API服务
│   │   ├── types/          # TypeScript类型定义
│   │   │   └── analysis.ts # 分析数据类型
│   │   ├── hooks/          # 自定义Hooks
│   │   │   └── useAnalysisData.ts # 分析数据Hook
│   │   ├── assets/         # 静态资源
│   │   ├── App.tsx         # 主应用组件
│   │   └── main.tsx        # 应用入口
│   ├── package.json        # Node.js依赖
│   └── vite.config.ts      # Vite配置
├── docs/                   # 文档
│   └── api_config_guide.md # API配置指南
├── API_CONFIG_GUIDE.md     # API配置文档
├── ARCHITECTURE.md         # 架构文档
├── package.json            # 根目录依赖
└── README.md              # 项目文档
```

## 安装与部署

### 环境要求
- **Python**: 3.8 或更高版本
- **Node.js**: 16 或更高版本
- **FFmpeg**: 用于音视频处理
- **Git**: 用于克隆项目
- **磁盘空间**: 至少 5GB 可用空间

### 快速开始

#### 方法一：使用启动脚本（推荐）

**Windows:**
```bash
# 双击运行 start.bat
# 或在命令行中运行：
start.bat
```

**macOS/Linux:**
```bash
# 给脚本执行权限
chmod +x start.sh

# 运行启动脚本
./start.sh
```

#### 方法二：手动启动

1. **克隆项目**
```bash
git clone <repository-url>
cd DebateLens-test
```

2. **后端配置**
```bash
cd backend

# 创建虚拟环境
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置API密钥（二选一）
# 方法1：启动应用后通过前端配置
# 方法2：编辑 config.json 文件

# 初始化数据库
flask db upgrade

# 启动服务
python run.py
```

3. **前端配置**
```bash
cd frontend
npm install
npm run dev
```

4. **访问应用**
- 前端: http://localhost:5173
- 后端API: http://localhost:5000

### 详细部署指南

请参考 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 获取完整的部署说明，包括：
- 系统依赖安装（FFmpeg等）
- 生产环境部署
- Docker部署
- 常见问题解决
- 性能优化建议

## 使用指南

### 1. 创建项目

1. 打开应用首页
2. 点击"上传视频"按钮
3. 选择上传方式：
   - **Bilibili链接**：输入BV号或完整链接
   - **本地文件**：选择视频文件（支持MP4、AVI等格式）

### 2. 视频处理

1. 上传后系统自动开始处理：
   - 音频提取
   - 语音转录
   - AI分析
2. 处理过程中可查看实时状态
3. 支持失败重试机制

### 3. 查看分析结果

1. **视频播放器**：支持时间跳转和播放控制
2. **分析列表**：显示所有分析条目，包含技术手法
3. **可视化图表**：
   - 树形图：改进的树形布局，支持缩放和交互
   - 气泡图：力导向布局，支持动态评分

### 4. AI智能对话

1. 点击右下角聊天按钮
2. 基于当前视频内容提问
3. 支持Markdown格式回复
4. 上下文感知对话

## API文档

### 项目管理API

#### 获取项目列表
```
GET /api/projects/list
```

#### 上传Bilibili视频
```
POST /api/projects/upload
Content-Type: application/json

{
  "bv_id": "BV1xx411c7mu"
}
```

#### 上传本地视频
```
POST /api/projects/upload_local
Content-Type: multipart/form-data

video_file: <file>
```

#### 删除项目
```
DELETE /api/projects/delete/{project_id}
```

#### 重试处理
```
POST /api/projects/retry/{project_id}
```

### 分析数据API

#### 获取分析数据
```
GET /api/analysis/{project_id}_{type}
```

支持的类型：
- `tree`：树形图数据
- `bubble`：气泡图数据

### 聊天API

#### 流式聊天
```
POST /api/chat/chat
Content-Type: application/json

{
  "message": "用户消息",
  "project_id": "项目ID",
  "current_time": 当前时间
}
```

#### 完整回复聊天
```
POST /api/chat/chat_full
Content-Type: application/json

{
  "message": "用户消息",
  "project_id": "项目ID",
  "current_time": 当前时间
}
```

### 视频API

#### 获取视频文件
```
GET /api/video/{project_id}
```

#### 代理图片
```
GET /api/proxy_image?url={image_url}
```

## 数据模型

### Project（项目）
```python
class Project(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    bv_id = db.Column(db.String(20), unique=True)
    title = db.Column(db.String(200))
    duration = db.Column(db.Float)
    cover = db.Column(db.String(500))
    uploader = db.Column(db.String(100))
    bilibili_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default='processing')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### AnalysisResult（分析结果）
```python
class AnalysisResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey('project.id'))
    analysis_id = db.Column(db.String(50))
    global_fs = db.Column(db.String(20))
    speaker = db.Column(db.String(100))
    analysis_type = db.Column(db.String(50))
    content = db.Column(db.Text)
    technique = db.Column(db.String(200))
    target = db.Column(db.String(50))
    base = db.Column(db.String(50))
    goal = db.Column(db.String(200))
    pros_gain = db.Column(db.Float)
    cons_gain = db.Column(db.Float)
    summary = db.Column(db.String(500))
```

## 开发指南

### 添加新的可视化组件

1. 在`frontend/src/components/`中创建新组件
2. 实现以下接口：
```typescript
interface Props {
  analysis: AnalysisItem[];
  currentTime: number;
  onNodeSelect?: (analysisId: string) => void;
  selectedId?: string;
}
```

3. 在`DebatePlayer.tsx`中添加新的标签页（目前支持树形图和气泡图两种）

### 扩展分析功能

1. 在`backend/app/services/`中添加新的分析服务
2. 在`backend/app/api/analysis.py`中添加新的API端点
3. 更新数据库模型以支持新的分析字段

### 自定义AI提示词

1. 修改`backend/app/services/analysis_service.py`中的提示词模板
2. 调整分析逻辑以适应不同的辩论类型
3. 目前仅支持Gemini API，如需支持其他AI服务需要扩展配置系统

## 部署说明

### 生产环境部署

1. **后端部署**
```bash
# 使用Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app

# 或使用Docker
docker build -t debatelens-backend .
docker run -p 5000:5000 debatelens-backend
```

2. **前端部署**
```bash
npm run build
# 将dist目录部署到Web服务器
```

3. **反向代理配置**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 故障排除

### 常见问题

1. **视频上传失败**
   - 检查FFmpeg是否正确安装
   - 确认视频格式支持
   - 检查磁盘空间

2. **AI分析失败**
   - 验证Gemini API密钥是否正确配置
   - 检查网络连接
   - 查看Gemini API配额限制
   - 确保API密钥以"AIza"开头

3. **数据库错误**
   - 运行数据库迁移：`flask db upgrade`
   - 检查数据库文件权限

4. **前端显示问题**
   - 清除浏览器缓存
   - 检查控制台错误信息
   - 确认API端点可访问

### 日志查看

```bash
# 后端日志
tail -f backend/logs/app.log

# 前端开发日志
# 查看浏览器开发者工具控制台
```

## 贡献指南

1. Fork项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建Pull Request

### 计划功能
- [ ] 支持更多视频平台
- [ ] 增加更多可视化类型
- [ ] 优化AI分析准确性
- [ ] 添加用户管理系统
- [ ] 支持批量处理
- [ ] 移动端适配
- [ ] 支持更多AI服务（OpenAI、Anthropic等）
- [ ] 桌面应用打包