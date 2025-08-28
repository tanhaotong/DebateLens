import os
import time
import logging
from typing import List, Tuple
from pydub import AudioSegment
from google import genai
from dataclasses import dataclass
import re
import mimetypes

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TranscriptionSegment:
    global_ts: str
    speaker: str
    text: str
    confidence: float = 1.0
    camp: str = "未知"
    stage_name: str = ""

class AudioTranscribeService:
    def __init__(self, gemini_api_key: str, max_retries: int = 3, segment_length_ms: int = 30*60*1000):
        """
        初始化转录服务
        
        Args:
            gemini_api_key: Gemini API密钥
            max_retries: 最大重试次数
            segment_length_ms: 音频分段长度（毫秒）
        """
        # 增强：校验并初始化客户端
        if not gemini_api_key:
            raise ValueError("Gemini API Key 未配置")
        self.client = genai.Client(api_key=gemini_api_key)
        self.max_retries = max_retries
        self.segment_length_ms = segment_length_ms
        
    def split_audio(self, audio_path: str) -> List[Tuple[str, int]]:
        """将长音频切分为多个小段"""
        audio = AudioSegment.from_file(audio_path)
        segments = []
        
        # 获取原文件所在目录和扩展名
        audio_dir = os.path.dirname(audio_path)
        audio_name = os.path.basename(audio_path)
        audio_name_without_ext = os.path.splitext(audio_name)[0]
        audio_ext = os.path.splitext(audio_name)[1]
        
        # 确保目录存在
        os.makedirs(audio_dir, exist_ok=True)
        
        for i in range(0, len(audio), self.segment_length_ms):
            segment = audio[i:i+self.segment_length_ms]
            segment_path = os.path.join(audio_dir, f"{audio_name_without_ext}_part{i//self.segment_length_ms}{audio_ext}")
            
            try:
                # 保持原文件格式
                segment.export(segment_path, format=audio_ext[1:])  # 去掉点号
                # 检查文件是否成功创建且大小正常
                if os.path.exists(segment_path):
                    file_size = os.path.getsize(segment_path)
                    if file_size > 0:  # 文件大小应该大于0
                        segments.append((segment_path, i))
                        logger.info(f"成功创建音频段: {segment_path}, 大小: {file_size} bytes")
                    else:
                        logger.warning(f"音频段文件大小为0，删除: {segment_path}")
                        os.remove(segment_path)
                else:
                    logger.error(f"音频段文件创建失败: {segment_path}")
            except Exception as e:
                logger.error(f"创建音频段失败: {segment_path}, 错误: {str(e)}")
                # 如果文件存在但创建失败，删除它
                if os.path.exists(segment_path):
                    try:
                        os.remove(segment_path)
                        logger.info(f"已删除失败的音频段: {segment_path}")
                    except Exception as del_e:
                        logger.error(f"删除失败音频段时出错: {segment_path}, 错误: {str(del_e)}")
        
        logger.info(f"音频切分为 {len(segments)} 段")
        return segments

    def gemini_transcribe(self, segment_path: str) -> str:
        """Gemini只做纯文本转写，使用流式生成"""
        prompt = """请将以下音频内容转写为完整、流畅的中文文字，不要加任何格式说明。
请转录内容，为每句话标明准确时间戳[MM:SS]和说话人角色(主持人、正方一辩、反方二辩等)。例如：[00:00]正方一辩：大家好！
为保证时间戳准确，请注意：不要将一长段几分钟的内容放在同一个时间戳下，而是要根据内容分段，每段都标明时间戳。时间戳是相对于音频开始时间，而不是这一阶段开始时间。
注意识别辩论阶段(开场白、立论、质询、自由辩论等)，并在每个阶段开始前用三级标题和加粗注明，如：### **辩论阶段：正方立论/正方小结/自由辩论**  如果音频一开头没有主持人串场，说明这是被截断的音频，无需标明开头的阶段。"""
        
        for attempt in range(self.max_retries):
            try:
                uploaded_file = self.client.files.upload(file=segment_path)
                response = self.client.models.generate_content_stream(
                    model="gemini-2.5-pro",
                    contents=[prompt, uploaded_file])
                
                # 收集流式响应
                full_text = ""
                for chunk in response:
                    if chunk.text:
                        full_text += chunk.text
                        # 可以在这里添加进度回调或日志
                        # logger.info(f"转录进度: {len(full_text)} 字符")
                        print(chunk.text)
                
                return full_text.strip()
                    
            except Exception as e:
                logger.warning(f"Gemini转写失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return ""

    def from_raw_text(self, raw_txt_path: str, output_path: str = None) -> None:
        """
        读取raw.txt（多段原始Gemini返回），自动分段并本地化处理，保存为新txt。
        Args:
            raw_txt_path: 原始Gemini转录txt路径
            output_path: 处理后txt保存路径（默认同目录xxx_local_from_raw.txt）
        """
        import re
        # import pdb; pdb.set_trace()
        with open(raw_txt_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        # 合并所有行，按时间戳递增分段
        segments = []
        current_lines = []
        last_global_seconds = -1
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # 匹配[hh:mm:ss]或[mm:ss]时间戳
            ts_match = re.match(r'^\[(\d{2}):(\d{2})(?::(\d{2}))?\]', line)
            if ts_match:
                if ts_match.group(3):
                    # [mm:ss:SS]
                    h,m, s = 0,int(ts_match.group(1)), int(ts_match.group(2))
                else:
                    # [mm:ss]
                    h, m, s = 0, int(ts_match.group(1)), int(ts_match.group(2))
                global_seconds = h * 3600 + m * 60 + s
                if last_global_seconds >= 0 and global_seconds < last_global_seconds:
                    # 时间戳突然减小，认为新段
                    segments.append('\n'.join(current_lines))
                    current_lines = []
                last_global_seconds = global_seconds
            current_lines.append(line)
        if current_lines:
            segments.append('\n'.join(current_lines))
        # 用local_segment_and_format处理所有段
        all_text = []
        for idx, seg_text in enumerate(segments):
            # 估算每段的start_ms
            if idx == 0:
                start_ms = 0
            else:
                # 取本段第一个时间戳
                ts_match = re.match(r'^\[(\d{2}):(\d{2})(?::(\d{2}))?\]', segments[idx])
                if ts_match:
                    if ts_match.group(3):
                        h, m, s = int(ts_match.group(1)), int(ts_match.group(2)), int(ts_match.group(3))
                    else:
                        h, m, s = 0, int(ts_match.group(1)), int(ts_match.group(2))
                    start_ms = (h * 3600 + m * 60 + s) * 1000
                else:
                    start_ms = 0
            all_text.append((start_ms, seg_text))
        segments_structured = self.local_segment_and_format(all_text)
        # 保存为新txt
        if not output_path:
            output_path = raw_txt_path.replace('.txt', '_local_from_raw.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            for seg in segments_structured:
                if seg.camp=="":
                    f.write(f'{seg.text}\n')
                else:
                    f.write(f"{seg.global_ts} {seg.speaker}: {seg.text}\n")
        logger.info(f"本地化处理后的转录文本已保存到: {output_path}")

    def local_segment_and_format(self, all_text: List[Tuple[int, str]]) -> List[TranscriptionSegment]:
        """
        本地分段、发言人识别、时间戳推算和格式化。
        识别发言人阵营（正反方）和辩论阶段，过滤自我介绍和主持人串场。
        支持[mm:ss]和[hh:mm:ss]两种时间戳。
        """
        segments = []
        # 支持[mm:ss]和[hh:mm:ss]，优先匹配hh:mm:ss
        ts_patterns = [
            r'^\[(\d{1,2}):(\d{1,2}):(\d{1,2})\]([^\s：:]+)[：:](.*)',  # [hh:mm:ss]发言人：内容
            r'^\[(\d{1,2}):(\d{1,2})\]([^\s：:]+)[：:](.*)'            # [mm:ss]发言人：内容
        ]
        current_stage_name = ""
        for idx, (start_ms, text) in enumerate(all_text):
            # 估算本段结束时间
            # if idx < len(all_text) - 1:
            #     end_ms = all_text[idx+1][0]
            # else:
            #     end_ms = start_ms + self.segment_length_ms
            start_seconds=idx*self.segment_length_ms//1000
            for line in re.split(r'[\n\r]+', text):
                line = line.strip()
                if not line:
                    continue
                # 跳过阶段标题
                stage_match = re.match(r"^###\s*\*\*?辩论阶段[：:][^*]+\*\*?$", line)
                if stage_match:
                    current_stage_name = re.sub(r'^###\s*\*\*?辩论阶段[：:](.+?)\*\*?$', r'\1', line).strip()
                    segments.append(TranscriptionSegment(
                        global_ts="",
                        speaker="",
                        text=line,
                        camp=""
                    ))
                    continue
                match = None
                for pat in ts_patterns:
                    match = re.match(pat, line)
                    if match:
                        break
                if match:
                    if len(match.groups()) == 5:
                        # [mm:ss:SS]
                        m, s, ms = map(int, match.groups()[:3])
                        speaker = match.group(4).strip()
                        content = match.group(5).strip()
                        local_seconds = m * 60 +s
                    else:
                        # [mm:ss]
                        h = 0
                        m, s = map(int, match.groups()[:2])
                        speaker = match.group(3).strip()
                        content = match.group(4).strip()
                        local_seconds = m * 60 + s
                    # 去掉content前的时间戳和说话人
                    content = re.sub(r'^\[\d{1,2}:\d{1,2}(?::\d{1,2})?\][^\s：:]+[：:]', '', content).strip()
                    global_seconds = local_seconds + start_seconds
                    gh = global_seconds // 3600
                    gm = (global_seconds % 3600) // 60
                    gs = global_seconds % 60
                    global_ts = f"[{gh:02d}:{gm:02d}:{gs:02d}]"
                else:
                    speaker = ""
                    content = line
                    global_ts = ""
                if self.is_intro_or_host_content(speaker, content):
                    continue
                camp = self.identify_speaker_camp(speaker)
                if self.is_irrelevant_speaker(speaker, content):
                    continue
                segments.append(TranscriptionSegment(
                    global_ts=global_ts,
                    speaker=speaker,
                    text=content,
                    confidence=1.0,
                    camp=camp,
                    stage_name=current_stage_name
                ))
        return segments

    def identify_speaker_camp(self, speaker: str) -> str:
        """识别发言人阵营（正反方）"""
        if "正方" in speaker:
            return "正方"
        elif "反方" in speaker:
            return "反方"
        elif "主持人" in speaker or "主席" in speaker:
            return "主持人"
        elif "评委" in speaker:
            return "评委"
        else:
            return "未知"

    def is_intro_or_host_content(self, speaker: str, content: str) -> bool:
        """判断是否为自我介绍或主持人串场内容"""
        # 自我介绍关键词
        intro_keywords = [
            "大家好", "各位好", "我是", "代表", "问候", "早上好", "下午好", "晚上好",
            "欢迎来到", "感谢", "掌声", "有请", "让我们", "接下来"
        ]
        
        # 主持人串场关键词
        host_keywords = [
            "主持人", "主席", "感谢", "掌声", "有请", "让我们", "接下来", "现在",
            "首先", "然后", "最后", "接下来", "下面", "现在让我们"
        ]
        
        # 检查发言人
        if "主持人" in speaker or "主席" in speaker:
            # 主持人发言，检查内容是否只是串场
            if any(keyword in content for keyword in host_keywords):
                return True
                
        # 检查内容是否包含自我介绍特征
        if any(keyword in content for keyword in intro_keywords):
            # 进一步判断是否只是简单的自我介绍
            if len(content) < 50 and ("大家好" in content or "各位好" in content):
                return True
                
        return False

    def is_irrelevant_speaker(self, speaker: str, text: str) -> bool:
        """
        可自定义过滤规则。默认不过滤任何发言人。
        可根据实际需要扩展，如过滤"主持人"、"嘉宾"等。
        """
        # 示例：如需过滤可在此添加规则
        # if speaker in ["主持人", "嘉宾", "评委"]:
        #     return True
        return False

    def optimize_transcription(self, segments: List[TranscriptionSegment]) -> List[TranscriptionSegment]:
        """
        优化转录结果
        
        Args:
            segments: 转录段列表
            
        Returns:
            优化后的转录段列表
        """
        optimized = []
        
        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue
                
            # 移除重复的标点符号
            text = re.sub(r'[。，、；：！？]{2,}', '。', text)
            
            # 确保句子完整性
            if not text.endswith(('。', '！', '？', '，', '；', '：')):
                text += '。'
            
            segment.text = text
            optimized.append(segment)
        
        return optimized

    def transcribe_audio_stream(self, audio_path: str, progress_callback=None):
        """
        流式音频转录流程，支持进度回调
        
        Args:
            audio_path: 音频文件路径
            progress_callback: 进度回调函数，接收(当前步骤, 总步骤, 描述)参数
            
        Yields:
            TranscriptionSegment: 转录段
        """
        logger.info(f"开始流式转录音频: {audio_path}")
        
        try:
            # 1. 切分音频
            if progress_callback:
                progress_callback(1, 5, "正在切分音频...")
            segments = self.split_audio(audio_path)
            
            # 2. 分段转录
            if progress_callback:
                progress_callback(2, 5, "正在转录音频段...")
            
            all_text = []
            for i, (segment_path, start_ms) in enumerate(segments):
                try:
                    if progress_callback:
                        progress_callback(2, 5, f"正在转录第 {i+1}/{len(segments)} 段...")
                    
                    text = self.gemini_transcribe(segment_path)
                    all_text.append((start_ms, text))
                    
                    # 实时返回已完成的转录段
                    if i > 0:  # 从第二段开始，可以处理前一段的完整转录
                        prev_start_ms = all_text[i-1][0]
                        prev_text = all_text[i-1][1]
                        
                        # 处理前一段的转录
                        prev_segments = self.local_segment_and_format([(prev_start_ms, prev_text)])
                        for seg in prev_segments:
                            yield seg
                            
                finally:
                    # 清理临时文件
                    if os.path.exists(segment_path):
                        os.remove(segment_path)
            
            # 3. 本地分段和格式化
            if progress_callback:
                progress_callback(3, 5, "正在分段和格式化...")
            
            # 处理最后一段
            if all_text:
                last_start_ms = all_text[-1][0]
                last_text = all_text[-1][1]
                last_segments = self.local_segment_and_format([(last_start_ms, last_text)])
                for seg in last_segments:
                    yield seg
            
            # 4. 优化转录结果（可选，如果需要的话）
            if progress_callback:
                progress_callback(4, 5, "正在优化转录结果...")
            
            logger.info("流式转录完成")
            
        except Exception as e:
            logger.error(f"流式音频转录失败: {str(e)}")
            raise

    def transcribe_audio(self, audio_path: str) -> List[TranscriptionSegment]:
        """完整的音频转录流程（非流式，保持向后兼容）"""
        logger.info(f"开始转录音频: {audio_path}")
        
        try:
            # 1. 切分音频
            segments = self.split_audio(audio_path)
            
            # 2. 分段转录
            all_text = []
            raw_texts = []
            for i, (segment_path, start_ms) in enumerate(segments):
                try_count = 0
                text = ""
                # 新增：如果内容为空自动重试
                while try_count < self.max_retries:
                    text = self.gemini_transcribe(segment_path)
                    if text.strip():
                        break
                    try_count += 1
                    logger.warning(f"第{i+1}段转录内容为空，重试第{try_count}次。文件: {segment_path}")
                if not text.strip():
                    # 多次尝试后仍为空，主动失败，避免静默完成
                    raise RuntimeError(f"第{i+1}段多次为空，终止任务。文件: {segment_path}")
                logger.info(f"第{i+1}段转录文本长度: {len(text)}，内容预览: {text[:50]}")
                all_text.append((start_ms, text))
                raw_texts.append(text)
                # 清理临时文件
                if os.path.exists(segment_path):
                    os.remove(segment_path)
            audio_dir = os.path.dirname(audio_path)
            audio_name = os.path.basename(audio_path)
            audio_name_without_ext = os.path.splitext(audio_name)[0]
            raw_txt_path = os.path.join(audio_dir, f"{audio_name_without_ext}_raw.txt")
            with open(raw_txt_path, 'w', encoding='utf-8') as f:
                for raw in raw_texts:
                    f.write(f"{raw}\n")
            logger.info(f"原始Gemini转录文本已保存到: {raw_txt_path}")
            
            # 3. 本地分段和格式化
            logger.info("本地分段和格式化")
            structured = self.local_segment_and_format(all_text)
            
            # 4. 优化转录结果
            logger.info("优化转录结果")
            optimized = self.optimize_transcription(structured)

            # 5. 保存转录结果
            transcript_path=os.path.join(audio_dir,"transcript.txt")
            self.save_transcription_to_file(optimized,transcript_path)
            
            logger.info(f"转录完成，共 {len(optimized)} 段")
            return optimized
            
        except Exception as e:
            logger.error(f"音频转录失败: {str(e)}")
            raise

    def save_transcription_to_file(self, segments: List[TranscriptionSegment], output_path: str):
        """
        将转录结果保存到文件
        
        Args:
            segments: 转录段列表
            output_path: 输出文件路径
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            for segment in segments:
                if segment.global_ts:
                    f.write(f"{segment.global_ts} {segment.speaker}: {segment.text}\n")
                else:
                    f.write(f"{segment.text}\n")
        
        logger.info(f"转录结果已保存到: {output_path}")

    def cleanup_temp_files(self):
        """清理临时文件"""
        import glob
        temp_files = glob.glob("temp/*_part*.wav")
        for file in temp_files:
            try:
                os.remove(file)
            except Exception as e:
                logger.warning(f"清理临时文件失败 {file}: {str(e)}")
