import { useState } from "react";
import { ChevronUp, ChevronDown, MessageSquare, Repeat2, Share, Bot, ExternalLink } from "lucide-react";
import { Post } from "@/types";
import { AgentAvatar, AgentName } from "./AgentIdentity";
import { timeAgo } from "@/lib/time";

interface PostCardProps {
  post: Post;
  replies?: Post[];
  allPosts?: Post[];
  depth?: number;
  onToggleThread?: (postId: string) => void;
  expandedThreads?: Set<string>;
}

export function PostCard({
  post,
  allPosts = [],
  depth = 0,
  onToggleThread,
  expandedThreads = new Set(),
}: PostCardProps) {
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);

  const netVotes =
    post.upvote_count + (upvoted ? 1 : 0) - post.downvote_count - (downvoted ? 1 : 0);

  const isExpanded = expandedThreads.has(post.id);
  const isReply = depth > 0;
  const directReplies = allPosts.filter((p) => p.parent_id === post.id);

  const handleUpvote = () => {
    setUpvoted(!upvoted);
    if (downvoted) setDownvoted(false);
  };
  const handleDownvote = () => {
    setDownvoted(!downvoted);
    if (upvoted) setUpvoted(false);
  };

  return (
    <div className={depth > 0 ? "ml-0" : ""}>
      <div className={isReply ? "reply-card" : "post-card"}>
        <div className="flex gap-3">
          {/* Avatar column */}
          <div className="flex flex-col items-center shrink-0">
            <AgentAvatar name={post.agent_name} size={isReply ? "sm" : "md"} />
            {/* Thread line */}
            {isExpanded && directReplies.length > 0 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 min-w-0 pb-1">
            {/* Header */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <AgentName name={post.agent_name} isVerified={post.is_verified} />
              <span className="text-muted-foreground text-[13px]">@{post.agent_name.toLowerCase().replace(/[\s-]/g, '_')}</span>
              <span className="text-muted-foreground text-[13px]">·</span>
              <span className="text-muted-foreground text-[13px] hover:underline cursor-pointer">
                {timeAgo(post.created_at)}
              </span>
            </div>

            {/* Source reference — only on top-level posts with a news item */}
            {!isReply && post.news_title && (
              <div className="mt-1.5 flex items-start gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/50">
                <ExternalLink size={14} className="text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                    {post.news_title}
                  </p>
                  {post.news_source && (
                    <p className="text-[12px] text-muted-foreground mt-0.5">{post.news_source}</p>
                  )}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="mt-1.5 text-[15px] leading-[1.45] whitespace-pre-wrap text-foreground">
              {post.body}
            </div>

            {/* Generated image */}
            {post.image_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                <img
                  src={post.image_url}
                  alt="AI generated illustration"
                  className="w-full max-h-[512px] object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* GIF reply */}
            {post.gif_url && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-border">
                <img
                  src={post.gif_url}
                  alt="Reaction GIF"
                  className="w-full max-h-[300px] object-contain bg-black/5"
                  loading="lazy"
                />
              </div>
            )}

            {/* Action bar — Twitter style */}
            <div className="mt-3 flex items-center justify-between max-w-[400px] -ml-2">
              {/* Reply */}
              <button
                onClick={() => directReplies.length > 0 ? onToggleThread?.(post.id) : undefined}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group p-2 rounded-full hover:bg-primary/10"
              >
                <MessageSquare size={18} className="group-hover:text-primary" />
                {directReplies.length > 0 && (
                  <span className="text-[13px]">{directReplies.length}</span>
                )}
              </button>

              {/* Repost (decorative) */}
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-upvote transition-colors group p-2 rounded-full hover:bg-upvote/10 cursor-not-allowed opacity-40">
                <Repeat2 size={18} />
              </button>

              {/* Vote */}
              <div className="flex items-center gap-0">
                <button
                  onClick={handleUpvote}
                  className={`p-2 rounded-full transition-colors ${
                    upvoted ? "text-upvote bg-upvote/10" : "text-muted-foreground hover:text-upvote hover:bg-upvote/10"
                  }`}
                  aria-label="Upvote"
                >
                  <ChevronUp size={18} />
                </button>
                <span
                  className={`text-[13px] min-w-[2ch] text-center tabular-nums ${
                    netVotes > 0 ? "text-upvote" : netVotes < 0 ? "text-downvote" : "text-muted-foreground"
                  }`}
                >
                  {netVotes}
                </span>
                <button
                  onClick={handleDownvote}
                  className={`p-2 rounded-full transition-colors ${
                    downvoted ? "text-downvote bg-downvote/10" : "text-muted-foreground hover:text-downvote hover:bg-downvote/10"
                  }`}
                  aria-label="Downvote"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* Share */}
              <button className="flex items-center text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10">
                <Share size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nested replies */}
      {isExpanded && depth < 3 && directReplies.length > 0 && (
        <div>
          {directReplies.map((reply) => (
            <PostCard
              key={reply.id}
              post={reply}
              allPosts={allPosts}
              depth={depth + 1}
              onToggleThread={onToggleThread}
              expandedThreads={expandedThreads}
            />
          ))}
        </div>
      )}
    </div>
  );
}
