import requests
import json
import time
import os.path

# 验证文件路径
audio_path = "D:\\Git\\DebateLens-test\\backend\\temp\\BV1Qw4m1Y7xp\\BV1Qw4m1Y7xp.mp3"
if not os.path.exists(audio_path):
    print(f"错误: 音频文件不存在 - {audio_path}")
    print("当前工作目录:", os.getcwd())
    exit(1)
else:
    print(f"找到音频文件: {audio_path}")
    print(f"文件大小: {os.path.getsize(audio_path) / 1024 / 1024:.2f} MB")

# 1. 测试服务器连接
try:
    health_check = requests.get("http://127.0.0.1:5000/health")
    print(f"服务器状态检查: {health_check.status_code}")
    if health_check.status_code == 200:
        print("服务器运行正常")
    else:
        print(f"警告: 服务器返回非200状态码: {health_check.status_code}")
except Exception as e:
    print(f"错误: 无法连接到服务器 - {e}")
    print("请确保Flask服务器正在运行")
    exit(1)

# 2. 上传音频文件
# print("\n开始上传音频文件...")
# upload_url = "http://127.0.0.1:5000/api/transcribe/upload"

# try:
#     with open(audio_path, "rb") as audio_file:
#         files = {"audio": audio_file}
#         response = requests.post(upload_url, files=files)
        
#     print(f"上传响应状态码: {response.status_code}")
#     print(f"上传响应内容: {response.text[:200]}...")  # 显示响应前200个字符
    
#     # 尝试解析JSON
#     try:
#         data = response.json()
#         task_id = data.get("task_id")
#         if not task_id:
#             print("错误: 响应中没有task_id")
#             exit(1)
#         print(f"获取到任务ID: {task_id}")
#     except Exception as e:
#         print(f"错误: 无法解析JSON响应 - {e}")
#         print(f"完整响应内容: {response.text}")
#         exit(1)
        
# except Exception as e:
#     print(f"错误: 上传文件失败 - {e}")
#     exit(1)

url="http://127.0.0.1:5000/api/transcribe/process_raw_text/3bc762dd-cb16-4809-9fee-361dc911640c"
# url="http://127.0.0.1:5000/api/transcribe/retranscribe/3bc762dd-cb16-4809-9fee-361dc911640c"
response=requests.get(url)
print(response)

# 3. 等待并检查转录状态
# print("\n检查转录状态...")
# status_url = f"http://127.0.0.1:5000/api/transcribe/status/{task_id}"

# for attempt in range(5):  # 尝试5次
#     try:
#         status_response = requests.get(status_url)
#         status_data = status_response.json()
#         status = status_data.get("status")
#         print(f"转录状态: {status}")
        
#         if status == "completed":
#             print("转录已完成!")
#             segments_count = status_data.get("segments_count", 0)
#             print(f"转录段数: {segments_count}")
#             break
#         elif status == "failed":
#             print(f"转录失败: {status_data.get('error_message')}")
#             break
#         else:
#             print("转录进行中，等待5秒后重新检查...")
#             time.sleep(5)
#     except Exception as e:
#         print(f"检查状态时出错: {e}")
#         time.sleep(2)

# # 4. 如果需要，尝试流式API
# if status == "pending" or status == "processing":
#     print("\n尝试流式转录API...")
#     stream_url = f"http://127.0.0.1:5000/api/transcribe/stream/{task_id}"
    
#     try:
#         with requests.get(stream_url, stream=True) as stream_response:
#             print(f"流式API响应状态码: {stream_response.status_code}")
            
#             if stream_response.status_code != 200:
#                 print(f"流式API返回错误: {stream_response.text}")
#                 exit(1)
                
#             print("开始接收流式转录结果...")
#             for line in stream_response.iter_lines():
#                 if line:
#                     if line.startswith(b'data: '):
#                         try:
#                             event_data = json.loads(line[6:])
#                             event_type = event_data.get('type', 'unknown')
                            
#                             if event_type == 'segment':
#                                 segment = event_data.get('segment', {})
#                                 print(f"新转录段: {segment.get('text', '')[:50]}...")
#                             elif event_type == 'progress':
#                                 print(f"进度: {event_data.get('percentage', 0)}%")
#                             elif event_type == 'completion':
#                                 print(f"完成: {event_data.get('message', '')}")
#                                 break
#                             elif event_type == 'error':
#                                 print(f"错误: {event_data.get('error', '')}")
#                                 break
#                         except json.JSONDecodeError as e:
#                             print(f"解析流数据时出错: {e}")
#                             print(f"原始数据: {line[6:]}")
#     except Exception as e:
#         print(f"流式API出错: {e}")

# # 5. 下载转录结果
# print("\n下载转录结果...")
# download_url = f"http://127.0.0.1:5000/api/transcribe/download/{task_id}"

# try:
#     download_response = requests.get(download_url)
#     download_data = download_response.json()
    
#     if download_data.get("success"):
#         content = download_data.get("content", "")
#         print(f"转录内容 (前500字符):\n{content[:500]}...\n")
        
#         # 保存到文件
#         output_file = f"{task_id}_transcript.txt"
#         with open(output_file, "w", encoding="utf-8") as f:
#             f.write(content)
#         print(f"转录内容已保存到文件: {output_file}")
#     else:
#         print(f"下载转录结果失败: {download_data.get('error')}")
        
# except Exception as e:
#     print(f"下载转录结果时出错: {e}")