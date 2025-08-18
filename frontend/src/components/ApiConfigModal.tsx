import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Alert
} from 'antd';
import {
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SaveOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// 定义API配置接口
interface ApiConfig {
  geminiApiKey: string;
}

const { Text, Paragraph } = Typography;

interface ApiConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    gemini: false
  });

  useEffect(() => {
    if (visible) {
      // 从后端获取配置
      fetch('/api/config')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            form.setFieldsValue(data.data);
          }
        })
        .catch(error => {
          console.error('获取配置失败:', error);
        });
    }
  }, [visible, form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 验证API Key格式
      const validationErrors: string[] = [];
      
      if (values.geminiApiKey && !values.geminiApiKey.startsWith('AIza')) {
        validationErrors.push('Gemini API Key 格式不正确，应以 "AIza" 开头');
      }
      
      if (validationErrors.length > 0) {
        message.error(validationErrors.join('\n'));
        return;
      }
      
      // 保存到后端
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      });
      
      const result = await response.json();
      if (result.success) {
        message.success('API配置已保存');
        onClose();
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Save config error:', error);
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderApiKeyInput = (name: keyof ApiConfig, label: string, prefix: string, key: string) => (
    <Form.Item
      name={name}
      label={
        <Space>
          <KeyOutlined />
          {label}
        </Space>
      }
      rules={[
        {
          validator: (_, value) => {
            if (value && !value.startsWith(prefix)) {
              return Promise.reject(new Error(`${label} 格式不正确，应以 "${prefix}" 开头`));
            }
            return Promise.resolve();
          }
        }
      ]}
    >
      <Input
        type={showKeys[key] ? 'text' : 'password'}
        placeholder={`请输入${label}`}
        suffix={
          <Button
            type="text"
            icon={showKeys[key] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleKeyVisibility(key)}
            size="small"
          />
        }
      />
    </Form.Item>
  );

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>API配置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
        >
          保存配置
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="API Key 配置说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                请配置Gemini API Key。配置将保存在后端服务器中，确保安全性。
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <Text strong>注意：</Text> 请妥善保管您的API Key，不要分享给他人。目前仅支持Gemini API。
              </Paragraph>
            </div>
          }
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        {renderApiKeyInput('geminiApiKey', 'Gemini API Key', 'AIza', 'gemini')}
      </Form>
    </Modal>
  );
};

export default ApiConfigModal; 