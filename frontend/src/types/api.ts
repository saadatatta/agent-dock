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
  type: string;
  description: string;
  config: Record<string, any>;
  is_active: boolean;
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
  message?: string;
} 