import { SourceBadge } from "./SourceBadge";
import { motion } from "framer-motion";

export type Track = {
  id: string | number;
  title: string;
  artist: string;
  url: string;
  sharedBy: string;
  genre: string;
  timestamp: string;
  albumArt?: string;
  source?: string;
};

type TrackCardProps = {
  track: Track;
  index?: number;
};

export const TrackCard = ({ track, index = 0 }: TrackCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.2, 0, 0, 1] }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors duration-200 cursor-pointer"
    >
      {/* Album art or placeholder */}
      <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground">{track.title[0]}</span>
          </div>
        )}
      </div>

      {/* Track info */}
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

      {/* Source badge */}
      <SourceBadge url={track.url} />

      {/* Genre tag */}
      <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
        {track.genre}
      </span>

      {/* Timestamp */}
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
        {track.timestamp}
      </span>
    </motion.div>
  );
};
