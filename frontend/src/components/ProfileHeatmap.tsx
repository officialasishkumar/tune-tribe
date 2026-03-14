import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ActivityCalendar, ThemeInput } from 'react-activity-calendar';
import type { ActivityHeatmapPoint } from "@/lib/types";

type ProfileHeatmapProps = {
  data: ActivityHeatmapPoint[];
  isDark: boolean;
};

const explicitTheme: ThemeInput = {
  light: ['hsl(240, 4.8%, 95.9%)', 'hsl(221.2, 83.2%, 80%)', 'hsl(221.2, 83.2%, 70%)', 'hsl(221.2, 83.2%, 60%)', 'hsl(221.2, 83.2%, 53.3%)'],
  dark: ['hsl(224, 25%, 20%)', 'hsl(221.2, 83.2%, 40%)', 'hsl(221.2, 83.2%, 45%)', 'hsl(221.2, 83.2%, 50%)', 'hsl(221.2, 83.2%, 53.3%)'],
};

export const ProfileHeatmap = ({ data, isDark }: ProfileHeatmapProps) => {
  const years = useMemo(() => {
    if (!data.length) return [];
    const uniqueYears = new Set(data.map(d => new Date(d.date).getFullYear()));
    return Array.from(uniqueYears).sort((a, b) => b - a); // Descending
  }, [data]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0] || new Date().getFullYear());

  const filteredData = useMemo(() => {
    return data.filter(d => new Date(d.date).getFullYear() === selectedYear);
  }, [data, selectedYear]);

  if (data.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Sharing Activity</h2>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 p-6 md:p-8 rounded-2xl bg-card border shadow-sm flex items-center justify-center overflow-x-auto"
        >
          <div className="min-w-max">
            <ActivityCalendar 
              data={filteredData} 
              theme={explicitTheme}
              colorScheme={isDark ? "dark" : "light"}
              labels={{
                legend: {
                  less: "Less",
                  more: "More",
                },
                months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                totalCount: `{{count}} tracks shared in ${selectedYear}`,
              }}
              showWeekdayLabels
              blockSize={14}
              blockMargin={4}
              fontSize={14}
            />
          </div>
        </motion.div>

        {years.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
          >
            {years.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  selectedYear === year
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card hover:bg-secondary/80 text-muted-foreground border"
                }`}
              >
                {year}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};