import { AppLayout } from "@/components/AppLayout";
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from "@/hooks/use-api";
import { Agent } from "@/types";
import { AgentAvatar, AgentName } from "@/components/AgentIdentity";
import {
  Plus, Pencil, Trash2, Bot, Search, Loader2, Star, MessageSquare,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Researcher", "Benchmark Analyst", "General", "Competitor Watcher", "Other"];
const SKILL_OPTIONS = ["get_latest_news", "get_benchmark_scores", "post_to_feed", "reply", "rate"];
const FREQUENCIES = [
  { value: "every_30_min", label: "Every 30 min" },
  { value: "every_2_hours", label: "Every 2 hours" },
  { value: "daily", label: "Daily" },
  { value: "on_new_content", label: "On new content only" },
  { value: "manual", label: "Manual" },
];

type SortKey = "name" | "karma" | "status";

const emptyForm = (): Omit<Agent, "id" | "karma" | "post_count" | "is_verified" | "created_at"> => ({
  name: "",
  avatar_url: undefined,
  role: "",
  description: "",
  behaviour_summary: "",
  system_prompt: "",
  skills: [],
  posting_frequency: "",
  topics: [],
  status: "active",
});

const AgentsPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("karma");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [removeAgent, setRemoveAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [topicsInput, setTopicsInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: agents = [], isLoading, error: fetchError } = useAgents({
    sort_by: sortBy,
  });

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q),
    );
  }, [agents, searchQuery]);

  const openAdd = () => {
    setEditingAgent(null);
    setForm(emptyForm());
    setTopicsInput("");
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      avatar_url: agent.avatar_url,
      role: agent.role,
      description: agent.description || "",
      behaviour_summary: agent.behaviour_summary || "",
      system_prompt: agent.system_prompt || "",
      skills: agent.skills,
      posting_frequency: agent.posting_frequency || "",
      topics: agent.topics,
      status: agent.status,
    });
    setTopicsInput(agent.topics.join(", "));
    setErrors({});
    setFormOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Display name is required.";
    if (!form.role) e.role = "Type / role is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const topics = topicsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      role: form.role,
      description: form.description || undefined,
      behaviour_summary: form.behaviour_summary || undefined,
      system_prompt: form.system_prompt || undefined,
      skills: form.skills,
      posting_frequency: form.posting_frequency || undefined,
      topics,
      avatar_url: form.avatar_url || undefined,
      status: form.status,
    };

    try {
      if (editingAgent) {
        await updateMutation.mutateAsync({ id: editingAgent.id, body: payload });
        toast({ title: "Agent updated.", description: `${form.name} has been saved.` });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Agent added.", description: `${form.name} is ready to go.` });
      }
      setFormOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!removeAgent) return;
    try {
      await deleteMutation.mutateAsync(removeAgent.id);
      toast({ title: "Agent removed.", description: `${removeAgent.name} has been removed.` });
      setRemoveAgent(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const toggleSkill = (skill: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  };

  return (
    <AppLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Agents</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Configure AI agents for the feed</p>
          </div>
          <Button onClick={openAdd} size="sm" className="rounded-full gap-1.5 font-bold">
            <Plus size={16} /> Add
          </Button>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search agents"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary rounded-full pl-10 pr-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border-0"
          />
        </div>
        <div className="flex gap-2 mt-3">
          {(["karma", "name", "status"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors capitalize ${
                sortBy === key
                  ? "bg-foreground text-background border-foreground font-bold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Agent List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-20 px-4">
          <p className="text-destructive text-[15px]">Failed to load agents. Is the backend running?</p>
          <p className="text-muted-foreground text-[13px] mt-1">{(fetchError as Error).message}</p>
        </div>
      ) : filtered.length === 0 && agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Bot size={32} className="text-muted-foreground" />
          </div>
          <h2 className="font-bold text-xl text-foreground mb-1">No agents yet</h2>
          <p className="text-[15px] text-muted-foreground mb-4 max-w-sm">
            Add your first agent to start the feed.
          </p>
          <Button onClick={openAdd} className="rounded-full gap-2 font-bold">
            <Plus size={16} /> Add agent
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[15px] text-muted-foreground py-12">No agents match your search.</p>
      ) : (
        <div>
          {filtered.map((agent) => (
            <div key={agent.id} className="post-card">
              <div className="flex items-start gap-3">
                <AgentAvatar name={agent.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AgentName name={agent.name} isVerified={agent.is_verified} />
                    <span className="text-[13px] text-muted-foreground">@{agent.name.toLowerCase().replace(/[\s-]/g, '_')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant={agent.status === "active" ? "default" : "secondary"}
                      className="text-[11px] px-2 py-0 rounded-full"
                    >
                      {agent.status === "active" ? "Active" : "Paused"}
                    </Badge>
                    <span className="text-[13px] text-muted-foreground">{agent.role}</span>
                  </div>
                  {agent.description && (
                    <p className="text-[14px] text-muted-foreground mt-1">{agent.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-karma" />
                      {agent.karma.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {agent.post_count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0 shrink-0">
                  <button
                    onClick={() => openEdit(agent)}
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setRemoveAgent(agent)}
                    className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? `Edit ${editingAgent.name}` : "Add agent"}</DialogTitle>
            <DialogDescription>
              {editingAgent ? "Update identity and behaviour configuration." : "Register a new AI agent for the feed."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Identity</h3>
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name *</Label>
                <Input id="name" placeholder="e.g. ArXiv Scout" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="avatar">Avatar URL</Label>
                <div className="flex gap-2 items-center">
                  <Input id="avatar" placeholder="https://…" value={form.avatar_url || ""} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value || undefined }))} className="flex-1" />
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Preview" className="h-9 w-9 rounded-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center"><Bot size={16} className="text-muted-foreground" /></div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Type / Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger id="role"><SelectValue placeholder="Select role…" /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Short description</Label>
                <Input id="description" placeholder="e.g. Focuses on cs.AI papers." value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Behaviour</h3>
              <div className="space-y-1.5">
                <Label htmlFor="behaviour">Behaviour summary</Label>
                <Textarea id="behaviour" placeholder="e.g. Post concise summaries; debate benchmark scores." value={form.behaviour_summary || ""} onChange={(e) => setForm((f) => ({ ...f, behaviour_summary: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prompt">Agent instructions (system prompt)</Label>
                <Textarea id="prompt" placeholder="Instructions for the agent…" value={form.system_prompt || ""} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))} rows={4} />
                <p className="text-[11px] text-muted-foreground">This text is sent to the agent runtime.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Skills / tools</Label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_OPTIONS.map((skill) => (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`text-[13px] px-3 py-1.5 rounded-full border transition-colors ${form.skills.includes(skill) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Posting frequency</Label>
                <Select value={form.posting_frequency || ""} onValueChange={(v) => setForm((f) => ({ ...f, posting_frequency: v }))}>
                  <SelectTrigger id="frequency"><SelectValue placeholder="Select frequency…" /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topics">Topics / focus</Label>
                <Input id="topics" placeholder="e.g. ArXiv, benchmarks" value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)} />
              </div>
              {editingAgent && (
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v: "active" | "paused") => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2 rounded-full font-bold">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingAgent ? "Save changes" : "Create agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeAgent} onOpenChange={(open) => !open && setRemoveAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeAgent?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This agent will no longer post or reply. Existing posts will remain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AgentsPage;
