# DebateLens 技术架构文档

## 系统架构概览

DebateLens采用前后端分离的微服务架构，主要包含以下组件：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用      │    │   后端API服务   │    │   外部服务      │
│   (React)       │◄──►│   (Flask)       │◄──►│   (Gemini API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   静态资源      │    │   SQLite数据库  │    │   视频处理      │
│   (Vite)        │    │   (SQLAlchemy)  │    │   (FFmpeg)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 前端架构

### 技术栈
- **React 18**: 现代化前端框架，支持并发特性
- **TypeScript**: 类型安全的JavaScript超集
- **Ant Design**: 企业级UI组件库
- **D3.js**: 数据可视化库
- **Vite**: 快速构建工具
- **React Router**: 客户端路由管理

### 组件架构

```
src/
├── components/           # 核心组件
│   ├── ProjectList.tsx   # 项目列表管理
│   ├── DebatePlayer.tsx  # 视频播放器主组件
│   ├── AnalysisList.tsx  # 分析结果列表
│   ├── AttackDefenceBubble.tsx    # 气泡图可视化
│   ├── AttackDefenseTree.tsx      # 攻防树可视化
│   ├── AttackDefenceTree2.tsx     # 树形图2可视化
│   ├── ArgumentMap.tsx            # 论证地图可视化
│   ├── GeminiChat.tsx             # AI聊天组件
│   └── VideoSelector.tsx          # 视频选择器
├── types/                # TypeScript类型定义
│   └── analysis.ts       # 分析数据类型
├── hooks/                # 自定义Hooks
│   └── useAnalysisData.ts # 分析数据Hook
└── assets/               # 静态资源
```

### 数据流

```
用户操作 → 组件状态更新 → API调用 → 后端处理 → 数据返回 → UI更新
    ↑                                                           ↓
    └─────────────── 状态管理 (useState/useEffect) ─────────────┘
```

### 可视化组件设计

#### 1. 气泡图 (AttackDefenceBubble)
- **布局算法**: D3.js力导向布局
- **节点表示**: 圆形节点，大小基于论证强度
- **连接关系**: 线条连接，区分攻击/支持关系
- **交互功能**: 拖拽、缩放、点击跳转

#### 2. 攻防树 (AttackDefenseTree)
- **布局算法**: D3.js树形布局
- **节点表示**: 矩形节点，层次化展示
- **连接关系**: 父子关系，支持多层级
- **交互功能**: 展开/折叠、时间同步

#### 3. 论证地图 (ArgumentMap)
- **布局算法**: D3.js力导向布局
- **节点表示**: 圆形节点，颜色区分阵营
- **连接关系**: 箭头连接，虚线表示攻击，实线表示支持
- **交互功能**: 缩放、拖拽、图例说明

## 后端架构

### 技术栈
- **Flask**: 轻量级Python Web框架
- **SQLAlchemy**: ORM数据库操作
- **Flask-Migrate**: 数据库迁移管理
- **Google Generative AI**: Gemini API集成
- **FFmpeg**: 音视频处理
- **yt-dlp**: 视频下载工具

### 服务架构

```
app/
├── api/                  # API路由层
│   ├── project.py        # 项目管理API
│   ├── analysis.py       # 分析数据API
│   ├── chat.py          # 聊天API
│   ├── video.py         # 视频API
│   ├── transcribe.py    # 转录API
│   ├── proxy.py         # 代理API
│   └── status.py        # 状态API
├── services/            # 业务服务层
│   ├── analysis_service.py      # 分析服务
│   ├── audio_service.py         # 音频服务
│   ├── audio_transcribe_service.py # 转录服务
│   ├── bilibili_service.py      # Bilibili服务
│   ├── gemini_chat_service.py   # Gemini聊天服务
│   └── video_slice_service.py   # 视频切片服务
├── models/              # 数据模型层
│   ├── db.py            # 数据库配置
│   ├── video.py         # 视频模型
│   ├── analysis_result.py # 分析结果模型
│   └── transcription.py # 转录模型
└── config.py            # 配置文件
```

### 数据模型设计

#### Project（项目）
```python
class Project(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # UUID
    bv_id = db.Column(db.String(20), unique=True)    # Bilibili视频ID
    title = db.Column(db.String(200))                # 视频标题
    duration = db.Column(db.Float)                   # 视频时长
    cover = db.Column(db.String(500))                # 封面URL
    uploader = db.Column(db.String(100))             # 上传者
    bilibili_url = db.Column(db.String(500))         # Bilibili链接
    status = db.Column(db.String(20))                # 处理状态
    created_at = db.Column(db.DateTime)              # 创建时间
```

#### AnalysisResult（分析结果）
```python
class AnalysisResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey('project.id'))
    analysis_id = db.Column(db.String(50))           # 分析ID
    global_fs = db.Column(db.String(20))             # 时间戳
    speaker = db.Column(db.String(100))              # 发言者
    analysis_type = db.Column(db.String(50))         # 分析类型
    content = db.Column(db.Text)                     # 内容
    technique = db.Column(db.String(200))            # 技术手法
    target = db.Column(db.String(50))                # 攻击目标
    base = db.Column(db.String(50))                  # 支持基础
    goal = db.Column(db.String(200))                 # 目标
    pros_gain = db.Column(db.Float)                  # 正方得分
    cons_gain = db.Column(db.Float)                  # 反方得分
    summary = db.Column(db.String(500))              # 摘要
```

### API设计

#### RESTful API规范
- **GET**: 获取资源
- **POST**: 创建资源
- **PUT**: 更新资源
- **DELETE**: 删除资源

#### 响应格式
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

#### 错误处理
```json
{
  "success": false,
  "error": "错误描述",
  "code": 400
}
```

## 数据处理流程

### 视频处理流程

```
1. 视频上传
   ↓
2. 音频提取 (FFmpeg)
   ↓
3. 语音转录 (Gemini API)
   ↓
4. AI分析 (Gemini API)
   ↓
5. 数据存储 (SQLite)
   ↓
6. 前端展示
```

### AI分析流程

```
1. 转录文本预处理
   ↓
2. 分段处理
   ↓
3. Gemini API调用
   ↓
4. 结果解析
   ↓
5. 数据标准化
   ↓
6. 存储到数据库
```

### 实时处理机制

#### 异步处理
- 使用Python threading进行后台处理
- 状态更新机制
- 错误重试机制

#### 进度跟踪
```python
# 状态枚举
PROCESSING_STATES = {
    'uploading': '上传中',
    'extracting': '提取音频',
    'transcribing': '转录中',
    'analyzing': '分析中',
    'completed': '完成',
    'failed': '失败'
}
```

## 性能优化

### 前端优化
1. **代码分割**: 使用React.lazy进行组件懒加载
2. **虚拟滚动**: 长列表使用虚拟滚动
3. **缓存策略**: 使用useMemo和useCallback优化渲染
4. **图片优化**: 使用WebP格式和懒加载

### 后端优化
1. **数据库索引**: 为常用查询字段添加索引
2. **连接池**: 使用数据库连接池
3. **缓存**: 实现API响应缓存
4. **异步处理**: 使用后台任务处理耗时操作

### 视频处理优化
1. **并行处理**: 音频提取和转录并行进行
2. **分段处理**: 长视频分段处理
3. **格式优化**: 选择合适的视频格式和编码参数

## 安全考虑

### 前端安全
1. **输入验证**: 客户端输入验证
2. **XSS防护**: 使用React的安全渲染
3. **CSRF防护**: 使用CSRF Token

### 后端安全
1. **输入验证**: 服务器端输入验证
2. **文件上传**: 文件类型和大小限制
3. **API限流**: 实现API调用频率限制
4. **错误处理**: 避免敏感信息泄露

### 数据安全
1. **数据加密**: 敏感数据加密存储
2. **访问控制**: 实现基于角色的访问控制
3. **备份策略**: 定期数据备份

## 部署架构

### 开发环境
```
┌─────────────────┐    ┌─────────────────┐
│   Vite Dev      │    │   Flask Dev     │
│   (localhost:5173) │    │   (localhost:5000) │
└─────────────────┘    └─────────────────┘
```

### 生产环境
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Gunicorn      │    │   SQLite        │
│   (静态文件)     │◄──►│   (Flask应用)   │◄──►│   (数据库)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 容器化部署
```dockerfile
# 后端Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "run:app"]
```

## 监控与日志

### 日志系统
1. **应用日志**: 记录应用运行状态
2. **错误日志**: 记录错误和异常
3. **访问日志**: 记录API访问情况
4. **性能日志**: 记录性能指标

### 监控指标
1. **系统指标**: CPU、内存、磁盘使用率
2. **应用指标**: 响应时间、错误率、吞吐量
3. **业务指标**: 视频处理成功率、用户活跃度

## 扩展性设计

### 水平扩展
1. **负载均衡**: 使用Nginx进行负载均衡
2. **数据库分片**: 支持数据库水平分片
3. **缓存集群**: 使用Redis集群

### 垂直扩展
1. **模块化设计**: 服务模块化，便于扩展
2. **插件系统**: 支持可视化组件插件
3. **配置化**: 支持配置驱动的功能开关

## 未来规划

### 短期目标
- [ ] 支持更多视频平台
- [ ] 优化AI分析准确性
- [ ] 增加更多可视化类型
- [ ] 移动端适配

### 长期目标
- [ ] 微服务架构重构
- [ ] 分布式部署支持
- [ ] 机器学习模型优化
- [ ] 实时协作功能 