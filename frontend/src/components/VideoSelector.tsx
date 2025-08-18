import React, { useState } from 'react';
import { Input, Button, Card, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  bv_id: string;
}

interface VideoSelectorProps {
  onVideoSelect: (videoInfo: VideoInfo) => void;
}

const VideoSelector: React.FC<VideoSelectorProps> = ({ onVideoSelect }) => {
  const [bvId, setBvId] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const validateBvId = (id: string) => {
    const bvPattern = /^BV1[0-9A-Za-z]{10}$/;
    return bvPattern.test(id);
  };

  const handleSearch = async () => {
    if (!validateBvId(bvId)) {
      message.error('请输入正确的BV号格式');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/videos/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bv_id: bvId }),
      });
      const data = await response.json();
      if (data.status === 'success' && data.video_info) {
        const info: VideoInfo = {
          title: data.video_info.title,
          duration: data.video_info.duration,
          uploader: data.video_info.uploader,
          bv_id: bvId,
        };
        setVideoInfo(info);
        message.success('视频信息获取成功');
      } else {
        message.error(data.message || '获取视频信息失败');
      }
    } catch (error) {
      message.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (videoInfo) {
      onVideoSelect(videoInfo);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', padding: '0 20px' }}>
      <Card title="辩论视频分析" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <Input
            size="large"
            placeholder="请输入B站BV号，如：BV1xx411c7mD"
            value={bvId}
            onChange={(e) => setBvId(e.target.value)}
            onPressEnter={handleSearch}
            style={{ marginBottom: 16 }}
            disabled={loading}
          />
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
            block
          >
            搜索视频
          </Button>
        </div>

        {videoInfo && (
          <Card
            size="small"
            style={{ marginTop: 16, textAlign: 'left' }}
            title="视频信息"
          >
            <p><strong>标题：</strong>{videoInfo.title}</p>
            <p><strong>UP主：</strong>{videoInfo.uploader}</p>
            <p><strong>时长：</strong>{formatDuration(videoInfo.duration)}</p>
            <p><strong>BV号：</strong>{videoInfo.bv_id}</p>
            <Button
              type="primary"
              onClick={handleSelect}
              style={{ marginTop: 16 }}
              block
            >
              开始分析
            </Button>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default VideoSelector; 