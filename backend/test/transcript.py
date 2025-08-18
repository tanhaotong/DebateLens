import os
import time
import json
from pathlib import Path
import sys

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置
from app.config import Config
API_KEY = Config.GEMINI_API_KEY  # 从配置中获取API密钥
AUDIO_FILE = "D:\Git\DebateLens-test\\backend\\temp\BV1yE421N7gw.mp3"  # 音频文件路径

# 导入所需库
from google import genai

def main():
    """主函数"""
    print(f"开始处理音频文件: {AUDIO_FILE}")
    
    # 检查文件大小
    file_size_mb = os.path.getsize(AUDIO_FILE) / (1024 * 1024)
    print(f"文件大小: {file_size_mb:.2f} MB")
    
    # 根据文件大小决定处理方法
    if file_size_mb > 25:  # 大于25MB的文件使用分段处理
        print("音频文件较大，将使用分段处理")
        transcript = process_large_audio()
    else:
        print("音频文件大小适中，尝试直接处理")
        transcript = process_audio_streaming()
    
    # 保存结果
    save_path = Path(AUDIO_FILE).stem + "_transcript.txt"
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(transcript)
    print(f"转录完成，已保存到 {save_path}")

def process_audio_streaming():
    """使用流式API处理音频"""
    # 配置客户端
    # genai.configure(api_key=API_KEY)
    client = genai.Client(api_key=API_KEY)
    
    # 构造提示词
    prompt = """
    请将辩论音频转录为文本，满足以下要求:
    1. 为每句话标明准确时间戳，格式为 [HH:MM:SS]
    2. 识别并标明说话人角色，例如：主持人、正方一辩、反方三辩等
    3. 区分不同辩论环节（如开场白、立论陈词、质询、自由辩论等）
    4. 确保时间戳与实际音频对应一致
    """
    
    print("上传音频文件...")
    try:
        myfile = client.files.upload(file=AUDIO_FILE)
        
        print("开始转录（流式生成）...")
        full_response = ""
        
        # 使用流式生成
        response_stream = client.models.generate_content_stream(
            model="gemini-2.5-flash",  # 使用支持音频的模型
            contents=[prompt, myfile]
        )
        
        print("正在接收转录结果...")
        print("-" * 50)
        
        # 打印进度并收集完整响应
        for chunk in response_stream:
            if chunk.text:
                print(chunk.text, end="", flush=True)
                full_response += chunk.text
        
        print("\n" + "-" * 50)
        print("转录完成！")
        
        return full_response
        
    except Exception as e:
        print(f"处理时出错: {e}")
        return f"转录失败: {str(e)}"

def process_large_audio():
    """分段处理大型音频文件"""
    try:
        # 安装依赖
        try_install_dependencies()
        
        # 分段处理
        return process_with_overlap(AUDIO_FILE, segment_length=30*60, overlap=60)
        
    except Exception as e:
        print(f"分段处理失败: {e}")
        exit(1)
        print("尝试流式处理...")
        return process_audio_streaming()

def try_install_dependencies():
    """尝试安装必要的依赖"""
    try:
        import pydub
        print("pydub已安装")
    except ImportError:
        print("安装pydub...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub"])
        print("pydub安装完成")

