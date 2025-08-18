#!/usr/bin/env python3
"""
配置测试脚本
用于验证API配置是否正确加载
"""

import os
import sys

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import Config

def test_config():
    """测试配置加载"""
    print("=== API配置测试 ===")
    print(f"Gemini API Key: {'已配置' if Config.GEMINI_API_KEY else '未配置'}")
    print(f"OpenAI API Key: {'已配置' if Config.OPENAI_API_KEY else '未配置'}")
    print(f"Anthropic API Key: {'已配置' if Config.ANTHROPIC_API_KEY else '未配置'}")
    
    if Config.GEMINI_API_KEY:
        print(f"Gemini Key 前10位: {Config.GEMINI_API_KEY[:10]}...")
    if Config.OPENAI_API_KEY:
        print(f"OpenAI Key 前10位: {Config.OPENAI_API_KEY[:10]}...")
    if Config.ANTHROPIC_API_KEY:
        print(f"Anthropic Key 前10位: {Config.ANTHROPIC_API_KEY[:10]}...")
    
    print("\n=== 环境变量检查 ===")
    print(f"GEMINI_API_KEY 环境变量: {'已设置' if os.environ.get('GEMINI_API_KEY') else '未设置'}")
    print(f"OPENAI_API_KEY 环境变量: {'已设置' if os.environ.get('OPENAI_API_KEY') else '未设置'}")
    print(f"ANTHROPIC_API_KEY 环境变量: {'已设置' if os.environ.get('ANTHROPIC_API_KEY') else '未设置'}")
    
    print("\n=== 配置文件检查 ===")
    config_file = os.path.join(os.path.dirname(__file__), 'config.json')
    if os.path.exists(config_file):
        print(f"配置文件存在: {config_file}")
        try:
            import json
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            print(f"配置文件内容: {config}")
        except Exception as e:
            print(f"读取配置文件失败: {e}")
    else:
        print(f"配置文件不存在: {config_file}")

if __name__ == "__main__":
    test_config() 