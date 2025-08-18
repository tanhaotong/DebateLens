from .db import db
from datetime import datetime

class Transcription(db.Model):
    __tablename__ = 'transcriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id', ondelete='CASCADE'), nullable=False)
    start_time_ms = db.Column(db.Integer, nullable=False)
    end_time_ms = db.Column(db.Integer, nullable=False)
    speaker = db.Column(db.String(50))
    text = db.Column(db.Text, nullable=False)
    confidence = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class TranscriptionTask(db.Model):
    """转录任务模型"""
    __tablename__ = 'transcription_tasks'
    
    id = db.Column(db.String(36), primary_key=True)  # UUID
    original_filename = db.Column(db.String(255), nullable=False)
    audio_path = db.Column(db.String(500), nullable=False)
    transcript_path = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    segments = db.Column(db.Text)  # JSON格式的转录段数据
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
