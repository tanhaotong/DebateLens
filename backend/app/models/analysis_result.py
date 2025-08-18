from .db import db
from datetime import datetime

class AnalysisResult(db.Model):
    __tablename__ = 'analysis_results'
    
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.id', ondelete='CASCADE'), nullable=False)
    start_time_ms = db.Column(db.Integer, nullable=False)
    end_time_ms = db.Column(db.Integer, nullable=False)
    speaker = db.Column(db.String(50))
    analysis_type = db.Column(db.String(50))  # 'affirmation', 'attack', 'defense', 'definition'
    content = db.Column(db.Text, nullable=False)
    technique = db.Column(db.String(100))  # 辩论技巧类型
    speaking_speed = db.Column(db.String(20))  # 'fast', 'medium', 'slow'
    interruption_type = db.Column(db.String(50))  # 'active', 'passive', 'none'
    summary = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
