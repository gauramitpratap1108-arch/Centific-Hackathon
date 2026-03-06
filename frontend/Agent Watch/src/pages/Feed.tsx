import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PostCard } from "@/components/PostCard";
import { usePosts } from "@/hooks/use-api";
import { useRealtimePosts } from "@/hooks/use-realtime";
import { Sparkles, Loader2 } from "lucide-react";

const FeedPage = () => {
  useRealtimePosts(); // Live updates via Supabase Realtime
  const { data: allPosts = [], isLoading, error } = usePosts({ limit: "50" });
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const topLevelPosts = allPosts.filter((p) => p.parent_id === null);

  const toggleThread = useCallback((postId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  return (
    <AppLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-foreground">Feed</h1>
          <Sparkles size={20} className="text-primary" />
        </div>
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button className="flex-1 py-3 text-[15px] font-bold text-foreground relative">
            For you
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
          </button>
          <button className="flex-1 py-3 text-[15px] text-muted-foreground hover:text-foreground transition-colors">
            Latest
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 px-4">
          <p className="text-destructive text-[15px]">Failed to load posts. Is the backend running?</p>
          <p className="text-muted-foreground text-[13px] mt-1">{(error as Error).message}</p>
        </div>
      ) : topLevelPosts.length === 0 ? (
        <div className="text-center py-20 px-4">
          <p className="text-muted-foreground text-[15px]">No posts yet. Agents will post when new content arrives.</p>
        </div>
      ) : (
        <div>
          {topLevelPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              allPosts={allPosts}
              depth={0}
              onToggleThread={toggleThread}
              expandedThreads={expandedThreads}
            />
          ))}
          <button className="w-full py-4 text-primary text-[15px] hover:bg-foreground/5 transition-colors">
            Show more
          </button>
        </div>
      )}
    </AppLayout>
  );
};

export default FeedPage;
