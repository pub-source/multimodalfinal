import { Camera, Square, Play, Loader2, Upload, X, Circle, Download } from "lucide-react";
import { useRef, useEffect, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { useDetectionContext } from "@/context/DetectionContext";

const CameraFeed = () => {
  const {
    isLive, setIsLive,
    setDetections,
    modelLoaded, setModelLoaded,
    addLog, addAlert,
    setSaliencyScore,
    currentVolume,
    showBoundingBoxes,
    enableAlerts,
    videoMode,
    addTimeSeriesPoint,
    resolution,
    cctvUrl,
    videoRef: sharedVideoRef,
    mirrorMode,
    qualityMode,
  } = useDetectionContext();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const lastLogRef = useRef<number>(0);
  const lastAlertRef = useRef<number>(0);
  const fpsCountRef = useRef(0);
  const fpsRef = useRef(0);
  const [fps, setFps] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordAnimRef = useRef<number>(0);

  // Sync shared ref
  useEffect(() => {
    if (localVideoRef.current) {
      (sharedVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = localVideoRef.current;
    }
  });

  // FPS counter
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load model
  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      await tf.ready();
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      if (!cancelled) {
        modelRef.current = model;
        setModelLoaded(true);
      }
    };
    loadModel();
    return () => { cancelled = true; };
  }, [setModelLoaded]);

  const getTimeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  // Fire detection via color analysis
  const detectFire = useCallback((video: HTMLVideoElement, ctx: CanvasRenderingContext2D, vw: number, vh: number) => {
    // Sample a grid of pixels looking for fire-like colors (high R, medium G, low B)
    const sampleCanvas = document.createElement("canvas");
    const sampleSize = 64;
    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    const sctx = sampleCanvas.getContext("2d")!;
    sctx.drawImage(video, 0, 0, sampleSize, sampleSize);
    const imgData = sctx.getImageData(0, 0, sampleSize, sampleSize);
    const d = imgData.data;

    let firePixels = 0;
    let fireCenterX = 0;
    let fireCenterY = 0;
    let fireMinX = sampleSize, fireMinY = sampleSize, fireMaxX = 0, fireMaxY = 0;

    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const idx = (y * sampleSize + x) * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        // Fire heuristic: R > 200, G between 50-180, B < 80, R > G, R > B*2
        if (r > 200 && g > 50 && g < 180 && b < 80 && r > g && r > b * 2) {
          firePixels++;
          fireCenterX += x;
          fireCenterY += y;
          if (x < fireMinX) fireMinX = x;
          if (y < fireMinY) fireMinY = y;
          if (x > fireMaxX) fireMaxX = x;
          if (y > fireMaxY) fireMaxY = y;
        }
      }
    }

    const fireRatio = firePixels / (sampleSize * sampleSize);
    if (fireRatio > 0.02 && firePixels > 10) {
      // Map back to full resolution
      const sx = vw / sampleSize;
      const sy = vh / sampleSize;
      const bbox: [number, number, number, number] = [
        fireMinX * sx,
        fireMinY * sy,
        (fireMaxX - fireMinX + 1) * sx,
        (fireMaxY - fireMinY + 1) * sy,
      ];
      return { detected: true, confidence: Math.min(0.95, fireRatio * 10), bbox };
    }
    return { detected: false, confidence: 0, bbox: [0, 0, 0, 0] as [number, number, number, number] };
  }, []);

  const lastFireAlertRef = useRef<number>(0);

  const detect = useCallback(async () => {
    if (!localVideoRef.current || !canvasRef.current || !modelRef.current) return;
    const video = localVideoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;

    const predictions = await modelRef.current.detect(video);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fpsCountRef.current++;

    // Fire detection via color analysis
    const fireResult = detectFire(video, ctx, vw, vh);

    // Sort predictions: person first (priority), then by confidence
    const sorted = [...predictions].sort((a, b) => {
      if (a.class === "person" && b.class !== "person") return -1;
      if (b.class === "person" && a.class !== "person") return 1;
      return b.score - a.score;
    });

    if (showBoundingBoxes) {
      sorted.forEach((pred) => {
        const [x, y, w, h] = pred.bbox;
        const isPerson = pred.class === "person";
        const color = isPerson ? "hsl(0, 70%, 55%)" : "hsl(185, 80%, 50%)";
        const colorAlpha = isPerson ? "hsla(0, 70%, 55%, 0.8)" : "hsla(185, 80%, 50%, 0.8)";
        ctx.strokeStyle = color;
        ctx.lineWidth = isPerson ? 3 : 2;
        ctx.strokeRect(x, y, w, h);
        const label = `${pred.class} ${(pred.score * 100).toFixed(0)}%`;
        ctx.font = "12px 'JetBrains Mono', monospace";
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = colorAlpha;
        ctx.fillRect(x, y - 18, textW + 8, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x + 4, y - 5);
        const bl = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y + bl); ctx.lineTo(x, y); ctx.lineTo(x + bl, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - bl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + h - bl); ctx.lineTo(x, y + h); ctx.lineTo(x + bl, y + h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w - bl, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bl); ctx.stroke();
      });

      // Draw fire bounding box if detected
      if (fireResult.detected) {
        const [fx, fy, fw, fh] = fireResult.bbox;
        ctx.strokeStyle = "hsl(15, 90%, 55%)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(fx, fy, fw, fh);
        ctx.setLineDash([]);
        // Fire label
        const fireLabel = `🔥 FIRE ${(fireResult.confidence * 100).toFixed(0)}%`;
        ctx.font = "bold 13px 'JetBrains Mono', monospace";
        const ftw = ctx.measureText(fireLabel).width;
        ctx.fillStyle = "hsla(15, 90%, 45%, 0.9)";
        ctx.fillRect(fx, fy - 20, ftw + 8, 20);
        ctx.fillStyle = "#fff";
        ctx.fillText(fireLabel, fx + 4, fy - 5);
        // Shading
        ctx.fillStyle = "hsla(15, 90%, 55%, 0.2)";
        ctx.fillRect(fx, fy, fw, fh);
      }
    }

    // Build detections list with fire as priority
    const newDetections = sorted.map((p, i) => ({
      id: `${p.class}-${i}`,
      label: p.class,
      confidence: p.score,
      bbox: p.bbox as [number, number, number, number],
    }));

    if (fireResult.detected) {
      newDetections.unshift({
        id: `fire-${Date.now()}`,
        label: "fire",
        confidence: fireResult.confidence,
        bbox: fireResult.bbox,
      });
    }

    setDetections(newDetections);

    const maxScore = predictions.length > 0 ? Math.max(...predictions.map((p) => p.score)) : 0;
    const personDetected = predictions.some((p) => p.class === "person");
    const sal = Math.min(1,
      maxScore * (personDetected ? 1.2 : 0.8) * (predictions.length > 2 ? 1.1 : 1) * (fireResult.detected ? 1.3 : 1)
    );
    setSaliencyScore(sal);

    const now = Date.now();
    if ((predictions.length > 0 || fireResult.detected) && now - lastLogRef.current > 3000) {
      lastLogRef.current = now;
      const time = getTimeStr();
      const objectLabels = predictions.map((p) => p.class);
      if (fireResult.detected) objectLabels.unshift("🔥 fire");
      addLog({
        id: `log-${now}`, time,
        objects: objectLabels.join(", "),
        saliency: parseFloat(sal.toFixed(2)),
        speechEvent: currentVolume > 60 ? `Voice (${Math.round(currentVolume)} dB)` : "Ambient",
        level: fireResult.detected ? "critical" : sal > 0.85 ? "critical" : sal > 0.6 ? "elevated" : "normal",
      });
      addTimeSeriesPoint({ time, timestamp: now, objectCount: newDetections.length, audioIntensity: currentVolume, attentionScore: sal * 100 });
    }

    if (enableAlerts) {
      // Fire warning - highest priority
      if (fireResult.detected && now - lastFireAlertRef.current > 4000) {
        lastFireAlertRef.current = now;
        addAlert({
          id: `fire-alert-${now}`,
          type: "critical",
          message: `⚠️ FIRE DETECTED — Confidence ${(fireResult.confidence * 100).toFixed(0)}% — IMMEDIATE ACTION REQUIRED`,
          time: getTimeStr(),
        });
      }

      if (personDetected && currentVolume > 60 && now - lastAlertRef.current > 5000) {
        lastAlertRef.current = now;
        addAlert({ id: `alert-${now}`, type: "critical", message: `Person detected + loud voice (${Math.round(currentVolume)} dB)`, time: getTimeStr() });
      } else if (personDetected && now - lastAlertRef.current > 8000) {
        lastAlertRef.current = now;
        addAlert({ id: `alert-${now}`, type: "info", message: `Person detected — saliency ${sal.toFixed(2)}`, time: getTimeStr() });
      }
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [setDetections, addLog, addAlert, setSaliencyScore, currentVolume, showBoundingBoxes, enableAlerts, addTimeSeriesPoint, detectFire]);

  // Start/stop camera
  useEffect(() => {
    if (isLive) {
      const w = qualityMode === "hd" ? 1280 : 640;
      const h = qualityMode === "hd" ? 720 : 480;

      if (videoMode === "live") {
        const startCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment", width: { ideal: w }, height: { ideal: h } },
            });
            streamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.onloadeddata = () => {
                animFrameRef.current = requestAnimationFrame(detect);
              };
            }
          } catch (err) {
            console.error("Camera access denied:", err);
            setIsLive(false);
          }
        };
        startCamera();
      } else if (videoMode === "cctv" && cctvUrl) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.src = cctvUrl;
          localVideoRef.current.crossOrigin = "anonymous";
          localVideoRef.current.loop = true;
          localVideoRef.current.onloadeddata = () => {
            localVideoRef.current?.play();
            animFrameRef.current = requestAnimationFrame(detect);
          };
        }
      } else if (videoMode === "upload" && uploadedVideoUrl) {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.src = uploadedVideoUrl;
          localVideoRef.current.loop = true;
          localVideoRef.current.onloadeddata = () => {
            localVideoRef.current?.play();
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
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.src = "";
      }
      setDetections([]);
      setSaliencyScore(0);
    }
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [isLive, detect, setIsLive, setDetections, setSaliencyScore, videoMode, uploadedVideoUrl, resolution, cctvUrl, qualityMode]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedVideoUrl(URL.createObjectURL(file));
  };

  const startRecording = () => {
    if (!localVideoRef.current || !canvasRef.current) return;
    // Create a compositing canvas that merges video + detection overlay
    const rc = document.createElement("canvas");
    recordCanvasRef.current = rc;
    recordedChunksRef.current = [];

    const compositeFrame = () => {
      const video = localVideoRef.current;
      const overlay = canvasRef.current;
      if (!video || !overlay || video.readyState < 2) {
        recordAnimRef.current = requestAnimationFrame(compositeFrame);
        return;
      }
      rc.width = video.videoWidth;
      rc.height = video.videoHeight;
      const ctx = rc.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      ctx.drawImage(overlay, 0, 0);
      recordAnimRef.current = requestAnimationFrame(compositeFrame);
    };
    compositeFrame();

    const stream = rc.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      cancelAnimationFrame(recordAnimRef.current);
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

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
          {isLive && <span className="text-[10px] font-mono text-success">{fps} FPS</span>}
          {isLive && <span className="status-dot-live" />}
          <span className="text-xs font-mono">{isLive ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[200px] bg-background overflow-hidden">
        <video
          ref={localVideoRef}
          autoPlay playsInline muted
          className={`w-full h-full object-cover ${isLive ? "block" : "hidden"} ${mirrorMode ? "scale-x-[-1]" : ""}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover ${isLive ? "block" : "hidden"} ${mirrorMode ? "scale-x-[-1]" : ""}`}
        />
        {!isLive && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-mono">
            {videoMode === "upload" && !uploadedVideoUrl
              ? "Upload a video file to begin"
              : videoMode === "cctv" && !cctvUrl
              ? "Enter CCTV stream URL in Controls"
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
            {new Date().toLocaleString()} • {videoMode === "cctv" ? "CCTV" : videoMode === "upload" ? "FILE" : "CAM-01"} • {qualityMode.toUpperCase()}
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex gap-2 items-center">
        <button
          onClick={() => setIsLive(!isLive)}
          disabled={!modelLoaded || (videoMode === "upload" && !uploadedVideoUrl) || (videoMode === "cctv" && !cctvUrl)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !modelLoaded || (videoMode === "upload" && !uploadedVideoUrl) || (videoMode === "cctv" && !cctvUrl)
              ? "bg-secondary text-muted-foreground cursor-not-allowed"
              : isLive
              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {isLive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {!modelLoaded ? "Loading…" : isLive ? "Stop" : "Start"}
        </button>

        {isLive && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isRecording
                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                : "bg-accent/10 text-accent hover:bg-accent/20"
            }`}
          >
            {isRecording ? <Square className="w-3 h-3" /> : <Circle className="w-3 h-3 fill-current" />}
            {isRecording ? "Stop Rec" : "Record"}
          </button>
        )}

        {videoMode === "upload" && (
          <>
            <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/*" className="hidden" onChange={handleVideoUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-3 h-3" />
              {uploadedVideoUrl ? "Change File" : "Upload MP4"}
            </button>
            {uploadedVideoUrl && !isLive && (
              <button onClick={() => setUploadedVideoUrl(null)} className="text-muted-foreground hover:text-destructive transition-colors">
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
