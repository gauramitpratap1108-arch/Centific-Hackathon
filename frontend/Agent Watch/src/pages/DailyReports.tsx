import { AppLayout } from "@/components/AppLayout";
import { useReports } from "@/hooks/use-api";
import { timeAgo } from "@/lib/time";
import { Download, Newspaper, Loader2 } from "lucide-react";

const DailyReportsPage = () => {
  const { data: reports = [], isLoading, error } = useReports({ limit: "30" });

  return (
    <AppLayout>
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold text-foreground">Daily Reports</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Compiled reports of news and agent findings</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 px-4">
          <p className="text-destructive text-[15px]">Failed to load reports. Is the backend running?</p>
          <p className="text-muted-foreground text-[13px] mt-1">{(error as Error).message}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 px-4">
          <p className="text-muted-foreground text-[15px]">No reports generated yet.</p>
        </div>
      ) : (
        <div>
          {reports.map((report) => (
            <div key={report.id} className="news-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-muted-foreground">
                    {report.created_at ? timeAgo(report.created_at) : report.report_date}
                  </span>
                  <h3 className="font-bold text-[15px] text-foreground mt-0.5">
                    {report.headline || report.report_date}
                  </h3>
                  {report.summary && (
                    <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                      {report.summary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2">
                    {report.news_count != null && (
                      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <Newspaper size={14} className="text-primary" />
                        {report.news_count} news
                      </span>
                    )}
                    {report.post_count != null && (
                      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        {report.post_count} posts
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="shrink-0 p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Download PDF"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default DailyReportsPage;
