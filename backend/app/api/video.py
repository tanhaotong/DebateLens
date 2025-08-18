from flask import Blueprint, request, jsonify
from app.services.bilibili_service import BilibiliService
from flask import current_app, send_from_directory

video_bp = Blueprint('video', __name__)
bili_service = BilibiliService()

@video_bp.route('/api/videos/search', methods=['POST'])
def search_video():
    data = request.get_json()
    bv_id = data.get('bv_id')
    if not bv_id:
        return jsonify({'error': '缺少BV号'}), 400
    try:
        info = bili_service.get_video_info(bv_id)
        return jsonify({'status': 'success', 'video_info': info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@video_bp.route('/api/videos/download', methods=['POST'])
def download_video():
    data = request.get_json()
    bv_id = data.get('bv_id')
    if not bv_id:
        return jsonify({'error': '缺少BV号'}), 400
    try:
        info = bili_service.download_video(bv_id)
        return jsonify({'status': 'success', 'video_info': info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@video_bp.route('/api/videos/download_audio', methods=['POST'])
def download_audio():
    data = request.get_json()
    bv_id = data.get('bv_id')
    if not bv_id:
        return jsonify({'error': '缺少BV号'}), 400
    try:
        info = bili_service.download_audio(bv_id)
        return jsonify({'status': 'success', 'video_info': info})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@video_bp.route('/api/video/<video_id>')
def get_video(video_id):
    """统一的视频播放API，支持本地视频和B站视频"""
    import os
    from app.models.video import Video
    from app.models.db import db
    
    # 查找视频记录
    video = Video.query.get(video_id)
    if not video:
        return jsonify({'status': 'error', 'message': '视频不存在'}), 404
    
    # 构建视频目录路径
    video_dir = os.path.abspath(os.path.join(current_app.root_path, '..', 'temp', video_id))
    
    # 查找视频文件
    video_file = None
    allowed_extensions = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}
    
    for filename in os.listdir(video_dir):
        if filename.startswith('video.') and any(filename.endswith(ext) for ext in allowed_extensions):
            video_file = filename
            break
    
    if not video_file:
        return jsonify({'status': 'error', 'message': '视频文件不存在'}), 404
    
    full_path = os.path.join(video_dir, video_file)
    if not os.path.exists(full_path):
        return jsonify({'status': 'error', 'message': '视频文件不存在'}), 404
    
    return send_from_directory(video_dir, video_file)
