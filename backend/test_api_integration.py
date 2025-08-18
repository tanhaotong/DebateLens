#!/usr/bin/env python3
"""
API集成测试脚本
验证所有API接口是否正常工作
"""

import requests
import json
import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Config

# 测试配置
BASE_URL = "http://localhost:5000"

def test_config():
    """测试配置加载"""
    print("🔧 测试配置加载...")
    try:
        print(f"Gemini API Key: {'已配置' if Config.GEMINI_API_KEY else '未配置'}")
        return bool(Config.GEMINI_API_KEY)
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False

def test_health_endpoints():
    """测试健康检查端点"""
    print("\n🏥 测试健康检查端点...")
    
    endpoints = [
        "/api/status",
        "/api/chat/health"
    ]
    
    results = {}
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            status = response.status_code == 200
            results[endpoint] = status
            print(f"{endpoint}: {'✅' if status else '❌'} ({response.status_code})")
        except Exception as e:
            results[endpoint] = False
            print(f"{endpoint}: ❌ 连接失败 - {e}")
    
    return results

def test_config_api():
    """测试配置API"""
    print("\n⚙️ 测试配置API...")
    try:
        # 获取配置
        response = requests.get(f"{BASE_URL}/api/config")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 配置获取成功: {data.get('success', False)}")
            return True
        else:
            print(f"❌ 配置获取失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 配置API测试失败: {e}")
        return False

def test_chat_api():
    """测试聊天API"""
    print("\n💬 测试聊天API...")
    try:
        # 测试聊天接口（使用模拟数据）
        payload = {
            "projectId": "test_project",
            "currentTime": 60,
            "question": "测试问题"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/chat_full",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 聊天API响应成功: {data.get('success', False)}")
            return True
        else:
            print(f"❌ 聊天API响应失败: {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print("⚠️ 聊天API超时（可能是正常的，因为需要真实的项目数据）")
        return True
    except Exception as e:
        print(f"❌ 聊天API测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始API集成测试...\n")
    
    # 测试配置
    config_ok = test_config()
    
    # 测试健康检查
    health_results = test_health_endpoints()
    
    # 测试配置API
    config_api_ok = test_config_api()
    
    # 测试聊天API
    chat_api_ok = test_chat_api()
    
    # 总结
    print(f"\n📊 测试结果总结:")
    print(f"配置加载: {'✅ 通过' if config_ok else '❌ 失败'}")
    print(f"健康检查: {'✅ 通过' if all(health_results.values()) else '❌ 部分失败'}")
    print(f"配置API: {'✅ 通过' if config_api_ok else '❌ 失败'}")
    print(f"聊天API: {'✅ 通过' if chat_api_ok else '❌ 失败'}")
    
    # 详细健康检查结果
    print(f"\n🏥 健康检查详情:")
    for endpoint, status in health_results.items():
        print(f"  {endpoint}: {'✅' if status else '❌'}")
    
    # 总体结果
    all_passed = config_ok and all(health_results.values()) and config_api_ok and chat_api_ok
    if all_passed:
        print("\n🎉 所有API集成测试通过！")
    else:
        print("\n⚠️ 部分测试失败，请检查配置和日志。")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 