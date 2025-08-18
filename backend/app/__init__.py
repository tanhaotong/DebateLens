from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from .config import Config
from .models import db
from .api.video import video_bp
from .api.analysis import analysis_bp
from .api.status import status_bp
from .api.transcribe import transcribe_bp
from .api.project import project_bp
from .api.proxy import proxy_bp
from .api.chat import chat_bp
from .api.config import config_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 确保文件上传限制被正确设置
    app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB
    
    # 设置其他可能影响文件上传的配置
    app.config['MAX_CONTENT_PATH'] = None
    
    # 初始化扩展
    db.init_app(app)
    CORS(app)
    Migrate(app, db)
    
    # 注册蓝图
    app.register_blueprint(video_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(transcribe_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(proxy_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(config_bp)
    return app
