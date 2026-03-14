import { SourceBadge } from "./SourceBadge";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import type { Track } from "@/lib/types";

type TrackCardProps = {
  track: Track;
  index?: number;
  onClick?: () => void;
};

export const TrackCard = ({ track, index = 0, onClick }: TrackCardProps) => {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.2, 0, 0, 1] }}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      aria-label={`Open details for ${track.title} by ${track.artist}`}
    >
      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {track.albumArtUrl ? (
          <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground">{track.title[0]}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{track.title}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">@{track.sharedBy}</span>
        </div>
      </div>

      <SourceBadge url={track.url} />

      <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
        {track.genre}
      </span>

      <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
        {formatRelativeTime(track.sharedAt)}
      </span>

      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </motion.button>
  );
};
