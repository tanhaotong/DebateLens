# API配置使用指南

## 概述

DebateLens现在仅支持gemini的API Key配置，包括：

所有API Key都通过前端界面配置，并保存在后端的`config.json`文件中。

## 配置步骤

### 1. 前端配置
1. 在首页点击"API配置"按钮
2. 在弹出的配置窗口中输入相应的API Key
3. 点击"保存配置"按钮

### 2. 配置验证
- **Gemini API Key**: 应以 "AIza" 开头"sk-ant-" 开头

## 后端使用

### 1. 在Python代码中使用

```python
from app.services.ai_service import AIService

# 检查API配置状态
status = AIService.get_api_status()
print(f"Gemini: {status['gemini']}")
print(f"OpenAI: {status['openai']}")
print(f"Anthropic: {status['anthropic']}")

# 调用AI API（自动选择可用的服务）
try:
    response = await AIService.call_ai_api("你的问题")
    print(response)
except ValueError as e:
    print(f"错误: {e}")

# 指定使用特定服务
try:
    response = await AIService.call_ai_api("你的问题", preferred_service="gemini")
    print(response)
except ValueError as e:
    print(f"错误: {e}")
```

### 2. 在Flask路由中使用

```python
from flask import Blueprint, request, jsonify
from app.services.ai_service import AIService

@bp.route('/api/chat', methods=['POST'])
async def chat():
    try:
        data = request.get_json()
        question = data.get('question', '')
        
        # 使用AI服务
        response = await AIService.call_ai_api(question)
        
        return jsonify({
            'success': True,
            'answer': response
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
```

## 前端使用

### 1. 在React组件中使用

```typescript
import ApiService from '../services/api';

// 检查API状态
const checkApiStatus = async () => {
  const status = await ApiService.getApiStatus();
  console.log('API状态:', status);
};

// 调用AI API
const callAI = async () => {
  try {
    const response = await ApiService.callAIAPI("你的问题");
    console.log('AI回答:', response);
  } catch (error) {
    console.error('API调用失败:', error);
  }
};
```

## 配置文件位置

- **后端配置文件**: `backend/config.json`
- **前端配置**: 通过后端API管理

## 安全注意事项

1. **API Key安全**: 所有API Key都保存在后端，不会暴露给前端
2. **配置文件**: `config.json`文件应该添加到`.gitignore`中
3. **环境变量**: 也可以通过环境变量设置API Key（优先级更高）

## 故障排除

### 1. API Key未配置
错误信息: "没有可用的API Key，请在设置中配置至少一个API Key"
解决方案: 在首页配置至少一个API Key

### 2. API Key格式错误
错误信息: "XXX API Key 格式不正确"
解决方案: 检查API Key格式是否正确

### 3. API调用失败
错误信息: "XXX API 调用失败"
解决方案: 
- 检查API Key是否有效
- 检查网络连接
- 检查API服务是否可用

