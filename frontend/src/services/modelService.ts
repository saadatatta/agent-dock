import axios from 'axios';
import { LLMModel, ModelsResponse, ModelStatsResponse } from '../types/models';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const modelService = {
  getModels: async (): Promise<ModelsResponse> => {
    const response = await api.get('/settings/llm/models');
    return response.data;
  },

  setActiveModel: async (modelKey: string): Promise<ModelsResponse> => {
    const response = await api.post(`/settings/llm/models/${modelKey}/activate`);
    return response.data;
  },

  // Mock function for stats - to be implemented in the backend later
  getModelStats: async (): Promise<ModelStatsResponse> => {
    // This is a mock implementation, will be replaced with actual API calls later
    const mockStats = {
      status: 'success',
      data: {
        'groq': {
          requests_count: 245,
          average_latency: 1200, // ms
          error_rate: 0.02, // 2%
          total_tokens: 52400
        },
        'openai': {
          requests_count: 178,
          average_latency: 800, // ms
          error_rate: 0.01, // 1%
          total_tokens: 38900
        },
        'anthropic': {
          requests_count: 93,
          average_latency: 1500, // ms
          error_rate: 0.03, // 3%
          total_tokens: 22100
        }
      },
      message: 'Model stats retrieved successfully'
    };
    
    return mockStats as ModelStatsResponse;
  },

  // Function to get provider logo URL
  getProviderLogo: (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '/images/openai-logo.svg';
      case 'groq':
        return '/images/groq-logo.svg';
      case 'anthropic':
        return '/images/anthropic-logo.svg';
      default:
        return '/images/ai-model.svg';
    }
  },

  // Function to get provider color
  getProviderColor: (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '#10a37f';
      case 'groq':
        return '#7c3aed';
      case 'anthropic':
        return '#ee4c2c';
      default:
        return '#1976d2';
    }
  },
}; 