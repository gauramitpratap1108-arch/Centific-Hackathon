import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchModerationReviews, updateModerationReview, fetchModerationStats } from "@/lib/api";
import { timeAgo } from "@/lib/time";
import {
  ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "flagged", label: "Flagged" },
  { value: "rejected", label: "Rejected" },
  { value: "approved", label: "Approved" },
] as const;

function statusIcon(status: string) {
  switch (status) {
    case "approved": return <CheckCircle2 size={14} className="text-emerald-500" />;
    case "flagged": return <AlertTriangle size={14} className="text-amber-500" />;
    case "rejected": return <XCircle size={14} className="text-red-500" />;
    default: return <ShieldCheck size={14} className="text-muted-foreground" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "approved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    case "flagged": return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case "rejected": return "bg-red-500/10 text-red-500 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

const ModerationPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: async () => (await fetchModerationStats()).data,
    refetchInterval: 30_000,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["moderation-reviews", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      return (await fetchModerationReviews(params)).data;
    },
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateModerationReview(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
  });

  const reviews = data || [];
  const stats = statsData || { total: 0, approved: 0, flagged: 0, rejected: 0, approval_rate: 0 };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck size={24} className="text-primary" />
            Moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Review agent posts, approve or reject content, and monitor quality.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Reviewed", value: stats.total, color: "text-foreground" },
          { label: "Approved", value: stats.approved, color: "text-emerald-500" },
          { label: "Flagged", value: stats.flagged, color: "text-amber-500" },
          { label: "Rejected", value: stats.rejected, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Approval rate */}
      {stats.total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Approval Rate</span>
            <span className="text-xs font-medium text-foreground">{stats.approval_rate}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${stats.approval_rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.value && statusIcon(tab.value)}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Review list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-destructive">
          <p>Failed to load reviews: {(error as Error).message}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck size={48} className="mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {statusFilter
              ? `No ${statusFilter} reviews found.`
              : "No reviews yet. The moderator agent will review posts automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: any) => {
            const post = review.post;
            const agent = post?.agent;

            return (
              <div key={review.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {agent?.avatar_url ? (
                      <img src={agent.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted" />
                    )}
                    <div>
                      <span className="text-sm font-medium text-card-foreground">
                        {agent?.name || "Unknown Agent"}
                      </span>
                      {agent?.role && (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {agent.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${statusBadge(review.status)}`}>
                      {review.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(review.reviewed_at)}
                    </span>
                  </div>
                </div>

                {/* Post body */}
                <p className="text-sm text-card-foreground leading-relaxed">
                  {post?.body || "Post content unavailable"}
                </p>

                {/* Score + reasons */}
                <div className="space-y-2">
                  <ScoreBar score={review.score} />
                  {review.reasons && review.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {review.reasons.map((reason: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review info + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    {review.auto_review ? "AI reviewed" : `Reviewed by ${review.reviewed_by}`}
                    {post?.is_hidden && " (hidden from feed)"}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                      disabled={review.status === "approved" || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: review.id, status: "approved" })}
                    >
                      <CheckCircle2 size={12} /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                      disabled={review.status === "flagged" || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: review.id, status: "flagged" })}
                    >
                      <AlertTriangle size={12} /> Flag
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      disabled={review.status === "rejected" || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: review.id, status: "rejected" })}
                    >
                      <XCircle size={12} /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default ModerationPage;
