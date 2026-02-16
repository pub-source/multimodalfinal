import { Camera, Square, Play, Loader2, Upload, X } from "lucide-react";
import { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { useDetectionContext } from "@/context/DetectionContext";

const CameraFeed = () => {
  const {
    isLive, setIsLive,
    setDetections, detections,
    modelLoaded, setModelLoaded,
    addLog, addAlert,
    saliencyScore, setSaliencyScore,
    currentVolume,
    showBoundingBoxes,
    enableAlerts,
    videoMode,
    addTimeSeriesPoint,
  } = useDetectionContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLogRef = useRef<number>(0);
  const lastAlertRef = useRef<number>(0);

  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  // Load model
  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      await tf.ready();
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      if (!cancelled) {
        modelRef.current = model;
        setModelLoaded(true);
      }
    };
    loadModel();
    return () => { cancelled = true; };
  }, [setModelLoaded]);

  const getTimeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  const detect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const predictions = await modelRef.current.detect(video);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showBoundingBoxes) {
      predictions.forEach((pred) => {
        const [x, y, w, h] = pred.bbox;
        const isPerson = pred.class === "person";

        ctx.strokeStyle = isPerson ? "hsl(0, 70%, 55%)" : "hsl(185, 80%, 50%)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const label = `${pred.class} ${(pred.score * 100).toFixed(0)}%`;
        ctx.font = "12px 'JetBrains Mono', monospace";
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = isPerson ? "hsla(0, 70%, 55%, 0.8)" : "hsla(185, 80%, 50%, 0.8)";
        ctx.fillRect(x, y - 18, textW + 8, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 4, y - 5);

        const bracketLen = 12;
        ctx.strokeStyle = isPerson ? "hsl(0, 70%, 55%)" : "hsl(185, 80%, 50%)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + bracketLen); ctx.lineTo(x, y); ctx.lineTo(x + bracketLen, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - bracketLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bracketLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h - bracketLen); ctx.lineTo(x, y + h); ctx.lineTo(x + bracketLen, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - bracketLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bracketLen); ctx.stroke();
      });
    }

    const newDetections = predictions.map((p, i) => ({
      id: `${p.class}-${i}`,
      label: p.class,
      confidence: p.score,
      bbox: p.bbox as [number, number, number, number],
    }));
    setDetections(newDetections);

    const maxScore = predictions.length > 0
      ? Math.max(...predictions.map((p) => p.score))
      : 0;
    const personDetected = predictions.some((p) => p.class === "person");
    const sal = Math.min(1, maxScore * (personDetected ? 1.2 : 0.8) * (predictions.length > 2 ? 1.1 : 1));
    setSaliencyScore(sal);

    const now = Date.now();
    if (predictions.length > 0 && now - lastLogRef.current > 3000) {
      lastLogRef.current = now;
      const time = getTimeStr();
      addLog({
        id: `log-${now}`,
        time,
        objects: predictions.map((p) => p.class).join(", "),
        saliency: parseFloat(sal.toFixed(2)),
        speechEvent: currentVolume > 60 ? `Voice (${Math.round(currentVolume)} dB)` : "Ambient",
        level: sal > 0.85 ? "critical" : sal > 0.6 ? "elevated" : "normal",
      });

      addTimeSeriesPoint({
        time,
        timestamp: now,
        objectCount: predictions.length,
        audioIntensity: currentVolume,
        attentionScore: sal * 100,
      });
    }

    if (enableAlerts) {
      if (personDetected && currentVolume > 60 && now - lastAlertRef.current > 5000) {
        lastAlertRef.current = now;
        addAlert({
          id: `alert-${now}`,
          type: "critical",
          message: `Person detected + loud voice (${Math.round(currentVolume)} dB)`,
          time: getTimeStr(),
        });
      } else if (personDetected && now - lastAlertRef.current > 8000) {
        lastAlertRef.current = now;
        addAlert({
          id: `alert-${now}`,
          type: "info",
          message: `Person detected — saliency ${sal.toFixed(2)}`,
          time: getTimeStr(),
        });
      }
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [setDetections, addLog, addAlert, setSaliencyScore, currentVolume, showBoundingBoxes, enableAlerts, addTimeSeriesPoint]);

  // Start/stop camera or uploaded video
  useEffect(() => {
    if (isLive) {
      if (videoMode === "live") {
        const startCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadeddata = () => {
                animFrameRef.current = requestAnimationFrame(detect);
              };
            }
          } catch (err) {
            console.error("Camera access denied:", err);
            setIsLive(false);
          }
        };
        startCamera();
      } else if (videoMode === "upload" && uploadedVideoUrl) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = uploadedVideoUrl;
          videoRef.current.loop = true;
          videoRef.current.onloadeddata = () => {
            videoRef.current?.play();
            animFrameRef.current = requestAnimationFrame(detect);
          };
        }
      }
    } else {
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
      }
      setDetections([]);
      setSaliencyScore(0);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isLive, detect, setIsLive, setDetections, setSaliencyScore, videoMode, uploadedVideoUrl]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedVideoUrl(url);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <Camera className="w-4 h-4 text-primary" />
        <span>Camera Feed</span>
        {!modelLoaded && (
          <span className="ml-2 flex items-center gap-1 text-[10px] font-mono text-accent">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading model…
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isLive && <span className="status-dot-live" />}
          <span className="text-xs font-mono">
            {isLive ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[280px] bg-background overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isLive ? "block" : "hidden"}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover ${isLive ? "block" : "hidden"}`}
        />
        {!isLive && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-mono">
            {videoMode === "upload" && !uploadedVideoUrl
              ? "Upload a video file to begin"
              : "Camera offline — click Start"}
          </div>
        )}
        <div className="absolute inset-0 grid-scanline pointer-events-none" />
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-primary/50" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-primary/50" />
        <div className="absolute bottom-6 left-2 w-4 h-4 border-b border-l border-primary/50" />
        <div className="absolute bottom-6 right-2 w-4 h-4 border-b border-r border-primary/50" />
        {isLive && (
          <div className="absolute bottom-2 left-2 font-mono text-[10px] text-primary/70 bg-background/60 px-2 py-0.5 rounded">
            {new Date().toLocaleString()} • {videoMode === "upload" ? "FILE" : "CAM-01"}
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex gap-2 items-center">
        <button
          onClick={() => setIsLive(!isLive)}
          disabled={!modelLoaded || (videoMode === "upload" && !uploadedVideoUrl)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !modelLoaded || (videoMode === "upload" && !uploadedVideoUrl)
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : isLive
              ? "bg-danger/20 text-danger hover:bg-danger/30"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {isLive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {!modelLoaded ? "Loading…" : isLive ? "Stop" : "Start"}
        </button>

        {videoMode === "upload" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/*"
              className="hidden"
              onChange={handleVideoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3 h-3" />
              {uploadedVideoUrl ? "Change File" : "Upload MP4"}
            </button>
            {uploadedVideoUrl && !isLive && (
              <button
                onClick={() => setUploadedVideoUrl(null)}
                className="text-muted-foreground hover:text-danger transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CameraFeed;