def process_with_overlap(audio_file, segment_length=30*60, overlap=60):
    """使用重叠段落处理长音频，保持上下文连贯性"""
    from pydub import AudioSegment
    import os
    
    # 配置客户端
    # genai.configure(api_key=API_KEY)
    client = genai.Client(api_key=API_KEY)
    
    # 加载音频
    try:
        print(f"加载音频文件: {audio_file}")
        audio = AudioSegment.from_file(audio_file)
        total_duration = len(audio) / 1000  # 秒
    except Exception as e:
        # 在主函数开始添加
        print(f"加载音频文件失败: {e}")
        print(f"错误：文件不存在 - {AUDIO_FILE}")
        print(f"当前工作目录: {os.getcwd()}")
        exit(1)
    
    print(f"音频总长度: {format_time(total_duration)}")
    
    # 转换为毫秒
    segment_ms = segment_length * 1000
    overlap_ms = overlap * 1000
    
    segments = []
    transcripts = []
    
    # 创建临时文件夹
    temp_dir = "temp_segments"
    os.makedirs(temp_dir, exist_ok=True)
    
    # 分割音频，确保重叠
    start_points = list(range(0, int(len(audio)), int(segment_ms - overlap_ms)))
    
    print(f"将音频分为 {len(start_points)} 段进行处理")
    
    for i, start_ms in enumerate(start_points):
        # 计算结束时间
        end_ms = min(start_ms + segment_ms, len(audio))
        
        # 如果是最后一小段且太短，不单独处理
        if end_ms - start_ms < 30000:  # 小于30秒
            continue
            
        # 提取片段
        segment = audio[start_ms:end_ms]
        
        # 保存片段
        segment_file = f"{temp_dir}/segment_{i:03d}.mp3"
        segment.export(segment_file, format="mp3")
        segments.append((segment_file, start_ms/1000))
        
        print(f"创建片段 {i+1}/{len(start_points)}: {start_ms/1000:.1f}s - {end_ms/1000:.1f}s")
    
    # 处理每个片段
    for i, (segment_file, start_time) in enumerate(segments):
        print(f"处理片段 {i+1}/{len(segments)}")
        
        # 构建上下文提示
        if i > 0:
            context_prompt = f"""
            这是辩论的第 {i+1}/{len(segments)} 部分。
            请继续转录，保持对话一致性，使用流式输出。
            为每句话标明准确的绝对时间戳和说话人角色(主持人、正方一辩、反方二辩等)。
            """
        else:
            context_prompt = """
            这是辩论的第一部分。
            请转录内容，为每句话标明准确时间戳[HH:MM:SS]和说话人角色(主持人、正方一辩、反方二辩等)。
            注意识别辩论阶段(开场白、立论、质询、自由辩论等)。
            """
        
        # 转录当前片段
        try:
            print(f"上传片段 {i+1}...")
            myfile = client.files.upload(file=segment_file)
            
            print(f"转录片段 {i+1}...")
            full_response = ""
            
            # 使用流式生成
            response_stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=[context_prompt, myfile]
            )
            
            print(f"接收片段 {i+1} 转录结果...")
            
            # 收集完整响应
            for chunk in response_stream:
                if chunk.text:
                    full_response += chunk.text
            
            # 保存片段转录
            segment_transcript = full_response
            
            # 写入临时文件
            with open(f"{temp_dir}/transcript_{i:03d}.txt", "w", encoding="utf-8") as f:
                f.write(segment_transcript)
                
            transcripts.append(segment_transcript)
            print(f"片段 {i+1} 转录完成")
            
        except Exception as e:
            print(f"片段 {i+1} 转录失败: {e}")
            transcripts.append(f"[转录失败: {str(e)}]")
        
        # 防止API限制
        time.sleep(5)
    
    # 合并转录结果并处理重叠部分
    print("合并所有片段...")
    final_transcript = merge_transcripts(transcripts, overlap)
    
    # 清理临时文件
    for segment_file, _ in segments:
        try:
            os.remove(segment_file)
        except:
            pass
            
    return final_transcript

def merge_transcripts(transcripts, overlap_seconds):
    """合并多个转录结果，处理重叠部分"""
    import re
    
    if not transcripts:
        return "转录失败：没有有效的转录片段"
    
    if len(transcripts) == 1:
        return transcripts[0]
    
    print(f"合并 {len(transcripts)} 个转录片段...")
    final_result = transcripts[0]
    
    # 合并后续片段，处理重叠部分
    for i in range(1, len(transcripts)):
        print(f"合并片段 {i+1}/{len(transcripts)}...")
        
        # 查找当前片段中的时间戳
        timestamps = re.findall(r'\[(\d{2}):(\d{2}):(\d{2})\]', transcripts[i])
        
        # 如果找不到时间戳，直接拼接
        if not timestamps:
            final_result += "\n\n--- 片段连接点 ---\n\n" + transcripts[i]
            continue
            
        # 查找前一个片段中最后的时间戳
        last_timestamps = re.findall(r'\[(\d{2}):(\d{2}):(\d{2})\]', final_result)
        if not last_timestamps:
            final_result += "\n\n--- 片段连接点 ---\n\n" + transcripts[i]
            continue
            
        # 获取前一个片段最后的时间
        last_h, last_m, last_s = map(int, last_timestamps[-1])
        last_seconds = last_h * 3600 + last_m * 60 + last_s
        
        # 计算重叠点
        overlap_found = False
        current_transcript_lines = transcripts[i].split('\n')
        
        for line_idx, line in enumerate(current_transcript_lines):
            time_match = re.search(r'\[(\d{2}):(\d{2}):(\d{2})\]', line)
            if time_match:
                h, m, s = map(int, time_match.groups())
                seconds = h * 3600 + m * 60 + s
                
                # 找到第一个比前一段最后时间戳晚的时间点
                if seconds > last_seconds + overlap_seconds/2:
                    overlap_found = True
                    final_result += "\n\n--- 片段连接点 ---\n\n" + "\n".join(current_transcript_lines[line_idx:])
                    break
        
        # 如果没找到合适的重叠点，附加整个转录但添加标记
        if not overlap_found:
            final_result += "\n\n--- 片段连接点(无明确重叠) ---\n\n" + transcripts[i]
    
    return final_result

def format_time(seconds):
    """将秒数格式化为 HH:MM:SS"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

if __name__ == "__main__":
    main()

