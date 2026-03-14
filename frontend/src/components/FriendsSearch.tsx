import { useDeferredValue, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, UserCheck, X, Users, Clock, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Friend } from "@/lib/types";

type FriendsSearchProps = {
  onClose: () => void;
  mode?: "search" | "add-to-group";
  onSelect?: (friend: Friend) => void;
};

export const FriendsSearch = ({ onClose, mode = "search", onSelect }: FriendsSearchProps) => {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data: users = [] } = useQuery({
    queryKey: ["friends", deferredQuery],
    queryFn: () => api.searchUsers(deferredQuery),
  });

  const addFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.addFriend(friendId),
    onSuccess: (friend) => {
      if (friend.friendshipStatus === "accepted") {
        toast.success(`You and @${friend.username} are now friends!`);
      } else {
        toast.success(`Friend request sent to @${friend.username}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.removeFriend(friendId),
    onSuccess: (_, friendId) => {
      const friend = users.find((entry) => entry.id === friendId);
      toast.success(friend ? `Removed @${friend.username}` : "Friend removed");
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const handleAction = (friend: Friend) => {
    const status = friend.friendshipStatus;
    if (status === "accepted") {
      removeFriendMutation.mutate(friend.id);
    } else if (status === "pending_incoming") {
      addFriendMutation.mutate(friend.id);
    } else if (status === "none") {
      addFriendMutation.mutate(friend.id);
    }
  };

  const renderActionButton = (user: Friend) => {
    if (mode === "add-to-group") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm gap-1.5"
          onClick={() => onSelect?.(user)}
        >
          <Users className="w-3.5 h-3.5" /> Add
        </Button>
      );
    }

    const status = user.friendshipStatus;

    if (status === "accepted") {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-sm gap-1.5"
          onClick={() => handleAction(user)}
        >
          <UserCheck className="w-3.5 h-3.5" /> Friends
        </Button>
      );
    }

    if (status === "pending_outgoing") {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-sm gap-1.5 opacity-70 cursor-default"
          disabled
        >
          <Clock className="w-3.5 h-3.5" /> Pending
        </Button>
      );
    }

    if (status === "pending_incoming") {
      return (
        <Button
          variant="default"
          size="sm"
          className="h-8 text-sm gap-1.5"
          onClick={() => handleAction(user)}
        >
          <Check className="w-3.5 h-3.5" /> Accept
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-sm gap-1.5"
        onClick={() => handleAction(user)}
      >
        <UserPlus className="w-3.5 h-3.5" /> Add
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md bg-background rounded-2xl shadow-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "add-to-group" ? "Search friends to add to group..." : "Search by @username..."}
            className="border-0 shadow-none focus-visible:ring-0 text-base bg-transparent px-0 h-9"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {users.length === 0 ? (
            <div className="px-4 py-8 text-center text-base text-muted-foreground">
              {query ? `No users found matching "${query}"` : "Type to search for users..."}
            </div>
          ) : (
            <div className="py-1">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-base font-medium text-foreground">{user.displayName}</span>
                      <span className="block text-sm font-mono text-muted-foreground">@{user.username}</span>
                    </div>
                  </div>

                  {renderActionButton(user)}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
