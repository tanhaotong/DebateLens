import os
import logging
from flask import Blueprint, request, jsonify, current_app, Response
from app.services.gemini_chat_service import GeminiChatService

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建蓝图
chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

def get_chat_service():
    """获取聊天服务实例"""
    api_key = current_app.config.get('GEMINI_API_KEY')
    return GeminiChatService(api_key=api_key)

@chat_bp.route('/chat', methods=['POST'])
def chat():
    """
    聊天接口 - 使用文件上传和流式输出
    
    Request Body:
        projectId: 项目ID
        currentTime: 当前视频时间
        question: 用户问题
    
    Returns:
        流式响应包含AI回答
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        project_id = data.get('projectId')
        current_time = data.get('currentTime', 0)
        question = data.get('question', '')
        
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question is required'
            }), 400
        
        # 获取转录任务和文字稿文件路径
        temp_dir = os.path.join(current_app.root_path, '..', 'temp', project_id)
        transcript_path = os.path.join(temp_dir, "transcript.txt")

        # 获取聊天服务
        chat_service = get_chat_service()
        
        def generate_response():
            """生成流式响应"""
            try:
                # 使用服务进行流式聊天
                for chunk in chat_service.chat_with_transcript_stream(
                    transcript_path, 
                    current_time, 
                    question
                ):
                    yield f"data: {chunk}\n\n"
                
                # 发送完成信号
                yield f"data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Error in chat stream: {str(e)}")
                error_msg = "抱歉，AI 服务暂时不可用。请检查网络连接或稍后重试。"
                if "timeout" in str(e).lower() or "connection" in str(e).lower():
                    error_msg = "抱歉，AI 服务连接超时。请检查网络连接或稍后重试。"
                elif "api" in str(e).lower() or "key" in str(e).lower():
                    error_msg = "抱歉，AI 服务配置有误。请检查 API 密钥配置。"
                
                yield f"data: {error_msg}\n\n"
                yield f"data: [DONE]\n\n"
        
        return Response(generate_response(), mimetype='text/plain')
        
    except ValueError as e:
        logger.error(f"Configuration error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/chat_full', methods=['POST'])
def chat_full():
    """
    非流式聊天接口，返回完整内容
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        project_id = data.get('projectId')
        current_time = data.get('currentTime', 0)
        question = data.get('question', '')
        if not question:
            return jsonify({'success': False, 'error': 'Question is required'}), 400
        temp_dir = os.path.join(current_app.root_path, '..', 'temp', project_id)
        transcript_path = os.path.join(temp_dir, "transcript.txt")
        chat_service = get_chat_service()
        answer = chat_service.chat_with_transcript(transcript_path, current_time, question)
        return jsonify({'success': True, 'answer': answer})
    except Exception as e:
        logger.error(f"Error in chat_full: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@chat_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    try:
        # 测试聊天服务
        chat_service = get_chat_service()
        is_healthy = chat_service.health_check()
        
        # 即使API连接失败，也返回服务可用的状态
        # 因为服务本身是正常的，只是外部API暂时不可用
        return jsonify({
            'status': 'healthy',
            'service': 'chat',
            'message': 'Chat service is available',
            'api_status': 'available' if is_healthy else 'unavailable'
        })
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'chat',
            'error': str(e)
        }), 500 