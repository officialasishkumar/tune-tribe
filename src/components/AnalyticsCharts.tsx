import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const genreData = [
  { name: "Electronic", value: 34, color: "hsl(221.2, 83.2%, 53.3%)" },
  { name: "Hip-Hop", value: 22, color: "hsl(262, 83%, 58%)" },
  { name: "Jazz", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Post-Punk", value: 12, color: "hsl(0, 72%, 51%)" },
  { name: "Indie", value: 10, color: "hsl(141, 73%, 42%)" },
  { name: "Other", value: 7, color: "hsl(240, 4.8%, 80%)" },
];

const sourceData = [
  { name: "Spotify", tracks: 45, color: "hsl(141, 73%, 42%)" },
  { name: "Apple Music", tracks: 28, color: "hsl(352, 95%, 56%)" },
  { name: "YouTube", tracks: 19, color: "hsl(0, 100%, 50%)" },
  { name: "Other", tracks: 8, color: "hsl(240, 4.8%, 80%)" },
];

const weeklyData = [
  { day: "Mon", tracks: 8 },
  { day: "Tue", tracks: 12 },
  { day: "Wed", tracks: 5 },
  { day: "Thu", tracks: 15 },
  { day: "Fri", tracks: 22 },
  { day: "Sat", tracks: 18 },
  { day: "Sun", tracks: 10 },
];

export const GenreDistribution = () => (
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

export const SourceLoyalty = () => (
  <div>
    <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Source Loyalty</h3>
    <div className="space-y-2">
      {sourceData.map((s) => (
        <div key={s.name} className="flex items-center gap-3">
          <span className="text-xs text-foreground w-20 truncate">{s.name}</span>
          <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${(s.tracks / 50) * 100}%`, backgroundColor: s.color }}
            />
          </div>
          <span className="text-xs font-mono tabular-nums text-muted-foreground w-6 text-right">{s.tracks}</span>
        </div>
      ))}
    </div>
  </div>
);

export const WeeklyActivity = () => (
  <div>
    <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Weekly Activity</h3>
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeklyData} barSize={16}>
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
