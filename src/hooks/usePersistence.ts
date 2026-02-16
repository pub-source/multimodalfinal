import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDetectionContext, LogEntry, Alert, TimeSeriesPoint } from "@/context/DetectionContext";

/**
 * Persists detection logs, alerts, and analytics to the database
 * and loads historical data on mount.
 */
export const usePersistence = () => {
  const {
    logs, alerts, timeSeries,
    addLog, addAlert, addTimeSeriesPoint,
  } = useDetectionContext();

  const lastLogCount = useRef(0);
  const lastAlertCount = useRef(0);
  const lastTsCount = useRef(0);
  const initialLoaded = useRef(false);

  // Load historical data on mount
  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;

    const load = async () => {
      const [logsRes, alertsRes, tsRes] = await Promise.all([
        supabase.from("detection_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("analytics_timeseries").select("*").order("created_at", { ascending: true }).limit(120),
      ]);

      if (logsRes.data) {
        logsRes.data.reverse().forEach((row) => {
          addLog({
            id: row.id,
            time: row.time,
            objects: row.objects,
            saliency: Number(row.saliency),
            speechEvent: row.speech_event,
            level: row.level as LogEntry["level"],
          });
        });
        lastLogCount.current = logsRes.data.length;
      }

      if (alertsRes.data) {
        alertsRes.data.reverse().forEach((row) => {
          addAlert({
            id: row.id,
            type: row.type as Alert["type"],
            message: row.message,
            time: row.time,
          });
        });
        lastAlertCount.current = alertsRes.data.length;
      }

      if (tsRes.data) {
        tsRes.data.forEach((row) => {
          addTimeSeriesPoint({
            time: row.time,
            timestamp: Number(row.timestamp),
            objectCount: row.object_count,
            audioIntensity: Number(row.audio_intensity),
            attentionScore: Number(row.attention_score),
          });
        });
        lastTsCount.current = tsRes.data.length;
      }
    };

    load();
  }, [addLog, addAlert, addTimeSeriesPoint]);

  // Persist new logs
  useEffect(() => {
    if (logs.length <= lastLogCount.current) {
      lastLogCount.current = logs.length;
      return;
    }
    const newLogs = logs.slice(0, logs.length - lastLogCount.current);
    lastLogCount.current = logs.length;

    newLogs.forEach((log) => {
      supabase.from("detection_logs").insert({
        time: log.time,
        objects: log.objects,
        saliency: log.saliency,
        speech_event: log.speechEvent,
        level: log.level,
      }).then();
    });
  }, [logs]);

  // Persist new alerts
  useEffect(() => {
    if (alerts.length <= lastAlertCount.current) {
      lastAlertCount.current = alerts.length;
      return;
    }
    const newAlerts = alerts.slice(0, alerts.length - lastAlertCount.current);
    lastAlertCount.current = alerts.length;

    newAlerts.forEach((alert) => {
      supabase.from("alerts").insert({
        type: alert.type,
        message: alert.message,
        time: alert.time,
      }).then();
    });
  }, [alerts]);

  // Persist new time series points
  useEffect(() => {
    if (timeSeries.length <= lastTsCount.current) {
      lastTsCount.current = timeSeries.length;
      return;
    }
    const newPoints = timeSeries.slice(lastTsCount.current);
    lastTsCount.current = timeSeries.length;

    newPoints.forEach((p) => {
      supabase.from("analytics_timeseries").insert({
        time: p.time,
        timestamp: p.timestamp,
        object_count: p.objectCount,
        audio_intensity: p.audioIntensity,
        attention_score: p.attentionScore,
      }).then();
    });
  }, [timeSeries]);
};
