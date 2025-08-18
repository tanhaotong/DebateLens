import os
import logging
import time
from google import genai
from app.config import Config

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiChatService:
    def __init__(self, api_key: str = None):
        """初始化 Gemini 聊天服务"""
        # 优先使用传入的api_key，其次使用配置中的API Key
        self.api_key = api_key or Config.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Gemini API Key 未配置，请在首页的API配置中设置")

        self.client = genai.Client(api_key=self.api_key)
        self.max_retries = 3

    def format_time(self, seconds: float) -> str:
        """格式化时间戳"""
        minutes = int(seconds // 60)
        remaining_seconds = int(seconds % 60)
        return f"{minutes}:{remaining_seconds:02d}"

    def chat_with_transcript(self, transcript_path: str, current_time: float, question: str) -> str:
        """
        基于文字稿文件进行聊天
        
        Args:
            transcript_path: 文字稿文件路径
            current_time: 当前视频时间
            question: 用户问题
            
        Returns:
            AI 回答内容
        """
        # 构建提示词
        prompt = f"""
当前视频时间戳: {self.format_time(current_time)}

问题: {question}

请基于上传的文字稿文件回答用户的问题。如果问题与当前时间点的内容相关，请特别关注该时间点的文字稿内容。
你是一个资深辩手并且担任某校的辩论教练，你正在陪学生复盘某辩论比赛，请解答学生的问题。注意，无需进行过多的角色扮演，只需专业地解答问题，让学生豁然开朗。
请用中文回答。
"""
        
        for attempt in range(self.max_retries):
            try:
                # 读取文件内容并生成流式响应
                uploaded_file = self.client.files.upload(file=transcript_path)
                
                response = self.client.models.generate_content_stream(
                    model="gemini-2.5-pro",
                    contents=[prompt, uploaded_file]
                )
                
                # 收集流式响应
                full_text = ""
                for chunk in response:
                    if chunk.text:
                        full_text += chunk.text
                        # 可以在这里添加进度回调或日志
                        # logger.info(f"聊天进度: {len(full_text)} 字符")
                        print(chunk.text)
                
                return full_text.strip()
                    
            except Exception as e:
                logger.warning(f"Gemini聊天失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        
        return ""

    def chat_with_transcript_stream(self, transcript_path: str, current_time: float, question: str):
        """
        基于文字稿文件进行流式聊天
        Args:
            transcript_path: 文字稿文件路径
            current_time: 当前视频时间
            question: 用户问题
        Yields:
            流式文本块
        """
        # 构建提示词
        prompt = f"""
当前视频时间戳: {self.format_time(current_time)}

用户问题: {question}

请基于上传的文字稿文件回答用户的问题。首先分析问题是否与当前时间相关。如果问题与当前时间点的内容相关，请特别关注该时间点的文字稿内容。如果没有明显标识，则基于全局内容回答。
请用中文回答，回答要简洁明了。
"""
        for attempt in range(self.max_retries):
            try:
                uploaded_file = self.client.files.upload(file=transcript_path)
                response = self.client.models.generate_content_stream(
                    model="gemini-2.5-pro",
                    contents=[prompt, uploaded_file]
                )
                buffer = ""
                for chunk in response:
                    if chunk.text:
                        buffer += chunk.text
                        # 按行分批yield，保证Markdown分段
                        while '\n' in buffer:
                            idx = buffer.find('\n')
                            to_yield = buffer[:idx+1]
                            yield to_yield
                            buffer = buffer[idx+1:]
                # yield 剩余内容
                if buffer.strip():
                    yield buffer
                return  # 成功完成，退出重试循环
            except Exception as e:
                logger.warning(f"Gemini聊天失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    yield f"错误: {str(e)}"
                    return
                time.sleep(2 ** attempt)

    def health_check(self) -> bool:
        """健康检查"""
        try:
            # 简单的测试请求，设置较短的超时时间
            response = self.client.generate_content("Hello", timeout=10)
            return True
        except Exception as e:
            logger.warning(f"Gemini健康检查失败: {str(e)}")
            # 即使API连接失败，也不应该完全阻止服务启动
            # 返回True表示服务本身是健康的，只是API暂时不可用
            return True 