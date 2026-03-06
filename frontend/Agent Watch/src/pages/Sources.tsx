import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useSources } from "@/hooks/use-api";
import { createSource, updateSource } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import {
  Wifi, WifiOff, Plus, Loader2, Pencil, Database, Info, Eye, EyeOff,
  Sparkles, Zap, Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Source } from "@/types";

// ── Constants ────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: "ArXiv", label: "ArXiv" },
  { value: "Hugging Face", label: "Hugging Face" },
  { value: "Web Search", label: "Web Search" },
  { value: "Custom API (n8n)", label: "Custom API (n8n)" },
];

const SCHEDULES = [
  { value: "every_15_min", label: "Every 15 min" },
  { value: "every_30_min", label: "Every 30 min" },
  { value: "every_hour", label: "Hourly" },
  { value: "every_6_hours", label: "Every 6 hours" },
  { value: "daily", label: "Daily" },
];

const ARXIV_CATEGORIES = [
  "cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.NE",
  "cs.RO", "stat.ML", "cs.MA", "cs.IR", "cs.SE",
];

type ModelProvider = "openai" | "anthropic";

interface ModelOption {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  desc: string;
  icon: React.ElementType;
}

const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-opus-4-20250514", name: "Claude Opus 4.6", badge: "Best All-Rounder", badgeColor: "bg-orange-500/20 text-orange-400", desc: "Flagship for complex reasoning and 1M+ token context", icon: Sparkles },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4.6", badge: "Best Value", badgeColor: "bg-primary/20 text-primary", desc: "Default workhorse: near-Opus quality, excels at coding", icon: Code2 },
  { id: "claude-haiku-4-20250514", name: "Claude Haiku 4.5", badge: "Speed / Low Cost", badgeColor: "bg-emerald-500/20 text-emerald-400", desc: "Extremely fast and cheap for high-volume tasks", icon: Zap },
];

const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-5.4", name: "GPT-5.4", badge: "Most Capable", badgeColor: "bg-primary/20 text-primary", desc: "Flagship model for complex, professional tasks", icon: Sparkles },
  { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", badge: "High Precision", badgeColor: "bg-violet-500/20 text-violet-400", desc: "Optimized for smarter, more precise responses", icon: Code2 },
  { id: "gpt-5.4-thinking", name: "GPT-5.4 Thinking", badge: "Reasoning", badgeColor: "bg-amber-500/20 text-amber-400", desc: "Chain-of-thought, coding, and agentic tasks", icon: Zap },
  { id: "gpt-5-mini", name: "GPT-5 Mini", badge: "Speed / Cost", badgeColor: "bg-emerald-500/20 text-emerald-400", desc: "Fast, efficient, cost-effective for simple tasks", icon: Zap },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", badge: "Coding", badgeColor: "bg-cyan-500/20 text-cyan-400", desc: "Multi-language engineering and terminal tasks", icon: Code2 },
  { id: "gpt-4.1", name: "GPT-4.1", badge: "Balanced", badgeColor: "bg-zinc-500/20 text-zinc-400", desc: "Non-reasoning balance between speed and capability", icon: Sparkles },
];

// ── Helper to derive backend type from source option ─────

function sourceOptionToType(sourceOption: string): string {
  if (sourceOption === "ArXiv") return "API";
  if (sourceOption === "Hugging Face") return "API";
  if (sourceOption === "Web Search") return "RSS";
  return "n8n";
}

// ── Component ────────────────────────────────────────────

