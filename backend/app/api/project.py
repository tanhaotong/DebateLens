import os
import uuid
import json
from flask import Blueprint, jsonify, request, current_app, send_file
from werkzeug.utils import secure_filename
from app.models.video import Video
from app.services.audio_service import AudioService
from app.services.audio_transcribe_service import AudioTranscribeService
from app.services.analysis_service import AnalysisService
from app.models.db import db
import threading
import time

project_bp = Blueprint('project', __name__)

# 允许的视频文件扩展名
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@project_bp.route('/api/projects/list')
def list_projects():
    """获取项目列表"""
    videos = Video.query.order_by(Video.created_at.desc()).all()  # 显示所有状态的项目，按创建时间倒序
    # current_app.logger.info(f"查询到 {len(videos)} 个项目")
    # for video in videos:
    #     current_app.logger.info(f"项目 {video.id}: 状态={video.status}, 标题={video.title}")
    projects = []
    for v in videos:
        projects.append({
            'id': v.id,
            'bv_id': v.bv_id,
            'title': v.title,
            'uploader': v.uploader,
            'duration': v.duration,
            'cover': v.cover,
            'bilibili_url': v.bilibili_url,
            'created_at': v.created_at.isoformat() if v.created_at else None,
            'status': v.status,
        })
    return jsonify(projects)

