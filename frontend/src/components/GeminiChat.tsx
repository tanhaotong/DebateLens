import React, { useState, useRef, useEffect } from 'react';
import { 
   
  Input, 
  Button, 
   
  Avatar, 
  Spin, 
  Drawer, 
  
  Typography,
  
  Tag,
  
  
} from 'antd';
import { 
  SendOutlined, 
   
  
  RobotOutlined,
  UserOutlined,
  ClockCircleOutlined,
  BulbOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { TextArea } = Input;
const { Text } = Typography;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeminiChatProps {
  currentTime: number;
  visible: boolean;
  onClose: () => void;
  projectId: string;
}

const GeminiChat: React.FC<GeminiChatProps> = ({ 
  currentTime, 
  visible, 
  onClose,
  projectId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 格式化时间戳
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // 创建助手消息占位符
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // 调用非流式后端接口
      const response = await fetch('/api/chat/chat_full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          currentTime,
          question: inputValue
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const answer = data.answer || data.content || data.text || '';
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: answer }
          : msg
      ));
    } catch (error) {
      console.error('Gemini API 错误:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: '抱歉，我遇到了一个错误。请稍后重试。' }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Drawer
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          margin: '0px 0px 0 0px',
          padding: '12px 12px',
          color: 'white',
          borderRadius: '12px 12px 12px 12px',
          height: '50px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar 
              icon={<RobotOutlined />} 
              size={32}
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 2 }}>AI 智能助手</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>基于视频内容的智能分析</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center' }}>
            <Tag color="rgba(255,255,255,0.2)" style={{ 
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '4px 8px',
              fontSize: '12px'
            }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatTime(currentTime)}
            </Tag>
          </div>
        </div>
      }
      placement="right"
      width={480}
      open={visible}
      onClose={onClose}
      mask={false}
      styles={{
        body: { 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        },
        header: { 
          padding: 0, 
          border: 'none',
          background: 'transparent',
          height: 'auto'
        }
      }}
    >
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        padding: '16px'
      }}>
        {/* 消息列表 */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '16px',
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '16px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxHeight: 'calc(100vh - 200px)'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              padding: '40px 20px',
              fontSize: '14px'
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
              }}>
                <BulbOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
                开始智能对话
              </div>
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                我会基于当前视频内容和时间点为您提供深度分析
              </div>
              <div style={{ 
                marginTop: 16, 
                padding: '12px 16px', 
                background: 'rgba(102, 126, 234, 0.1)', 
                borderRadius: 8,
                border: '1px solid rgba(102, 126, 234, 0.2)'
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💡 提示：您可以询问关于当前时间点的辩论内容、攻防逻辑分析等问题
                </Text>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message) => (
                message.role === 'user' ? (
                  <div key={message.id} style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    margin: '16px 0',
                    alignItems: 'flex-end',
                    gap: 8
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '18px 18px 4px 18px',
                      padding: '12px 16px',
                      maxWidth: '80%',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      wordBreak: 'break-word',
                      position: 'relative'
                    }}>
                      {message.content}
                    </div>
                    <Avatar 
                      icon={<UserOutlined />} 
                      size={32}
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        flexShrink: 0
                      }}
                    />
                  </div>
                ) : (
                  <div key={message.id} style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    margin: '16px 0',
                    alignItems: 'flex-start',
                    gap: 8
                  }}>
                    <Avatar 
                      icon={<RobotOutlined />} 
                      size={32}
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{
                      background: 'white',
                      borderRadius: '18px 18px 18px 4px',
                      padding: '12px 16px',
                      maxWidth: '80%',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      wordBreak: 'break-word',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ node, inline, className, children, ...props }: any) => {
                            
                            return !inline ? (
                              <pre style={{ 
                                backgroundColor: '#f8f9fa', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                overflow: 'auto', 
                                fontSize: '13px', 
                                lineHeight: '1.4', 
                                margin: '8px 0',
                                border: '1px solid #e9ecef'
                              }}>
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            ) : (
                              <code className={className} style={{ 
                                backgroundColor: '#f1f3f4', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.9em',
                                color: '#d63384'
                              }} {...props}>{children}</code>
                            );
                          },
                          table: ({ children }) => (
                            <div style={{ overflow: 'auto', margin: '8px 0' }}>
                              <table style={{ 
                                borderCollapse: 'collapse', 
                                width: '100%', 
                                fontSize: '14px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}>{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th style={{ 
                              border: '1px solid #dee2e6', 
                              padding: '10px 12px', 
                              backgroundColor: '#f8f9fa', 
                              fontWeight: 'bold', 
                              textAlign: 'left' 
                            }}>{children}</th>
                          ),
                          td: ({ children }) => (
                            <td style={{ 
                              border: '1px solid #dee2e6', 
                              padding: '10px 12px' 
                            }}>{children}</td>
                          ),
                          ul: ({ children }) => (
                            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>
                          ),
                          li: ({ children }: any) => (
                            <li style={{ margin: '4px 0', lineHeight: '1.5' }}>{children}</li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote style={{ 
                              borderLeft: '4px solid #667eea', 
                              margin: '8px 0', 
                              padding: '0 16px', 
                              color: '#6c757d', 
                              fontStyle: 'italic',
                              background: 'rgba(102, 126, 234, 0.05)',
                              borderRadius: '0 8px 8px 0'
                            }}>{children}</blockquote>
                          ),
                          h1: ({ children }) => (
                            <h1 style={{ 
                              fontSize: '1.5em', 
                              margin: '16px 0 8px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 style={{ 
                              fontSize: '1.3em', 
                              margin: '14px 0 6px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 style={{ 
                              fontSize: '1.1em', 
                              margin: '12px 0 4px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h3>
                          ),
                          h4: ({ children }) => (
                            <h4 style={{ 
                              fontSize: '1em', 
                              margin: '10px 0 4px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h4>
                          ),
                          h5: ({ children }) => (
                            <h5 style={{ 
                              fontSize: '0.95em', 
                              margin: '8px 0 2px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h5>
                          ),
                          h6: ({ children }) => (
                            <h6 style={{ 
                              fontSize: '0.9em', 
                              margin: '6px 0 2px 0', 
                              fontWeight: 'bold',
                              color: '#333'
                            }}>{children}</h6>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ 
                              color: '#667eea', 
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}>{children}</a>
                          ),
                          hr: () => (
                            <hr style={{ 
                              border: 'none', 
                              borderTop: '2px solid #e9ecef', 
                              margin: '16px 0' 
                            }} />
                          )
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
          {loading && (
            <div style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              margin: '16px 0'
            }}>
              <Avatar 
                icon={<RobotOutlined />} 
                size={32}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  flexShrink: 0
                }}
              />
              <div style={{
                background: 'white',
                borderRadius: '18px 18px 18px 4px',
                padding: '12px 16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spin size="small" />
                  <Text type="secondary">AI 正在思考中...</Text>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{ 
          background: 'rgba(255,255,255,0.8)',
          borderRadius: '16px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题，我会基于当前视频内容为您分析..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={loading}
              style={{ 
                flex: 1,
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                resize: 'none'
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              disabled={!inputValue.trim() || loading}
              style={{ 
                alignSelf: 'flex-end',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: 40,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            />
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#999', 
            marginTop: '8px',
            textAlign: 'center'
          }}>
            💡 按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default GeminiChat; 