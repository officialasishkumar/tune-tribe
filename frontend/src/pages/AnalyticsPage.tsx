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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold tracking-tight">
                {selectedGroup ? `${selectedGroup.name} Analytics` : "Analytics"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {["7d", "30d", "90d", "all"].map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => setTimeFilter(filterValue)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  timeFilter === filterValue
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {filterValue}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {(analytics?.stats ?? []).map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change ?? undefined} />
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <GenreDistribution data={analytics?.genreDistribution ?? []} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <SourceLoyalty data={analytics?.sourceLoyalty ?? []} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <WeeklyActivity data={analytics?.weeklyActivity ?? []} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Monthly Trend</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.monthlyTrend ?? []}>
                  <defs>
                    <linearGradient id="colorTracks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4.8%, 92%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0, 0%, 100%)",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="tracks" stroke="hsl(221.2, 83.2%, 53.3%)" strokeWidth={2} fill="url(#colorTracks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Member Leaderboard</h3>
            <div className="space-y-2">
              {(analytics?.memberLeaderboard ?? []).map((member, index) => (
                <div key={member.name} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-4">{index + 1}</span>
                  <span className="text-sm text-foreground flex-1">{member.name}</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{member.topGenre}</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-foreground">{member.tracks}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Most Shared Tracks</h3>
            <div className="space-y-2">
              {(analytics?.topTracks ?? []).map((track, index) => (
                <div key={`${track.title}-${track.artist}`} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-4">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block truncate">{track.title}</span>
                    <span className="text-xs text-muted-foreground">{track.artist}</span>
                  </div>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{track.genre}</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-foreground">{track.shares}×</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {analytics?.sourceLoyalty?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35, ease: [0.2, 0, 0, 1] }}
              className="p-4 rounded-xl bg-card shadow-card"
            >
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Source Mix</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.sourceLoyalty} dataKey="tracks" nameKey="name" innerRadius={42} outerRadius={66}>
                      {analytics.sourceLoyalty.map((entry, index) => (
                        <Cell key={entry.name} fill={accentColors[index % accentColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AnalyticsPage;
