#!/usr/bin/env python3
"""
测试 Gemini 聊天功能
"""

import requests
import json

# 测试配置
BASE_URL = "http://localhost:5000"
PROJECT_ID = "BV1yE421N7gw"  # 替换为实际的项目ID

def test_health_check():
    """测试健康检查"""
    print("🔍 测试健康检查...")
    try:
        response = requests.get(f"{BASE_URL}/api/chat/health")
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 健康检查失败: {e}")
        return False

def test_transcript_download():
    """测试文字稿下载"""
    print(f"\n📄 测试文字稿下载 (项目ID: {PROJECT_ID})...")
    try:
        response = requests.get(f"{BASE_URL}/api/transcribe/download/{PROJECT_ID}")
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 文字稿下载成功")
            print(f"文件大小: {len(data.get('content', ''))} 字符")
            return True
        else:
            print(f"❌ 文字稿下载失败: {response.json()}")
            return False
    except Exception as e:
        print(f"❌ 文字稿下载异常: {e}")
        return False

def test_chat():
    """测试聊天功能"""
    print(f"\n💬 测试聊天功能...")
    try:
        payload = {
            "projectId": PROJECT_ID,
            "currentTime": 60,  # 1分钟
            "question": "请总结一下当前时间点的内容"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/chat",
            json=payload,
            stream=True
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 聊天请求成功，开始接收流式响应...")
            full_response = ""
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data = line_str[6:]
                        if data == '[DONE]':
                            break
                        else:
                            full_response += data
                            print(f"📝 收到: {data}")
            
            print(f"\n📋 完整响应: {full_response}")
            return True
        else:
            print(f"❌ 聊天请求失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 聊天测试异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试 Gemini 聊天功能...\n")
    
    # 测试健康检查
    health_ok = test_health_check()
    
    # 测试文字稿下载
    transcript_ok = test_transcript_download()
    
    # 测试聊天功能
    chat_ok = test_chat()
    
    # 总结
    print(f"\n📊 测试结果总结:")
    print(f"健康检查: {'✅ 通过' if health_ok else '❌ 失败'}")
    print(f"文字稿下载: {'✅ 通过' if transcript_ok else '❌ 失败'}")
    print(f"聊天功能: {'✅ 通过' if chat_ok else '❌ 失败'}")
    
    if all([health_ok, transcript_ok, chat_ok]):
        print("\n🎉 所有测试通过！Gemini 聊天功能正常工作。")
    else:
        print("\n⚠️ 部分测试失败，请检查配置和日志。")

if __name__ == "__main__":
    main() 