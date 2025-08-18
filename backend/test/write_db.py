import sys
import os
import uuid

# 添加backend目录到路径
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
from app.models.db import db
import requests
from app.models.video import Video

app = create_app()
with app.app_context():
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"数据库中的表: {tables}")
    url="http://127.0.0.1:5000/api/videos/search"
    data={"bv_id":"BV1Qw4m1Y7xp"}
    response=requests.post(url,json=data)
    print(response.text)
    info=response.json()['video_info']

    # 写入前先查重并删除已有bv_id
    old = Video.query.filter_by(bv_id=info['bvid']).first()
    if old:
        db.session.delete(old)
        db.session.commit()
        print(f"已删除旧的bv_id={info['bvid']}记录")

    # 示例：写入一条项目数据到videos表
    v = Video(
        id="3bc762dd-cb16-4809-9fee-361dc911640c",
        bv_id="BV1Qw4m1Y7xp",
        title=info['title'],
        duration=info['duration'],
        uploader=info['uploader'],
        bilibili_url="https://www.bilibili.com/video/BV1Qw4m1Y7xp",
        status="completed",
        progress=100,
        cover=info['cover'],
    )
    db.session.add(v)
    db.session.commit()
    print("写入videos表成功")