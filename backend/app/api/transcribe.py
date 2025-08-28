import os
import uuid
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, Response, stream_template
from werkzeug.utils import secure_filename
from app.services.audio_transcribe_service import AudioTranscribeService, TranscriptionSegment
from app.models.transcription import TranscriptionTask
from app.models.db import db
import json

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建蓝图
transcribe_bp = Blueprint('transcribe', __name__, url_prefix='/api/transcribe')

# 允许的音频文件扩展名
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg'}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_transcribe_service():
    """获取转录服务实例"""
    # 优先使用 app.config；若无则回退到 Config（避免因热更新不同步导致的空值）
    from app.config import Config
    gemini_api_key = current_app.config.get('GEMINI_API_KEY') or Config.GEMINI_API_KEY
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured")
    
    return AudioTranscribeService(
        gemini_api_key=gemini_api_key,
        max_retries=3,
        segment_length_ms=30*60*1000  # 30分钟一段
    )

def segments_to_dict(segments):
    """将TranscriptionSegment列表转换为字典列表"""
    return [
        {
            'start_time_ms': seg.start_time_ms,
            'end_time_ms': seg.end_time_ms,
            'speaker': seg.speaker,
            'text': seg.text,
            'confidence': seg.confidence,
            'camp': getattr(seg, 'camp', '未知'),
            'stage': getattr(seg, 'stage', '未知阶段'),
            'stage_name': getattr(seg, 'stage_name', '')
        }
        for seg in segments
    ]

@transcribe_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'transcribe',
        'timestamp': datetime.utcnow().isoformat()
    })

@transcribe_bp.route('/upload', methods=['POST'])
def upload_audio():
    """
    上传音频文件并开始转录
    
    Returns:
        JSON响应包含任务ID和状态
    """
    try:
        # 检查是否有文件
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # 检查文件类型
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # 生成唯一文件名
        file_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        audio_filename = f"{file_id}.{file_extension}"
        
        # 确保上传目录存在
        upload_dir = os.path.join(current_app.root_path, '..', 'temp', f'task_{file_id}')
        os.makedirs(upload_dir, exist_ok=True)
        
        # 保存文件
        audio_path = os.path.join(upload_dir, audio_filename)
        file.save(audio_path)
        
        # 创建转录记录
        transcription = TranscriptionTask(
            id=file_id,
            original_filename=filename,
            audio_path=audio_path,
            status='pending',
            created_at=datetime.utcnow()
        )
        
        db.session.add(transcription)
        db.session.commit()
        
        # 异步开始转录（在实际部署中应该使用Celery等任务队列）
        try:
            transcribe_service = get_transcribe_service()
            segments = transcribe_service.transcribe_audio(audio_path)
            
            # 保存转录结果
            transcription.status = 'completed'
            transcription.completed_at = datetime.utcnow()
            transcription.segments = str(segments_to_dict(segments))
            
            # 生成转录文本文件
            output_filename = f"{file_id}_transcript.txt"
            output_path = os.path.join(upload_dir, output_filename)
            transcribe_service.save_transcription_to_file(segments, output_path)
            transcription.transcript_path = output_path
            
            db.session.commit()
            
            # 清理临时文件
            transcribe_service.cleanup_temp_files()
            
            return jsonify({
                'success': True,
                'task_id': file_id,
                'status': 'completed',
                'message': 'Transcription completed successfully',
                'segments_count': len(segments)
            })
            
        except Exception as e:
            logger.error(f"转录失败: {str(e)}")
            transcription.status = 'failed'
            transcription.error_message = str(e)
            db.session.commit()
            
            return jsonify({
                'success': False,
                'task_id': file_id,
                'status': 'failed',
                'error': str(e)
            }), 500
        
    except Exception as e:
        logger.error(f"上传处理失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transcribe_bp.route('process_raw_text/<task_id>', methods=['GET'])
def process_raw_text(task_id):
    upload_dir = os.path.join(current_app.root_path, '..', 'temp', f'task_{task_id}')
    raw_text_path = os.path.join(upload_dir, f'{task_id}_raw.txt')
    transcribe_service=get_transcribe_service()
    transcribe_service.from_raw_text(raw_text_path)
    return jsonify({
        'success': True,
        'task_id': task_id,
    })
    

@transcribe_bp.route('/retranscribe/<task_id>', methods=['GET'])
def retranscribe_audio(task_id):
    upload_dir = os.path.join(current_app.root_path, '..', 'temp', f'task_{task_id}')
    audio_path = os.path.join(upload_dir,f"{task_id}.mp3")
    # transcription= TranscriptionTask.query.get(task_id)
    try:
        transcribe_service = get_transcribe_service()
        segments = transcribe_service.transcribe_audio(audio_path)
        
        # 保存转录结果
        # transcription.status = 'completed'
        # transcription.completed_at = datetime.utcnow()
        # transcription.segments = str(segments_to_dict(segments))
        
        # 生成转录文本文件
        output_filename = f"{task_id}_transcript.txt"
        output_path = os.path.join(upload_dir, output_filename)
        transcribe_service.save_transcription_to_file(segments, output_path)
        # transcription.transcript_path = output_path
        
        db.session.commit()
        
        # 清理临时文件
        transcribe_service.cleanup_temp_files()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': 'completed',
            'message': 'Transcription completed successfully',
            'segments_count': len(segments)
        })
        
    except Exception as e:
        logger.error(f"转录失败: {str(e)}")
        # transcription.status = 'failed'
        # transcription.error_message = str(e)
        db.session.commit()
        
        return jsonify({
            'success': False,
            'task_id': task_id,
            'status': 'failed',
            'error': str(e)
        }), 500


