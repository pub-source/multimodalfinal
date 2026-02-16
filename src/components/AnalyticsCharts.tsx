import { BarChart3 } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

const AnalyticsCharts = () => {
  const { timeSeries } = useDetectionContext();

  const chartData = timeSeries.map((p) => ({
    time: p.time,
    objects: p.objectCount,
    audio: Math.round(p.audioIntensity),
    attention: Math.round(p.attentionScore),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 text-xs font-mono shadow-lg">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span>Analytics</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {timeSeries.length} data points
        </span>
      </div>
      <div className="p-4 space-y-4">
        {timeSeries.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono text-center py-8">
            No analytics data — start detection to populate charts
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Object frequency */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono text-primary uppercase tracking-wider">Object Count</h3>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="objGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(185, 80%, 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(185, 80%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="objects" stroke="hsl(185, 80%, 50%)" fill="url(#objGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Audio intensity */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono text-accent uppercase tracking-wider">Audio Intensity (dB)</h3>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="audioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(38, 90%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(38, 90%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="audio" stroke="hsl(38, 90%, 55%)" fill="url(#audioGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attention score */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-mono text-danger uppercase tracking-wider">Attention Score</h3>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 70%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="attention" stroke="hsl(0, 70%, 55%)" fill="url(#attGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsCharts;
