import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Disc3, Search, Plus, BarChart3, LogOut, Moon, Sun, UserCircle, UserPlus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GroupCard, type Group } from "@/components/GroupCard";
import { TrackCard, type Track } from "@/components/TrackCard";
import { AddTrackInput } from "@/components/AddTrackInput";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { FriendsSearch } from "@/components/FriendsSearch";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";

const mockGroups: Group[] = [
  { id: "1", name: "The Heavy Rotation", memberCount: 6, trackCount: 142, lastActive: "2m ago", members: ["alex", "maya", "joe", "kim", "sam", "lee"] },
  { id: "2", name: "Late Night Jams", memberCount: 4, trackCount: 89, lastActive: "1h ago", members: ["alex", "nina", "chris", "pat"] },
  { id: "3", name: "Workout Fuel", memberCount: 8, trackCount: 234, lastActive: "5m ago", members: ["alex", "maya", "joe", "kim", "sam", "lee", "nina", "chris"] },
  { id: "4", name: "Jazz Explorers", memberCount: 3, trackCount: 67, lastActive: "3h ago", members: ["alex", "joe", "pat"] },
  { id: "5", name: "New Releases", memberCount: 12, trackCount: 312, lastActive: "just now", members: ["alex", "maya", "joe", "kim", "sam", "lee", "nina", "chris", "pat", "dan", "eli", "rue"] },
];

const mockTracks: Track[] = [
  { id: "1", title: "Myxomatosis", artist: "Radiohead", url: "https://open.spotify.com/track/abc", sharedBy: "alex", genre: "Alt Rock", timestamp: "2m ago" },
  { id: "2", title: "Genesis", artist: "Grimes", url: "https://music.apple.com/track/def", sharedBy: "maya", genre: "Electronic", timestamp: "15m ago" },
  { id: "3", title: "Tadow", artist: "Masego & FKJ", url: "https://youtube.com/watch?v=ghi", sharedBy: "joe", genre: "Jazz", timestamp: "1h ago" },
  { id: "4", title: "Motion Sickness", artist: "Phoebe Bridgers", url: "https://open.spotify.com/track/jkl", sharedBy: "kim", genre: "Indie", timestamp: "2h ago" },
  { id: "5", title: "Nights", artist: "Frank Ocean", url: "https://music.apple.com/track/mno", sharedBy: "sam", genre: "R&B", timestamp: "3h ago" },
  { id: "6", title: "Dissolve", artist: "Absofacto", url: "https://open.spotify.com/track/pqr", sharedBy: "lee", genre: "Indie Pop", timestamp: "4h ago" },
  { id: "7", title: "Pink + White", artist: "Frank Ocean", url: "https://music.apple.com/track/stu", sharedBy: "nina", genre: "R&B", timestamp: "5h ago" },
  { id: "8", title: "Breathe Deeper", artist: "Tame Impala", url: "https://youtube.com/watch?v=vwx", sharedBy: "chris", genre: "Psychedelic", timestamp: "6h ago" },
];

const Dashboard = () => {
  const [activeGroup, setActiveGroup] = useState<string>("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFriendsSearch, setShowFriendsSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleAddTrack = (url: string) => {
    toast.success("Track added to feed");
  };

  const filteredGroups = mockGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/analytics")}>
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/profile")}>
              <UserCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/")}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Groups */}
        <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-border/50 h-[calc(100vh-48px)] sticky top-12">
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search groups or @users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-0 bg-secondary shadow-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => setShowCreateGroup(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Group
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-3 py-2 block">
              Your Tribes ({filteredGroups.length})
            </span>
            {filteredGroups.map((group, i) => (
              <GroupCard
                key={group.id}
                group={group}
                isActive={activeGroup === group.id}
                onClick={() => setActiveGroup(group.id)}
                index={i}
              />
            ))}
          </div>
        </aside>

        {/* Main feed */}
        <main className="flex-1 min-w-0">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            {/* Group header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">
                  {mockGroups.find((g) => g.id === activeGroup)?.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mockGroups.find((g) => g.id === activeGroup)?.memberCount} members ·{" "}
                  <span className="font-mono tabular-nums">
                    {mockGroups.find((g) => g.id === activeGroup)?.trackCount} tracks
                  </span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground"
                onClick={() => navigate("/analytics")}
              >
                Analytics <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Add track */}
            <AddTrackInput onSubmit={handleAddTrack} />

            {/* Track list */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Recent Activity
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  48 tracks this week <span className="text-spotify">(+12%)</span>
                </span>
              </div>
              {mockTracks.map((track, i) => (
                <TrackCard key={track.id} track={track} index={i} />
              ))}
            </div>
          </div>
        </main>

        {/* Right rail - Quick analytics (desktop only) */}
        <aside className="hidden lg:block w-72 xl:w-80 border-l border-border/50 h-[calc(100vh-48px)] sticky top-12 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="This week" value="48" change="+12%" />
              <StatCard label="Members" value="6" />
              <StatCard label="Top genre" value="Electronic" />
              <StatCard label="Top source" value="Spotify" />
            </div>
            <GenreDistribution />
            <SourceLoyalty />
            <WeeklyActivity />
          </div>
        </aside>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 z-30">
        <div className="flex items-center justify-around h-14">
          {[
            { icon: Disc3, label: "Feed", active: true },
            { icon: Search, label: "Search", active: false, onClick: () => setShowFriendsSearch(true) },
            { icon: Plus, label: "Add", active: false, onClick: () => setShowCreateGroup(true) },
            { icon: BarChart3, label: "Analytics", active: false, onClick: () => navigate("/analytics") },
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

      {/* Modals */}
      <AnimatePresence>
        {showFriendsSearch && (
          <FriendsSearch onClose={() => setShowFriendsSearch(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(name, members) => {
              toast.success(`Group "${name}" created`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