@transcribe_bp.route('/status/<task_id>', methods=['GET'])
def get_transcription_status(task_id):
    """
    获取转录任务状态
    
    Args:
        task_id: 任务ID
        
    Returns:
        JSON响应包含任务状态和结果
    """
    try:
        transcription = TranscriptionTask.query.get(task_id)
        if not transcription:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        response = {
            'success': True,
            'task_id': task_id,
            'status': transcription.status,
            'original_filename': transcription.original_filename,
            'created_at': transcription.created_at.isoformat() if transcription.created_at else None,
            'completed_at': transcription.completed_at.isoformat() if transcription.completed_at else None
        }
        
        if transcription.status == 'completed':
            # 解析转录段
            import ast
            segments_data = ast.literal_eval(transcription.segments) if transcription.segments else []
            response['segments_count'] = len(segments_data)
            response['segments'] = segments_data
            
            # 生成完整转录文本
            full_text = ""
            for segment in segments_data:
                start_min = segment['start_time_ms'] // 1000 // 60
                start_sec = segment['start_time_ms'] // 1000 % 60
                full_text += f"[{start_min:02d}:{start_sec:02d}] {segment['speaker']}: {segment['text']}\n"
            
            response['full_text'] = full_text
            
        elif transcription.status == 'failed':
            response['error_message'] = transcription.error_message
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"获取状态失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transcribe_bp.route('/download/<project_id>', methods=['GET'])
def download_transcript(project_id):
    """
    下载转录文本文件
    
    Args:
        project_id: 项目ID (BV号)
        
    Returns:
        转录文本文件
    """
    try:
        # 查找项目对应的转录任务
        transcription = TranscriptionTask.query.filter(
            TranscriptionTask.original_filename.like(f'%{project_id}%')
        ).first()
        
        if not transcription:
            return jsonify({
                'success': False,
                'error': 'Transcription not found for this project'
            }), 404
        
        if transcription.status != 'completed':
            return jsonify({
                'success': False,
                'error': 'Transcription not completed'
            }), 400
        
        if not transcription.transcript_path or not os.path.exists(transcription.transcript_path):
            return jsonify({
                'success': False,
                'error': 'Transcript file not found'
            }), 404
        
        # 返回文件内容
        with open(transcription.transcript_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'task_id': transcription.id,
            'filename': f"{project_id}_transcript.txt",
            'content': content
        })
        
    except Exception as e:
        logger.error(f"下载失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transcribe_bp.route('/list', methods=['GET'])
def list_transcriptions():
    """
    获取所有转录任务列表
    
    Returns:
        JSON响应包含任务列表
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        transcriptions = TranscriptionTask.query.order_by(
            TranscriptionTask.created_at.desc()
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        tasks = []
        for transcription in transcriptions.items:
            task = {
                'task_id': transcription.id,
                'original_filename': transcription.original_filename,
                'status': transcription.status,
                'created_at': transcription.created_at.isoformat() if transcription.created_at else None,
                'completed_at': transcription.completed_at.isoformat() if transcription.completed_at else None
            }
            
            if transcription.status == 'completed' and transcription.segments:
                import ast
                segments_data = ast.literal_eval(transcription.segments)
                task['segments_count'] = len(segments_data)
            
            tasks.append(task)
        
        return jsonify({
            'success': True,
            'tasks': tasks,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transcriptions.total,
                'pages': transcriptions.pages,
                'has_next': transcriptions.has_next,
                'has_prev': transcriptions.has_prev
            }
        })
        
    except Exception as e:
        logger.error(f"获取任务列表失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transcribe_bp.route('/delete/<task_id>', methods=['DELETE'])
def delete_transcription(task_id):
    """
    删除转录任务及相关文件
    
    Args:
        task_id: 任务ID
        
    Returns:
        JSON响应
    """
    try:
        transcription = TranscriptionTask.query.get(task_id)
        if not transcription:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        # 删除相关文件
        if transcription.audio_path and os.path.exists(transcription.audio_path):
            os.remove(transcription.audio_path)
        
        if transcription.transcript_path and os.path.exists(transcription.transcript_path):
            os.remove(transcription.transcript_path)
        
        # 删除数据库记录
        db.session.delete(transcription)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transcription deleted successfully'
        })
        
    except Exception as e:
        logger.error(f"删除失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@transcribe_bp.route('/retry/<task_id>', methods=['POST'])
def retry_transcription(task_id):
    """
    重试失败的转录任务
    
    Args:
        task_id: 任务ID
        
    Returns:
        JSON响应
    """
    try:
        transcription = TranscriptionTask.query.get(task_id)
        if not transcription:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        if transcription.status != 'failed':
            return jsonify({
                'success': False,
                'error': 'Only failed tasks can be retried'
            }), 400
        
        if not transcription.audio_path or not os.path.exists(transcription.audio_path):
            return jsonify({
                'success': False,
                'error': 'Audio file not found'
            }), 404
        
        # 重置状态
        transcription.status = 'pending'
        transcription.error_message = None
        db.session.commit()
        
        # 重新转录
        try:
            transcribe_service = get_transcribe_service()
            segments = transcribe_service.transcribe_audio(transcription.audio_path)
            
            # 更新结果
            transcription.status = 'completed'
            transcription.completed_at = datetime.utcnow()
            transcription.segments = str(segments_to_dict(segments))
            
            # 更新转录文件
            if transcription.transcript_path and os.path.exists(transcription.transcript_path):
                os.remove(transcription.transcript_path)
            
            output_filename = f"{task_id}_transcript.txt"
            output_path = os.path.join(os.path.dirname(transcription.audio_path), output_filename)
            transcribe_service.save_transcription_to_file(segments, output_path)
            transcription.transcript_path = output_path
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'task_id': task_id,
                'status': 'completed',
                'message': 'Transcription retried successfully',
                'segments_count': len(segments)
            })
            
        except Exception as e:
            logger.error(f"重试转录失败: {str(e)}")
            transcription.status = 'failed'
            transcription.error_message = str(e)
            db.session.commit()
            
            return jsonify({
                'success': False,
                'task_id': task_id,
                'status': 'failed',
                'error': str(e)
            }), 500
        
    except Exception as e:
        logger.error(f"重试失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@transcribe_bp.route('/stream/<task_id>', methods=['GET'])
def stream_transcription(task_id):
    """流式转录API，实时返回转录结果"""
    try:
        transcription = TranscriptionTask.query.get(task_id)
        if not transcription:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        if transcription.status != 'pending':
            return jsonify({
                'success': False,
                'error': 'Task is not in pending status'
            }), 400
        
        if not transcription.audio_path or not os.path.exists(transcription.audio_path):
            return jsonify({
                'success': False,
                'error': 'Audio file not found'
            }), 404
        
        def generate():
            """生成器函数，实时返回转录结果"""
            try:
                # 更新状态为处理中
                transcription.status = 'processing'
                db.session.commit()
                
                transcribe_service = get_transcribe_service()
                
                # 进度回调函数
                def progress_callback(current, total, description):
                    progress_data = {
                        'type': 'progress',
                        'current': current,
                        'total': total,
                        'description': description,
                        'percentage': int((current / total) * 100)
                    }
                    yield f"data: {json.dumps(progress_data, ensure_ascii=False)}\n\n"
                
                # 开始流式转录
                segments_count = 0
                for segment in transcribe_service.transcribe_audio_stream(
                    transcription.audio_path, 
                    progress_callback
                ):
                    segments_count += 1
                    segment_data = {
                        'type': 'segment',
                        'segment': {
                            'start_time_ms': segment.start_time_ms,
                            'end_time_ms': segment.end_time_ms,
                            'speaker': segment.speaker,
                            'text': segment.text,
                            'confidence': segment.confidence,
                            'camp': getattr(segment, 'camp', '未知'),
                            'stage': getattr(segment, 'stage', '未知阶段'),
                            'stage_name': getattr(segment, 'stage_name', '')
                        },
                        'count': segments_count
                    }
                    yield f"data: {json.dumps(segment_data, ensure_ascii=False)}\n\n"
                
                # 转录完成
                transcription.status = 'completed'
                transcription.completed_at = datetime.utcnow()
                transcription.segments = str(segments_to_dict(list(transcribe_service.transcribe_audio(transcription.audio_path))))
                
                # 生成转录文本文件
                output_filename = f"{task_id}_transcript.txt"
                output_path = os.path.join(os.path.dirname(transcription.audio_path), output_filename)
                transcribe_service.save_transcription_to_file(list(transcribe_service.transcribe_audio(transcription.audio_path)), output_path)
                transcription.transcript_path = output_path
                
                db.session.commit()
                
                # 发送完成消息
                completion_data = {
                    'type': 'completion',
                    'message': 'Transcription completed successfully',
                    'segments_count': segments_count
                }
                yield f"data: {json.dumps(completion_data, ensure_ascii=False)}\n\n"
                
            except Exception as e:
                logger.error(f"流式转录失败: {str(e)}")
                transcription.status = 'failed'
                transcription.error_message = str(e)
                db.session.commit()
                
                error_data = {
                    'type': 'error',
                    'error': str(e)
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            }
        )
        
    except Exception as e:
        logger.error(f"流式转录API失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
