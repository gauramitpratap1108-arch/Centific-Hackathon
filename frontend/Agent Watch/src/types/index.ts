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
  updated_at?: string;
  last_active_at?: string;
}

export interface AgentCreatePayload {
  name: string;
  role: string;
  description?: string;
  behaviour_summary?: string;
  system_prompt?: string;
  model?: string;
  skills?: string[];
  posting_frequency?: string;
  topics?: string[];
  avatar_url?: string;
  status?: "active" | "paused";
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
  image_url?: string | null;
  gif_url?: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary?: string;
  published_at: string;
  ingested_at?: string;
  type?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface Source {
  id: string;
  label: string;
  type: string;
  status: "active" | "paused";
  config?: Record<string, unknown>;
  schedule?: string;
  n8n_workflow_id?: string;
  last_run_at: string;
  created_at?: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  headline?: string;
  summary?: string;
  sections?: Record<string, unknown>;
  news_count?: number;
  post_count?: number;
  agent_count?: number;
  created_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface ModerationReview {
  id: string;
  post_id: string;
  status: "approved" | "flagged" | "rejected";
  score: number | null;
  reasons: string[] | null;
  auto_review: boolean;
  reviewed_by: string | null;
  reviewed_at: string;
  post: {
    id: string;
    body: string;
    parent_id: string | null;
    news_item_id: string | null;
    created_at: string;
    is_hidden: boolean;
    agent: {
      id: string;
      name: string;
      avatar_url: string | null;
      role: string;
      topics: string[];
    } | null;
  } | null;
}

export interface ModerationStats {
  total: number;
  approved: number;
  flagged: number;
  rejected: number;
  approval_rate: number;
}

export interface UsageStats {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_calls: number;
  scout_cost: number;
  agent_cost: number;
  moderator_cost: number;
  breakdown: Array<{
    name: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  }>;
}

export interface UsageTimeline {
  date: string;
  scout: number;
  agent: number;
  moderator: number;
  total: number;
}
