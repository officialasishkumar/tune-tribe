import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

import { Button } from "@/components/ui/button";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { api } from "@/lib/api";

const accentColors = [
  "hsl(221.2, 83.2%, 53.3%)",
  "hsl(141, 73%, 42%)",
  "hsl(352, 95%, 56%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(240, 4.8%, 80%)",
];

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeFilter, setTimeFilter] = useState("30d");

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  const selectedGroupId = Number(searchParams.get("groupId") ?? 0);
  const selectedGroup = groupsQuery.data?.find((group) => group.id === selectedGroupId) ?? groupsQuery.data?.[0];

  useEffect(() => {
    if (!groupsQuery.data?.length) return;
    if (!selectedGroup || searchParams.get("groupId") !== String(selectedGroup.id)) {
      setSearchParams({ groupId: String(selectedGroup?.id ?? groupsQuery.data[0].id) }, { replace: true });
    }
  }, [groupsQuery.data, searchParams, selectedGroup, setSearchParams]);

  const analyticsQuery = useQuery({
    queryKey: ["group", selectedGroup?.id, "analytics", timeFilter],
    queryFn: () => api.getGroupAnalytics(selectedGroup!.id, timeFilter),
    enabled: Boolean(selectedGroup?.id),
  });

  const analytics = analyticsQuery.data;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
                Tribe Analytics
              </span>
              <h1 className="text-lg font-bold tracking-tight">
                {selectedGroup ? selectedGroup.name : "Select a Tribe"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
            {["7d", "30d", "90d", "all"].map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => setTimeFilter(filterValue)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  timeFilter === filterValue
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filterValue.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 pb-16">
        {/* Overview Cards */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Overview</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {(analytics?.stats ?? []).map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change ?? undefined} />
            ))}
          </motion.div>
        </section>

        {/* Primary Trends Section */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Sharing Activity</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-card border shadow-sm h-[400px]"
            >
              <h3 className="text-base font-semibold mb-6">Monthly Volume</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.monthlyTrend ?? []}>
                    <defs>
                      <linearGradient id="colorTracks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="tracks" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorTracks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Active Times</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-card border shadow-sm h-[400px]"
            >
              <WeeklyActivity data={analytics?.weeklyActivity ?? []} />
            </motion.div>
          </div>
        </section>

        {/* Distributions Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Genre Mix</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-card border shadow-sm"
            >
              <GenreDistribution data={analytics?.genreDistribution ?? []} />
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Source Loyalty</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-2xl bg-card border shadow-sm"
            >
              <SourceLoyalty data={analytics?.sourceLoyalty ?? []} />
            </motion.div>
          </div>
        </section>

        {/* Leaderboards Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Top Contributors</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl bg-card border shadow-sm overflow-hidden"
            >
              <div className="space-y-4">
                {(analytics?.memberLeaderboard ?? []).map((member, index) => (
                  <div key={member.name} className="flex items-center gap-4 group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/80 text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-foreground block">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.topGenre} Lover</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-foreground block">{member.tracks}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Tracks</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Most Popular Tracks</h2>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-6 rounded-2xl bg-card border shadow-sm overflow-hidden"
            >
              <div className="space-y-4">
                {(analytics?.topTracks ?? []).map((track, index) => (
                  <div key={`${track.title}-${track.artist}`} className="flex items-center gap-4 group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/80 text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground block truncate">{track.title}</span>
                      <span className="text-xs text-muted-foreground truncate block">{track.artist}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-mono font-bold text-foreground block">{track.shares}×</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{track.genre}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnalyticsPage;
