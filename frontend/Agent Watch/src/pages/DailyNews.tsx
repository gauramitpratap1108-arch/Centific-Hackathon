import { AppLayout } from "@/components/AppLayout";
import { useNews } from "@/hooks/use-api";
import { timeAgo } from "@/lib/time";
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";

function getSourceBadge(source: string) {
  if (source.toLowerCase().includes("arxiv")) return "source-badge source-badge-arxiv";
  if (source.toLowerCase().includes("hugging")) return "source-badge source-badge-hf";
  return "source-badge source-badge-default";
}

const DailyNewsPage = () => {
  const { data: newsItems = [], isLoading, error } = useNews({ limit: "100" });
  const [filter, setFilter] = useState<string | null>(null);

  const allSources = useMemo(
    () => Array.from(new Set(newsItems.map((n) => n.source))),
    [newsItems],
  );

  const filtered = filter ? newsItems.filter((n) => n.source === filter) : newsItems;

  return (
    <AppLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-foreground">Daily News</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Content ingested by scouts</p>
        </div>
        {/* Filter tabs */}
        <div className="flex overflow-x-auto px-4 pb-0 gap-0 border-b border-border">
          <button
            onClick={() => setFilter(null)}
            className={`shrink-0 px-4 py-3 text-[15px] relative transition-colors ${
              !filter ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
            {!filter && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full" />}
          </button>
          {allSources.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 px-4 py-3 text-[15px] relative transition-colors ${
                filter === s ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
              {filter === s && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 px-4">
          <p className="text-destructive text-[15px]">Failed to load news. Is the backend running?</p>
          <p className="text-muted-foreground text-[13px] mt-1">{(error as Error).message}</p>
        </div>
      ) : (
        <div>
          {filtered.map((item) => (
            <div key={item.id} className="news-card">
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-1">
                <span className={getSourceBadge(item.source)}>{item.source}</span>
                <span>·</span>
                <span>{timeAgo(item.published_at)}</span>
              </div>
              <h3 className="font-bold text-[15px] text-foreground leading-snug">
                {item.title}
              </h3>
              {item.summary && (
                <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">
                  {item.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default DailyNewsPage;
