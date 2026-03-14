import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FriendsSearch, type Friend } from "./FriendsSearch";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

type CreateGroupModalProps = {
  onClose: () => void;
  onCreate: (name: string, members: string[]) => void;
};

export const CreateGroupModal = ({ onClose, onCreate }: CreateGroupModalProps) => {
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Friend[]>([]);
  const [showFriendSearch, setShowFriendSearch] = useState(false);

  const handleAddMember = (friend: Friend) => {
    if (members.find((m) => m.id === friend.id)) {
      toast.error(`@${friend.username} is already added`);
      return;
    }
    setMembers((prev) => [...prev, friend]);
    toast.success(`Added @${friend.username}`);
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    onCreate(name, members.map((m) => m.username));
    toast.success(`"${name}" created with ${members.length} members`);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-foreground/20 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-sm bg-background rounded-xl shadow-elevated overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold tracking-tight">Create Group</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Group name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Late Night Jams"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-muted-foreground">Members</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => setShowFriendSearch(true)}
                >
                  <Plus className="w-3 h-3" /> Add friends
                </Button>
              </div>

              {members.length === 0 ? (
                <div className="text-xs text-muted-foreground py-3 text-center bg-secondary/50 rounded-lg">
                  No members yet. Add friends to this group.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-md"
                    >
                      @{m.username}
                      <button onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleCreate} className="w-full h-9 text-sm gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Create Group
            </Button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showFriendSearch && (
          <FriendsSearch
            mode="add-to-group"
            onClose={() => setShowFriendSearch(false)}
            onSelect={(friend) => {
              handleAddMember(friend);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
