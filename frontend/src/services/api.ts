import axios from 'axios';
import { Agent, Tool, ApiResponse, PaginatedResponse, ToolLog, Setting, LLMModel, LLMModelsResponse } from '../types/api';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const agentApi = {
  getAgents: async (skip = 0, limit = 10): Promise<PaginatedResponse<Agent>> => {
    const response = await api.get(`/agents?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getAgent: async (id: number): Promise<ApiResponse<Agent>> => {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },

  createAgent: async (agent: Omit<Agent, 'id'>): Promise<ApiResponse<Agent>> => {
    const response = await api.post('/agents/', agent);
    return response.data;
  },

  updateAgent: async (id: number, agent: Partial<Agent>): Promise<ApiResponse<Agent>> => {
    const response = await api.put(`/agents/${id}/`, agent);
    return response.data;
  },

  deleteAgent: async (id: number): Promise<ApiResponse<Agent>> => {
    const response = await api.delete(`/agents/${id}/`);
    return response.data;
  },

  addToolToAgent: async (agentId: number, toolId: number): Promise<ApiResponse<Agent>> => {
    const response = await api.post(`/agents/${agentId}/tools/${toolId}`);
    return response.data;
  },

  removeToolFromAgent: async (agentId: number, toolId: number): Promise<ApiResponse<Agent>> => {
    const response = await api.delete(`/agents/${agentId}/tools/${toolId}`);
    return response.data;
  },

  executeAgent: async (agentId: number, actionData: { action: string, parameters: any }): Promise<ApiResponse<any>> => {
    const response = await api.post(`/agents/${agentId}/execute`, actionData);
    return response.data;
  }
};

export const toolApi = {
  getTools: async (skip = 0, limit = 10): Promise<PaginatedResponse<Tool>> => {
    const response = await api.get(`/tools?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getTool: async (id: number): Promise<ApiResponse<Tool>> => {
    const response = await api.get(`/tools/${id}`);
    return response.data;
  },

  createTool: async (tool: Omit<Tool, 'id'>): Promise<ApiResponse<Tool>> => {
    const response = await api.post('/tools/', tool);
    return response.data;
  },

  updateTool: async (id: number, tool: Partial<Tool>): Promise<ApiResponse<Tool>> => {
    const response = await api.put(`/tools/${id}/`, tool);
    return response.data;
  },

  deleteTool: async (id: number): Promise<ApiResponse<Tool>> => {
    const response = await api.delete(`/tools/${id}/`);
    return response.data;
  },

  getToolLogs: async (toolId: number, skip = 0, limit = 10): Promise<PaginatedResponse<ToolLog>> => {
    const response = await api.get(`/logs/tool/${toolId}?skip=${skip}&limit=${limit}`);
    return response.data;
  },
};

export const logApi = {
  getAllLogs: async (skip = 0, limit = 10): Promise<PaginatedResponse<ToolLog>> => {
    const response = await api.get(`/logs/?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  deleteLog: async (logId: number): Promise<ApiResponse<ToolLog>> => {
    const response = await api.delete(`/logs/${logId}`);
    return response.data;
  }
};

export const settingsApi = {
  getSettings: async (skip = 0, limit = 100): Promise<PaginatedResponse<Setting>> => {
    const response = await api.get(`/settings?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getSetting: async (key: string): Promise<ApiResponse<Setting>> => {
    const response = await api.get(`/settings/${key}`);
    return response.data;
  },

  createSetting: async (setting: Omit<Setting, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Setting>> => {
    const response = await api.post('/settings/', setting);
    return response.data;
  },

  updateSetting: async (key: string, setting: Partial<Setting>): Promise<ApiResponse<Setting>> => {
    const response = await api.put(`/settings/${key}`, setting);
    return response.data;
  },

  deleteSetting: async (key: string): Promise<ApiResponse<Setting>> => {
    const response = await api.delete(`/settings/${key}`);
    return response.data;
  },

  getLLMModels: async (): Promise<LLMModelsResponse> => {
    const response = await api.get('/settings/llm/models');
    return response.data;
  },

  setActiveLLMModel: async (modelKey: string): Promise<LLMModelsResponse> => {
    const response = await api.post(`/settings/llm/models/${modelKey}/activate`);
    return response.data;
  }
}; 