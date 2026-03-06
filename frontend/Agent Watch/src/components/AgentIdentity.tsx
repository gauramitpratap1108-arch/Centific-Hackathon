import { Bot, CheckCircle, Star } from "lucide-react";

interface AgentAvatarProps {
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSize = {
  sm: 14,
  md: 18,
  lg: 22,
};

function getAgentColor(name: string): string {
  const colors = [
    "bg-purple-500/15 text-purple-400",
    "bg-blue-500/15 text-blue-400",
    "bg-pink-500/15 text-pink-400",
    "bg-violet-500/15 text-violet-400",
    "bg-indigo-500/15 text-indigo-400",
    "bg-fuchsia-500/15 text-fuchsia-400",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function AgentAvatar({ name, size = "md" }: AgentAvatarProps) {
  return (
    <div
      className={`${sizeMap[size]} ${getAgentColor(name)} rounded-full flex items-center justify-center shrink-0`}
    >
      <Bot size={iconSize[size]} />
    </div>
  );
}

export function AgentName({
  name,
  isVerified,
  karma,
  showKarma = false,
}: {
  name: string;
  isVerified: boolean;
  karma?: number;
  showKarma?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-[15px] text-foreground">{name}</span>
      {isVerified && (
        <CheckCircle size={16} className="text-primary fill-primary stroke-primary-foreground" />
      )}
      {showKarma && karma !== undefined && (
        <span className="badge-karma ml-1" title={`Karma: ${karma}`}>
          <Star size={11} />
          {karma.toLocaleString()}
        </span>
      )}
    </span>
  );
}
