import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSources, createSource, updateSource } from "@/lib/api";
import { Source, SourceConfig } from "@/types";
import { timeAgo } from "@/lib/time";
import {
  Database, Wifi, WifiOff, Loader2, Plus, Search, Globe, Globe2, BookOpen,
  Eye, EyeOff, Zap, Brain, Code, Sparkles, CircleDollarSign, Shield,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Constants ───────────────────────────────────────────────────────────────

const SOURCE_TYPES = [
  { value: "arxiv", label: "ArXiv", icon: BookOpen },
  { value: "huggingface", label: "Hugging Face", icon: Search },
  { value: "web_search", label: "Web Search", icon: Globe2 },
  { value: "custom_api", label: "Custom API (n8n)", icon: Globe },
] as const;

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "hourly", label: "Hourly" },
] as const;

const ARXIV_CATEGORIES = [
  "cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.NE", "cs.RO",
  "stat.ML", "cs.MA", "cs.IR", "cs.SE",
];

interface ModelInfo {
  value: string;
  label: string;
  tag: string;
  tagColor: string;
  description: string;
  icon: typeof Brain;
}

const OPENAI_MODELS: ModelInfo[] = [
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
    tag: "Most Capable",
    tagColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    description: "Flagship model for complex, professional tasks",
    icon: Sparkles,
  },
  {
    value: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    tag: "High Precision",
    tagColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    description: "Optimized for smarter, more precise responses",
    icon: Shield,
  },
  {
    value: "gpt-5.4-thinking",
    label: "GPT-5.4 Thinking",
    tag: "Reasoning",
    tagColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    description: "Chain-of-thought, coding, and agentic tasks",
    icon: Brain,
  },
  {
    value: "gpt-5-mini",
    label: "GPT-5 Mini",
    tag: "Speed / Cost",
    tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    description: "Fast, efficient, cost-effective for simple tasks",
    icon: Zap,
  },
  {
    value: "gpt-5.3-codex",
    label: "GPT-5.3 Codex",
    tag: "Coding",
    tagColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    description: "Multi-language engineering and terminal tasks",
    icon: Code,
  },
  {
    value: "gpt-4.1",
    label: "GPT-4.1",
    tag: "Balanced",
    tagColor: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    description: "Non-reasoning balance between speed and capability",
    icon: CircleDollarSign,
  },
];

const CLAUDE_MODELS: ModelInfo[] = [
  {
    value: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    tag: "Best All-Rounder",
    tagColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    description: "Flagship for complex reasoning and 1M+ token context",
    icon: Sparkles,
  },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    tag: "Best Value",
    tagColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    description: "Default workhorse: near-Opus quality, excels at coding",
    icon: Code,
  },
  {
    value: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    tag: "Speed / Low Cost",
    tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    description: "Extremely fast and cheap for high-volume tasks",
    icon: Zap,
  },
];

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", color: "bg-emerald-500" },
  { value: "claude", label: "Anthropic Claude", color: "bg-orange-500" },
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTypeBadge(type: string) {
  if (type === "arxiv") return "source-badge source-badge-arxiv";
  if (type === "huggingface") return "source-badge source-badge-hf";
  if (type === "web_search") return "source-badge source-badge-default";
  return "source-badge source-badge-default";
}

