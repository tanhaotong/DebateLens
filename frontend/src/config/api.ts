// API配置文件
export interface ApiConfig {
  geminiApiKey: string;
}

// 默认配置
const defaultConfig: ApiConfig = {
  geminiApiKey: '',
};

// 从后端获取配置
export const getApiConfig = async (): Promise<ApiConfig> => {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    if (data.success) {
      return { ...defaultConfig, ...data.data };
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }
  return defaultConfig;
};

// 保存配置到后端
export const saveApiConfig = async (config: Partial<ApiConfig>): Promise<boolean> => {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config)
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to save API config:', error);
    return false;
  }
};

// 获取特定API Key（同步版本，用于兼容性）
export const getApiKey = (): string => {
  // 这里返回空字符串，实际使用时需要通过后端API获取
  return '';
};

// 检查API Key是否已配置（同步版本，用于兼容性）
export const isApiKeyConfigured = (): boolean => {
  // 这里返回false，实际使用时需要通过后端API检查
  return false;
};

// 异步版本
export const getApiKeyAsync = async (type: keyof ApiConfig): Promise<string> => {
  const config = await getApiConfig();
  return config[type];
};

export const isApiKeyConfiguredAsync = async (type: keyof ApiConfig): Promise<boolean> => {
  const apiKey = await getApiKeyAsync(type);
  return Boolean(apiKey && apiKey.trim().length > 0);
}; 