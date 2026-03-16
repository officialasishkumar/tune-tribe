import type { FormEvent } from "react";
import { Search, UserPlus, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Friend, FriendRequest } from "@/lib/types";

type SearchUsersProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResult: Friend | null;
  hasSearched: boolean;
  isSearching: boolean;
  searchError: string | null;
  requests: FriendRequest[];
  onSearch: () => void;
  onAddFriend: (id: number) => void;
  onAccept: (id: number) => void;
};

export const SearchUsers = ({
  searchQuery,
  setSearchQuery,
  searchResult,
  hasSearched,
  isSearching,
  searchError,
  requests,
  onSearch,
  onAddFriend,
  onAccept,
}: SearchUsersProps) => {
  const normalizedQuery = searchQuery.trim().replace(/^@/, "");
  const matchingRequest = searchResult
    ? requests.find((request) => request.fromUser.id === searchResult.id)
    : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedQuery.length < 3 || isSearching) {
      return;
    }
    onSearch();
  };

  const renderEmptyState = () => {
    if (isSearching) {
      return "Looking up username...";
    }
    if (searchError) {
      return searchError;
    }
    if (hasSearched) {
      return `No account found for @${normalizedQuery}`;
    }
    return "Enter the full @username, then press Search.";
  };

  return (
    <div>
      <form className="p-3 border-b" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter full @username"
              className="pl-9 bg-secondary/30 border-secondary focus-visible:ring-1"
            />
          </div>
          <Button type="submit" size="sm" disabled={normalizedQuery.length < 3 || isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>
      <div className="py-1">
        {!searchResult ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {renderEmptyState()}
          </div>
        ) : (
          <div
            key={searchResult.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{searchResult.displayName.charAt(0)}</span>
              </div>
              <div>
                <span className="text-base font-medium text-foreground">{searchResult.displayName}</span>
                <span className="block text-sm font-mono text-muted-foreground">@{searchResult.username}</span>
              </div>
            </div>
            {searchResult.friendshipStatus === "accepted" ? (
              <Button variant="secondary" size="sm" className="h-8 text-sm gap-1.5" disabled>
                <Check className="w-3.5 h-3.5" /> Friends
              </Button>
            ) : searchResult.friendshipStatus === "pending_outgoing" ? (
              <Button variant="secondary" size="sm" className="h-8 text-sm gap-1.5 opacity-70" disabled>
                <Clock className="w-3.5 h-3.5" /> Pending
              </Button>
            ) : searchResult.friendshipStatus === "pending_incoming" ? (
              <Button
                variant="default"
                size="sm"
                className="h-8 text-sm gap-1.5"
                onClick={() => matchingRequest && onAccept(matchingRequest.id)}
                disabled={!matchingRequest}
              >
                <Check className="w-3.5 h-3.5" /> Accept
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm gap-1.5"
                onClick={() => onAddFriend(searchResult.id)}
              >
                <UserPlus className="w-3.5 h-3.5" /> Add
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
