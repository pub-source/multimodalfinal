import { useState, useCallback, useRef, useEffect } from "react";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraPanelState {
  status: "offline" | "live" | "error";
  fps: number;
  deviceId: string | null;
  stream: MediaStream | null;
  error: string | null;
}

const DEFAULT_PANEL: CameraPanelState = {
  status: "offline",
  fps: 0,
  deviceId: null,
  stream: null,
  error: null,
};

export const useMultiCamera = () => {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [panels, setPanels] = useState<CameraPanelState[]>([
    { ...DEFAULT_PANEL },
    { ...DEFAULT_PANEL },
    { ...DEFAULT_PANEL },
    { ...DEFAULT_PANEL },
  ]);
  const [allLive, setAllLive] = useState(false);
  const streamsRef = useRef<(MediaStream | null)[]>([null, null, null, null]);
  const fpsCounters = useRef<number[]>([0, 0, 0, 0]);
  const fpsTimers = useRef<number[]>([0, 0, 0, 0]);

  // Enumerate cameras
  const enumerateDevices = useCallback(async () => {
    try {
      // Request permission first so labels are populated
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((t) => t.stop());

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
      return [];
    }
  }, []);

  // Get stream for a device
  const getStream = useCallback(
    async (deviceId: string, quality: "hd" | "sd"): Promise<MediaStream> => {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: quality === "hd" ? 1280 : 640 },
          height: { ideal: quality === "hd" ? 720 : 480 },
        },
      };
      return navigator.mediaDevices.getUserMedia(constraints);
    },
    []
  );

  // Clone a stream (for single-camera mode)
  const cloneStream = useCallback((stream: MediaStream): MediaStream => {
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return stream;
    // Clone the track for independent usage
    const clonedTrack = tracks[0].clone();
    return new MediaStream([clonedTrack]);
  }, []);

  // Start all cameras
  const startAll = useCallback(
    async (quality: "hd" | "sd" = "hd") => {
      const foundDevices = await enumerateDevices();
      const newPanels: CameraPanelState[] = [];

      try {
        if (foundDevices.length === 0) {
          // No cameras found
          for (let i = 0; i < 4; i++) {
            newPanels.push({ ...DEFAULT_PANEL, status: "error", error: "No camera found" });
          }
          setPanels(newPanels);
          return;
        }

        // Get main stream
        const mainStream = await getStream(foundDevices[0].deviceId, quality);
        streamsRef.current[0] = mainStream;
        newPanels.push({
          status: "live",
          fps: 0,
          deviceId: foundDevices[0].deviceId,
          stream: mainStream,
          error: null,
        });

        // For panels 2-4, use additional cameras or clone main
        for (let i = 1; i < 4; i++) {
          if (foundDevices[i]) {
            try {
              const stream = await getStream(foundDevices[i].deviceId, quality);
              streamsRef.current[i] = stream;
              newPanels.push({
                status: "live",
                fps: 0,
                deviceId: foundDevices[i].deviceId,
                stream,
                error: null,
              });
            } catch {
              // Fallback to clone
              const cloned = cloneStream(mainStream);
              streamsRef.current[i] = cloned;
              newPanels.push({
                status: "live",
                fps: 0,
                deviceId: foundDevices[0].deviceId,
                stream: cloned,
                error: null,
              });
            }
          } else {
            // Clone main stream for extra panels
            const cloned = cloneStream(mainStream);
            streamsRef.current[i] = cloned;
            newPanels.push({
              status: "live",
              fps: 0,
              deviceId: foundDevices[0].deviceId,
              stream: cloned,
              error: null,
            });
          }
        }

        setPanels(newPanels);
        setAllLive(true);
      } catch (err: any) {
        console.error("Failed to start cameras:", err);
        for (let i = newPanels.length; i < 4; i++) {
          newPanels.push({
            ...DEFAULT_PANEL,
            status: "error",
            error: err?.message || "Permission denied",
          });
        }
        setPanels(newPanels);
      }
    },
    [enumerateDevices, getStream, cloneStream]
  );

  // Stop all cameras
  const stopAll = useCallback(() => {
    streamsRef.current.forEach((stream, i) => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamsRef.current[i] = null;
      }
    });
    setPanels([
      { ...DEFAULT_PANEL },
      { ...DEFAULT_PANEL },
      { ...DEFAULT_PANEL },
      { ...DEFAULT_PANEL },
    ]);
    setAllLive(false);
  }, []);

  // FPS tracking
  const tickFps = useCallback((panelIndex: number) => {
    fpsCounters.current[panelIndex]++;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPanels((prev) =>
        prev.map((p, i) => {
          if (p.status === "live") {
            const fps = fpsCounters.current[i];
            fpsCounters.current[i] = 0;
            return { ...p, fps };
          }
          return p;
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamsRef.current.forEach((stream) => {
        if (stream) stream.getTracks().forEach((t) => t.stop());
      });
    };
  }, []);

  return {
    devices,
    panels,
    allLive,
    startAll,
    stopAll,
    tickFps,
    enumerateDevices,
  };
};
