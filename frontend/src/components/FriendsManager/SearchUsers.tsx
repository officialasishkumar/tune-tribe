import { Search, UserPlus, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Friend, FriendRequest } from "@/lib/types";

type SearchUsersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Friend[];
  requests: FriendRequest[];
  onAddFriend: (id: number) => void;
  onAccept: (id: number) => void;
};

export const SearchUsers = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  requests,
  onAddFriend,
  onAccept,
}: SearchUsersProps) => {
  return (
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
                <Button variant="default" size="sm" className="h-8 text-sm gap-1.5" onClick={() => onAccept(requests.find(r => r.fromUser.id === user.id)?.id || 0)}>
                  <Check className="w-3.5 h-3.5" /> Accept
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5" onClick={() => onAddFriend(user.id)}>
                  <UserPlus className="w-3.5 h-3.5" /> Add
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
