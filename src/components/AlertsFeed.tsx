import { AlertTriangle, Bell, ShieldAlert, User, Trash2 } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";

const typeConfig = {
  critical: {
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    className: "border-danger/30 bg-danger/5 text-danger",
  },
  warning: {
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    className: "border-accent/30 bg-accent/5 text-accent",
  },
  info: {
    icon: <User className="w-3.5 h-3.5" />,
    className: "border-primary/20 bg-primary/5 text-primary",
  },
};

const AlertsFeed = () => {
  const { alerts, enableAlerts, clearAlerts } = useDetectionContext();
  const criticalCount = alerts.filter((a) => a.type === "critical").length;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Bell className="w-4 h-4 text-accent" />
        <span>Context Alerts</span>
        <div className="ml-auto flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-danger">
              <span className="status-dot bg-danger animate-pulse" />
              {criticalCount} critical
            </span>
          )}
          {alerts.length > 0 && (
            <button
              onClick={clearAlerts}
              className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
              title="Clear all alerts"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {!enableAlerts && (
          <div className="text-xs text-muted-foreground font-mono text-center py-8">
            Alerts disabled — enable in Controls
          </div>
        )}
        {enableAlerts && alerts.length === 0 && (
          <div className="text-xs text-muted-foreground font-mono text-center py-8">
            No alerts — start camera & mic
          </div>
        )}
        {alerts.map((alert) => {
          const config = typeConfig[alert.type];
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md border transition-colors ${config.className}`}
            >
              <div className="mt-0.5">{config.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{alert.message}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsFeed;