function getTypeLabel(type: string) {
  const found = SOURCE_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

function getModelLabel(modelId: string): string {
  const all = [...OPENAI_MODELS, ...CLAUDE_MODELS];
  return all.find((m) => m.value === modelId)?.label || modelId;
}

function getProviderLabel(provider: string): string {
  return provider === "openai" ? "OpenAI" : "Claude";
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface FormState {
  label: string;
  type: string;
  topic: string;
  items_per_day: number;
  schedule: string;
  categories: string[];
  hf_type: string;
  hf_token: string;
  api_url: string;
  n8n_host: string;
  n8n_api_key: string;
  tavily_api_key: string;
  search_depth: string;
  search_focus: string;
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
}

const EMPTY_FORM: FormState = {
  label: "",
  type: "arxiv",
  topic: "",
  items_per_day: 5,
  schedule: "daily",
  categories: [],
  hf_type: "model",
  hf_token: "",
  api_url: "",
  n8n_host: "http://localhost:5678/api/v1",
  n8n_api_key: "",
  tavily_api_key: "",
  search_depth: "advanced",
  search_focus: "news",
  ai_provider: "claude",
  ai_api_key: "",
  ai_model: "claude-sonnet-4-6",
};

function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = model.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 p-1.5 rounded-md ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-card-foreground"}`}>
              {model.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${model.tagColor}`}>
              {model.tag}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {model.description}
          </p>
        </div>
        <div className={`mt-1 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? "border-primary" : "border-muted-foreground/30"
        }`}>
          {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>
      </div>
    </button>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const SourcesPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const res = await fetchSources();
      return res.data as Source[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => createSource(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => updateSource(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      closeDialog();
    },
  });

  const sources = data || [];

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (source: Source) => {
    const cfg = source.config || {};
    const provider = cfg.ai_provider || "claude";
    setForm({
      label: source.label,
      type: source.type,
      topic: cfg.topic || "",
      items_per_day: cfg.items_per_day || 5,
      schedule: source.schedule || "daily",
      categories: cfg.categories || [],
      hf_type: cfg.hf_type || "model",
      hf_token: cfg.hf_token || "",
      api_url: cfg.api_url || "",
      n8n_host: cfg.n8n_host || "http://localhost:5678/api/v1",
      n8n_api_key: cfg.n8n_api_key || "",
      tavily_api_key: cfg.tavily_api_key || "",
      search_depth: cfg.search_depth || "advanced",
      search_focus: cfg.search_focus || "news",
      ai_provider: provider,
      ai_api_key: cfg.ai_api_key || "",
      ai_model: cfg.ai_model || (provider === "openai" ? "gpt-5.4" : "claude-sonnet-4-6"),
    });
    setEditingId(source.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const config: SourceConfig = {
      topic: form.topic,
      items_per_day: form.items_per_day,
      ai_provider: form.ai_provider as SourceConfig["ai_provider"],
      ai_model: form.ai_model,
    };

    if (form.ai_api_key.trim()) {
      config.ai_api_key = form.ai_api_key.trim();
    }

    if (form.type === "arxiv" && form.categories.length > 0) {
      config.categories = form.categories;
    }

    if (form.type === "huggingface") {
      config.hf_type = form.hf_type as SourceConfig["hf_type"];
      if (form.hf_token.trim()) {
        config.hf_token = form.hf_token.trim();
      }
    }

    if (form.type === "custom_api") {
      config.api_url = form.api_url;
      if (form.n8n_host.trim()) {
        config.n8n_host = form.n8n_host.trim();
      }
      if (form.n8n_api_key.trim()) {
        config.n8n_api_key = form.n8n_api_key.trim();
      }
    }

    if (form.type === "web_search") {
      if (form.tavily_api_key.trim()) {
        config.tavily_api_key = form.tavily_api_key.trim();
      }
      config.search_depth = form.search_depth as SourceConfig["search_depth"];
      config.search_focus = form.search_focus as SourceConfig["search_focus"];
    }

    const body = {
      label: form.label,
      type: form.type,
      config,
      schedule: form.schedule,
      status: "active",
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const currentModels = form.ai_provider === "openai" ? OPENAI_MODELS : CLAUDE_MODELS;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isValid =
    form.label.trim() &&
    form.topic.trim() &&
    (form.type !== "custom_api" || form.api_url.trim()) &&
    (form.type !== "web_search" || form.tavily_api_key.trim());

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Database size={24} className="text-primary" />
            Scout Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure sources, topics, and daily limits for your scouts.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus size={16} />
          New Scout
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-destructive">
          <p>Failed to load sources: {(error as Error).message}</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16">
          <Database size={48} className="mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mb-4">No scout sources configured yet.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
            <Plus size={16} /> Create your first scout
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => {
            const cfg = source.config || {};
            return (
              <div
                key={source.id}
                className="post-card animate-fade-in cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                onClick={() => openEdit(source)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      source.status === "active"
                        ? "bg-upvote/10 text-upvote"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {source.status === "active" ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-medium text-card-foreground">
                        {source.label}
                      </span>
                      <span className={getTypeBadge(source.type)}>
                        {getTypeLabel(source.type)}
                      </span>
                      {cfg.ai_provider && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                          cfg.ai_provider === "openai"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-orange-500/10 text-orange-500 border-orange-500/30"
                        }`}>
                          {getProviderLabel(cfg.ai_provider)} / {getModelLabel(cfg.ai_model || "")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className={source.status === "active" ? "text-upvote" : "text-muted-foreground"}>
                        {source.status === "active" ? "Scout active" : "Paused"}
                      </span>
                      {cfg.topic && (
                        <span>
                          Topic: <span className="text-foreground/80">{cfg.topic}</span>
                        </span>
                      )}
                      {cfg.items_per_day && <span>{cfg.items_per_day} items/day</span>}
                      <span>
                        Last run: {source.last_run_at ? timeAgo(source.last_run_at) : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Scout Source" : "New Scout Source"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Source Type */}
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                placeholder="e.g. ArXiv - Transformers"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            {/* Topic + Items in a row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Topic</Label>
                <Input
                  placeholder="e.g. transformer architecture"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Items/day</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.items_per_day}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, items_per_day: Number(e.target.value) || 5 }))
                  }
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <Select
                value={form.schedule}
                onValueChange={(v) => setForm((f) => ({ ...f, schedule: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── ArXiv categories ──────────────────────────────────────── */}
            {form.type === "arxiv" && (
              <div className="space-y-1.5">
                <Label>Categories (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ARXIV_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.categories.includes(cat)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Hugging Face fields ───────────────────────────────────── */}
            {form.type === "huggingface" && (
              <>
                <div className="space-y-1.5">
                  <Label>Content type</Label>
                  <Select value={form.hf_type} onValueChange={(v) => setForm((f) => ({ ...f, hf_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="model">Models</SelectItem>
                      <SelectItem value="dataset">Datasets</SelectItem>
                      <SelectItem value="paper">Papers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hugging Face Token</Label>
                  <SecretInput value={form.hf_token} onChange={(v) => setForm((f) => ({ ...f, hf_token: v }))} placeholder="hf_..." />
                  <p className="text-xs text-muted-foreground">
                    Required for private models/datasets.{" "}
                    <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-primary underline">
                      Get token
                    </a>
                  </p>
                </div>
              </>
            )}

            {/* ── Web Search fields ──────────────────────────────────────── */}
            {form.type === "web_search" && (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Web Search Configuration
                </p>
                <div className="space-y-1.5">
                  <Label>Tavily API Key</Label>
                  <SecretInput
                    value={form.tavily_api_key}
                    onChange={(v) => setForm((f) => ({ ...f, tavily_api_key: v }))}
                    placeholder="tvly-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Free: 1,000 searches/month.{" "}
                    <a href="https://tavily.com" target="_blank" rel="noreferrer" className="text-primary underline">
                      Get key at tavily.com
                    </a>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Search Depth</Label>
                    <Select value={form.search_depth} onValueChange={(v) => setForm((f) => ({ ...f, search_depth: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (faster, 1 credit)</SelectItem>
                        <SelectItem value="advanced">Advanced (deeper, 2 credits)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Focus</Label>
                    <Select value={form.search_focus} onValueChange={(v) => setForm((f) => ({ ...f, search_focus: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">News (latest articles)</SelectItem>
                        <SelectItem value="general">General (all web)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Custom API + n8n fields ───────────────────────────────── */}
            {form.type === "custom_api" && (
              <>
                <div className="space-y-1.5">
                  <Label>API URL</Label>
                  <Input
                    placeholder="https://api.example.com/v1/items"
                    value={form.api_url}
                    onChange={(e) => setForm((f) => ({ ...f, api_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Scout queries this endpoint with your topic as a search parameter.
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    n8n Workflow (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">n8n Host URL</Label>
                      <Input placeholder="http://localhost:5678/api/v1" value={form.n8n_host} onChange={(e) => setForm((f) => ({ ...f, n8n_host: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">n8n API Key</Label>
                      <SecretInput value={form.n8n_api_key} onChange={(v) => setForm((f) => ({ ...f, n8n_api_key: v }))} placeholder="API key" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── AI Model Settings ────────────────────────────────────── */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Brain size={12} />
                  AI Model for Summarization
                </p>
              </div>

              <div className="p-3 space-y-3">
                {/* Provider toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        const defaultModel = p.value === "openai" ? "gpt-5.4" : "claude-sonnet-4-6";
                        setForm((f) => ({ ...f, ai_provider: p.value, ai_model: defaultModel, ai_api_key: "" }));
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        form.ai_provider === p.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Model cards */}
                <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {currentModels.map((model) => (
                    <ModelCard
                      key={model.value}
                      model={model}
                      selected={form.ai_model === model.value}
                      onSelect={() => setForm((f) => ({ ...f, ai_model: model.value }))}
                    />
                  ))}
                </div>

                {/* API key */}
                <div className="space-y-1.5 pt-1 border-t border-border">
                  <Label className="text-xs">
                    {form.ai_provider === "openai" ? "OpenAI API Key" : "Anthropic API Key"}
                  </Label>
                  <SecretInput
                    value={form.ai_api_key}
                    onChange={(v) => setForm((f) => ({ ...f, ai_api_key: v }))}
                    placeholder={form.ai_provider === "openai" ? "sk-..." : "sk-ant-..."}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {form.ai_provider === "openai"
                      ? "Enter your OpenAI key. Get one at platform.openai.com/api-keys"
                      : "Leave blank to use the server default, or enter a per-source key."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !isValid}>
              {isPending ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SourcesPage;
