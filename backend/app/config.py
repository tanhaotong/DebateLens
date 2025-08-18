import os
import json

def load_api_config():
    """从配置文件加载API配置"""
    config_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
    try:
        if os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                print(f"成功加载API配置: {list(config.keys())}")
                return config
        else:
            print(f"配置文件不存在: {config_file}")
    except Exception as e:
        print(f"加载API配置文件失败: {e}")
    return {}

class Config:
    # 数据库配置（开发阶段使用SQLite）
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///debatelens.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 其他配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # API配置 - 优先从配置文件加载，其次从环境变量
    api_config = load_api_config()
    GEMINI_API_KEY = api_config.get('geminiApiKey') or os.environ.get('GEMINI_API_KEY') or ''
    OPENAI_API_KEY = api_config.get('openaiApiKey') or os.environ.get('OPENAI_API_KEY') or ''
    ANTHROPIC_API_KEY = api_config.get('anthropicApiKey') or os.environ.get('ANTHROPIC_API_KEY') or ''
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 1024 * 1024 * 1024  # 1GB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'temp')
    
    # 转录配置
    MAX_RETRIES = 3
    SEGMENT_LENGTH_MS = 30 * 60 * 1000  # 30分钟
