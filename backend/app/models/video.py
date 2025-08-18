from .db import db
from datetime import datetime
import uuid

class Video(db.Model):
    __tablename__ = 'videos'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bv_id = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(500), nullable=False)
    duration = db.Column(db.Integer)
    uploader = db.Column(db.String(100))
    bilibili_url = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    progress = db.Column(db.Integer, default=0)  # 处理进度 0-100
    error_message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cover = db.Column(db.String(500))  # 封面图片URL或路径
    
    # 关联关系
    transcriptions = db.relationship('Transcription', backref='video', lazy=True, cascade='all, delete-orphan')
    analysis_results = db.relationship('AnalysisResult', backref='video', lazy=True, cascade='all, delete-orphan')
