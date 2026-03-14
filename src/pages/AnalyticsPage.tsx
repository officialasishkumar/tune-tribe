import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, ArrowLeft, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Area, AreaChart } from "recharts";

const memberData = [
  { name: "@alex", tracks: 34, topGenre: "Electronic" },
  { name: "@maya", tracks: 28, topGenre: "Indie" },
  { name: "@joe", tracks: 22, topGenre: "Jazz" },
  { name: "@kim", tracks: 19, topGenre: "Post-Punk" },
  { name: "@sam", tracks: 15, topGenre: "Hip-Hop" },
  { name: "@lee", tracks: 12, topGenre: "R&B" },
];

const monthlyTrend = [
  { month: "Sep", tracks: 68 },
  { month: "Oct", tracks: 82 },
  { month: "Nov", tracks: 95 },
  { month: "Dec", tracks: 72 },
  { month: "Jan", tracks: 110 },
  { month: "Feb", tracks: 142 },
];

const topTracks = [
  { title: "Myxomatosis", artist: "Radiohead", shares: 8, genre: "Alt Rock" },
  { title: "Genesis", artist: "Grimes", shares: 6, genre: "Electronic" },
  { title: "Nights", artist: "Frank Ocean", shares: 5, genre: "R&B" },
  { title: "Tadow", artist: "Masego & FKJ", shares: 5, genre: "Jazz" },
  { title: "Motion Sickness", artist: "Phoebe Bridgers", shares: 4, genre: "Indie" },
];

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("30d");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold tracking-tight">Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {["7d", "30d", "90d", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                  timeFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatCard label="Total tracks" value="142" change="+18%" />
          <StatCard label="Unique artists" value="87" change="+9%" />
          <StatCard label="Genres covered" value="14" change="+2" />
          <StatCard label="Avg. per week" value="24" change="+12%" />
        </motion.div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <GenreDistribution />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <SourceLoyalty />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <WeeklyActivity />
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
                <AreaChart data={monthlyTrend}>
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

        {/* Member leaderboard & Top tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: [0.2, 0, 0, 1] }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Member Leaderboard</h3>
            <div className="space-y-2">
              {memberData.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm text-foreground flex-1">{m.name}</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{m.topGenre}</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-foreground">{m.tracks}</span>
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
              {topTracks.map((t, i) => (
                <div key={t.title} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.artist}</span>
                  </div>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t.genre}</span>
                  <span className="text-sm font-mono tabular-nums font-medium text-foreground">{t.shares}×</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
