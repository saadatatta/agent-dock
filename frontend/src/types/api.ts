export interface Agent {
  id: number;
  name: string;
  description: string;
  code: string;
  config: Record<string, any>;
  is_active: boolean;
  tools: Tool[];
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  type: string;
  config: Record<string, any>;
  is_active: boolean;
}

export interface ToolLog {
  id: number;
  tool_id: number;
  action: string;
  status: string;
  details?: Record<string, any>;
  error_message?: string;
  created_at: string;
  updated_at: string;
  tool?: Tool;
}

export interface Setting {
  id: number;
  key: string;
  value: any;
  description?: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMModel {
  key: string;
  provider: string;
  model_name: string;
  api_key_env_var: string;
  parameters: Record<string, any>;
  is_active: boolean;
  api_key_available: boolean;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface LLMModelsResponse {
  status: string;
  data: LLMModel[];
  active_model: string;
  message?: string;
} 