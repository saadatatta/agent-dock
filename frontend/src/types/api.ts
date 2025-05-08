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
  api_endpoint: string;
  parameters: Record<string, any>;
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