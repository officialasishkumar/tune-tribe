import { motion } from "framer-motion";
import { CalendarDays, Clock3, Disc3, ExternalLink, Music, Tag, Timer, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/SourceBadge";
import type { Track } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";

type TrackDetailsModalProps = {
  track: Track;
  onClose: () => void;
};

const formatAbsoluteDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatDuration = (durationMs?: number | null) => {
  if (!durationMs) {
    return null;
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const TrackDetailsModal = ({ track, onClose }: TrackDetailsModalProps) => {
  const duration = formatDuration(track.durationMs);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-elevated"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Hero section with album art and gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-secondary/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
            aria-label="Close track details"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-5 p-6">
            <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-elevated">
              {track.albumArtUrl ? (
                <img src={track.albumArtUrl} alt={track.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 to-secondary">
                  <Disc3 className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge url={track.url} size="md" />
                <span className="rounded-full bg-background/80 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  {track.source}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{track.title}</h2>
              <p className="mt-1 text-lg text-muted-foreground">{track.artist}</p>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <UserRound className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Added by</p>
                <p className="text-sm font-medium text-foreground truncate">@{track.sharedBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <Clock3 className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">When</p>
                <p className="text-sm font-medium text-foreground">{formatRelativeTime(track.sharedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{formatAbsoluteDate(track.sharedAt)}</p>
              </div>
            </div>
            {track.album && (
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <Music className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Album</p>
                  <p className="text-sm font-medium text-foreground truncate">{track.album}</p>
                </div>
              </div>
            )}
            {track.genre && (
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <Tag className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Genre</p>
                  <p className="text-sm font-medium text-foreground">{track.genre}</p>
                </div>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <Timer className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium text-foreground">{duration}</p>
                </div>
              </div>
            )}
          </div>

          {/* Open track button */}
          <Button asChild className="w-full h-11 text-base font-medium gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            <a href={track.url} target="_blank" rel="noopener noreferrer">
              Open on {track.source}
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
