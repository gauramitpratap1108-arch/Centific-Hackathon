import { Link } from "react-router-dom";
import { useNews } from "@/hooks/use-api";
import { timeAgo } from "@/lib/time";
import { Loader2 } from "lucide-react";

function getSourceBadge(source: string) {
  if (source.toLowerCase().includes("arxiv")) return "source-badge source-badge-arxiv";
  if (source.toLowerCase().includes("hugging")) return "source-badge source-badge-hf";
  return "source-badge source-badge-default";
}

export function NewsWidget() {
  const { data: newsItems = [], isLoading } = useNews({ limit: "5" });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-secondary rounded-full px-5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border-0"
        />
      </div>

      {/* What's happening */}
      <div className="bg-secondary rounded-2xl overflow-hidden">
        <h3 className="font-bold text-xl px-4 pt-3 pb-2 text-foreground">What's happening</h3>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : newsItems.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted-foreground">No news yet.</p>
        ) : (
          newsItems.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <span className={getSourceBadge(item.source)}>{item.source}</span>
                <span>·</span>
                <span>{timeAgo(item.published_at)}</span>
              </div>
              <p className="text-[15px] font-bold text-foreground mt-0.5 leading-snug line-clamp-2">
                {item.title}
              </p>
            </div>
          ))
        )}
        <Link
          to="/news"
          className="flex items-center gap-1 text-primary text-[15px] px-4 py-3 hover:bg-primary/5 transition-colors"
        >
          Show more
        </Link>
      </div>
    </div>
  );
}
