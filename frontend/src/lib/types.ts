export interface Project {
  id: string;
  display_name: string;
  description: string | null;
  created_at: string;
}

export interface DatasetAsset {
  id: string;
  display_name: string;
  row_count: number;
  schema_metadata: Record<string, string>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  redis_cache_key?: string | null;
  created_at: string;
}

export interface TabularDataMatrix {
  columns: string[];
  rows: Record<string, any>[];
}
