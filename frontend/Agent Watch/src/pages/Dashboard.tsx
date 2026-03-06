import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { fetchUsageStats, fetchUsageTimeline, fetchUsageRecent } from "@/lib/api";
import {
  BarChart3, Loader2, RefreshCw, DollarSign, Cpu, Search, Bot, ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All Time" },
] as const;

const GROUP_BY = [
  { value: "service", label: "By Service" },
  { value: "model", label: "By Model" },
  { value: "agent", label: "By Agent" },
] as const;

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function serviceIcon(service: string) {
  switch (service) {
    case "scout": return <Search size={14} className="text-blue-500" />;
    case "agent": return <Bot size={14} className="text-violet-500" />;
    case "moderator": return <ShieldCheck size={14} className="text-amber-500" />;
    default: return <Cpu size={14} className="text-muted-foreground" />;
  }
}

function serviceColor(service: string): string {
  switch (service) {
    case "scout": return "bg-blue-500";
    case "agent": return "bg-violet-500";
    case "moderator": return "bg-amber-500";
    default: return "bg-muted-foreground";
  }
}

function CostBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

const DashboardPage = () => {
  const [period, setPeriod] = useState("7d");
  const [groupBy, setGroupBy] = useState("service");

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats, isFetching } = useQuery({
    queryKey: ["usage-stats", period, groupBy],
    queryFn: async () => (await fetchUsageStats({ period, group_by: groupBy })).data,
    refetchInterval: 60_000,
  });

  const { data: timelineData } = useQuery({
    queryKey: ["usage-timeline", period],
    queryFn: async () => (await fetchUsageTimeline({ period })).data,
    refetchInterval: 60_000,
  });

  const { data: recentData } = useQuery({
    queryKey: ["usage-recent"],
    queryFn: async () => (await fetchUsageRecent({ limit: "20" })).data,
    refetchInterval: 30_000,
  });

  const stats = statsData || {
    total_cost: 0, total_calls: 0, total_input_tokens: 0, total_output_tokens: 0,
    scout_cost: 0, agent_cost: 0, moderator_cost: 0, breakdown: [],
  };
  const timeline = timelineData || [];
  const recent = recentData || [];

  const maxTimelineCost = Math.max(...timeline.map((d: any) => d.total), 0.001);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            AI Usage Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track token usage and estimated costs across scouts, agents, and moderation.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchStats()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              period === p.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {statsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-emerald-500" />
                <span className="text-xs text-muted-foreground">Total Spend</span>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{formatCost(stats.total_cost)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.total_calls} API calls</p>
            </div>

            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={16} className="text-blue-500" />
                <span className="text-xs text-muted-foreground">Total Tokens</span>
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {formatTokens(stats.total_input_tokens + stats.total_output_tokens)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTokens(stats.total_input_tokens)} in / {formatTokens(stats.total_output_tokens)} out
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Search size={16} className="text-blue-500" />
                <span className="text-xs text-muted-foreground">Scout Costs</span>
              </div>
              <p className="text-2xl font-heading font-bold text-blue-500">{formatCost(stats.scout_cost)}</p>
            </div>

            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={16} className="text-violet-500" />
                <span className="text-xs text-muted-foreground">Agent + Mod</span>
              </div>
              <p className="text-2xl font-heading font-bold text-violet-500">
                {formatCost(stats.agent_cost + stats.moderator_cost)}
              </p>
            </div>
          </div>

          {/* Service cost split bar */}
          {stats.total_cost > 0 && (
            <div className="rounded-lg border border-border p-4 bg-card mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Cost Distribution</p>
              <div className="h-4 rounded-full overflow-hidden flex">
                {stats.scout_cost > 0 && (
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${(stats.scout_cost / stats.total_cost) * 100}%` }}
                    title={`Scout: ${formatCost(stats.scout_cost)}`}
                  />
                )}
                {stats.agent_cost > 0 && (
                  <div
                    className="bg-violet-500 h-full transition-all"
                    style={{ width: `${(stats.agent_cost / stats.total_cost) * 100}%` }}
                    title={`Agent: ${formatCost(stats.agent_cost)}`}
                  />
                )}
                {stats.moderator_cost > 0 && (
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${(stats.moderator_cost / stats.total_cost) * 100}%` }}
                    title={`Moderator: ${formatCost(stats.moderator_cost)}`}
                  />
                )}
              </div>
              <div className="flex gap-4 mt-2">
                {[
                  { label: "Scout", cost: stats.scout_cost, color: "bg-blue-500" },
                  { label: "Agent", cost: stats.agent_cost, color: "bg-violet-500" },
                  { label: "Moderator", cost: stats.moderator_cost, color: "bg-amber-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
                    {s.label}: {formatCost(s.cost)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily cost timeline */}
          {timeline.length > 0 && (
            <div className="rounded-lg border border-border p-4 bg-card mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Daily Spend</p>
              <div className="flex items-end gap-1 h-32">
                {timeline.map((day: any) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full flex flex-col-reverse" style={{ height: "100px" }}>
                      {day.scout > 0 && (
                        <div
                          className="w-full bg-blue-500 rounded-t-sm transition-all"
                          style={{ height: `${(day.scout / maxTimelineCost) * 100}px` }}
                        />
                      )}
                      {day.agent > 0 && (
                        <div
                          className="w-full bg-violet-500 transition-all"
                          style={{ height: `${(day.agent / maxTimelineCost) * 100}px` }}
                        />
                      )}
                      {day.moderator > 0 && (
                        <div
                          className="w-full bg-amber-500 rounded-t-sm transition-all"
                          style={{ height: `${(day.moderator / maxTimelineCost) * 100}px` }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/60">
                      {day.date.substring(5)}
                    </span>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-1 text-[10px] text-foreground shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      {day.date}: {formatCost(day.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown table */}
          <div className="rounded-lg border border-border bg-card mb-6">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Breakdown</p>
              <div className="flex gap-1">
                {GROUP_BY.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGroupBy(g.value)}
                    className={`text-[10px] px-2 py-1 rounded transition-colors ${
                      groupBy === g.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            {stats.breakdown.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No usage data yet</p>
            ) : (
              <div className="divide-y divide-border">
                {stats.breakdown.map((row: any) => (
                  <div key={row.name} className="px-4 py-3 flex items-center gap-3">
                    {serviceIcon(row.name)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-card-foreground truncate">{row.name}</span>
                        <span className="text-sm font-heading font-bold text-foreground">{formatCost(row.cost)}</span>
                      </div>
                      <CostBar value={row.cost} max={stats.breakdown[0]?.cost || 1} />
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{row.calls} calls</span>
                        <span>{formatTokens(row.input_tokens)} in</span>
                        <span>{formatTokens(row.output_tokens)} out</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent usage log */}
          {recent.length > 0 && (
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent API Calls</p>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {recent.map((row: any) => (
                  <div key={row.id} className="px-4 py-2.5 flex items-center gap-3">
                    {serviceIcon(row.service)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-card-foreground">{row.model}</span>
                        {row.agent_name && (
                          <span className="text-[10px] text-muted-foreground">({row.agent_name})</span>
                        )}
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>{row.service}</span>
                        <span>{formatTokens(row.input_tokens)} in / {formatTokens(row.output_tokens)} out</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-foreground">{formatCost(Number(row.cost_usd))}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(row.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default DashboardPage;
