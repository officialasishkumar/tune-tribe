import { motion } from "framer-motion";

import { formatRelativeTime } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

type RecentActivityFeedProps = {
  events: ActivityEvent[];
  emptyMessage?: string;
};

const formatEventType = (value: string) =>
  value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const RecentActivityFeed = ({ events, emptyMessage = "No activity yet." }: RecentActivityFeedProps) => {
  if (events.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.04, ease: [0.2, 0, 0, 1] }}
          className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{event.title}</span>
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {formatRelativeTime(event.occurredAt)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {formatEventType(event.eventType)}
            </span>
          </div>
          {event.detail ? (
            <div className="mt-2 text-xs text-muted-foreground">
              {event.detail}
            </div>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
};
