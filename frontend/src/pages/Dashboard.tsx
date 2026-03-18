import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, ChevronRight, Users, Filter, Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Group } from "@/components/GroupCard";
import { TrackCard } from "@/components/TrackCard";
import { TrackDetailsModal } from "@/components/TrackDetailsModal";
import { AddTrackInput } from "@/components/AddTrackInput";
import { ManageGroupMembersModal } from "@/components/ManageGroupMembersModal";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import type { Track } from "@/lib/types";
import { toast } from "sonner";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { DashboardSidebar } from "./Dashboard/DashboardSidebar";
import { DashboardAnalytics } from "./Dashboard/DashboardAnalytics";

const Dashboard = () => {
  const { user } = useAuth();
  const { activeGroup, setActiveGroup, setShowCreateGroup } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameValue, setEditGroupNameValue] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Re-sync permission when the tab regains focus (user may have changed
  // browser settings while the app was in the background).
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const syncPermission = () => setNotifPermission(Notification.permission);
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, []);

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
  }, [activeGroup, groupsQuery.data, setActiveGroup]);

  useEffect(() => {
    setSelectedTrack(null);
  }, [activeGroup]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && groupToDelete) setGroupToDelete(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [groupToDelete]);

  const tracksQuery = useQuery({
    queryKey: ["group", activeGroup, "tracks"],
    queryFn: () => api.listGroupTracks(activeGroup as number),
    enabled: Boolean(activeGroup),
    // Poll every 30 seconds so members see tracks added by others without a manual refresh.
    refetchInterval: 30_000,
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

  const deleteTrackMutation = useMutation({
    mutationFn: (trackId: number) => api.removeGroupTrack(activeGroup as number, trackId),
    onSuccess: () => {
      toast.success("Track removed from group");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove track");
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: number; name: string }) => api.updateGroup(groupId, name),
    onSuccess: () => {
      toast.success("Group name updated");
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      setIsEditingGroupName(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update group name");
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
          memberDetails: group.memberDetails,
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

  const filteredTracks = useMemo(() => {
    if (!filterText.trim()) return tracks;
    const lower = filterText.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.sharedBy.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower) ||
        t.source.toLowerCase().includes(lower)
    );
  }, [tracks, filterText]);

  // Fire browser notifications for new tracks posted by other members.
  useGroupNotifications(tracks, activeGroupSummary?.name ?? null, activeGroup);

  const handleRequestNotifPermission = () => {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then((perm) => {
      setNotifPermission(perm);
      if (perm === "granted") {
        toast.success("Browser notifications enabled");
      }
    });
  };
  const chartData = analyticsQuery.data;
  const weeklyTotal = chartData?.weeklyActivity.reduce((sum, entry) => sum + entry.tracks, 0) ?? 0;
  const topGenre = chartData?.genreDistribution[0]?.name ?? "N/A";
  const topSource = chartData?.sourceLoyalty[0]?.name ?? "N/A";

  return (
    <div className="flex flex-1 w-full">
      <DashboardSidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowCreateGroup={setShowCreateGroup}
        filteredGroups={filteredGroups}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        setGroupToDelete={setGroupToDelete}
      />

      <main className="flex-1 min-w-0 pb-14 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isEditingGroupName && activeGroupSummary ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editGroupNameValue}
                      onChange={(e) => setEditGroupNameValue(e.target.value)}
                      className="h-8 text-xl font-semibold px-2 w-48"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editGroupNameValue.trim().length >= 2) {
                          updateGroupMutation.mutate({ groupId: activeGroupSummary.id, name: editGroupNameValue.trim() });
                        } else if (e.key === 'Escape') {
                          setIsEditingGroupName(false);
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      onClick={() => updateGroupMutation.mutate({ groupId: activeGroupSummary.id, name: editGroupNameValue.trim() })}
                      disabled={editGroupNameValue.trim().length < 2 || updateGroupMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setIsEditingGroupName(false)}
                      disabled={updateGroupMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold tracking-tight">
                      {activeGroupSummary?.name ?? "Create your first tribe"}
                    </h1>
                    {activeGroupSummary?.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground opacity-50 hover:opacity-100"
                        onClick={() => {
                          setEditGroupNameValue(activeGroupSummary.name);
                          setIsEditingGroupName(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeGroupSummary
                  ? `${activeGroupSummary.memberCount} members · ${activeGroupSummary.trackCount} tracks`
                  : "Start by creating a group or invite friends to an existing one."}
              </p>
            </div>
            {activeGroup && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1 text-muted-foreground"
                  onClick={() => setShowManageMembers(true)}
                >
                  <Users className="w-3.5 h-3.5" /> Members
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1 text-muted-foreground"
                  onClick={() => navigate(`/analytics?groupId=${activeGroup}`)}
                >
                  Analytics <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
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
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 hover:bg-transparent ${showFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => {
                    setShowFilter(!showFilter);
                    if (showFilter) setFilterText("");
                  }}
                  title="Filter tracks"
                >
                  <Filter className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  {weeklyTotal} tracks this week
                </span>
              </div>
            </div>

            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pb-3 pt-1 overflow-hidden"
                >
                  <Input
                    placeholder="Filter by song, artist, @username, genre, or platform..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="h-8 text-sm bg-secondary/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {filteredTracks.length === 0 ? (
              <div className="px-3 py-8 rounded-lg bg-card shadow-card text-base text-muted-foreground">
                {tracks.length === 0 ? "No tracks have been shared in this group yet." : "No tracks match your filter."}
              </div>
            ) : (
              filteredTracks.map((track, index) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  index={index}
                  onClick={() => setSelectedTrack(track)}
                  onDelete={(activeGroupSummary?.isOwner || user?.username === track.sharedBy) ? () => {
                    if (window.confirm(`Are you sure you want to remove '${track.title}'?`)) {
                      deleteTrackMutation.mutate(Number(track.id));
                    }
                  } : undefined}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <DashboardAnalytics
        weeklyTotal={weeklyTotal}
        memberCount={activeGroupSummary?.memberCount ?? 0}
        topGenre={topGenre}
        topSource={topSource}
        chartData={chartData}
      />

      <AnimatePresence>
        {selectedTrack && <TrackDetailsModal track={selectedTrack} onClose={() => setSelectedTrack(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showManageMembers && activeGroupSummary && (
          <ManageGroupMembersModal
            group={filteredGroups.find(g => g.id === activeGroup) || { ...activeGroupSummary, id: activeGroupSummary.id, lastActive: "", memberDetails: activeGroupSummary.memberDetails }}
            onClose={() => setShowManageMembers(false)}
          />
        )}
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
