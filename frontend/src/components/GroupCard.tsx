import { Users, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export type Group = {
  id: string | number;
  name: string;
  memberCount: number;
  trackCount: number;
  lastActive: string;
  members: string[];
  isOwner?: boolean;
};

type GroupCardProps = {
  group: Group;
  onClick?: () => void;
  onDelete?: () => void;
  isActive?: boolean;
  index?: number;
};

export const GroupCard = ({ group, onClick, onDelete, isActive = false, index = 0 }: GroupCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: [0.2, 0, 0, 1] }}
      onClick={onClick}
      className={`relative group w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-primary/10 to-primary/5 shadow-surface"
          : "hover:bg-secondary/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-base font-medium truncate pr-6 ${isActive ? "text-primary" : "text-foreground"}`}>
          {group.name}
        </span>
        <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
          {group.trackCount}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{group.memberCount} members</span>
        <span className="text-sm text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground truncate">{group.lastActive}</span>
      </div>
      
      {group.isOwner && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.button>
  );
};
