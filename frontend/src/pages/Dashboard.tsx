import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Disc3,
  Search,
  Plus,
  BarChart3,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  UserPlus,
  Bell,
  ChevronRight,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupCard, type Group } from "@/components/GroupCard";
import { TrackCard } from "@/components/TrackCard";
import { TrackDetailsModal } from "@/components/TrackDetailsModal";
import { AddTrackInput } from "@/components/AddTrackInput";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { FriendsManager } from "@/components/FriendsManager";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/format";
import type { Track } from "@/lib/types";
import { toast } from "sonner";

const Dashboard = () => {
  const [activeGroup, setActiveGroup] = useState<number | null>(() => {
    const stored = localStorage.getItem("tunetribe-active-group");
    return stored ? Number(stored) : null;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [friendsManagerTab, setFriendsManagerTab] = useState<"friends" | "requests" | "search" | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const { isDark, toggle: toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  useEffect(() => {
    if (!groupsQuery.data?.length) {
      setActiveGroup(null);
      return;
    }

    const hasActive = groupsQuery.data.some((group) => group.id === activeGroup);
    if (!activeGroup || !hasActive) {
      setActiveGroup(groupsQuery.data[0].id);
    }
  }, [activeGroup, groupsQuery.data]);

  useEffect(() => {
    if (!activeGroup) return;
    localStorage.setItem("tunetribe-active-group", String(activeGroup));
  }, [activeGroup]);

  useEffect(() => {
    setSelectedTrack(null);
  }, [activeGroup]);

  const tracksQuery = useQuery({
    queryKey: ["group", activeGroup, "tracks"],
    queryFn: () => api.listGroupTracks(activeGroup as number),
    enabled: Boolean(activeGroup),
  });

  const analyticsQuery = useQuery({
    queryKey: ["group", activeGroup, "analytics", "30d"],
    queryFn: () => api.getGroupAnalytics(activeGroup as number, "30d"),
    enabled: Boolean(activeGroup),
  });

  const friendRequestsQuery = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const pendingRequestCount = friendRequestsQuery.data?.length ?? 0;

  const addTrackMutation = useMutation({
    mutationFn: (url: string) => api.addTrack(activeGroup as number, url),
    onSuccess: () => {
      toast.success("Track added to feed");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Track lookup failed.");
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: number[] }) =>
      api.createGroup({ name, memberIds }),
    onSuccess: (group) => {
      toast.success(`Group "${group.name}" created`);
      setActiveGroup(group.id);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Group creation failed.");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number | string) => api.deleteGroup(Number(groupId)),
    onSuccess: (_, deletedGroupId) => {
      toast.success("Group deleted successfully");
      setGroupToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (activeGroup === Number(deletedGroupId)) {
        setActiveGroup(null);
        localStorage.removeItem("tunetribe-active-group");
      }
    },
    onError: () => {
      toast.error("Failed to delete group");
      setGroupToDelete(null);
    }
  });

  const filteredGroups: Group[] = useMemo(
    () =>
      (groupsQuery.data ?? [])
        .filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.memberCount,
          trackCount: group.trackCount,
          lastActive: formatRelativeTime(group.lastActiveAt),
          members: group.members,
          isOwner: group.isOwner,
        })),
    [groupsQuery.data, searchQuery]
  );

  const activeGroupSummary = groupsQuery.data?.find((group) => group.id === activeGroup) ?? null;
  const tracks = (tracksQuery.data ?? []).map(
    (track): Track => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album ?? undefined,
      genre: track.genre,
      url: track.url,
      source: track.source,
      sharedBy: track.sharedBy,
      albumArtUrl: track.albumArtUrl ?? undefined,
      durationMs: track.durationMs ?? undefined,
      sharedAt: track.sharedAt,
    })
  );
  const chartData = analyticsQuery.data;
  const weeklyTotal = chartData?.weeklyActivity.reduce((sum, entry) => sum + entry.tracks, 0) ?? 0;
  const topGenre = chartData?.genreDistribution[0]?.name ?? "N/A";
  const topSource = chartData?.sourceLoyalty[0]?.name ?? "N/A";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <Disc3 className="w-6 h-6 text-primary" />
            <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">TuneTribe</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative" onClick={() => setFriendsManagerTab("requests")}>
              <Bell className="w-5 h-5" />
              {pendingRequestCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {pendingRequestCount}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setFriendsManagerTab("friends")}>
              <Users className="w-4.5 h-4.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setFriendsManagerTab("search")}>
              <UserPlus className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => navigate(activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics")}
            >
              <BarChart3 className="w-4.5 h-4.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate("/profile")}>
              <UserCircle className="w-4.5 h-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => {
                logout();
                navigate("/auth");
              }}
            >
              <LogOut className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex md:w-64 lg:w-72 flex-col h-[calc(100vh-56px)] sticky top-14">
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm border-0 bg-secondary shadow-none"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full h-9 text-sm gap-1.5" onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-3 py-2 block">
              Your Tribes ({filteredGroups.length})
            </span>
            {filteredGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                isActive={activeGroup === group.id}
                onClick={() => setActiveGroup(Number(group.id))}
                onDelete={() => setGroupToDelete(group)}
                index={index}
              />
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {activeGroupSummary?.name ?? "Create your first tribe"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeGroupSummary
                    ? `${activeGroupSummary.memberCount} members · ${activeGroupSummary.trackCount} tracks`
                    : "Start by creating a group or invite friends to an existing one."}
                </p>
              </div>
              {activeGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1 text-muted-foreground"
                  onClick={() => navigate(`/analytics?groupId=${activeGroup}`)}
                >
                  Analytics <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {activeGroup ? (
              <AddTrackInput onSubmit={(url) => addTrackMutation.mutateAsync(url).then(() => undefined)} />
            ) : (
              <div className="p-4 rounded-lg bg-card shadow-card text-base text-muted-foreground">
                Create a group before adding tracks.
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Recent Activity
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {weeklyTotal} tracks this week
                </span>
              </div>

              {tracks.length === 0 ? (
                <div className="px-3 py-8 rounded-lg bg-card shadow-card text-base text-muted-foreground">
                  No tracks have been shared in this group yet.
                </div>
              ) : (
                tracks.map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={index}
                    onClick={() => setSelectedTrack(track)}
                  />
                ))
              )}
            </div>
          </div>
        </main>

        <aside className="hidden lg:block w-80 xl:w-96 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto border-l bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-secondary/20">
          <div className="p-6 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Quick Stats</h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="This week" value={String(weeklyTotal)} />
                <StatCard label="Members" value={String(activeGroupSummary?.memberCount ?? 0)} />
                <StatCard label="Top genre" value={topGenre} />
                <StatCard label="Top source" value={topSource} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Active Times</h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="p-5 rounded-xl bg-card border shadow-sm">
                <WeeklyActivity data={chartData?.weeklyActivity ?? []} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Genre Mix</h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="p-5 rounded-xl bg-card border shadow-sm">
                <GenreDistribution data={chartData?.genreDistribution ?? []} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Source Loyalty</h2>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="p-5 rounded-xl bg-card border shadow-sm">
                <SourceLoyalty data={chartData?.sourceLoyalty ?? []} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-30">
        <div className="flex items-center justify-around h-14">
          {[
            { icon: Disc3, label: "Feed", active: true },
            { icon: Search, label: "Search", active: false, onClick: () => setFriendsManagerTab("search") },
            { icon: Plus, label: "Add", active: false, onClick: () => setShowCreateGroup(true) },
            {
              icon: BarChart3,
              label: "Analytics",
              active: false,
              onClick: () => navigate(activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics"),
            },
            { icon: UserCircle, label: "Profile", active: false, onClick: () => navigate("/profile") },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                tab.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {friendsManagerTab && (
          <FriendsManager
            initialTab={friendsManagerTab}
            onClose={() => setFriendsManagerTab(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(name, memberIds) => createGroupMutation.mutateAsync({ name, memberIds }).then(() => undefined)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedTrack && <TrackDetailsModal track={selectedTrack} onClose={() => setSelectedTrack(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setGroupToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-background rounded-xl p-6 shadow-elevated"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Delete Group</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">{groupToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setGroupToDelete(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteGroupMutation.mutate(groupToDelete.id)}
                  disabled={deleteGroupMutation.isPending}
                >
                  {deleteGroupMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
