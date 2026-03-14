import { motion } from "framer-motion";
import { CalendarDays, Clock3, Disc3, ExternalLink, UserRound, X } from "lucide-react";

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
  const metadata = [
    { label: "Added by", value: `@${track.sharedBy}`, icon: UserRound },
    { label: "Added", value: formatAbsoluteDate(track.sharedAt), icon: CalendarDays },
    { label: "Relative time", value: formatRelativeTime(track.sharedAt), icon: Clock3 },
  ];

  const optionalMetadata = [
    { label: "Album", value: track.album },
    { label: "Genre", value: track.genre },
    { label: "Duration", value: formatDuration(track.durationMs) },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-background shadow-elevated"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-secondary/60 px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
            aria-label="Close track details"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="h-24 w-24 overflow-hidden rounded-2xl bg-secondary shadow-card">
              {track.albumArtUrl ? (
                <img src={track.albumArtUrl} alt={track.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                  <Disc3 className="h-10 w-10 text-primary" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge url={track.url} size="md" />
                <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  {track.source}
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{track.title}</h2>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">{track.artist}</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Track metadata from the share feed, with a direct link back to the original platform when you want to
                listen.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:p-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Track details</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {metadata.map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/60 p-3">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
                {optionalMetadata.map((item) => (
                  <div key={item.label} className="rounded-xl bg-secondary/60 p-3">
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </span>
                    <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Open track</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Launch the original share in a new browser tab to play it on the source platform.
              </p>
              <div className="mt-4 rounded-xl bg-secondary/60 p-3">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">URL</span>
                <p className="mt-2 break-all text-sm text-foreground">{track.url}</p>
              </div>
              <Button asChild className="mt-4 w-full">
                <a href={track.url} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
