import { Users } from "lucide-react";
import { motion } from "framer-motion";

export type Group = {
  id: string | number;
  name: string;
  memberCount: number;
  trackCount: number;
  lastActive: string;
  members: string[];
};

type GroupCardProps = {
  group: Group;
  onClick?: () => void;
  isActive?: boolean;
  index?: number;
};

export const GroupCard = ({ group, onClick, isActive = false, index = 0 }: GroupCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-primary/10 to-primary/5 shadow-surface"
          : "hover:bg-secondary/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-base font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
          {group.name}
        </span>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {group.trackCount}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{group.memberCount} members</span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">{group.lastActive}</span>
      </div>
    </motion.button>
  );
};
