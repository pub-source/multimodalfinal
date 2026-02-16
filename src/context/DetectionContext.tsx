import React, { createContext, useContext, useState, useCallback } from "react";

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface SpeechEvent {
  id: string;
  time: string;
  volume: number;
  label: string;
  level: "normal" | "elevated" | "critical";
}

export interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  message: string;
  time: string;
}

export interface LogEntry {
  id: string;
  time: string;
  objects: string;
  saliency: number;
  speechEvent: string;
  level: "normal" | "elevated" | "critical";
}

export interface TimeSeriesPoint {
  time: string;
  timestamp: number;
  objectCount: number;
  audioIntensity: number;
  attentionScore: number;
}

interface DetectionContextType {
  detections: Detection[];
  setDetections: (d: Detection[]) => void;

  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
  currentVolume: number;
  setCurrentVolume: (v: number) => void;
  speechEvents: SpeechEvent[];
  addSpeechEvent: (e: SpeechEvent) => void;

  alerts: Alert[];
  addAlert: (a: Alert) => void;

  logs: LogEntry[];
  addLog: (l: LogEntry) => void;

  isLive: boolean;
  setIsLive: (v: boolean) => void;
  modelLoaded: boolean;
  setModelLoaded: (v: boolean) => void;

  saliencyScore: number;
  setSaliencyScore: (v: number) => void;

  // Toggles
  showBoundingBoxes: boolean;
  setShowBoundingBoxes: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  enableAlerts: boolean;
  setEnableAlerts: (v: boolean) => void;
  simulationMode: boolean;
  setSimulationMode: (v: boolean) => void;

  // Input mode
  videoMode: "live" | "upload";
  setVideoMode: (v: "live" | "upload") => void;
  audioMode: "live" | "upload";
  setAudioMode: (v: "live" | "upload") => void;

  // Time series for analytics
  timeSeries: TimeSeriesPoint[];
  addTimeSeriesPoint: (p: TimeSeriesPoint) => void;
}

const DetectionContext = createContext<DetectionContextType | null>(null);

export const useDetectionContext = () => {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error("useDetectionContext must be used within DetectionProvider");
  return ctx;
};

const MAX_ITEMS = 50;
const MAX_TIMESERIES = 120;

export const DetectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [speechEvents, setSpeechEvents] = useState<SpeechEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [saliencyScore, setSaliencyScore] = useState(0);

  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);

  const [videoMode, setVideoMode] = useState<"live" | "upload">("live");
  const [audioMode, setAudioMode] = useState<"live" | "upload">("live");

  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);

  const addSpeechEvent = useCallback((e: SpeechEvent) => {
    setSpeechEvents((prev) => [e, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const addAlert = useCallback((a: Alert) => {
    setAlerts((prev) => [a, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const addLog = useCallback((l: LogEntry) => {
    setLogs((prev) => [l, ...prev].slice(0, MAX_ITEMS));
  }, []);

  const addTimeSeriesPoint = useCallback((p: TimeSeriesPoint) => {
    setTimeSeries((prev) => [...prev, p].slice(-MAX_TIMESERIES));
  }, []);

  return (
    <DetectionContext.Provider
      value={{
        detections, setDetections,
        isRecording, setIsRecording,
        currentVolume, setCurrentVolume,
        speechEvents, addSpeechEvent,
        alerts, addAlert,
        logs, addLog,
        isLive, setIsLive,
        modelLoaded, setModelLoaded,
        saliencyScore, setSaliencyScore,
        showBoundingBoxes, setShowBoundingBoxes,
        showHeatmap, setShowHeatmap,
        enableAlerts, setEnableAlerts,
        simulationMode, setSimulationMode,
        videoMode, setVideoMode,
        audioMode, setAudioMode,
        timeSeries, addTimeSeriesPoint,
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
};
