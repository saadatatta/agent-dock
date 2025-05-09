import { ApiResponse } from './api';

export interface LLMModel {
  key: string;
  provider: string;
  model_name: string;
  api_key_env_var: string;
  parameters: Record<string, any>;
  api_key_available: boolean;
  is_active?: boolean;
}

export interface ModelParameter {
  name: string;
  type: 'number' | 'string' | 'boolean';
  value: any;
  min?: number;
  max?: number;
  description?: string;
}

export interface ModelsResponse extends ApiResponse<LLMModel[]> {
  active_model: string;
}

export interface ModelStats {
  requests_count: number;
  average_latency: number;
  error_rate: number;
  total_tokens: number;
}

export interface ModelStatsResponse extends ApiResponse<Record<string, ModelStats>> {
}

export enum ModelProvider {
  OpenAI = 'openai',
  Groq = 'groq',
  Anthropic = 'anthropic',
  Custom = 'custom'
} 