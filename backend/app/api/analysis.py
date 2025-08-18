import os
import uuid
import json
from flask import Blueprint, jsonify, current_app, request
from app.services.analysis_service import AnalysisService

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')

@analysis_bp.route('/analyze_transcript/<task_id>', methods=['GET'])
def analyze_transcript(task_id):
    """
    自动读取本地文字稿，调用AI分析，保存结构化结果
    """
    # 假设文字稿路径
    temp_dir = os.path.join(current_app.root_path, '..', 'temp', task_id)
    transcript_path = os.path.join(temp_dir, "transcript.txt")
    if not os.path.exists(transcript_path):
        return jsonify({'success': False, 'error': 'transcript file not found'}), 404

    # with open(transcript_path, 'r', encoding='utf-8') as f:
    #     transcript = f.read()

    # 调用分析服务
    analysis_service = AnalysisService()
    result = analysis_service.analyze_text(transcript_path)

    # 保存分析结果
    output_path = os.path.join(temp_dir, "tree.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result)

    return jsonify({'success': True, 'task_id': task_id, 'result': result})

@analysis_bp.route('<task_id>_tree')
def get_analysis_tree(task_id):
    """
    获取分析结果
    """
    temp_dir = os.path.join(current_app.root_path, '..', 'temp', task_id)
    output_path = os.path.join(temp_dir, "tree.json")
    
    if not os.path.exists(output_path):
        return jsonify({'success': False, 'error': 'analysis result not found'}), 404

    with open(output_path, 'r', encoding='utf-8') as f:
        result = json.load(f)

    return result

@analysis_bp.route('<task_id>_bubble')
def get_analysis_bubble(task_id):
    """
    获取分析结果
    """
    temp_dir = os.path.join(current_app.root_path, '..', 'temp', task_id)
    output_path = os.path.join(temp_dir, "bubble.json")
    
    if not os.path.exists(output_path):
        return jsonify({'success': False, 'error': 'analysis result not found'}), 404

    with open(output_path, 'r', encoding='utf-8') as f:
        result = json.load(f)

    return result

@analysis_bp.route('/analyze_transcript_bubble/<task_id>', methods=['GET'])
def analyze_transcript_bubble(task_id):
    """
    自动读取本地文字稿，调用AI分析，保存结构化结果
    """
    # 假设文字稿路径
    temp_dir = os.path.join(current_app.root_path, '..', 'temp', task_id)
    transcript_path = os.path.join(temp_dir, "transcript.txt")
    if not os.path.exists(transcript_path):
        return jsonify({'success': False, 'error': 'transcript file not found'}), 404

    # with open(transcript_path, 'r', encoding='utf-8') as f:
    #     transcript = f.read()

    # 调用分析服务
    analysis_service = AnalysisService()
    result = analysis_service.bubble_analyze_text(transcript_path)

    # 保存分析结果
    output_path = os.path.join(temp_dir, "bubble.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result)

    return jsonify({'success': True, 'task_id': task_id, 'result': result})

@analysis_bp.route('/analyze_audio_bubble/<task_id>', methods=['GET'])
def analyze_audio_bubble(task_id):
    """
    自动读取本地文字稿，调用AI分析，保存结构化结果
    """
    # 假设文字稿路径
    temp_dir = os.path.join(current_app.root_path, '..', 'temp', task_id)
    audio_path = os.path.join(temp_dir, "audio.wav")
    if not os.path.exists(audio_path):
        return jsonify({'success': False, 'error': 'audio file not found'}), 404

    # with open(transcript_path, 'r', encoding='utf-8') as f:
    #     transcript = f.read()

    # 调用分析服务
    analysis_service = AnalysisService()
    result = analysis_service.bubble_analyze_audio(audio_path)

    # 保存分析结果
    output_path = os.path.join(temp_dir, "bubble.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result)

    return jsonify({'success': True, 'task_id': task_id, 'result': result})