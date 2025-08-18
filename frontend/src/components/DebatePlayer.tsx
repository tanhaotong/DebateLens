import React, { useRef, useState, useEffect } from "react";
import {
  Card,
  Button,
  Tabs,
  Spin,
  FloatButton,
  Typography,
  Space,
  Tag,
  
  Breadcrumb,
  Avatar,
  
  Badge
} from "antd";
import {
  ArrowLeftOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  VideoCameraOutlined,
  BarChartOutlined,
  AppstoreOutlined
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";

import AnalysisList from "./AnalysisList";

import AttackDefenceTree2 from "./AttackDefenceTree2";
import ArgumentMap from "./ArgumentMap";
import GeminiChat from "./GeminiChat";

const { Title, Text } = Typography;

interface Project {
  id: string;
  bv_id: string;
  title: string;
  duration?: number;
  cover?: string;
  uploader?: string;
  bilibili_url?: string;
}

const DebatePlayer: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const analysisListRef = useRef<any>(null);
  const [tabKey, setTabKey] = useState<'tree' | 'bubble'>('tree');
  const [treeAnalysis, setTreeAnalysis] = useState<any[]>([]);
  const [bubbleAnalysis, setBubbleAnalysis] = useState<any[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);

  // 加载项目信息
  useEffect(() => {
    if (!projectId) {
      navigate('/');
      return;
    }

    fetch('/api/projects/list')
      .then(res => res.json())
      .then((projects: Project[]) => {
        const foundProject = projects.find(p => p.id === projectId);
        if (foundProject) {
          setProject(foundProject);
        } else {
          console.error('Project not found:', projectId);
          navigate('/');
        }
      })
      .catch(error => {
        console.error('Failed to load projects:', error);
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  // 加载分析数据
  useEffect(() => {
    if (!project) return;

    // 加载tree数据
    fetch(`/api/analysis/${project.id}_tree`).then(res => res.json()).then(data => {
      setTreeAnalysis(data.analysis || data);
    });
    // 加载bubble数据
    fetch(`/api/analysis/${project.id}_bubble`).then(res => res.json()).then(data => {
      const bubbleData = data.analysis || data;
      console.log('Bubble analysis data:', bubbleData);
      setBubbleAnalysis(bubbleData);
    });
  }, [project]);

  const handleBack = () => {
    navigate('/');
  };

  // 分析列表切换
  const currentAnalysis = tabKey === 'tree' ? treeAnalysis : bubbleAnalysis;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleNodeSelect = (analysisId: string) => {
    console.log('Node selected:', analysisId);
    // 自动滚动到分析列表对应项
    if (analysisListRef.current && typeof analysisListRef.current.scrollToId === 'function') {
      analysisListRef.current.scrollToId(analysisId);
    }
  };

    const formatDuration = (seconds?: number) => {
    if (!seconds) return '未知';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  if (loading || !project) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  const VIDEO_PATH = `http://localhost:5173/api/video/${project.id}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 24,
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* 面包屑导航 */}
        <Breadcrumb
          style={{ 
            marginBottom: 16, 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            lineHeight: '1.5'
          }}
          items={[
            {
              title: (
                <Button
                  type="text"
                  icon={<HomeOutlined />}
                  onClick={handleBack}
                  style={{ 
                    color: 'white', 
                    padding: 0,
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  项目列表
                </Button>
              ),
            },
            {
              title: (
                <span style={{ 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  视频分析
                </span>
              ),
            },
          ]}
        />

        {/* 顶部：视频信息卡片 */}
        <Card style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar
              size={64}
              icon={<VideoCameraOutlined />}
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1 }}>
              <Title level={3} style={{ marginBottom: 8, lineHeight: 1.3 }}>
                {project.title}
              </Title>
              <Space wrap>
                <Tag color="blue" icon={<PlayCircleOutlined />}>
                  {project.bv_id}
                </Tag>
                {project.duration && (
                  <Tag color="green" icon={<ClockCircleOutlined />}>
                    {formatDuration(project.duration)}
                  </Tag>
                )}
                {project.uploader && (
                  <Tag color="purple" icon={<UserOutlined />}>
                    {project.uploader}
                  </Tag>
                )}
              </Space>
            </div>
            <Button
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{
                borderRadius: 8,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                border: 'none',
                height: 40
              }}
            >
              返回列表
            </Button>
          </div>
        </Card>

                {/* 主要内容区域 */}
        <div style={{ display: "flex", gap: 24, marginBottom: 24, height: '44vh' }}>
          {/* 视频播放区域 */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlayCircleOutlined style={{ color: '#667eea' }} />
                视频播放
              </div>
            }
            style={{ 
              flex: '0 0 56vh', 
              minWidth: 320, 
              maxWidth: 960, 
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column'
            }} 
            bodyStyle={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              padding: 16,
              minHeight: 0
            }}
          >
            <div style={{ 
              width: '100%', 
              maxWidth: 960, 
              aspectRatio: '16/9', 
              background: '#000', 
              borderRadius: 12, 
              overflow: 'hidden', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <video
                ref={videoRef}
                src={VIDEO_PATH}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain', 
                  background: '#000',
                  borderRadius: 12
                }}
                controls
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          </Card>

          {/* 攻防分析列表 */}
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined style={{ color: '#667eea' }} />
                攻防分析列表
                <Badge count={currentAnalysis?.length || 0} style={{ backgroundColor: '#667eea' }} />
              </div>
            }
            style={{ 
              flex: 1, 
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column'
            }} 
            bodyStyle={{ 
              flex: 1, 
              overflow: "hidden", 
              padding: 16,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {currentAnalysis && currentAnalysis.length ? (
              <div style={{ 
                flex: 1, 
                overflow: 'auto',
                minHeight: 0
              }}>
                <AnalysisList
                  ref={analysisListRef}
                  analysis={currentAnalysis}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  selectedId={undefined}
                  onScrollToId={() => {}}
                />
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                padding: "40px", 
                color: "#999",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                flex: 1,
                justifyContent: 'center'
              }}>
                <AppstoreOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <Text type="secondary">暂无分析数据</Text>
              </div>
            )}
          </Card>
        </div>

                {/* 下半屏：攻防树/气泡图 */}
        <Card
          title={
            <Tabs
              activeKey={tabKey}
              onChange={k => setTabKey(k as 'tree' | 'bubble')}
              tabBarStyle={{ marginBottom: 0 }}
              style={{ marginBottom: 0 }}
              items={[
                { 
                  key: 'tree', 
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BarChartOutlined />
                      树形图
                    </div>
                  )
                },
                { 
                  key: 'bubble', 
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AppstoreOutlined />
                      气泡图
                    </div>
                  )
                }
              ]}
            />
          }
          style={{ 
            height: '36vh',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column'
          }}
          bodyStyle={{ 
            flex: 1, 
            padding: 16, 
            display: "flex", 
            alignItems: "stretch", 
            justifyContent: "stretch", 
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {tabKey === 'tree' ? (
            <AttackDefenceTree2
              analysis={treeAnalysis}
              currentTime={currentTime}
              onNodeSelect={handleNodeSelect}
              selectedId={undefined}
            />
          ) : (
            <ArgumentMap
              analysis={bubbleAnalysis}
              currentTime={currentTime}
              onNodeSelect={handleNodeSelect}
              selectedId={undefined}
            />
          )}
        </Card>
      </div>

      {/* AI 聊天按钮 */}
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        onClick={() => setChatVisible(true)}
        style={{
          right: 24,
          bottom: 24,
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
        }}
        tooltip="AI 助手"
      />

      {/* AI 聊天对话框 */}
      <GeminiChat
        currentTime={currentTime}
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        projectId={project.id}
      />
    </div>
  );
};

export default DebatePlayer;