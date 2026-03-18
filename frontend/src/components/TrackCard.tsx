import { SourceBadge } from "./SourceBadge";
import { motion } from "framer-motion";
import { ExternalLink, Trash2 } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import type { Track } from "@/lib/types";

type TrackCardProps = {
  track: Track;
  index?: number;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
};

export const TrackCard = ({ track, index = 0, onClick, onDelete }: TrackCardProps) => {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.2, 0, 0, 1] }}
      className="group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors duration-200 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      aria-label={`Open details for ${track.title} by ${track.artist}`}
    >
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {track.albumArtUrl ? (
          <img src={track.albumArtUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-sm font-mono text-muted-foreground">{track.title[0]}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground truncate">{track.title}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm text-muted-foreground truncate">{track.artist}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">@{track.sharedBy}</span>
        </div>
      </div>

      <SourceBadge url={track.url} showLabel={false} />

      <span className="hidden sm:inline-flex text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
        {track.genre}
      </span>

      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 whitespace-nowrap">
        {formatRelativeTime(track.sharedAt)}
      </span>

      {onDelete && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 cursor-pointer"
          title="Remove track"
        >
          <Trash2 className="h-4 w-4" />
        </div>
      )}

      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </motion.button>
  );
};