@project_bp.route('/api/projects/upload', methods=['POST'])
def upload_bilibili_video():
    """上传Bilibili视频"""
    try:
        current_app.logger.info("开始处理Bilibili视频上传请求")
        data = request.get_json()
        current_app.logger.info(f"接收到的数据: {data}")
        
        bv_id = data.get('bv_id')
        title = data.get('title', '')
        
        current_app.logger.info(f"BV号: {bv_id}, 标题: {title}")
        
        if not bv_id:
            current_app.logger.error("BV号为空")
            return jsonify({'success': False, 'error': 'BV号不能为空'}), 400
        
        # 验证BV号格式
        if not bv_id.startswith('BV') or len(bv_id) != 12:
            current_app.logger.error(f"BV号格式不正确: {bv_id}")
            return jsonify({'success': False, 'error': 'BV号格式不正确'}), 400
        
        # 创建视频记录
        video_id = str(uuid.uuid4())
        video = Video(
            id=video_id,
            bv_id=bv_id,
            title=title or f"视频_{bv_id}",
            bilibili_url=f"https://www.bilibili.com/video/{bv_id}",
            status='processing'
        )
        
        db.session.add(video)
        db.session.commit()
        
        # 异步处理视频
        def process_video_async():
            from app import create_app
            app = create_app()
            with app.app_context():
                try:
                    # 重新查询视频记录，确保在正确的会话中
                    current_video = Video.query.get(video_id)
                    if not current_video:
                        app.logger.error(f"视频记录不存在: {video_id}")
                        return

                    before_download = time.time()
                    # 调用Bilibili下载和处理流程
                    from app.services.bilibili_service import BilibiliService
                    bili_service = BilibiliService()
                    
                    # 获取视频信息
                    video_info = bili_service.get_video_info(current_video.bv_id)
                    
                    # 更新视频信息
                    current_video.title = video_info.get('title', current_video.title)
                    current_video.uploader = video_info.get('uploader', current_video.uploader)
                    current_video.cover = video_info.get('cover', current_video.cover)
                    current_video.duration = video_info.get('duration', current_video.duration)
                    db.session.commit()
                    
                    # 构建任务目录路径
                    task_dir = os.path.join(app.root_path, '..', 'temp', video_id)
                    os.makedirs(task_dir, exist_ok=True)
                    
                    # 下载视频
                    video_path = bili_service.download_video(current_video.bv_id, video_id)

                    after_download = time.time()
                    print(f"视频下载耗时: {after_download - before_download:.2f}秒")

                    # 处理下载的视频
                    process_local_video_pipeline(video_id, video_path, task_dir)

                    after_process = time.time()
                    print(f'全过程耗时: {after_process - before_download:.2f}秒')

                except Exception as e:
                    try:
                        current_video = Video.query.get(video_id)
                        if current_video:
                            current_video.status = 'failed'
                            db.session.commit()
                    except Exception as db_error:
                        app.logger.error(f"更新数据库状态失败: {str(db_error)}")
                    app.logger.error(f"处理Bilibili视频失败: {str(e)}")
        
        thread = threading.Thread(target=process_video_async)
        thread.start()
        
        return jsonify({'success': True, 'video_id': video_id})
        
    except Exception as e:
        current_app.logger.error(f"上传Bilibili视频失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@project_bp.route('/api/projects/upload_local', methods=['POST'])
def upload_local_video():
    """上传本地视频文件"""
    try:
        if 'video_file' not in request.files:
            return jsonify({'success': False, 'error': '没有选择文件'}), 400
        
        file = request.files['video_file']
        title = request.form.get('title', '')
        
        if file.filename == '':
            return jsonify({'success': False, 'error': '没有选择文件'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': '不支持的文件格式'}), 400
        
        # 生成唯一ID和目录
        video_id = str(uuid.uuid4())
        task_dir = os.path.join(current_app.root_path, '..', 'temp', video_id)
        os.makedirs(task_dir, exist_ok=True)
        
        # 保存视频文件
        original_filename = file.filename
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        video_path = os.path.join(task_dir, f"video.{file_extension}")
        file.save(video_path)
        
        # 创建视频记录 - 使用原始文件名（支持中文）
        display_title = title or original_filename.rsplit('.', 1)[0]
        video = Video(
            id=video_id,
            bv_id=f"LV{video_id[:8].upper()}",  # Local Video
            title=display_title,
            bilibili_url='',
            status='processing'
        )
        
        db.session.add(video)
        db.session.commit()
        
        # 异步处理视频
        def process_local_video_async():
            from app import create_app
            app = create_app()
            with app.app_context():
                try:
                    process_local_video_pipeline(video_id, video_path, task_dir)
                except Exception as e:
                    try:
                        current_video = Video.query.get(video_id)
                        if current_video:
                            current_video.status = 'failed'
                            db.session.commit()
                    except Exception as db_error:
                        app.logger.error(f"更新数据库状态失败: {str(db_error)}")
                    app.logger.error(f"处理本地视频失败: {str(e)}")
        
        thread = threading.Thread(target=process_local_video_async)
        thread.start()
        
        return jsonify({'success': True, 'video_id': video_id})
        
    except Exception as e:
        current_app.logger.error(f"上传本地视频失败: {str(e)}")
        error_msg = str(e)
        if "413" in error_msg or "Request Entity Too Large" in error_msg:
            error_msg = "文件太大！最大支持1GB，请选择较小的视频文件。"
        return jsonify({'success': False, 'error': error_msg}), 500



def process_local_video_pipeline(video_id: str, video_path: str, task_dir: str):
    """处理本地视频的完整流程：提取音频 -> 转录 -> 分析"""
    try:
        current_app.logger.info(f"开始处理本地视频: {video_id}")
        
        # 定义文件路径
        audio_path = os.path.join(task_dir, "audio.wav")
        transcript_path = os.path.join(task_dir, "transcript.txt")
        tree_analysis_path = os.path.join(task_dir, "tree.json")
        bubble_analysis_path = os.path.join(task_dir, "bubble.json")

        before_extract = time.time()

        # 步骤1: 提取音频
        current_app.logger.info(f"步骤1: 提取音频")
        try:
            if not os.path.exists(audio_path):
                audio_service = AudioService()
                audio_service.extract_audio(video_path, audio_path)
                current_app.logger.info(f"音频提取完成: {audio_path}")
            else:
                current_app.logger.info(f"音频文件已存在，跳过提取: {audio_path}")
        except Exception as e:
            current_app.logger.error(f"音频提取失败: {str(e)}")
            raise Exception(f"音频提取失败: {str(e)}")

        after_extract = time.time()
        print(f"音频提取耗时: {after_extract - before_extract:.2f}秒")

        before_transcribe = time.time()
        # 步骤2: 转录音频
        current_app.logger.info(f"步骤2: 转录音频")
        try:
            if not os.path.exists(transcript_path):
                from app.config import Config
                transcribe_service = AudioTranscribeService(
                    gemini_api_key=Config.GEMINI_API_KEY,
                    max_retries=Config.MAX_RETRIES,
                    segment_length_ms=Config.SEGMENT_LENGTH_MS
                )
                transcribe_service.transcribe_audio(audio_path)
                current_app.logger.info(f"转录完成: {transcript_path}")
            else:
                current_app.logger.info(f"转录文件已存在，跳过转录: {transcript_path}")
        except Exception as e:
            current_app.logger.error(f"音频转录失败: {str(e)}")
            raise Exception(f"音频转录失败: {str(e)}")

        after_transcribe = time.time()
        print(f"音频转录耗时: {after_transcribe - before_transcribe:.2f}秒")

        before_analysis = time.time()
        # 步骤3: 分析转录文本
        current_app.logger.info(f"步骤3: 分析转录文本")
        try:
            if not os.path.exists(tree_analysis_path) or not os.path.exists(bubble_analysis_path):
                from app.config import Config
                analysis_service = AnalysisService(
                    gemini_api_key=Config.GEMINI_API_KEY,
                    max_retries=Config.MAX_RETRIES
                )
                analysis_service.analyze_transcript(
                    transcript_path, 
                    tree_analysis_path, 
                    bubble_analysis_path
                )
                current_app.logger.info(f"分析完成: {tree_analysis_path}, {bubble_analysis_path}")
            else:
                current_app.logger.info(f"分析文件已存在，跳过分析")
        except Exception as e:
            current_app.logger.error(f"文本分析失败: {str(e)}")
            raise Exception(f"文本分析失败: {str(e)}")

        after_analysis = time.time()
        print(f"音频分析耗时: {after_analysis - before_analysis:.2f}秒")

        # 步骤4: 更新视频状态
        try:
            video = Video.query.get(video_id)
            if video:
                video.status = 'completed'
                db.session.commit()
                current_app.logger.info(f"本地视频处理完成: {video_id}")
        except Exception as db_error:
            current_app.logger.error(f"更新数据库状态失败: {str(db_error)}")


    except Exception as e:
        current_app.logger.error(f"处理本地视频失败: {str(e)}")
        # 更新状态为失败
        try:
            video = Video.query.get(video_id)
            if video:
                video.status = 'failed'
                db.session.commit()
                current_app.logger.info(f"已更新视频状态为失败: {video_id}")
        except Exception as db_error:
            current_app.logger.error(f"更新数据库状态失败: {str(db_error)}")
        raise e

@project_bp.route('/api/projects/delete/<video_id>', methods=['DELETE'])
def delete_project(video_id):
    """删除项目"""
    try:
        # 查找视频记录
        video = Video.query.get(video_id)
        if not video:
            return jsonify({'success': False, 'error': '项目不存在'}), 404
        
        current_app.logger.info(f"删除项目: {video_id}, 标题: {video.title}")
        
        # 删除相关文件
        task_dir = os.path.join('temp', video_id)
        if os.path.exists(task_dir):
            import shutil
            shutil.rmtree(task_dir)
            current_app.logger.info(f"删除项目文件夹: {task_dir}")
        
        # 删除数据库记录
        db.session.delete(video)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '项目删除成功'})
        
    except Exception as e:
        current_app.logger.error(f"删除项目失败: {str(e)}")
        return jsonify({'success': False, 'error': f'删除失败: {str(e)}'}), 500

@project_bp.route('/api/projects/retry/<video_id>', methods=['POST'])
def retry_video_processing(video_id):
    """重试视频处理"""
    try:
        # 查找视频记录
        video = Video.query.get(video_id)
        if not video:
            return jsonify({'success': False, 'error': '视频不存在'}), 404
        
        current_app.logger.info(f"重试处理视频: {video_id}, 当前状态: {video.status}")
        
        # 更新状态为处理中
        video.status = 'processing'
        db.session.commit()
        
        # 构建文件路径
        task_dir = os.path.join(current_app.root_path, '..', 'temp', video_id)
        
        # 查找视频文件
        video_file = None
        if os.path.exists(task_dir):
            for filename in os.listdir(task_dir):
                if filename.startswith('video.') and any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                    video_file = os.path.join(task_dir, filename)
                    break
        
        if not video_file or not os.path.exists(video_file):
            current_app.logger.warning(f"视频文件不存在: {task_dir}")
            # 如果是B站视频，尝试重新下载
            if not video.bv_id.startswith('LV'):
                current_app.logger.info(f"尝试重新下载B站视频: {video.bv_id}")
                # 继续处理，让异步函数重新下载
            else:
                return jsonify({'success': False, 'error': '本地视频文件不存在'}), 404
        
        # 异步重试处理
        def retry_process_async():
            from app import create_app
            app = create_app()
            with app.app_context():
                try:
                    # 重新查询视频记录，确保在正确的会话中
                    current_video = Video.query.get(video_id)
                    if not current_video:
                        app.logger.error(f"视频记录不存在: {video_id}")
                        return
                    
                    app.logger.info(f"开始重试处理视频: {video_id}")
                    
                    if current_video.bv_id.startswith('LV'):
                        # 本地视频重试
                        if video_file and os.path.exists(video_file):
                            app.logger.info(f"本地视频文件存在，开始处理: {video_file}")
                            process_local_video_pipeline(video_id, video_file, task_dir)
                        else:
                            app.logger.error(f"本地视频文件不存在: {video_file}")
                            current_video.status = 'failed'
                            db.session.commit()
                            app.logger.info(f"已更新状态为失败: {video_id}")
                    else:
                        # B站视频重试
                        app.logger.info(f"B站视频重试，开始下载: {current_video.bv_id}")
                        from app.services.bilibili_service import BilibiliService
                        bili_service = BilibiliService()
                        
                        # 检查视频文件是否已经存在
                        video_file = None
                        if os.path.exists(task_dir):
                            for filename in os.listdir(task_dir):
                                if filename.startswith('video.') and any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                                    video_file = os.path.join(task_dir, filename)
                                    break
                        
                        if video_file and os.path.exists(video_file):
                            app.logger.info(f"B站视频文件已存在，跳过下载: {video_file}")
                            video_path = video_file
                        else:
                            app.logger.info(f"B站视频文件不存在，开始下载: {current_video.bv_id}")
                            video_path = bili_service.download_video(current_video.bv_id, video_id)
                        
                        before_process=time.time()
                        process_local_video_pipeline(video_id, video_path, task_dir)
                        after_process = time.time()
                        print(f'处理用时：{after_process-before_process:.2f}秒')
                    
                    app.logger.info(f"重试处理完成: {video_id}")
                    
                except Exception as e:
                    app.logger.error(f"重试处理视频失败: {str(e)}")
                    try:
                        current_video = Video.query.get(video_id)
                        if current_video:
                            current_video.status = 'failed'
                            db.session.commit()
                            app.logger.info(f"已更新状态为失败: {video_id}")
                    except Exception as db_error:
                        app.logger.error(f"更新数据库状态失败: {str(db_error)}")
        
        thread = threading.Thread(target=retry_process_async)
        thread.start()
        
        return jsonify({'success': True, 'message': '重试处理已开始'})
        
    except Exception as e:
        current_app.logger.error(f"重试视频处理失败: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