const SourcesPage = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: sourceList = [], isLoading, error } = useSources();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [saving, setSaving] = useState(false);

  const [sourceType, setSourceType] = useState("ArXiv");
  const [label, setLabel] = useState("");
  const [topic, setTopic] = useState("");
  const [itemsPerDay, setItemsPerDay] = useState("5");
  const [schedule, setSchedule] = useState("daily");
  const [categories, setCategories] = useState<string[]>(["cs.AI"]);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("anthropic");
  const [modelId, setModelId] = useState("claude-sonnet-4-20250514");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<"active" | "paused">("active");

  const resetForm = useCallback(() => {
    setSourceType("ArXiv");
    setLabel("");
    setTopic("");
    setItemsPerDay("5");
    setSchedule("daily");
    setCategories(["cs.AI"]);
    setModelProvider("anthropic");
    setModelId("claude-sonnet-4-20250514");
    setApiKey("");
    setShowApiKey(false);
    setStatus("active");
  }, []);

  const openAdd = () => {
    setEditingSource(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (source: Source) => {
    setEditingSource(source);
    const cfg = (source.config || {}) as Record<string, unknown>;
    const srcLabel = source.label;

    // Try to reverse-detect source type
    const t = source.type;
    if (t === "API" && srcLabel.toLowerCase().includes("arxiv")) setSourceType("ArXiv");
    else if (t === "API") setSourceType("Hugging Face");
    else if (t === "RSS") setSourceType("Web Search");
    else setSourceType("Custom API (n8n)");

    setLabel(srcLabel);
    setTopic((cfg.topic as string) || "");
    setItemsPerDay(String((cfg.items_per_day as number) || 5));
    setSchedule(source.schedule || "daily");
    setCategories((cfg.categories as string[]) || []);
    setModelProvider((cfg.model_provider as ModelProvider) || "anthropic");
    setModelId((cfg.model as string) || "claude-sonnet-4-20250514");
    setApiKey("");
    setShowApiKey(false);
    setStatus(source.status);
    setFormOpen(true);
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async () => {
    if (!label.trim()) return;
    setSaving(true);

    const config: Record<string, unknown> = {
      topic: topic || undefined,
      items_per_day: Number(itemsPerDay) || 5,
      categories: categories.length > 0 ? categories : undefined,
      model_provider: modelProvider,
      model: modelId,
    };
    if (apiKey.trim()) config.api_key = apiKey.trim();

    const type = sourceOptionToType(sourceType);

    try {
      if (editingSource) {
        await updateSource(editingSource.id, { label, type, config, schedule, status });
        toast({ title: "Source updated.", description: `${label} has been saved.` });
      } else {
        await createSource({ label, type, config, schedule, status });
        toast({ title: "Source created.", description: `${label} is ready to scout.` });
      }
      qc.invalidateQueries({ queryKey: ["sources"] });
      setFormOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const models = modelProvider === "anthropic" ? ANTHROPIC_MODELS : OPENAI_MODELS;

  return (
    <AppLayout>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database size={20} className="text-primary" />
              <h1 className="text-xl font-bold text-foreground">Scout Sources</h1>
            </div>
            <p className="text-[13px] text-muted-foreground mt-0.5">Configure sources, topics, and AI models</p>
          </div>
          <Button onClick={openAdd} size="sm" className="rounded-full gap-1.5 font-bold">
            <Plus size={16} /> New Scout
          </Button>
        </div>
      </div>

      {/* Source List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 px-4">
          <p className="text-destructive text-[15px]">Failed to load sources.</p>
          <p className="text-muted-foreground text-[13px] mt-1">{(error as Error).message}</p>
        </div>
      ) : sourceList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Database size={32} className="text-muted-foreground" />
          </div>
          <h2 className="font-bold text-xl text-foreground mb-1">No sources</h2>
          <p className="text-[15px] text-muted-foreground mb-4 max-w-sm">Add a data source for scouts to crawl.</p>
          <Button onClick={openAdd} className="rounded-full gap-2 font-bold">
            <Plus size={16} /> New Scout
          </Button>
        </div>
      ) : (
        <div>
          {sourceList.map((source) => {
            const cfg = (source.config || {}) as Record<string, unknown>;
            const topicStr = cfg.topic as string | undefined;
            return (
              <div key={source.id} className="post-card">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      source.status === "active"
                        ? "bg-upvote/10 text-upvote"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {source.status === "active" ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[15px] text-foreground">{source.label}</span>
                      <span className="source-badge source-badge-default">{source.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[13px] text-muted-foreground flex-wrap">
                      <span className={source.status === "active" ? "text-upvote" : ""}>
                        {source.status === "active" ? "Scout active" : "Paused"}
                      </span>
                      <span>·</span>
                      <span>Last run {timeAgo(source.last_run_at)}</span>
                      {source.schedule && (
                        <>
                          <span>·</span>
                          <span>{source.schedule.replace(/_/g, " ")}</span>
                        </>
                      )}
                    </div>
                    {topicStr && (
                      <p className="text-[12px] text-muted-foreground mt-0.5">Topic: {topicStr}</p>
                    )}
                  </div>
                  <button
                    onClick={() => openEdit(source)}
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New / Edit Scout Source Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingSource ? `Edit ${editingSource.label}` : "New Scout Source"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Source type */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Source</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Label</Label>
              <Input
                placeholder="e.g. ArXiv - Transformers"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {/* Topic + Items/day */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="font-semibold">Topic</Label>
                <Input
                  placeholder="e.g. transformer architecture"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="w-24 space-y-1.5">
                <Label className="font-semibold">Items/day</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={itemsPerDay}
                  onChange={(e) => setItemsPerDay(e.target.value)}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label className="font-semibold">Schedule</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categories (for ArXiv) */}
            {(sourceType === "ArXiv" || sourceType === "Hugging Face") && (
              <div className="space-y-2">
                <Label className="font-semibold">Categories (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ARXIV_CATEGORIES.map((cat) => {
                    const active = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status (edit only) */}
            {editingSource && (
              <div className="space-y-1.5">
                <Label className="font-semibold">Status</Label>
                <Select value={status} onValueChange={(v: "active" | "paused") => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* AI Model Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground uppercase tracking-wider font-bold">
                <Info size={14} />
                AI Model for Summarization
              </div>

              {/* Provider tabs */}
              <div className="flex rounded-full border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setModelProvider("openai"); setModelId("gpt-5.4"); }}
                  className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
                    modelProvider === "openai"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => { setModelProvider("anthropic"); setModelId("claude-sonnet-4-20250514"); }}
                  className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
                    modelProvider === "anthropic"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anthropic Claude
                </button>
              </div>

              {/* Model cards */}
              <div className="space-y-2">
                {models.map((m) => {
                  const selected = modelId === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelId(m.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      <div className="shrink-0 h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon size={18} className={selected ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[14px] text-foreground">{m.name}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{m.desc}</p>
                      </div>
                      <div className="shrink-0">
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selected ? "border-primary" : "border-muted-foreground/40"
                        }`}>
                          {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label className="font-semibold">
                {modelProvider === "anthropic" ? "Anthropic API Key" : "OpenAI API Key"}
              </Label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={modelProvider === "anthropic" ? "sk-ant-…" : "sk-proj-…"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank to use the server default, or enter a per-source key.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !label.trim()}
              className="gap-2 rounded-full font-bold"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingSource ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default SourcesPage;
