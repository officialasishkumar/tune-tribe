import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

import type { DailyPoint, DistributionPoint, SourcePoint, MonthlyPoint } from "@/lib/types";

const chartColors = [
  "hsl(221.2, 83.2%, 53.3%)",
  "hsl(141, 73%, 42%)",
  "hsl(352, 95%, 56%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(240, 4.8%, 80%)",
];

const withColors = (data: DistributionPoint[]) =>
  data.map((entry, index) => ({
    ...entry,
    color: chartColors[index % chartColors.length],
  }));

export const GenreDistribution = ({ data }: { data: DistributionPoint[] }) => {
  const genreData = withColors(data);

  if (!genreData.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Genre Distribution</h3>
        <div className="text-sm text-muted-foreground">No tracks available yet.</div>
      </div>
    );
  }

  return (
  <div>
    <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Genre Distribution</h3>
    <div className="flex items-center gap-4">
      <div className="w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={genreData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {genreData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {genreData.map((g) => (
          <div key={g.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
              <span className="text-xs text-foreground">{g.name}</span>
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground">{g.value}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

export const SourceLoyalty = ({ data }: { data: SourcePoint[] }) => {
  if (!data.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Source Loyalty</h3>
        <div className="text-sm text-muted-foreground">No track sources to compare yet.</div>
      </div>
    );
  }

  const maxTracks = Math.max(...data.map((entry) => entry.tracks), 1);

  return (
  <div>
    <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Source Loyalty</h3>
    <div className="space-y-2">
      {data.map((s, index) => (
        <div key={s.name} className="flex items-center gap-3">
          <span className="text-xs text-foreground w-20 truncate">{s.name}</span>
          <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${(s.tracks / maxTracks) * 100}%`, backgroundColor: chartColors[index % chartColors.length] }}
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-muted-foreground w-6 text-right">{s.tracks}</span>
        </div>
      ))}
    </div>
  </div>
  );
};

export const WeeklyActivity = ({ data }: { data: DailyPoint[] }) => {
  if (!data.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Weekly Activity</h3>
        <div className="text-sm text-muted-foreground">No activity yet.</div>
      </div>
    );
  }

  return (
  <div>
    <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Weekly Activity</h3>
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={16}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4.8%, 92%)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }} axisLine={false} tickLine={false} width={24} />
          <Tooltip
            contentStyle={{
              background: "hsl(0, 0%, 100%)",
              border: "none",
              borderRadius: "8px",
              boxShadow: "var(--shadow-elevated)",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="tracks" fill="hsl(221.2, 83.2%, 53.3%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
  );
};

export const StatCard = ({ label, value, change }: { label: string; value: string; change?: string }) => (
  <div className="p-3 rounded-lg bg-card shadow-card">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-xl font-semibold tracking-tight text-foreground font-mono tabular-nums">{value}</span>
      {change && (
        <span className={`text-[11px] font-mono ${change.startsWith("+") ? "text-spotify" : "text-destructive"}`}>
          {change}
        </span>
      )}
    </div>
  </div>
);

export const MonthlyVolumeChart = ({ data }: { data: MonthlyPoint[] }) => {
  if (!data?.length) {
    return (
      <div>
        <h3 className="text-base font-semibold mb-6">Monthly Volume</h3>
        <div className="text-sm text-muted-foreground">No volume data yet.</div>
      </div>
    );
  }

  return (
    <>
      <h3 className="text-base font-semibold mb-6">Monthly Volume</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
    </>
  );
};

