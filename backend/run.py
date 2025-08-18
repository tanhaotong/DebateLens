#!/usr/bin/env python3
"""
Flask应用启动脚本
"""

import os
from app import create_app

# 设置环境变量
os.environ.setdefault('FLASK_APP', 'app:create_app')
os.environ.setdefault('FLASK_ENV', 'development')

# 创建应用实例
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)