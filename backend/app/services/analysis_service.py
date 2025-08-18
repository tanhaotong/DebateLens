import os
from google import genai
import json
import time
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self, gemini_api_key: str = None, max_retries: int = 3):
        # 从配置获取API KEY
        if gemini_api_key is None:
            from app.config import Config
            gemini_api_key = Config.GEMINI_API_KEY
        
        self.client = genai.Client(api_key=gemini_api_key)
        self.max_retries = max_retries  # 最大重试次数

    def analyze_text(self, transcription_path: str) -> str:
        # 你可以用OpenAI、Gemini等大模型
        prompt = """辩论要素分析：
           - 立论 (Affirmation): 此时发言者在阐述的主要观点
           - 攻辩 (Attack): 此时发言者对对方观点的攻击
           - 防守 (Defense): 此时发言者对自身观点的辩护
           - 定义 (Definition): 对概念、术语的定义或解释
           - 举例 (Example): 为论证某一论点举出的例子
        辩论技巧识别：
           - 类比、举例、归谬、反证等
           - 语速分析（快/中/慢）
           - 打断时机分析（主动打断/被动打断）
        每一个论点或者发言点返回一段分析结果，例如正方一辩提出三个论点，则需返回三段如下的json，对应论点相应的时间戳。分析应尽量细节且及时，例如用什么例子攻击对方什么论点或者支持己方什么论点都需单独返回一段json。
        每一个论点或者发言点还要返回一个简短概括，最好在10个字以内。
        每一段分析拥有顺序的id，从1开始顺序编号。如果目标是攻击对方某论点，则需将被攻击论点的id作为本段分析的target字段。如果目标是防守某被攻击论点，则需将反驳的攻击论点作为本段分析的target字段。如果发言是对某一论点的进一步阐释，则需将被阐释论点作为本段分析的base字段。
        返回的json格式不要加```字样。
           请以JSON格式返回，包含以下结构：
        {
          "analysis": [
            {
              "analysis_id": "唯一分析ID",
              "global_fs": "[mm:ss]"
              "speaker": "辩手A",
              "analysis_type": "affirmation",
              "content": "分析内容",
              "technique": "类比",
              "target": "被攻击/被防守的点的id",
              "base": "被延伸被阐释的论点的id",
              "goal": "攻击对方论点：xxx/支持自身论点：xxx",
              "summary": "用10个字以内的句子或短语简要概括",
              "interruption_type": "none"
            }
          ]
        }"""
        for attempt in range(self.max_retries):
            try:
                uploaded_file = self.client.files.upload(file=transcription_path)
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

                if "```json\n" in full_text:
                    full_text = full_text.replace('```json\n','')
                if "```json" in full_text:
                    full_text = full_text.replace('```json','')
                if "```" in full_text:
                    full_text = full_text.replace('```','')
                
                return full_text.strip()
                    
            except Exception as e:
                logger.warning(f"Gemini分析失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return ""

    def bubble_analyze_text(self, transcription_path: str) -> str:
        # 你可以用OpenAI、Gemini等大模型
        prompt = """你是一个资深辩手，也是某辩论强校的教练。现在，你要带领新入队队员拆解一场辩论赛。
        辩论要素分析：
           - 立论 (Affirmation): 此时发言者在阐述的主要观点
           - 攻辩 (Attack): 此时发言者对对方观点的攻击
           - 防守 (Defense): 此时发言者对自身观点的辩护
           - 定义 (Definition): 对概念、术语的定义或解释
           - 举例 (Example): 为论证某一论点举出的例子
        辩论技巧识别：
           - 类比、举例、归谬、反证等
           - 语速分析（快/中/慢）
           - 打断时机分析（主动打断/被动打断）
        每一个论点或者发言点返回一段分析结果，例如正方一辩提出三个论点，则需返回三段如下的json，对应论点相应的时间戳。分析应尽量细节且及时，例如用什么例子攻击对方什么论点或者支持己方什么论点都需单独返回一段json。
        每一个论点或者发言点还要返回一个简短概括，最好在10个字以内。
        每一段分析拥有顺序的id，从1开始顺序编号。如果目标是攻击对方某论点，则需将被攻击论点的id作为本段分析的target字段。如果目标是防守某被攻击论点，则需将反驳的攻击论点作为本段分析的target字段。如果发言是对某一论点的进一步阐释，则需将被阐释论点作为本段分析的base字段。
        需要量化评估这段发言对正反双方的价值，例如正方观点或例子成功攻击到反方，力度为5，则cons_gain值为-5.如果某例子成功支持正方，或提出某个有力论点，对正方支持力度为8，则cons_gain为8.pros_gain和cons_gain的取值范围都是[-10,+10].注意，对一方的支持并不意味着对另一方的攻击，反之亦然，这意味着两者之和不必是0。
        注意发言之间的关系。一般来说，一方只会有三个左右主论点，其余的论点都是对主论点的补充和拓展。所以请格外注重同一方论点、例子间的关系，用base表示。
        请不要返回JSON分析以外的任何内容。
           请以JSON格式返回，包含以下结构：
        {
          "analysis": [
            {
              "analysis_id": "唯一分析ID",
              "global_fs": "[mm:ss]"
              "speaker": "辩手A",
              "analysis_type": "affirmation",
              "content": "分析内容",
              "technique": "类比",
              "target": "被攻击/被防守的点的id",
              "base": "被延伸被阐释的论点的id",
              "goal": "攻击对方论点：xxx/支持自身论点：xxx",
              "pros_gain": "正方收益（可为负数）",
              "cons_gain": "反方收益（可为负数）",
              "summary": "用10个字以内的句子或短语简要概括",
              "interruption_type": "none"
            }
          ]
        }"""
        for attempt in range(self.max_retries):
            try:
                uploaded_file = self.client.files.upload(file=transcription_path)
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
                
                # 清理JSON字符串，删除可能存在的多余字符
                if "```json\n" in full_text:
                    full_text = full_text.replace('```json\n','')
                if "```json" in full_text:
                    full_text = full_text.replace('```json','')
                if "```" in full_text:
                    full_text = full_text.replace('```','')
                return full_text.strip()
                    
            except Exception as e:
                logger.warning(f"Gemini分析失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return ""

    def analyze_transcript(self, transcript_path: str, tree_analysis_path: str, bubble_analysis_path: str):
        """
        分析转录文本，生成树形分析和气泡分析
        
        Args:
            transcript_path: 转录文本文件路径
            tree_analysis_path: 树形分析输出路径
            bubble_analysis_path: 气泡分析输出路径
        """
        try:
            logger.info(f"开始分析转录文本: {transcript_path}")
            
            # 生成树形分析
            logger.info("生成树形分析...")
            tree_analysis = self.analyze_text(transcript_path)
            
            # 保存树形分析结果
            with open(tree_analysis_path, 'w', encoding='utf-8') as f:
                f.write(tree_analysis)
            logger.info(f"树形分析已保存到: {tree_analysis_path}")
            
            # 生成气泡分析
            logger.info("生成气泡分析...")
            bubble_analysis = self.bubble_analyze_text(transcript_path)
            
            # 保存气泡分析结果
            with open(bubble_analysis_path, 'w', encoding='utf-8') as f:
                f.write(bubble_analysis)
            logger.info(f"气泡分析已保存到: {bubble_analysis_path}")
            
            logger.info("转录文本分析完成")
            
        except Exception as e:
            logger.error(f"分析转录文本失败: {str(e)}")
            raise

    def bubble_analyze_audio(self, audio_path: str) -> str:
        # 你可以用OpenAI、Gemini等大模型
        prompt = """你是一个资深辩手，也是某辩论强校的教练。现在，你要带领新入队队员拆解一场辩论赛。
        辩论要素分析：
           - 立论 (Affirmation): 此时发言者在阐述的主要观点
           - 攻辩 (Attack): 此时发言者对对方观点的攻击
           - 防守 (Defense): 此时发言者对自身观点的辩护
           - 定义 (Definition): 对概念、术语的定义或解释
           - 举例 (Example): 为论证某一论点举出的例子
        辩论技巧识别：
           - 类比、举例、归谬、反证等
           - 语速分析（快/中/慢）
           - 打断时机分析（主动打断/被动打断）
        每一个论点或者发言点返回一段分析结果，例如正方一辩提出三个论点，则需返回三段如下的json，对应论点相应的时间戳。分析应尽量细节且及时，例如用什么例子攻击对方什么论点或者支持己方什么论点都需单独返回一段json。
        每一个论点或者发言点还要返回一个简短概括，最好在10个字以内。
        每一段分析拥有顺序的id，从1开始顺序编号。如果目标是攻击对方某论点，则需将被攻击论点的id作为本段分析的target字段。如果目标是防守某被攻击论点，则需将反驳的攻击论点作为本段分析的target字段。如果发言是对某一论点的进一步阐释，则需将被阐释论点作为本段分析的base字段。
        需要量化评估这段发言对正反双方的价值，例如正方观点或例子成功攻击到反方，力度为5，则cons_gain值为-5.如果某例子成功支持正方，或提出某个有力论点，对正方支持力度为8，则cons_gain为8.pros_gain和cons_gain的取值范围都是[-10,+10].注意，对一方的支持并不意味着对另一方的攻击，反之亦然，这意味着两者之和不必是0。
        请不要返回JSON分析以外的任何内容。
        返回的json格式不要加```字样。
           请以JSON格式返回，包含以下结构：
        {
          "analysis": [
            {
              "analysis_id": "唯一分析ID",
              "global_fs": "[mm:ss]"
              "speaker": "辩手A",
              "analysis_type": "affirmation",
              "content": "分析内容",
              "technique": "类比",
              "target": "被攻击/被防守的点的id",
              "base": "被延伸被阐释的论点的id",
              "goal": "攻击对方论点：xxx/支持自身论点：xxx",
              "pros_gain": "正方收益（可为负数）",
              "cons_gain": "反方收益（可为负数）",
              "summary": "用10个字以内的句子或短语简要概括",
              "interruption_type": "none"
            }
          ]
        }"""
        for attempt in range(self.max_retries):
            try:
                uploaded_file = self.client.files.upload(file=audio_path)
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
                
                # 清理JSON字符串，删除可能存在的多余字符
                if "```json\n" in full_text:
                    full_text = full_text.replace('```json\n','')
                if "```json" in full_text:
                    full_text = full_text.replace('```json','')
                if "```" in full_text:
                    full_text = full_text.replace('```','')
                return full_text.strip()
                    
            except Exception as e:
                logger.warning(f"Gemini分析失败(第{attempt+1}次): {str(e)}")
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        return ""
