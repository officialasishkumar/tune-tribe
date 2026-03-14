import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Disc3,
  ExternalLink,
  UserRound,
  X,
  Copy,
  Check,
} from "lucide-react";

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
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(track.url);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/40 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/20 p-2 text-white/80 backdrop-blur-md transition-all hover:bg-black/40 hover:text-white"
          aria-label="Close track details"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background px-6 pb-6 pt-10 sm:px-8 sm:pt-12">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
            <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-md shadow-xl sm:w-40">
              {track.albumArtUrl ? (
                <img
                  src={track.albumArtUrl}
                  alt={track.title}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary">
                  <Disc3 className="h-12 w-12 text-primary/50" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col sm:pb-2">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <SourceBadge url={track.url} size="md" />
              </div>
              <h2 className="line-clamp-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {track.title}
              </h2>
              <p className="mt-1.5 text-base font-medium text-muted-foreground sm:text-lg">
                {track.artist}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:px-8">
          <Button asChild className="flex-1 rounded-xl shadow-sm" size="lg">
            <a href={track.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Listen on {track.source}
            </a>
          </Button>
          <Button
            variant="secondary"
            className="flex-1 rounded-xl sm:flex-none sm:px-8"
            size="lg"
            onClick={handleCopy}
          >
            {hasCopied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
        </div>

        {/* Metadata Grid */}
        <div className="border-t border-border/40 bg-muted/30 px-6 py-6 sm:px-8">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
            {metadata.map((item) => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
            {optionalMetadata.map((item) => (
              <div key={item.label} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {item.label}
                </span>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
