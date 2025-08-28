import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spin, 
  Button, 
  Input, 
   
  message, 
  Typography, 
  Space, 
  Tag,
  Empty,
  Modal,
  Form,
  Select,
  Progress,
  
  
  Badge
} from 'antd';

import { 
   
  SearchOutlined, 
  UploadOutlined, 
  PlayCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EyeOutlined,
  LinkOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  
  KeyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import ApiConfigModal from './ApiConfigModal';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Project {
  id: string;
  bv_id: string;
  title: string;
  duration?: number;
  cover?: string;
  uploader?: string;
  bilibili_url?: string;
  created_at?: string;
  status?: string;
}

interface UploadFormData {
  bv_id?: string;
  video_type: 'bilibili' | 'local';
  title?: string;
  video_file?: File;
}

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [uploadStep, setUploadStep] = useState<string>('');
  const [videoType, setVideoType] = useState<'bilibili' | 'local'>('bilibili');
  const [form] = Form.useForm();
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchText]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects/list');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      message.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    if (!searchText.trim()) {
      setFilteredProjects(projects);
      return;
    }
    
    const filtered = projects.filter(project => 
      project.title.toLowerCase().includes(searchText.toLowerCase()) ||
      project.bv_id.toLowerCase().includes(searchText.toLowerCase()) ||
      (project.uploader && project.uploader.toLowerCase().includes(searchText.toLowerCase()))
    );
    setFilteredProjects(filtered);
  };

  const handleProjectSelect = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const handleRetry = async (project: Project) => {
    try {
      message.loading('正在启动重试处理...', 0);
      
      const response = await fetch(`/api/projects/retry/${project.id}`, {
        method: 'POST',
      });

      message.destroy(); // 清除loading消息

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `重试失败: ${response.status}`);
      }

      message.success('重试处理已开始，请稍候...');
      
      // 立即刷新项目列表
      setTimeout(() => {
        fetchProjects();
      }, 1000);
      
      // 定期刷新项目列表以更新状态，更频繁地检查
      const refreshInterval = setInterval(() => {
        fetchProjects();
      }, 3000); // 每3秒检查一次
      
      // 60秒后停止刷新
      setTimeout(() => {
        clearInterval(refreshInterval);
        // 最后再检查一次状态
        fetchProjects();
      }, 60000);
      
    } catch (error: any) {
      message.destroy(); // 清除loading消息
      message.error(`重试失败: ${error.message}`);
    }
  };

  const handleDelete = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/delete/${project.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `删除失败: ${response.status}`);
      }

      message.success('项目删除成功');
      fetchProjects(); // 刷新项目列表
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`);
    }
  };

  const handleUpload = async (values: UploadFormData) => {
    console.log('表单提交值:', values);
    console.log('当前uploadFileList:', uploadFileList);
    setUploadLoading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    
    try {
      if (values.video_type === 'local') {
        // 本地视频上传
        if (uploadFileList.length === 0) {
          message.error('请选择视频文件');
          return;
        }
        
        const selectedFile = uploadFileList[0];
        console.log('使用uploadFileList中的文件:', selectedFile);
        
        const formData = new FormData();
        formData.append('video_file', selectedFile);
        formData.append('title', values.title || '');
        formData.append('video_type', 'local');
        
        setUploadStep('正在上传视频文件...');
        // 模拟上传进度
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 95) {
              clearInterval(progressInterval);
              return 95;
            }
            return prev + 5;
          });
        }, 100);
        
        const response = await fetch('/api/projects/upload_local', {
          method: 'POST',
          body: formData,
        });
        
        clearInterval(progressInterval);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('上传失败:', response.status, errorData);
          
          let errorMessage = errorData.error || `上传失败: ${response.status}`;
          if (response.status === 413) {
            errorMessage = "文件太大！最大支持1GB，请选择较小的视频文件。";
          }
          
          throw new Error(errorMessage);
        }
        
        const result=await response.json();
        setUploadProgress(100);
        setUploadStatus('processing');
        setUploadStep('视频上传成功！正在处理中（提取音频、转录、分析）...');
        message.success('视频上传成功！正在处理中...');
        
        // 不立即关闭模态框，让用户看到处理状态
        // 定期检查处理状态
        const checkStatus = async () => {
          try {
            const statusResponse = await fetch(`/api/projects/list`);
            const projects = await statusResponse.json();
            const currentProject = projects.find((p: any) => p.id === result.video_id);
            
            if (currentProject) {
              if (currentProject.status === 'completed') {
                setUploadStatus('completed');
                setUploadStep('处理完成！');
                setUploadProgress(100);
                message.success('视频处理完成！');
                setTimeout(() => {
                  setUploadModalVisible(false);
                  form.resetFields();
                  setUploadFileList([]);
                  setUploadStatus('idle');
                  setUploadProgress(0);
                  setUploadStep('');
                  fetchProjects();
                }, 2000);
                return;
              } else if (currentProject.status === 'failed') {
                setUploadStatus('failed');
                setUploadStep('处理失败，请重试');
                setUploadProgress(0);
                message.error('视频处理失败，请重试');
                return;
              }
            }
            
            // 如果还在处理中，继续检查
            setTimeout(checkStatus, 3000);
          } catch (error) {
            console.error('检查状态失败:', error);
            setTimeout(checkStatus, 5000);
          }
        };
        
        // 开始检查状态
        setTimeout(checkStatus, 2000);
        
      } else {
        // Bilibili视频上传
        if (!values.bv_id) {
          message.error('请输入BV号');
          return;
        }
        
        console.log('发送的数据:', values);
        
        const response = await fetch('/api/projects/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('上传失败:', response.status, errorData);
          throw new Error(errorData.error || '上传失败');
        }

        if (!response.ok) {
          throw new Error('上传失败');
        }

        await response.json();
        setUploadStatus('completed');
        message.success('视频上传成功！');
        setUploadModalVisible(false);
        form.resetFields();
        fetchProjects(); // 刷新项目列表
      }
    } catch (error) {
      setUploadStatus('failed');
      setUploadStep('上传失败，请重试');
      setUploadProgress(0);
      message.error('上传失败，请重试');
    } finally {
      setUploadLoading(false);
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'processing';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'processing': return '处理中';
      case 'failed': return '失败';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 头部区域 */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 48,
          color: 'white'
        }}>
          <Title level={1} style={{ color: 'white', marginBottom: 16 }}>
            <PlayCircleOutlined style={{ marginRight: 12 }} />
            DebateLens 辩论分析平台
          </Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
            智能分析辩论视频，深度挖掘攻防逻辑
          </Paragraph>
        </div>

        {/* 操作栏 */}
        <Card style={{ 
          marginBottom: 24, 
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)'
        }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Search
                placeholder="搜索视频标题、BV号或上传者..."
                allowClear
                size="large"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  type="default"
                  size="large"
                  icon={<KeyOutlined />}
                  onClick={() => setConfigModalVisible(true)}
                  style={{
                    borderRadius: 8,
                    height: 40,
                    padding: '0 16px'
                  }}
                >
                  API配置
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<CloudUploadOutlined />}
                  onClick={() => {
                    setUploadModalVisible(true);
                    setVideoType('bilibili');
                    setUploadFileList([]);
                    setUploadStatus('idle');
                    setUploadProgress(0);
                    setUploadStep('');
                    form.resetFields();
                  }}
                  style={{
                    borderRadius: 8,
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    border: 'none',
                    height: 40,
                    padding: '0 24px'
                  }}
                >
                  上传视频
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 项目列表 */}
        {filteredProjects.length === 0 ? (
          <Card style={{ 
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }}>
            <Empty
              description={
                <span style={{ color: '#666' }}>
                  {searchText ? '没有找到匹配的项目' : '还没有项目，快来上传第一个视频吧！'}
                </span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {filteredProjects.map(project => (
              <Col key={project.id} xs={24} sm={12} lg={8} xl={6}>
          <Card
            hoverable
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease',
                      cursor: project.status === 'completed' ? 'pointer' : 'default',
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      opacity: project.status === 'completed' ? 1 : 0.8
                    }}
                    bodyStyle={{ padding: 0 }}
                    onClick={() => {
                      if (project.status === 'completed') {
                        handleProjectSelect(project);
                      } else if (project.status === 'failed') {
                        message.warning('视频处理失败，请点击重试按钮重新处理');
                      } else if (project.status === 'processing') {
                        message.info('视频正在处理中，请稍后查看或点击强制重试');
                      } else {
                        message.info('视频状态未知，请稍后查看');
                      }
                    }}
                  cover={
                    <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                      {project.cover ? (
                        <img
                          alt="cover"
                          src={`/api/proxy_image?url=${encodeURIComponent(project.cover)}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          onError={(e) => {
                            // 图片加载失败时，显示错误状态
                            console.error(`Failed to load cover image for project ${project.id}:`, e);
                            e.currentTarget.style.display = 'none';
                            // 可以在这里添加重试逻辑或者显示错误提示
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 48
                        }}>
                          <PlayCircleOutlined />
                        </div>
                      )}
                      
                      {/* 删除按钮 */}
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project);
                        }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(255,255,255,0.9)',
                          border: 'none',
                          borderRadius: 4,
                          color: '#ff4d4f',
                          zIndex: 10
                        }}
                      />
                      
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        right: 40,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12
                      }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {formatDuration(project.duration)}
                      </div>
                      <Badge
                        status={getStatusColor(project.status) as any}
                        text={getStatusText(project.status)}
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          background: 'rgba(255,255,255,0.9)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12
                        }}
                      />
                    </div>
                  }
                >
                  <div style={{ padding: 16 }}>
                    <Title level={5} style={{ marginBottom: 8, lineHeight: 1.4 }}>
                      {project.title}
                    </Title>
                    
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color="blue" icon={<LinkOutlined />}>
                          {project.bv_id}
                        </Tag>
                      </div>
                      
                      {project.uploader && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                          <UserOutlined />
                          <Text type="secondary">{project.uploader}</Text>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                        <EyeOutlined />
                        <Text type="secondary">
                          {project.created_at ? new Date(project.created_at).toLocaleDateString() : '未知时间'}
                        </Text>
                      </div>
                    </Space>
                    
                    {/* 重试按钮 - 只在失败状态显示 */}
                    {project.status === 'failed' && (
                      <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <Button
                          type="primary"
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(project);
                          }}
                          style={{
                            borderRadius: 6,
                            background: 'linear-gradient(45deg, #ff4d4f, #ff7875)',
                            border: 'none'
                          }}
                        >
                          重试处理
                        </Button>
                      </div>
                    )}
                    
                    {/* 处理中状态显示 */}
                    {project.status === 'processing' && (
                      <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                          正在处理中...
                        </div>
                        <div style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>
                          步骤：提取音频 → 转录 → 分析
                        </div>
                        <Button
                          type="default"
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(project);
                          }}
                          style={{
                            borderRadius: 6,
                            fontSize: 12
                          }}
                        >
                          强制重试
                        </Button>
                      </div>
                    )}
                  </div>
          </Card>
        </Col>
      ))}
    </Row>
        )}
      </div>

      {/* 上传模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudUploadOutlined style={{ color: '#667eea' }} />
            上传视频
          </div>
        }
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={600}
        style={{ borderRadius: 16 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{ video_type: 'bilibili' }}
        >
          <Form.Item
            name="video_type"
            label="视频类型"
            rules={[{ required: true, message: '请选择视频类型' }]}
          >
            <Select 
              style={{ borderRadius: 8 }}
              onChange={(value) => {
                setVideoType(value);
                form.setFieldsValue({ 
                  bv_id: '', 
                  video_file: undefined,
                  video_type: value 
                });
                setUploadFileList([]);
              }}
            >
              <Option value="bilibili">Bilibili 视频</Option>
              <Option value="local">本地视频文件</Option>
            </Select>
          </Form.Item>

          {videoType === 'bilibili' ? (
            <Form.Item
              name="bv_id"
              label="BV号"
              rules={[
                { required: true, message: '请输入BV号' },
                { 
                  pattern: /^BV[a-zA-Z0-9]{10}$/, 
                  message: '请输入正确的BV号格式，如：BV1xx411c7mu' 
                }
              ]}
            >
              <Input
                placeholder="请输入BV号，如：BV1xx411c7mu"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          ) : (
            <Form.Item
              label="选择视频文件"
              required
            >
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    console.log('选择的文件:', file);
                    if (file) {
                      // 检查文件大小（1GB限制）
                      const maxSize = 1024 * 1024 * 1024; // 1GB
                      if (file.size > maxSize) {
                        message.error(`文件太大！最大支持1GB，当前文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
                        return;
                      }
                      setUploadFileList([file]);
                    }
                  }}
                  style={{ display: 'none' }}
                  id="video-file-input"
                />
                <Button 
                  icon={<UploadOutlined />} 
                  onClick={() => document.getElementById('video-file-input')?.click()}
                  style={{ 
                    width: '100%', 
                    height: 80, 
                    borderRadius: 8,
                    border: '2px dashed #d9d9d9'
                  }}
                >
                  点击选择视频文件
                </Button>
                {uploadFileList.length > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                    <div>已选择: {uploadFileList[0].name}</div>
                    <Button 
                      size="small" 
                      type="link" 
                      onClick={() => {
                        setUploadFileList([]);
                      }}
                    >
                      移除
                    </Button>
                  </div>
                )}
              </div>
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="自定义标题（可选）"
          >
            <Input
              placeholder="留空将使用视频原标题"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {uploadProgress > 0 && (
            <Form.Item label="处理进度">
              <Progress 
                percent={uploadProgress} 
                status={uploadStatus === 'failed' ? 'exception' : uploadStatus === 'completed' ? 'success' : 'active'} 
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                {uploadStep}
              </div>
              {uploadStatus === 'failed' && (
                <div style={{ marginTop: 8 }}>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => {
                      setUploadStatus('idle');
                      setUploadProgress(0);
                      setUploadStep('');
                      setUploadLoading(false);
                    }}
                    style={{
                      background: 'linear-gradient(45deg, #ff4d4f, #ff7875)',
                      border: 'none',
                      borderRadius: 6
                    }}
                  >
                    重新上传
                  </Button>
                </div>
              )}
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
                    message.warning('正在处理中，请稍候...');
                    return;
                  }
                  setUploadModalVisible(false);
                  setUploadStatus('idle');
                  setUploadProgress(0);
                  setUploadStep('');
                  setUploadFileList([]);
                  form.resetFields();
                }}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={uploadLoading}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                icon={<UploadOutlined />}
                style={{
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: 8
                }}
              >
                {uploadStatus === 'uploading' ? '上传中...' : 
                 uploadStatus === 'processing' ? '处理中...' : 
                 '开始上传'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* API配置模态框 */}
      <ApiConfigModal
        visible={configModalVisible}
        onClose={() => setConfigModalVisible(false)}
      />
    </div>
  );
};

export default ProjectList;
