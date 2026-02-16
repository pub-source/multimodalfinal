import { useEffect, useRef } from "react";
import { useDetectionContext } from "@/context/DetectionContext";

const LABELS = ["person", "chair", "laptop", "cup", "bottle", "cell phone", "book", "tv"];

const randomBbox = (): [number, number, number, number] => {
  const x = Math.random() * 400;
  const y = Math.random() * 300;
  return [x, y, 60 + Math.random() * 120, 60 + Math.random() * 150];
};

const getTimeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });

export const useSimulation = () => {
  const {
    simulationMode, isLive, isRecording,
    setDetections, setSaliencyScore, setCurrentVolume,
    addLog, addAlert, addSpeechEvent, addTimeSeriesPoint,
    enableAlerts,
  } = useDetectionContext();

  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (!simulationMode || isLive || isRecording) {
      clearInterval(intervalRef.current);
      return;
    }

    // Run simulation every 2 seconds
    intervalRef.current = window.setInterval(() => {
      const numObjects = 1 + Math.floor(Math.random() * 4);
      const detections = Array.from({ length: numObjects }, (_, i) => {
        const label = LABELS[Math.floor(Math.random() * LABELS.length)];
        return {
          id: `sim-${label}-${i}`,
          label,
          confidence: 0.5 + Math.random() * 0.5,
          bbox: randomBbox(),
        };
      });
      setDetections(detections);

      const volume = 20 + Math.random() * 70;
      setCurrentVolume(volume);

      const personDetected = detections.some((d) => d.label === "person");
      const sal = Math.min(1, (personDetected ? 0.7 : 0.3) + Math.random() * 0.3);
      setSaliencyScore(sal);

      const time = getTimeStr();
      const now = Date.now();

      addLog({
        id: `sim-log-${now}`,
        time,
        objects: detections.map((d) => d.label).join(", "),
        saliency: parseFloat(sal.toFixed(2)),
        speechEvent: volume > 60 ? `Voice (${Math.round(volume)} dB)` : "Ambient",
        level: sal > 0.85 ? "critical" : sal > 0.6 ? "elevated" : "normal",
      });

      addTimeSeriesPoint({
        time,
        timestamp: now,
        objectCount: detections.length,
        audioIntensity: volume,
        attentionScore: sal * 100,
      });

      if (volume > 60) {
        addSpeechEvent({
          id: `sim-speech-${now}`,
          time,
          volume: Math.round(volume),
          label: volume > 80 ? `Loud voice (${Math.round(volume)} dB)` : `Speech detected (${Math.round(volume)} dB)`,
          level: volume > 80 ? "critical" : "elevated",
        });
      }

      if (enableAlerts && personDetected && volume > 60) {
        addAlert({
          id: `sim-alert-${now}`,
          type: "critical",
          message: `[SIM] Person + loud voice (${Math.round(volume)} dB)`,
          time,
        });
      } else if (enableAlerts && personDetected) {
        addAlert({
          id: `sim-alert-${now}`,
          type: "info",
          message: `[SIM] Person detected — saliency ${sal.toFixed(2)}`,
          time,
        });
      }
    }, 2000);

    return () => clearInterval(intervalRef.current);
  }, [simulationMode, isLive, isRecording, enableAlerts,
    setDetections, setSaliencyScore, setCurrentVolume,
    addLog, addAlert, addSpeechEvent, addTimeSeriesPoint]);
};
