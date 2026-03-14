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
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupCard, type Group } from "@/components/GroupCard";
import { TrackCard } from "@/components/TrackCard";
import { TrackDetailsModal } from "@/components/TrackDetailsModal";
import { AddTrackInput } from "@/components/AddTrackInput";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { FriendsSearch } from "@/components/FriendsSearch";
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
  const [showFriendsSearch, setShowFriendsSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
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
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">TuneTribe</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowFriendsSearch(true)}>
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate(activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics")}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/profile")}>
              <UserCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                logout();
                navigate("/auth");
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border/50 h-[calc(100vh-48px)] sticky top-12">
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-0 bg-secondary shadow-none"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => setShowCreateGroup(true)}>
              <Plus className="w-3.5 h-3.5" />
              Create Group
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-3 py-2 block">
              Your Tribes ({filteredGroups.length})
            </span>
            {filteredGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                isActive={activeGroup === group.id}
                onClick={() => setActiveGroup(Number(group.id))}
                index={index}
              />
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  {activeGroupSummary?.name ?? "Create your first tribe"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeGroupSummary
                    ? `${activeGroupSummary.memberCount} members · ${activeGroupSummary.trackCount} tracks`
                    : "Start by creating a group or invite friends to an existing one."}
                </p>
              </div>
              {activeGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-muted-foreground"
                  onClick={() => navigate(`/analytics?groupId=${activeGroup}`)}
                >
                  Analytics <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </div>

            {activeGroup ? (
              <AddTrackInput onSubmit={(url) => addTrackMutation.mutateAsync(url).then(() => undefined)} />
            ) : (
              <div className="p-4 rounded-lg bg-card shadow-card text-sm text-muted-foreground">
                Create a group before adding tracks.
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Recent Activity
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {weeklyTotal} tracks this week
                </span>
              </div>

              {tracks.length === 0 ? (
                <div className="px-3 py-8 rounded-lg bg-card shadow-card text-sm text-muted-foreground">
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

        <aside className="hidden lg:block w-72 xl:w-80 border-l border-border/50 h-[calc(100vh-48px)] sticky top-12 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="This week" value={String(weeklyTotal)} />
              <StatCard label="Members" value={String(activeGroupSummary?.memberCount ?? 0)} />
              <StatCard label="Top genre" value={topGenre} />
              <StatCard label="Top source" value={topSource} />
            </div>
            <GenreDistribution data={chartData?.genreDistribution ?? []} />
            <SourceLoyalty data={chartData?.sourceLoyalty ?? []} />
            <WeeklyActivity data={chartData?.weeklyActivity ?? []} />
          </div>
        </aside>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 z-30">
        <div className="flex items-center justify-around h-14">
          {[
            { icon: Disc3, label: "Feed", active: true },
            { icon: Search, label: "Search", active: false, onClick: () => setShowFriendsSearch(true) },
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
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {showFriendsSearch && <FriendsSearch onClose={() => setShowFriendsSearch(false)} />}
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
    </div>
  );
};

export default Dashboard;
