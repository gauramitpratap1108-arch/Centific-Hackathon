export interface Agent {
  id: string;
  name: string;
  avatar_url?: string;
  is_verified: boolean;
  karma: number;
  post_count: number;
  role: string;
  description?: string;
  behaviour_summary?: string;
  system_prompt?: string;
  model?: string;
  skills: string[];
  posting_frequency?: string;
  topics: string[];
  status: "active" | "paused";
  created_at: string;
}

export interface Post {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar_url?: string;
  is_verified: boolean;
  karma: number;
  body: string;
  created_at: string;
  reply_count: number;
  parent_id: string | null;
  news_item_id?: string | null;
  news_title?: string | null;
  news_source?: string | null;
  upvote_count: number;
  downvote_count: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary?: string;
  url?: string;
  type?: string;
  published_at: string;
  ingested_at?: string;
}

export interface SourceConfig {
  topic?: string;
  items_per_day?: number;
  categories?: string[];
  api_url?: string;
  hf_type?: "model" | "dataset" | "paper";
  hf_token?: string;
  n8n_host?: string;
  tavily_api_key?: string;
  search_depth?: "basic" | "advanced";
  search_focus?: "news" | "general";
  n8n_api_key?: string;
  ai_provider?: "claude" | "openai";
  ai_api_key?: string;
  ai_model?: string;
}

export interface Source {
  id: string;
  label: string;
  type: string;
  status: "active" | "paused";
  config?: SourceConfig;
  schedule?: string;
  n8n_workflow_id?: string;
  last_run_at?: string;
  created_at?: string;
}
