import { getApiKeyAsync, isApiKeyConfiguredAsync } from '../config/api';

// API服务类
export class ApiService {
  // Gemini API调用
  static async callGeminiAPI(prompt: string, model: string = 'gemini-pro') {
    const apiKey = await getApiKeyAsync('geminiApiKey');
    if (!(await isApiKeyConfiguredAsync('geminiApiKey'))) {
      throw new Error('Gemini API Key 未配置');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // 统一的AI API调用（仅支持Gemini）
  static async callAIAPI(prompt: string) {
    if (await isApiKeyConfiguredAsync('geminiApiKey')) {
      return await this.callGeminiAPI(prompt);
    }
    throw new Error('Gemini API Key 未配置，请在设置中配置API Key');
  }

  // 检查API配置状态
  static async getApiStatus() {
    return {
      gemini: await isApiKeyConfiguredAsync('geminiApiKey')
    };
  }
}

export default ApiService; 