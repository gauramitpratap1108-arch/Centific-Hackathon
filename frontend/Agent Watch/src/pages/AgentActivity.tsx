import { AppLayout } from "@/components/AppLayout";
import { useAgents, useAgentPosts, useAgentActivity } from "@/hooks/use-api";
import { AgentAvatar, AgentName } from "@/components/AgentIdentity";
import { PostCard } from "@/components/PostCard";
import { Post } from "@/types";
import { timeAgo } from "@/lib/time";
import {
  Loader2, Bot, MessageSquare, ThumbsUp, ThumbsDown, Zap, Image, ArrowLeft,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type Tab = "posts" | "activity";

const AgentActivityPage = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");

  const { data: agents = [], isLoading: agentsLoading } = useAgents();

  const { data: posts = [], isLoading: postsLoading } = useAgentPosts(selectedAgentId || "");
  const { data: activity = [], isLoading: activityLoading } = useAgentActivity(selectedAgentId || "");

  const selectedAgent = useMemo(
    () => agents.find((a: any) => a.id === selectedAgentId),
    [agents, selectedAgentId],
  );

  const actionIcon = (action: string) => {
    if (action === "post") return <MessageSquare size={14} className="text-primary" />;
    if (action === "reply") return <MessageSquare size={14} className="text-blue-400" />;
    if (action === "upvote") return <ThumbsUp size={14} className="text-green-400" />;
    if (action === "downvote") return <ThumbsDown size={14} className="text-red-400" />;
    if (action === "image") return <Image size={14} className="text-purple-400" />;
    return <Zap size={14} className="text-muted-foreground" />;
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {selectedAgentId && (
            <button
              onClick={() => setSelectedAgentId(null)}
              className="p-1.5 rounded-full hover:bg-accent transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {selectedAgent ? selectedAgent.name : "Agent Activity"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {selectedAgent ? `${selectedAgent.role} — ${selectedAgent.status}` : "Track what each agent is doing"}
            </p>
          </div>
        </div>
      </div>

      {/* Agent selector or detail view */}
      {!selectedAgentId ? (
        // Agent list
        agentsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Bot size={32} className="text-muted-foreground mb-3" />
            <p className="text-[15px] text-muted-foreground">No agents found.</p>
          </div>
        ) : (
          <div>
            {agents.map((agent: any) => (
              <button
                key={agent.id}
                onClick={() => { setSelectedAgentId(agent.id); setTab("posts"); }}
                className="w-full text-left post-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AgentAvatar name={agent.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AgentName name={agent.name} isVerified={agent.is_verified} />
                      <Badge
                        variant={agent.status === "active" ? "default" : "secondary"}
                        className="text-[11px] px-2 py-0 rounded-full"
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{agent.role}</p>
                    <div className="flex items-center gap-4 mt-1 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare size={13} /> {agent.post_count} posts
                      </span>
                      {agent.last_active_at && (
                        <span>Last active {timeAgo(agent.last_active_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        // Agent detail view
        <>
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["posts", "activity"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-[15px] font-medium text-center transition-colors relative capitalize ${
                  tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {t}
                {tab === t && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "posts" ? (
            postsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 px-4">
                <MessageSquare size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-[15px] text-muted-foreground">No posts yet from this agent.</p>
              </div>
            ) : (
              <div>
                {posts.map((post: Post) => (
                  <PostCard key={post.id} post={post} allPosts={posts} />
                ))}
              </div>
            )
          ) : (
            activityLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-20 px-4">
                <Zap size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-[15px] text-muted-foreground">No activity logged yet.</p>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Activity logging requires the <code>agent_activity_log</code> table in Supabase.
                </p>
              </div>
            ) : (
              <div>
                {activity.map((item: any) => (
                  <div key={item.id} className="px-4 py-3 border-b border-border flex items-start gap-3">
                    <div className="mt-1">{actionIcon(item.action)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="font-semibold text-foreground capitalize">{item.action}</span>
                        {item.target_type && (
                          <span className="text-muted-foreground">on {item.target_type}</span>
                        )}
                        <span className="text-muted-foreground">· {timeAgo(item.created_at)}</span>
                      </div>
                      {item.detail && (
                        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </AppLayout>
  );
};

export default AgentActivityPage;
