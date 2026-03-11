import { FileDown, FlaskConical } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const ResearchMode = () => {
  const { logs, alerts, timeSeries } = useDetectionContext();
  const [exporting, setExporting] = useState(false);

  const toCSV = (headers: string[], rows: string[][]) => {
    const lines = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))];
    return lines.join("\n");
  };

  const download = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLogs = () => {
    const csv = toCSV(
      ["Time", "Objects", "Saliency", "Speech Event", "Level"],
      logs.map((l) => [l.time, l.objects, String(l.saliency), l.speechEvent, l.level])
    );
    download(csv, `detection_logs_${Date.now()}.csv`);
  };

  const exportAlerts = () => {
    const csv = toCSV(
      ["Time", "Type", "Message"],
      alerts.map((a) => [a.time, a.type, a.message])
    );
    download(csv, `alerts_${Date.now()}.csv`);
  };

  const exportTimeSeries = () => {
    const csv = toCSV(
      ["Time", "Timestamp", "Object Count", "Audio Intensity", "Attention Score"],
      timeSeries.map((t) => [t.time, String(t.timestamp), String(t.objectCount), String(t.audioIntensity), String(t.attentionScore)])
    );
    download(csv, `analytics_timeseries_${Date.now()}.csv`);
  };

  const exportAllFromDB = async () => {
    setExporting(true);
    try {
      const [logsRes, alertsRes, tsRes] = await Promise.all([
        supabase.from("detection_logs").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(1000),
        supabase.from("analytics_timeseries").select("*").order("created_at", { ascending: false }).limit(1000),
      ]);

      if (logsRes.data?.length) {
        const csv = toCSV(
          ["ID", "Time", "Objects", "Saliency", "Speech Event", "Level", "Created At"],
          logsRes.data.map((r) => [r.id, r.time, r.objects, String(r.saliency), r.speech_event, r.level, r.created_at])
        );
        download(csv, `db_detection_logs_${Date.now()}.csv`);
      }

      if (alertsRes.data?.length) {
        const csv = toCSV(
          ["ID", "Time", "Type", "Message", "Created At"],
          alertsRes.data.map((r) => [r.id, r.time, r.type, r.message, r.created_at])
        );
        download(csv, `db_alerts_${Date.now()}.csv`);
      }

      if (tsRes.data?.length) {
        const csv = toCSV(
          ["ID", "Time", "Timestamp", "Object Count", "Audio Intensity", "Attention Score", "Created At"],
          tsRes.data.map((r) => [r.id, r.time, String(r.timestamp), String(r.object_count), String(r.audio_intensity), String(r.attention_score), r.created_at])
        );
        download(csv, `db_analytics_${Date.now()}.csv`);
      }
    } finally {
      setExporting(false);
    }
  };

  const ExportButton = ({ label, count, onClick }: { label: string; count: number; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={count === 0}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <FileDown className="w-3 h-3" />
      {label} ({count})
    </button>
  );

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span>Research Mode</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">CSV Export for Capstone Study</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Export Current Session</span>
          <div className="flex flex-wrap gap-2">
            <ExportButton label="Detection Logs" count={logs.length} onClick={exportLogs} />
            <ExportButton label="Alerts" count={alerts.length} onClick={exportAlerts} />
            <ExportButton label="Time Series" count={timeSeries.length} onClick={exportTimeSeries} />
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Export All Historical Data (Database)</span>
          <button
            onClick={exportAllFromDB}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all border border-accent/20 disabled:opacity-50"
          >
            <FileDown className="w-3 h-3" />
            {exporting ? "Exporting…" : "Export All from Database (up to 1000 rows each)"}
          </button>
        </div>

        <div className="text-[10px] font-mono text-muted-foreground bg-secondary/30 p-2 rounded">
          💡 Tip: Use "Export All from Database" to retrieve persisted historical data across sessions for your capstone analysis.
        </div>
      </div>
    </div>
  );
};

export default ResearchMode;
