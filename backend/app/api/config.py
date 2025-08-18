from flask import Blueprint, request, jsonify
from app.config import Config
import os
import json

config_bp = Blueprint('config', __name__)

# 配置文件路径
CONFIG_FILE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')

def load_config():
    """从配置文件加载配置"""
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"加载配置文件失败: {e}")
    return {}

def save_config(config_data):
    """保存配置到文件"""
    try:
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存配置文件失败: {e}")
        return False

@config_bp.route('/api/config', methods=['GET'])
def get_config():
    """获取当前配置"""
    try:
        config = load_config()
        return jsonify({
            'success': True,
            'data': {
                'geminiApiKey': config.get('geminiApiKey', ''),
                'openaiApiKey': config.get('openaiApiKey', ''),
                'anthropicApiKey': config.get('anthropicApiKey', '')
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config', methods=['POST'])
def update_config():
    """更新配置"""
    try:
        data = request.get_json()
        
        # 验证数据
        if not data:
            return jsonify({
                'success': False,
                'error': '无效的请求数据'
            }), 400
        
        # 验证API Key格式
        validation_errors = []
        
        if data.get('geminiApiKey') and not data['geminiApiKey'].startswith('AIza'):
            validation_errors.append('Gemini API Key 格式不正确，应以 "AIza" 开头')
        
        if data.get('openaiApiKey') and not data['openaiApiKey'].startswith('sk-'):
            validation_errors.append('OpenAI API Key 格式不正确，应以 "sk-" 开头')
        
        if data.get('anthropicApiKey') and not data['anthropicApiKey'].startswith('sk-ant-'):
            validation_errors.append('Anthropic API Key 格式不正确，应以 "sk-ant-" 开头')
        
        if validation_errors:
            return jsonify({
                'success': False,
                'error': '\n'.join(validation_errors)
            }), 400
        
        # 保存配置
        config = load_config()
        config.update({
            'geminiApiKey': data.get('geminiApiKey', ''),
            'openaiApiKey': data.get('openaiApiKey', ''),
            'anthropicApiKey': data.get('anthropicApiKey', '')
        })
        
        if save_config(config):
            # 更新环境变量（当前会话）
            if config.get('geminiApiKey'):
                os.environ['GEMINI_API_KEY'] = config['geminiApiKey']
            if config.get('openaiApiKey'):
                os.environ['OPENAI_API_KEY'] = config['openaiApiKey']
            if config.get('anthropicApiKey'):
                os.environ['ANTHROPIC_API_KEY'] = config['anthropicApiKey']
            
            # 重新加载配置
            from app.config import Config
            Config.api_config = load_config()
            Config.GEMINI_API_KEY = Config.api_config.get('geminiApiKey') or os.environ.get('GEMINI_API_KEY') or ''
            Config.OPENAI_API_KEY = Config.api_config.get('openaiApiKey') or os.environ.get('OPENAI_API_KEY') or ''
            Config.ANTHROPIC_API_KEY = Config.api_config.get('anthropicApiKey') or os.environ.get('ANTHROPIC_API_KEY') or ''
            
            return jsonify({
                'success': True,
                'message': '配置已保存并重新加载'
            })
        else:
            return jsonify({
                'success': False,
                'error': '保存配置失败'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_bp.route('/api/config/status', methods=['GET'])
def get_config_status():
    """获取配置状态"""
    try:
        config = load_config()
        return jsonify({
            'success': True,
            'data': {
                'gemini': bool(config.get('geminiApiKey')),
                'openai': bool(config.get('openaiApiKey')),
                'anthropic': bool(config.get('anthropicApiKey'))
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 