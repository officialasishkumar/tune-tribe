import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, UserCheck, X, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

export type Friend = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFriend: boolean;
};

type FriendsSearchProps = {
  onClose: () => void;
  mode?: "search" | "add-to-group";
  onSelect?: (friend: Friend) => void;
};

export const FriendsSearch = ({ onClose, mode = "search", onSelect }: FriendsSearchProps) => {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["friends", deferredQuery],
    queryFn: () => api.searchUsers(deferredQuery),
  });

  const addFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.addFriend(friendId),
    onSuccess: (friend) => {
      toast.success(`Added @${friend.username} as friend`);
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.removeFriend(friendId),
    onSuccess: (_, friendId) => {
      const friend = users.find((entry) => entry.id === friendId);
      toast.success(friend ? `Removed @${friend.username}` : "Friend removed");
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const toggleFriend = (friend: Friend) => {
    const friendId = friend.id;
    if (friend.isFriend) {
      removeFriendMutation.mutate(friendId);
      return;
    }
    addFriendMutation.mutate(friendId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/20 flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md bg-background rounded-xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "add-to-group" ? "Search friends to add to group..." : "Search by @username..."}
            className="border-0 shadow-none focus-visible:ring-0 text-sm bg-transparent px-0 h-7"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No users found matching "{query}"
            </div>
          ) : (
            <div className="py-1">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {user.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">{user.displayName}</span>
                      <span className="block text-xs font-mono text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>

                  {mode === "add-to-group" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onSelect?.(user)}
                    >
                      <Users className="w-3 h-3" /> Add
                    </Button>
                  ) : (
                    <Button
                      variant={user.isFriend ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => toggleFriend(user)}
                    >
                      {user.isFriend ? (
                        <>
                          <UserCheck className="w-3 h-3" /> Friends
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" /> Add
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
