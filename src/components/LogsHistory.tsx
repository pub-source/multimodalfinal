import { ScrollText } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";

const saliencyColor = (val: number) => {
  if (val > 0.85) return "text-danger";
  if (val > 0.6) return "text-accent";
  return "text-primary";
};

const levelColors = {
  normal: "text-muted-foreground",
  elevated: "text-accent",
  critical: "text-danger",
};

const LogsHistory = () => {
  const { logs } = useDetectionContext();

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <ScrollText className="w-4 h-4 text-primary" />
        <span>Detection Logs</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{logs.length} entries</span>
      </div>
      <div className="overflow-auto max-h-[250px]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground sticky top-0 bg-card">
              <th className="text-left px-4 py-2 font-medium">Time</th>
              <th className="text-left px-4 py-2 font-medium">Objects</th>
              <th className="text-left px-4 py-2 font-medium">Saliency</th>
              <th className="text-left px-4 py-2 font-medium">Speech Event</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No logs yet — start camera to begin detection
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">{log.time}</td>
                <td className="px-4 py-2.5 text-foreground capitalize">{log.objects}</td>
                <td className={`px-4 py-2.5 font-semibold ${saliencyColor(log.saliency)}`}>
                  {log.saliency.toFixed(2)}
                </td>
                <td className={`px-4 py-2.5 ${levelColors[log.level]}`}>{log.speechEvent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsHistory;
