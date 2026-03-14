import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Bell, Search, X, Check, UserPlus, Clock, UserX, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";
import type { Friend } from "./FriendsSearch";

type FriendsManagerProps = {
  onClose: () => void;
  initialTab?: "friends" | "requests" | "search";
};

export const FriendsManager = ({ onClose, initialTab = "friends" }: FriendsManagerProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data: friends = [] } = useQuery({
    queryKey: ["friendsList"],
    queryFn: api.listFriends,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["friends", searchQuery],
    queryFn: () => api.searchUsers(searchQuery),
    enabled: activeTab === "search",
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
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
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => api.acceptFriendRequest(requestId),
    onSuccess: (friend) => {
      toast.success(`You and @${friend.username} are now friends!`);
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectFriendRequest(requestId),
    onSuccess: () => {
      toast.success("Friend request declined");
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: number) => api.removeFriend(friendId),
    onSuccess: (_, friendId) => {
      const friend = friends.find((entry) => entry.id === friendId) || searchResults.find(entry => entry.id === friendId);
      toast.success(friend ? `Successfully removed @${friend.username} from friends` : "Friend removed successfully");
      setFriendToRemove(null);
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
      void queryClient.invalidateQueries({ queryKey: ["friends"] });
      void queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] }); // Invalidate groups because they might be removed from shared groups
    },
    onError: () => {
      toast.error("Failed to remove friend");
      setFriendToRemove(null);
    }
  });

  const tabs = [
    { id: "friends", label: "My Friends", icon: Users },
    { id: "requests", label: "Requests", icon: Bell, badge: requests.length },
    { id: "search", label: "Find Users", icon: Search },
  ];

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
        {friendToRemove ? (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold tracking-tight">Remove Friend?</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to remove <span className="font-semibold text-foreground">@{friendToRemove.username}</span> from your friends? They will also be removed from any groups you share.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFriendToRemove(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => removeFriendMutation.mutate(friendToRemove.id)}
                disabled={removeFriendMutation.isPending}
              >
                {removeFriendMutation.isPending ? "Removing..." : "Remove Friend"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
              <div className="flex gap-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as "friends" | "requests" | "search")}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors relative pb-3 -mb-3 ${
                      activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.badge ? (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {tab.badge}
                      </span>
                    ) : null}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mb-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "friends" && (
                    friends.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-base text-muted-foreground">You don't have any friends yet</p>
                        <Button variant="link" onClick={() => setActiveTab("search")} className="mt-2 text-primary">
                          Find friends
                        </Button>
                      </div>
                    ) : (
                      <div className="py-1">
                        {friends.map((friend) => (
                          <div key={friend.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{friend.displayName.charAt(0)}</span>
                              </div>
                              <div>
                                <span className="text-base font-medium text-foreground">{friend.displayName}</span>
                                <span className="block text-sm text-muted-foreground">@{friend.username}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-sm text-muted-foreground hover:text-destructive gap-1.5"
                              onClick={() => setFriendToRemove(friend)}
                            >
                              <UserX className="w-4 h-4" /> Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === "requests" && (
                    requests.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-base text-muted-foreground">No pending requests</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">When someone sends you a request, it will appear here.</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {requests.map((req) => (
                          <div key={req.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{req.fromUser.displayName.charAt(0)}</span>
                              </div>
                              <div>
                                <span className="text-base font-medium text-foreground">{req.fromUser.displayName}</span>
                                <span className="block text-sm text-muted-foreground">@{req.fromUser.username} · {formatRelativeTime(req.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-sm gap-1"
                                onClick={() => acceptMutation.mutate(req.id)}
                                disabled={acceptMutation.isPending}
                              >
                                <Check className="w-3.5 h-3.5" /> Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => rejectMutation.mutate(req.id)}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {activeTab === "search" && (
                    <div>
                      <div className="p-3 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by @username..."
                            className="pl-9 bg-secondary/30 border-secondary focus-visible:ring-1"
                          />
                        </div>
                      </div>
                      <div className="py-1">
                        {searchResults.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {searchQuery ? "No users found" : "Type to search..."}
                          </div>
                        ) : (
                          searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">{user.displayName.charAt(0)}</span>
                                </div>
                                <div>
                                  <span className="text-base font-medium text-foreground">{user.displayName}</span>
                                  <span className="block text-sm font-mono text-muted-foreground">@{user.username}</span>
                                </div>
                              </div>
                              {user.friendshipStatus === "accepted" ? (
                                <Button variant="secondary" size="sm" className="h-8 text-sm gap-1.5" disabled>
                                  <Check className="w-3.5 h-3.5" /> Friends
                                </Button>
                              ) : user.friendshipStatus === "pending_outgoing" ? (
                                <Button variant="secondary" size="sm" className="h-8 text-sm gap-1.5 opacity-70" disabled>
                                  <Clock className="w-3.5 h-3.5" /> Pending
                                </Button>
                              ) : user.friendshipStatus === "pending_incoming" ? (
                                <Button variant="default" size="sm" className="h-8 text-sm gap-1.5" onClick={() => acceptMutation.mutate(requests.find(r => r.fromUser.id === user.id)?.id || 0)}>
                                  <Check className="w-3.5 h-3.5" /> Accept
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5" onClick={() => addFriendMutation.mutate(user.id)}>
                                  <UserPlus className="w-3.5 h-3.5" /> Add
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};
