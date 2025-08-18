import os
import json
import requests
from typing import Optional, Dict, Any
from app.config import Config

class AIService:
    """AI服务类，统一管理所有AI API调用"""
    
    @staticmethod
    def get_api_key(service: str) -> Optional[str]:
        """获取指定服务的API Key"""
        if service == 'gemini':
            return Config.GEMINI_API_KEY
        elif service == 'openai':
            return Config.OPENAI_API_KEY
        elif service == 'anthropic':
            return Config.ANTHROPIC_API_KEY
        return None
    
    @staticmethod
    def is_api_configured(service: str) -> bool:
        """检查指定服务的API是否已配置"""
        api_key = AIService.get_api_key(service)
        return bool(api_key and api_key.strip())
    
    @staticmethod
    async def call_gemini_api(prompt: str, model: str = 'gemini-pro') -> str:
        """调用Gemini API"""
        api_key = AIService.get_api_key('gemini')
        if not api_key:
            raise ValueError('Gemini API Key 未配置')
        
        url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
        
        payload = {
            'contents': [{
                'parts': [{
                    'text': prompt
                }]
            }]
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data['candidates'][0]['content']['parts'][0]['text']
    
    @staticmethod
    async def call_openai_api(prompt: str, model: str = 'gpt-3.5-turbo') -> str:
        """调用OpenAI API"""
        api_key = AIService.get_api_key('openai')
        if not api_key:
            raise ValueError('OpenAI API Key 未配置')
        
        url = 'https://api.openai.com/v1/chat/completions'
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        
        payload = {
            'model': model,
            'messages': [{
                'role': 'user',
                'content': prompt
            }],
            'max_tokens': 1000,
            'temperature': 0.7
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data['choices'][0]['message']['content']
    
    @staticmethod
    async def call_anthropic_api(prompt: str, model: str = 'claude-3-sonnet-20240229') -> str:
        """调用Anthropic API"""
        api_key = AIService.get_api_key('anthropic')
        if not api_key:
            raise ValueError('Anthropic API Key 未配置')
        
        url = 'https://api.anthropic.com/v1/messages'
        
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        }
        
        payload = {
            'model': model,
            'max_tokens': 1000,
            'messages': [{
                'role': 'user',
                'content': prompt
            }]
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        return data['content'][0]['text']
    
    @staticmethod
    async def call_ai_api(prompt: str, preferred_service: Optional[str] = None) -> str:
        """智能选择API服务"""
        # 如果指定了首选服务，优先使用
        if preferred_service:
            if AIService.is_api_configured(preferred_service):
                try:
                    if preferred_service == 'gemini':
                        return await AIService.call_gemini_api(prompt)
                    elif preferred_service == 'openai':
                        return await AIService.call_openai_api(prompt)
                    elif preferred_service == 'anthropic':
                        return await AIService.call_anthropic_api(prompt)
                except Exception as e:
                    print(f'{preferred_service} API 调用失败: {e}')
        
        # 按优先级尝试可用的API
        services = ['gemini', 'openai', 'anthropic']
        
        for service in services:
            if AIService.is_api_configured(service):
                try:
                    if service == 'gemini':
                        return await AIService.call_gemini_api(prompt)
                    elif service == 'openai':
                        return await AIService.call_openai_api(prompt)
                    elif service == 'anthropic':
                        return await AIService.call_anthropic_api(prompt)
                except Exception as e:
                    print(f'{service} API 调用失败: {e}')
                    continue
        
        raise ValueError('没有可用的API Key，请在设置中配置至少一个API Key')
    
    @staticmethod
    def get_api_status() -> Dict[str, bool]:
        """获取API配置状态"""
        return {
            'gemini': AIService.is_api_configured('gemini'),
            'openai': AIService.is_api_configured('openai'),
            'anthropic': AIService.is_api_configured('anthropic')
        } 