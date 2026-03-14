import type { MemberLeaderboardEntry, TopTrackEntry } from "@/lib/types";
import { motion } from "framer-motion";

export const TopContributors = ({ data }: { data: MemberLeaderboardEntry[] }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Top Contributors</h2>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-card border shadow-sm overflow-hidden"
      >
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No contributors yet.</div>
        ) : (
          <div className="space-y-4">
            {data.map((member, index) => (
              <div key={member.name} className="flex items-center gap-4 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/80 text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground block">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.topGenre} Lover</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-foreground block">{member.tracks}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Tracks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const MostPopularTracks = ({ data }: { data: TopTrackEntry[] }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Most Popular Tracks</h2>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="p-6 rounded-2xl bg-card border shadow-sm overflow-hidden"
      >
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">No tracks shared yet.</div>
        ) : (
          <div className="space-y-4">
            {data.map((track, index) => (
              <div key={`${track.title}-${track.artist}`} className="flex items-center gap-4 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/80 text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground block truncate">{track.title}</span>
                  <span className="text-xs text-muted-foreground truncate block">{track.artist}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-bold text-foreground block">{track.shares}×</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{track.genre}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
